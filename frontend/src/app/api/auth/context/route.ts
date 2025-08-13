import { NextRequest, NextResponse } from 'next/server';
import { JWTValidator } from '@/lib/security/jwt-validator';
import { BFF_FEATURES } from '@/lib/feature-flags';

// Django backend base URL
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

interface AuthContextResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
  };
  organization: {
    id: string;
    trade_name: string;
    business_name: string;
    type: string;
    state: string;
    subscription: {
      plan: string;
      features: string[];
      expires_at: string;
    };
  } | null;
  clubs: Array<{
    id: string;
    name: string;
    role: string;
    permissions: string[];
  }>;
  permissions: {
    global: string[];
    by_club: Record<string, string[]>;
  };
  session: {
    expires_at: string;
    last_activity: string;
    multi_factor_enabled: boolean;
  };
}

interface DjangoUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  current_organization?: any;
  organization_memberships?: Array<{
    organization: any;
    role: string;
  }>;
}

interface DjangoOrganization {
  id: string;
  trade_name: string;
  business_name: string;
  type: string;
  state: string;
  subscription_plan?: string;
  subscription_features?: string[];
  subscription_expires_at?: string;
}

interface DjangoClub {
  id: string;
  name: string;
  role?: string;
  permissions?: string[];
}

interface DjangoPermissions {
  global_permissions: string[];
  club_permissions: Record<string, string[]>;
}

// Cache store for context data
const contextCache = new Map<string, { data: AuthContextResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Validates JWT token from cookies first, then headers as fallback
 */
function validateToken(request: NextRequest): string | null {
  // Try to get token from httpOnly cookie first
  const cookieToken = request.cookies.get('access_token')?.value;
  if (cookieToken) {
    if (JWTValidator.isValidTokenFormat(cookieToken) && !JWTValidator.isTokenExpired(cookieToken)) {
      return cookieToken;
    }
  }

  // Fallback to header-based token for backward compatibility
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  
  if (!JWTValidator.isValidTokenFormat(token)) {
    return null;
  }

  if (JWTValidator.isTokenExpired(token)) {
    return null;
  }

  return token;
}

/**
 * Makes authenticated request to Django backend
 */
async function makeDjangoRequest<T>(endpoint: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      throw new Error(`Django API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (process.env.NODE_ENV === 'development')     return null;
  }
}

/**
 * GET /api/auth/context
 * Returns unified authentication context for multi-tenant applications
 */
export async function GET(request: NextRequest) {
  // Check if BFF auth feature is enabled
  if (!BFF_FEATURES.auth) {
    return NextResponse.json(
      { error: 'BFF auth context is not enabled' },
      { status: 503 }
    );
  }

  try {
    // 1. Validate JWT token from headers
    const token = validateToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Invalid or missing authentication token' },
        { status: 401 }
      );
    }

    // Check cache first
    const cacheKey = token;
    const cached = contextCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      if (process.env.NODE_ENV === 'development')       return NextResponse.json(cached.data);
    }

    // 
    // 2. Fetch data from Django APIs in parallel
    const [userResponse, organizationResponse, clubsResponse, permissionsResponse] = await Promise.allSettled([
      makeDjangoRequest<DjangoUser>('/auth/profile/', token),
      makeDjangoRequest<DjangoOrganization>('/root/organization/', token),
      makeDjangoRequest<DjangoClub[]>('/clubs/user-clubs/', token),
      makeDjangoRequest<DjangoPermissions>('/auth/permissions/', token),
    ]);

    // Handle critical user data failure
    if (userResponse.status === 'rejected' || !userResponse.value) {
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 401 }
      );
    }

    const user = userResponse.value;
    const organization = organizationResponse.status === 'fulfilled' ? organizationResponse.value : null;
    const clubs = clubsResponse.status === 'fulfilled' ? clubsResponse.value || [] : [];
    const permissions = permissionsResponse.status === 'fulfilled' ? permissionsResponse.value : null;

    // Handle organization response (might be array or single object)
    const orgData = organization ? (Array.isArray(organization) ? organization[0] : organization) : null;
    
    // Handle clubs response (might be wrapped in an object)
    const clubsList = clubs ? (clubs.clubs || clubs) : [];

    // 3. Build unified response
    const authContext: AuthContextResponse = {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
      },
      organization: orgData ? {
        id: orgData.id,
        trade_name: orgData.trade_name,
        business_name: orgData.business_name,
        type: orgData.type,
        state: orgData.state,
        subscription: {
          plan: orgData.subscription?.plan || orgData.subscription_plan || 'free',
          features: orgData.subscription?.features || orgData.subscription_features || [],
          expires_at: orgData.subscription?.expires_at || orgData.subscription_expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      } : null,
      clubs: clubsList.map((club: any) => ({
        id: club.id,
        name: club.name,
        role: club.role || 'member',
        permissions: club.permissions || [],
      })),
      permissions: {
        global: permissions?.global_permissions || [],
        by_club: permissions?.club_permissions || {},
      },
      session: {
        expires_at: (() => {
          const payload = JWTValidator.decodeToken(token);
          const exp = payload?.exp || Math.floor(Date.now() / 1000) + 3600; // 1 hour fallback
          return new Date(exp * 1000).toISOString();
        })(),
        last_activity: new Date().toISOString(),
        multi_factor_enabled: false, // TODO: Add MFA support
      },
    };

    // 4. Cache the response
    contextCache.set(cacheKey, {
      data: authContext,
      timestamp: Date.now(),
    });

    // Clean old cache entries (simple cleanup)
    if (contextCache.size > 100) {
      const oldestKey = contextCache.keys().next().value;
      if (oldestKey !== undefined) {
        contextCache.delete(oldestKey);
      }
    }

    if (process.env.NODE_ENV === 'development') 
    return NextResponse.json(authContext);

  } catch (error) {
    if (process.env.NODE_ENV === 'development') 
    if (error instanceof Error) {
      if (error.message === 'UNAUTHORIZED') {
        return NextResponse.json(
          { error: 'Token expired or blacklisted' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error fetching auth context' },
      { status: 500 }
    );
  }
}

/**
 * Handle token refresh scenarios
 */
export async function POST(request: NextRequest) {
  if (!BFF_FEATURES.auth) {
    return NextResponse.json(
      { error: 'BFF auth context is not enabled' },
      { status: 503 }
    );
  }

  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Make refresh request to Django
    const response = await fetch(`${BACKEND_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refresh_token }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 401 }
      );
    }

    const { access } = await response.json();

    // Clear cache for old token and return new token
    contextCache.clear();

    return NextResponse.json({ access_token: access });

  } catch (error) {
    if (process.env.NODE_ENV === 'development')     return NextResponse.json(
      { error: 'Token refresh failed' },
      { status: 500 }
    );
  }
}