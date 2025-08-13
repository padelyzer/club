'use client';

import { useAuthStore } from '@/store/auth';
import { useActiveClubStore, useClubsDataStore, useClubsStore } from '@/store/clubs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DebugPage() {
  const router = useRouter();
  const authState = useAuthStore();
  const activeClubState = useActiveClubStore();
  const clubsDataState = useClubsDataStore();
  const clubsStore = useClubsStore();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">System Debug Information</h1>
        <Button onClick={() => router.push('/es/clubs')}>
          Go to Clubs
        </Button>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🔐 Authentication State</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify({
            isAuthenticated: authState.isAuthenticated,
            userId: authState.user?.id,
            userEmail: authState.user?.email,
            isSuperuser: authState.user?.is_superuser,
            isStaff: authState.user?.is_staff,
            clubMemberships: authState.user?.club_memberships?.map(m => ({
              clubId: m.club?.id,
              clubName: m.club?.name,
              role: m.role,
              isActive: m.is_active
            })),
            hasSession: !!authState.session,
            isLoading: authState.isLoading,
          }, null, 2)}
        </pre>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🏢 Active Club State</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify({
            activeClubId: activeClubState.activeClubId,
            activeClubName: activeClubState.activeClub?.name,
            activeClubSlug: activeClubState.activeClub?.slug,
            hasStats: !!activeClubState.activeClubStats,
          }, null, 2)}
        </pre>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">📊 Clubs Data State</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
          {JSON.stringify({
            totalClubs: clubsDataState.totalClubs,
            loadedClubs: clubsDataState.clubs.map(c => ({
              id: c.id,
              name: c.name,
              slug: c.slug
            })),
            filters: clubsDataState.filters,
            currentPage: clubsDataState.currentPage,
            pageSize: clubsDataState.pageSize,
          }, null, 2)}
        </pre>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🔗 Club Relationships</h2>
        <div className="space-y-2">
          {authState.user?.club_memberships?.map((membership: any) => (
            <div 
              key={membership.id} 
              className={`p-3 rounded ${
                membership.club?.id === activeClubState.activeClubId 
                  ? 'bg-blue-100 border-2 border-blue-500' 
                  : 'bg-gray-50'
              }`}
            >
              <div className="font-semibold">
                {membership.club?.name} {membership.club?.id === activeClubState.activeClubId && '(ACTIVE)'}
              </div>
              <div className="text-sm text-gray-600">
                Role: {membership.role} | ID: {membership.club?.id}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">🔧 Actions</h2>
        <div className="space-x-4">
          <Button 
            onClick={() => {
              localStorage.clear();
              window.location.href = '/es/login';
            }}
          >
            Clear Storage & Logout
          </Button>
          <Button 
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reload Page
          </Button>
        </div>
      </Card>
    </div>
  );
}