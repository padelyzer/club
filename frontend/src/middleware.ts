import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// List of public routes that don&apos;t require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/',
  '/test-modules',
];

// List of auth routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = ['/login', '/register', '/forgot-password'];

// ROOT admin routes that require superuser access
const ROOT_ROUTES = ['/root'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const locale = pathname.split('/')[1] || 'en';
  
  // Extract potential club slug from path
  const pathSegments = pathname.split('/');
  const potentialClubSlug = pathSegments[2]; // After locale
  const isClubRoute = pathSegments.length > 2 && 
    !PUBLIC_ROUTES.includes(`/${potentialClubSlug}`) && 
    !AUTH_ROUTES.includes(`/${potentialClubSlug}`) &&
    !ROOT_ROUTES.includes(`/${potentialClubSlug}`) &&
    potentialClubSlug !== 'dashboard' &&
    potentialClubSlug !== 'profile' &&
    potentialClubSlug !== 'analytics' &&
    potentialClubSlug !== 'system-config' &&
    potentialClubSlug !== 'clubs';

  // Check if it&apos;s a public route
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === `/${locale}${route}` || pathname === route
  );

  // Check if it&apos;s an auth route
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === `/${locale}${route}` || pathname === route
  );
  
  // Check if it&apos;s a ROOT route
  const isRootRoute = ROOT_ROUTES.some(
    (route) => pathname.includes(`/${locale}${route}`)
  );

  // Get the authentication token from cookies
  const accessToken = request.cookies.get('access_token')?.value;
  const isAuthenticated = !!accessToken;

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthRoute) {
    // Check if user is superadmin from JWT token
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.is_superuser || payload.is_staff) {
          return NextResponse.redirect(new URL(`/${locale}/root`, request.url));
        }
      }
    } catch {
      // Continue with default flow if token parsing fails
    }
    
    // Get preferred club from cookie or use default
    const preferredClub = request.cookies.get('preferred_club')?.value || 'api-test-padel-club';
    return NextResponse.redirect(new URL(`/${locale}/${preferredClub}`, request.url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicRoute) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For authenticated requests, validate token expiry and permissions
  if (isAuthenticated && !isPublicRoute) {
    try {
      // Decode JWT token to check expiry (without verification for performance)
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expiryTime = payload.exp * 1000; // Convert to milliseconds

        if (Date.now() > expiryTime) {
          // Token expired, redirect to login
          const response = NextResponse.redirect(
            new URL(`/${locale}/login`, request.url)
          );
          response.cookies.delete('access_token');
          response.cookies.delete('refresh_token');
          return response;
        }
        
        // Check ROOT route access
        if (isRootRoute && !payload.is_superuser && !payload.is_staff) {
          return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
        }
        
        // For club routes, we'll validate on the page level since we need to check specific club access
      }
    } catch (error) {
      // Invalid token, redirect to login
      const response = NextResponse.redirect(
        new URL(`/${locale}/login`, request.url)
      );
      response.cookies.delete('access_token');
      response.cookies.delete('refresh_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - test pages
     * 
     * Explicitly include locale patterns
     */
    '/(es|en|fr|de|pt)/:path*',
    '/',
  ],
};
