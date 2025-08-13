import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = await fetch('http://127.0.0.1:8000/api/v1/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:3000',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json({
        error: 'Login failed',
        status: response.status,
        data
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Network error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}