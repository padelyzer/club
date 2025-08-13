import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api/config';

// Types for our BFF response
interface DashboardMetrics {
  monthlyRevenue: number;
  revenueChange: number;
  todayReservations: number;
  reservationsChange: number;
  activeClients: number;
  clientsChange: number;
  occupancyRate: number;
  occupancyChange: number;
  revenueChart: {
    daily: { date: string; amount: number }[];
    total: number;
    change: number;
  };
  occupancyHeatmap: {
    hourly: { hour: number; occupancy: number }[];
    courts: { id: string; name: string; occupancy: number }[];
  };
  topClients: {
    id: string;
    name: string;
    totalSpent: number;
    reservations: number;
  }[];
  upcomingEvents: {
    id: string;
    type: 'reservation' | 'tournament' | 'class';
    title: string;
    time: string;
    participants: number;
  }[];
}

// Feature flag for BFF rollout
const BFF_FEATURES = {
  dashboard: process.env.NEXT_PUBLIC_BFF_DASHBOARD === 'true'
};

// Cache management (in-memory for now, Redis in production)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(userId: string, organizationId: string): string {
  return `dashboard-overview:${userId}:${organizationId}`;
}

function getFromCache(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Helper function to make authenticated requests to Django backend
async function fetchFromDjango(endpoint: string, token: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_CONFIG.API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Django API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Get user's current organization/club in multi-tenant way
async function getUserCurrentClub(token: string): Promise<string | null> {
  try {
    // Get user profile with club memberships
    const profile = await fetchFromDjango('/auth/profile/', token);
    
    // Get active club membership (first active one)
    const activeMembership = profile.club_memberships?.find((membership: any) => 
      membership.is_active && ['owner', 'admin', 'staff'].includes(membership.role)
    );
    
    return activeMembership?.club?.id || null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
          }
    return null;
  }
}

// Transform Django analytics data to frontend interface
function transformAnalyticsData(data: any): Partial<DashboardMetrics> {
  return {
    monthlyRevenue: data.revenue?.total || 0,
    revenueChange: data.revenue?.comparison?.change_percent || 0,
    todayReservations: data.occupancy?.total_reservations || 0,
    reservationsChange: data.occupancy?.comparison?.change_percent || 0,
    activeClients: data.customers?.active_customers || 0,
    clientsChange: data.customers?.comparison?.change_percent || 0,
    occupancyRate: data.occupancy?.occupancy_rate || 0,
    occupancyChange: data.occupancy?.comparison?.change_percent || 0,
    revenueChart: {
      daily: data.revenue?.daily_breakdown || [],
      total: data.revenue?.total || 0,
      change: data.revenue?.comparison?.change_percent || 0,
    },
    occupancyHeatmap: {
      hourly: data.occupancy?.hourly_breakdown || [],
      courts: data.occupancy?.by_court?.map((court: any) => ({
        id: court.court,
        name: court.court_name || court.court,
        occupancy: court.occupancy_rate,
      })) || [],
    },
  };
}

// Fetch additional data that's missing from analytics endpoint
async function fetchSupplementaryData(token: string, clubId: string): Promise<Partial<DashboardMetrics>> {
  try {
    const [clientsResponse, reservationsResponse] = await Promise.all([
      fetchFromDjango(`/clients/?club=${clubId}&limit=5&order_by=-total_spent`, token),
      fetchFromDjango(`/reservations/upcoming/?club=${clubId}&limit=10`, token),
    ]);

    return {
      topClients: clientsResponse.results?.slice(0, 5).map((client: any) => ({
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        totalSpent: client.total_spent || 0,
        reservations: client.reservation_count || 0,
      })) || [],
      upcomingEvents: reservationsResponse.results?.map((reservation: any) => ({
        id: reservation.id,
        type: 'reservation' as const,
        title: `Court ${reservation.court.name}`,
        time: reservation.start_time,
        participants: reservation.players?.length || 2,
      })) || [],
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
          }
    return {
      topClients: [],
      upcomingEvents: [],
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check feature flag
    if (!BFF_FEATURES.dashboard) {
      return NextResponse.json(
        { error: 'Dashboard BFF not enabled', useDirectCall: true },
        { status: 501 }
      );
    }

    // 1. Simple auth check (placeholder - integrate with your auth system)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required - Bearer token missing' },
        { status: 401 }
      );
    }

    // 2. Get user clubs (NO hardcoding por email)
    const clubId = await getUserCurrentClub(token);
    
    if (!clubId) {
      return NextResponse.json(
        { error: 'No active club found for user' },
        { status: 403 }
      );
    }

    // 3. Check cache first
    const cacheKey = getCacheKey('user-id', clubId); // Simplified cache key
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=300', // 5 minutes
        },
      });
    }

    // 4. Parallel fetch de Django APIs necesarias
    const [analyticsData, supplementaryData] = await Promise.allSettled([
      fetchFromDjango(`/bi/analytics/club/?club=${clubId}`, token, {
        method: 'POST',
        body: JSON.stringify({
          period: 'month',
          include_revenue: true,
          include_occupancy: true,
          include_customers: true,
          compare_previous: true,
        }),
      }),
      fetchSupplementaryData(token, clubId),
    ]);

    // 5. Transform data para dashboard interface
    let dashboardMetrics: DashboardMetrics = {
      monthlyRevenue: 0,
      revenueChange: 0,
      todayReservations: 0,
      reservationsChange: 0,
      activeClients: 0,
      clientsChange: 0,
      occupancyRate: 0,
      occupancyChange: 0,
      revenueChart: {
        daily: [],
        total: 0,
        change: 0,
      },
      occupancyHeatmap: {
        hourly: [],
        courts: [],
      },
      topClients: [],
      upcomingEvents: [],
    };

    // Merge analytics data if successful
    if (analyticsData.status === 'fulfilled') {
      const transformedAnalytics = transformAnalyticsData(analyticsData.value);
      dashboardMetrics = { ...dashboardMetrics, ...transformedAnalytics };
    } else {
      if (process.env.NODE_ENV === 'development') {
              }
    }

    // Merge supplementary data if successful
    if (supplementaryData.status === 'fulfilled') {
      dashboardMetrics = { ...dashboardMetrics, ...supplementaryData.value };
    } else {
      if (process.env.NODE_ENV === 'development') {
              }
    }

    // 6. Cache for 5 minutes
    setCache(cacheKey, dashboardMetrics);

    // 7. Return DashboardMetrics optimizado
    return NextResponse.json(dashboardMetrics, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300', // 5 minutes
      },
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
          }
    
    // Fallback graceful - return empty metrics structure
    const fallbackMetrics: DashboardMetrics = {
      monthlyRevenue: 0,
      revenueChange: 0,
      todayReservations: 0,
      reservationsChange: 0,
      activeClients: 0,
      clientsChange: 0,
      occupancyRate: 0,
      occupancyChange: 0,
      revenueChart: {
        daily: [],
        total: 0,
        change: 0,
      },
      occupancyHeatmap: {
        hourly: [],
        courts: [],
      },
      topClients: [],
      upcomingEvents: [],
    };

    return NextResponse.json(fallbackMetrics, {
      status: 200, // Return 200 with empty data instead of error
      headers: {
        'X-Fallback': 'true',
        'Cache-Control': 'no-cache',
      },
    });
  }
}