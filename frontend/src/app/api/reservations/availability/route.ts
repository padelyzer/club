import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api/config';

// Feature flag para rollout gradual del BFF
const BFF_FEATURES = {
  reservations: process.env.NEXT_PUBLIC_BFF_RESERVATIONS === 'true'
};

// Interface target consolidada para availability
interface AvailabilityResponse {
  date: string;
  club_id: string;
  courts: Array<{
    id: string;
    name: string;
    surface_type: string;
    is_active: boolean;
    slots: Array<{
      start_time: string;
      end_time: string;
      is_available: boolean;
      price: {
        amount: number;
        currency: string;
        includes_tax: boolean;
      };
      promotion?: {
        id: string;
        name: string;
        discount_percent: number;
        original_price: number;
      };
      conflicts: Array<{
        reservation_id: string;
        status: string;
        client_name: string;
      }>;
      blocked_reason?: string;
    }>;
    schedule: {
      open_time: string;
      close_time: string;
      is_open_today: boolean;
    };
  }>;
  summary: {
    total_slots: number;
    available_slots: number;
    occupancy_rate: number;
    peak_hours: string[];
  };
}

// Cache en memoria (Redis en producción)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 1 * 60 * 1000; // 1 minuto (availability cambia frecuentemente)

function getCacheKey(clubId: string, date: string, courtIds?: string[]): string {
  const courtsKey = courtIds ? courtIds.sort().join(',') : 'all';
  return `availability:${clubId}:${date}:${courtsKey}`;
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

// Helper para hacer requests autenticados a Django
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

// Simple auth token extraction from headers
function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Validar acceso multi-tenant al club
async function validateClubAccess(token: string, clubId: string): Promise<boolean> {
  try {
    const profile = await fetchFromDjango('/auth/profile/', token);
    
    // Verificar que el usuario tiene acceso al club
    const hasAccess = profile.club_memberships?.some((membership: any) => 
      membership.club?.id === clubId && 
      membership.is_active && 
      ['owner', 'admin', 'staff'].includes(membership.role)
    );
    
    return hasAccess || false;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
          }
    return false;
  }
}

// Generar time slots basados en horarios del club
function generateTimeSlots(openTime: string, closeTime: string, slotDuration: number = 90): Array<{ start_time: string; end_time: string }> {
  const slots: Array<{ start_time: string; end_time: string }> = [];
  
  const [openHour = 0, openMin = 0] = openTime.split(':').map(Number);
  const [closeHour = 0, closeMin = 0] = closeTime.split(':').map(Number);
  
  let currentTime = openHour * 60 + openMin; // en minutos
  const endTime = closeHour * 60 + closeMin;
  
  while (currentTime + slotDuration <= endTime) {
    const startHour = Math.floor(currentTime / 60);
    const startMin = currentTime % 60;
    const endSlotTime = currentTime + slotDuration;
    const endHour = Math.floor(endSlotTime / 60);
    const endSlotMin = endSlotTime % 60;
    
    slots.push({
      start_time: `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`,
      end_time: `${endHour.toString().padStart(2, '0')}:${endSlotMin.toString().padStart(2, '0')}`
    });
    
    currentTime += slotDuration;
  }
  
  return slots;
}

// Calcular pricing con promociones
function calculateSlotPricing(
  basePrice: number, 
  startTime: string, 
  pricingRules: any[], 
  promotions: any[]
): { price: { amount: number; currency: string; includes_tax: boolean }; promotion?: any } {
  let finalPrice = basePrice;
  let appliedPromotion = null;
  
  // Aplicar reglas de pricing por hora
  const timeBasedRule = pricingRules.find(rule => {
    const ruleStart = rule.start_time;
    const ruleEnd = rule.end_time;
    return startTime >= ruleStart && startTime < ruleEnd;
  });
  
  if (timeBasedRule) {
    finalPrice = timeBasedRule.price;
  }
  
  // Aplicar promociones activas
  const activePromotion = promotions.find(promo => 
    promo.is_active && 
    promo.applies_to_time && 
    startTime >= promo.start_time && 
    startTime <= promo.end_time
  );
  
  if (activePromotion) {
    const originalPrice = finalPrice;
    finalPrice = finalPrice * (1 - activePromotion.discount_percent / 100);
    
    appliedPromotion = {
      id: activePromotion.id,
      name: activePromotion.name,
      discount_percent: activePromotion.discount_percent,
      original_price: originalPrice
    };
  }
  
  return {
    price: {
      amount: Math.round(finalPrice * 100) / 100, // Round to 2 decimals
      currency: 'ARS', // Default currency, should come from club settings
      includes_tax: true
    },
    promotion: appliedPromotion
  };
}

// Detectar conflictos con reservas existentes
function detectConflicts(
  slotStart: string, 
  slotEnd: string, 
  courtId: string, 
  date: string, 
  reservations: any[]
): Array<{ reservation_id: string; status: string; client_name: string }> {
  return reservations
    .filter(reservation => 
      reservation.court === courtId && 
      reservation.date === date &&
      reservation.status !== 'cancelled' &&
      !(reservation.end_time <= slotStart || reservation.start_time >= slotEnd)
    )
    .map(reservation => ({
      reservation_id: reservation.id,
      status: reservation.status,
      client_name: `${reservation.player_name || reservation.created_by_name}`
    }));
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar feature flag
    if (!BFF_FEATURES.reservations) {
      return NextResponse.json(
        { error: 'Reservations BFF not enabled', useDirectCall: true },
        { status: 501 }
      );
    }

    // 2. Parsear request body
    const { 
      club_id, 
      date, 
      court_ids, 
      include_pricing = true, 
      include_conflicts = true,
      time_range = { start: "08:00", end: "22:00" }
    } = await request.json();

    // Validaciones básicas
    if (!club_id || !date) {
      return NextResponse.json(
        { error: 'club_id and date are required' },
        { status: 400 }
      );
    }

    // 3. Autenticación y autorización
    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required - Bearer token missing' },
        { status: 401 }
      );
    }

    // 4. Validar acceso multi-tenant al club
    const hasClubAccess = await validateClubAccess(token, club_id);
    if (!hasClubAccess) {
      return NextResponse.json(
        { error: 'Access denied to club' },
        { status: 403 }
      );
    }

    // 5. Verificar cache
    const cacheKey = getCacheKey(club_id, date, court_ids);
    const cachedData = getFromCache(cacheKey);
    
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=60', // 1 minuto
        },
      });
    }

    // 6. Llamadas paralelas a Django APIs
    const courtParams = court_ids ? `&court_ids=${court_ids.join(',')}` : '';
    
    const [
      courtsResponse,
      backendAvailabilityResponse,
      reservationsResponse,
      pricingResponse,
      promotionsResponse,
      blockedSlotsResponse
    ] = await Promise.allSettled([
      // Courts info + schedules
      fetchFromDjango(`/clubs/${club_id}/courts/?is_active=true${courtParams}`, token),
      
      // Availability base
      fetchFromDjango('/reservations/reservations/check_availability/', token, {
        method: 'POST',
        body: JSON.stringify({ club: club_id, date, court: court_ids?.[0] })
      }),
      
      // Existing reservations for conflicts
      fetchFromDjango(`/reservations/reservations/?club=${club_id}&date=${date}&status=confirmed,pending`, token),
      
      // Pricing rules (opcional)
      ...(include_pricing ? [
        fetchFromDjango(`/finance/pricing/${club_id}?date=${date}`, token)
      ] : [Promise.resolve({ status: 'fulfilled', value: { pricing_rules: [] } })]),
      
      // Active promotions (opcional)
      ...(include_pricing ? [
        fetchFromDjango(`/finance/promotions/${club_id}?active=true&date=${date}`, token)
      ] : [Promise.resolve({ status: 'fulfilled', value: { promotions: [] } })]),
      
      // Blocked slots
      fetchFromDjango(`/reservations/blocked-slots/?club=${club_id}&date=${date}`, token)
    ]);

    // 7. Procesar resultados con fallbacks
    const courts = courtsResponse.status === 'fulfilled' ? courtsResponse.value.results || [] : [];
    const availability = backendAvailabilityResponse.status === 'fulfilled' ? backendAvailabilityResponse.value.availability || [] : [];
    const reservations = reservationsResponse.status === 'fulfilled' ? reservationsResponse.value.results || [] : [];
    const pricingRules = pricingResponse.status === 'fulfilled' ? pricingResponse.value.pricing_rules || [] : [];
    const promotions = promotionsResponse.status === 'fulfilled' ? promotionsResponse.value.promotions || [] : [];
    const blockedSlots = blockedSlotsResponse.status === 'fulfilled' ? blockedSlotsResponse.value.results || [] : [];

    // 8. Transformar a interface unificada
    const transformedCourts = courts.map((court: any) => {
      // Generar slots basados en horarios
      const schedule = {
        open_time: time_range.start,
        close_time: time_range.end,
        is_open_today: true // Simplificado, debería venir de club schedule
      };
      
      const timeSlots = generateTimeSlots(schedule.open_time, schedule.close_time, 90);
      
      const slots = timeSlots.map(slot => {
        // Detectar conflictos
        const conflicts = include_conflicts ? 
          detectConflicts(slot.start_time, slot.end_time, court.id, date, reservations) : 
          [];
        
        // Verificar si está bloqueado
        const isBlocked = blockedSlots.some((blocked: any) => 
          blocked.court === court.id &&
          blocked.start_datetime <= `${date} ${slot.start_time}` &&
          blocked.end_datetime >= `${date} ${slot.end_time}`
        );
        
        const blockedSlot = isBlocked ? blockedSlots.find((blocked: any) => 
          blocked.court === court.id &&
          blocked.start_datetime <= `${date} ${slot.start_time}` &&
          blocked.end_datetime >= `${date} ${slot.end_time}`
        ) : null;
        
        // Calcular pricing
        const pricing = include_pricing ? 
          calculateSlotPricing(
            parseFloat(court.price_per_hour || '0'), 
            slot.start_time, 
            pricingRules, 
            promotions
          ) : 
          {
            price: {
              amount: parseFloat(court.price_per_hour || '0'),
              currency: 'ARS',
              includes_tax: true
            }
          };
        
        return {
          start_time: slot.start_time,
          end_time: slot.end_time,
          is_available: !isBlocked && conflicts.length === 0,
          ...pricing,
          conflicts,
          blocked_reason: isBlocked ? (blockedSlot?.reason || 'Maintenance') : undefined
        };
      });
      
      return {
        id: court.id.toString(),
        name: court.name,
        surface_type: court.surface_type,
        is_active: court.is_active,
        slots,
        schedule
      };
    });

    // 9. Calcular summary
    const totalSlots = transformedCourts.reduce((sum: any, court: Court) => sum + court.slots.length, 0);
    const availableSlots = transformedCourts.reduce(
      (sum: any, court: any) => sum + court.slots.filter(slot => slot.is_available).length, 
      0
    );
    const occupancyRate = totalSlots > 0 ? (totalSlots - availableSlots) / totalSlots : 0;
    
    // Peak hours analysis (horas con mayor ocupación)
    const hourOccupancy: Record<string, number> = {};
    transformedCourts.forEach(court => {
      court.slots.forEach(slot => {
        const hour = slot.start_time.split(':')[0] + ':00';
        if (!hourOccupancy[hour]) hourOccupancy[hour] = 0;
        if (!slot.is_available) hourOccupancy[hour]++;
      });
    });
    
    const peakHours = Object.entries(hourOccupancy)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);

    // 10. Construir response final
    const availabilityResponse: AvailabilityResponse = {
      date,
      club_id,
      courts: transformedCourts,
      summary: {
        total_slots: totalSlots,
        available_slots: availableSlots,
        occupancy_rate: Math.round(occupancyRate * 100) / 100,
        peak_hours: peakHours
      }
    };

    // 11. Cache por 1 minuto
    setCache(cacheKey, availabilityResponse);

    // 12. Return optimized response
    return NextResponse.json(availabilityResponse, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=60', // 1 minuto
        'X-Courts-Count': transformedCourts.length.toString(),
        'X-Total-Slots': totalSlots.toString(),
        'X-Available-Slots': availableSlots.toString()
      },
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
          }
    
    // Fallback graceful - return estructura vacía para que frontend no falle
    const fallbackResponse: AvailabilityResponse = {
      date: (await request.json()).date || new Date().toISOString().split('T')[0],
      club_id: (await request.json()).club_id || '',
      courts: [],
      summary: {
        total_slots: 0,
        available_slots: 0,
        occupancy_rate: 0,
        peak_hours: []
      }
    };

    return NextResponse.json(fallbackResponse, {
      status: 200, // Return 200 con datos vacíos en lugar de error
      headers: {
        'X-Fallback': 'true',
        'Cache-Control': 'no-cache',
        'X-Error': 'BFF Error - Fallback Response'
      },
    });
  }
}