'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { useClubsStore } from '@/store/clubs';
import { Card } from '@/components/ui/card';
import { Loader2, Settings, Shield, Building2 } from 'lucide-react';

export default function SystemConfigRedirectPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { activeClub } = useClubsStore();

  useEffect(() => {
    // Wait for auth to be loaded
    if (!user) return;

    // Extract locale from pathname
    const pathSegments = pathname.split('/');
    const locale = pathSegments[1] || 'es';

    // Determine redirect destination based on user role and context
    let redirectPath = '';

    // Check if user is ROOT admin (superuser or staff)
    if (user.is_superuser || user.is_staff) {
      // Check if we're in a ROOT context (path contains /root/)
      const isRootContext = pathname.includes('/root/');
      
      if (isRootContext) {
        // Already in ROOT context, go to ROOT system config
        redirectPath = `/${locale}/root/system-config`;
      } else if (activeClub?.slug) {
        // In club context, go to club settings
        redirectPath = `/${locale}/${activeClub.slug}/settings`;
      } else {
        // Default to ROOT system config for superusers
        redirectPath = `/${locale}/root/system-config`;
      }
    } else if (user.club_memberships && user.club_memberships.length > 0) {
      // Organization admin or club staff
      const membership = user.club_memberships[0];
      
      if (membership && membership.role === 'owner') {
        // Organization admin - could go to either context
        if (activeClub?.slug) {
          redirectPath = `/${locale}/${activeClub.slug}/settings`;
        } else {
          // No active club, default to a club if available
          redirectPath = `/${locale}/root/system-config`;
        }
      } else if (activeClub?.slug) {
        // Club staff - go to club settings
        redirectPath = `/${locale}/${activeClub.slug}/settings`;
      } else {
        // Fallback to dashboard if no active club
        redirectPath = `/${locale}/dashboard`;
      }
    } else {
      // Regular user - redirect to dashboard
      redirectPath = `/${locale}/dashboard`;
    }

    // Perform the redirect
    if (redirectPath && redirectPath !== pathname) {
      router.replace(redirectPath);
    }
  }, [user, activeClub, pathname, router]);

  // Show loading state while determining redirect
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto mt-32">
          <Card className="p-8">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <Settings className="h-12 w-12 text-blue-600" />
                  <Loader2 className="h-6 w-6 text-blue-400 animate-spin absolute -top-1 -right-1" />
                </div>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Redirecting to Configuration
              </h2>
              
              <p className="text-gray-600 mb-6">
                Determining the appropriate configuration page based on your role and context...
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">ROOT System Config</span>
                  </div>
                  <span className="text-xs text-blue-600">For system administrators</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">Club Settings</span>
                  </div>
                  <span className="text-xs text-green-600">For club management</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
