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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Forward login request to Django backend
    const backendResponse = await fetch(`${BACKEND_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(data, { status: backendResponse.status });
    }

    // Extract tokens from response
    const { access, refresh, user } = data;

    // Set httpOnly cookies with security headers
    const cookieStore = cookies();
    
    cookieStore.set('access_token', access, {
      ...COOKIE_OPTIONS,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    
    cookieStore.set('refresh_token', refresh, {
      ...COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    // Create response with security headers
    const response = NextResponse.json({ user });
    
    // Add security headers for token rotation
    response.headers.set('X-Token-Rotation', 'enabled');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    return response;

  } catch (error) {
    if (process.env.NODE_ENV === 'development')     return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}