import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * GET /api/auth/profile - Get current user profile
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/auth/profile/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Clear invalid cookies
        cookieStore.set('access_token', '', { maxAge: 0 });
        cookieStore.set('refresh_token', '', { maxAge: 0 });
      }
      return NextResponse.json(
        await response.json(),
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());

  } catch (error) {
    if (process.env.NODE_ENV === 'development')     return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/profile - Update user profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const accessToken = cookieStore.get('access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/auth/profile/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        await response.json(),
        { status: response.status }
      );
    }

    return NextResponse.json(await response.json());

  } catch (error) {
    if (process.env.NODE_ENV === 'development')     return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}