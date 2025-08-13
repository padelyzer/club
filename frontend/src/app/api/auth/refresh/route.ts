import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 24; // 24 hours
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Track used refresh tokens to prevent reuse
const usedTokens = new Set<string>();
const MAX_USED_TOKENS = 10000; // Limit memory usage

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      );
    }

    // Check if token has been used (replay attack prevention)
    if (usedTokens.has(refreshToken)) {
      // Token reuse detected - potential security breach
      cookieStore.set('access_token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
      cookieStore.set('refresh_token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
      
      return NextResponse.json(
        { error: 'Token reuse detected - session terminated for security' },
        { status: 401 }
      );
    }

    // Request new tokens from Django backend with rotation
    const response = await fetch(`${BACKEND_URL}/auth/token/refresh-rotate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) {
      // Try legacy endpoint if rotation endpoint doesn't exist
      const legacyResponse = await fetch(`${BACKEND_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!legacyResponse.ok) {
        // Clear invalid tokens
        cookieStore.set('access_token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
        cookieStore.set('refresh_token', '', { ...COOKIE_OPTIONS, maxAge: 0 });
        
        return NextResponse.json(
          { error: 'Token refresh failed' },
          { status: 401 }
        );
      }

      const { access } = await legacyResponse.json();
      
      // Update only access token (legacy mode - no rotation)
      cookieStore.set('access_token', access, {
        ...COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });

      return NextResponse.json({ 
        message: 'Token refreshed successfully (legacy mode)',
        rotationEnabled: false 
      });
    }

    // Extract new tokens from rotation response
    const data = await response.json();
    const { access, refresh: newRefreshToken } = data;

    // Mark old token as used
    usedTokens.add(refreshToken);
    
    // Cleanup old tokens if set gets too large
    if (usedTokens.size > MAX_USED_TOKENS) {
      const tokensArray = Array.from(usedTokens);
      tokensArray.slice(0, 1000).forEach(token => usedTokens.delete(token));
    }

    // Update both tokens (rotation)
    cookieStore.set('access_token', access, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    
    cookieStore.set('refresh_token', newRefreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return NextResponse.json({ 
      message: 'Tokens refreshed and rotated successfully',
      rotationEnabled: true 
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development')     return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}