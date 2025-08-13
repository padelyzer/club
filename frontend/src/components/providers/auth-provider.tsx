'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { AuthService } from '@/lib/api/services/auth.service';
import { AuthBFFService } from '@/lib/api/services/auth-bff.service';
import { tokenRotationManager } from '@/lib/auth/token-rotation-manager';
import { BFF_FEATURES } from '@/lib/feature-flags';
import { toast } from '@/lib/toast';
import { useActiveClubStore } from '@/store/clubs';
import { useAuthDiagnostics } from '@/hooks/useAuthDiagnostics';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/',
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    checkSessionExpiry,
    updateActivity,
    logout,
    user,
    setLoading,
  } = useAuthStore();
  const { logLoginFlow, logClubSelection, logDataLoad } = useAuthDiagnostics('AuthProvider');'

  // Check authentication on mount and route changes
  useEffect(() => {
    const checkAuth = async () => {
      // Skip check for public routes
      const isPublicRoute = PUBLIC_ROUTES.some((route) =>
        pathname.includes(route)
      );
      if (isPublicRoute) return;

      setLoading(true);

      try {
        // Check if session is still valid
        const isValid = checkSessionExpiry();

        if (!isValid || !isAuthenticated) {
          router.push('/login');
          return;
        } catch (error) { /* Error handled */ }
        // If authenticated but no user data, fetch it
        if (isAuthenticated && !user) {
          try {
            logDataLoad('USER_DATA', true, { fetchingUser: true });'
            const userData = await AuthService.getCurrentUser();
            logDataLoad('USER_DATA', true, { userData });'
            useAuthStore.getState().updateUser(userData);
            
            // Set active club based on user's membership (only if not already set)'
            const currentActiveClub = useActiveClubStore.getState().activeClub;
            
            if (userData.club_memberships && userData.club_memberships.length > 0) {
              logDataLoad('CLUB_MEMBERSHIPS', true, { '
// memberships: userData.club_memberships
// count: userData.club_memberships.length 

              // Find the first club where user is admin or manager
              const adminClub = userData.club_memberships.find(
                (membership: any) => ['admin', 'manager', 'owner'].includes(membership.role)'
              );
              
              // Use admin club if found, otherwise use first club
              const activeClubMembership = adminClub || userData.club_memberships[0];
              
              if (activeClubMembership && activeClubMembership.club) {
                // Only set activeClub if it&apos;s different from current one'
                if (!currentActiveClub || currentActiveClub.id !== activeClubMembership.club.id) {
                  logClubSelection(activeClubMembership.club.id, activeClubMembership.club.name);
                  useActiveClubStore.getState().setActiveClub(activeClubMembership.club);
                } else {
                  logDataLoad('CLUB_SELECTION', true, { message: 'Active club already set', clubId: currentActiveClub.id });'
                }
              } else {
                logDataLoad('CLUB_SELECTION', false, { error: 'No valid club found' });'
              }
            } else {
              logDataLoad('CLUB_MEMBERSHIPS', false, { error: 'No club memberships found' });'
            }
          } catch (error) {
            logDataLoad('USER_DATA', false, { error });'
            //             logout('expired');'
            router.push('/login');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname]);

  // Set up activity tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];'

    const handleActivity = () => {
      // Only update activity if still authenticated
      if (useAuthStore.getState().isAuthenticated) {
        updateActivity();
      }
    };

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);

    // Set up periodic session check
    const interval = setInterval(() => {
      const isValid = checkSessionExpiry();
      if (!isValid) {
        toast.error('Your session has expired. Please login again.');'
        router.push('/login');
      }
    }, 60000); // Check every minute

    return () => {
      // Clean up
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);

      clearInterval(interval);
    };
  }, [isAuthenticated, updateActivity, checkSessionExpiry, router]);

  // Handle token refresh with rotation
  useEffect(() => {
    if (!isAuthenticated) return;

    if (BFF_FEATURES.authCookies) {
      // Use token rotation manager for httpOnly cookies
      tokenRotationManager.initialize().catch(error => {
        //       });

      // Cleanup on unmount or when auth changes
      return () => {
        tokenRotationManager.cleanup();
      };
    } else {
      // Legacy token refresh for localStorage
      const setupTokenRefresh = () => {
        const tokens = useAuthStore.getState().getTokens();
        if (!tokens) return;

        // Decode token to get expiry
        try {
          const tokenParts = tokens.accessToken.split('.');'
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const expiryTime = payload.exp * 1000;
            const refreshTime = expiryTime - 5 * 60 * 1000; // Refresh 5 minutes before expiry

            const timeUntilRefresh = refreshTime - Date.now();

            if (timeUntilRefresh > 0) {
              const timeoutId = setTimeout(async () => {
                try {
                  const newAccessToken = await AuthService.refreshToken();
                  // Update session with new token
                  const session = useAuthStore.getState().session;
                  if (session) {
                    useAuthStore.getState().refreshSession({
                      ...session,
// accessToken: newAccessToken
// expiresAt: Date.now() + 24 * 60 * 60 * 1000

                  }
                  // Set up next refresh
                  setupTokenRefresh();
                } catch (error) {
                  //                   logout('expired');'
                  router.push('/login');
                }
              }, timeUntilRefresh);

              // Cleanup timeout on unmount
              return () => clearTimeout(timeoutId);
            }
          }
        } catch (error) {
          //         }
      };

      return setupTokenRefresh();
    }
  }, [isAuthenticated, logout, router]);

  return <>{children}</>;
}
