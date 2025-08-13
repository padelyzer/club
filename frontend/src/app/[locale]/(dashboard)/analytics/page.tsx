'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth';
import { useActiveClub, useClubs } from '@/store/clubs';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { LoadingState } from '@/components/ui/states/loading-state';
import { BIDashboard } from '@/components/analytics/bi-dashboard';

/**
 * BI Analytics Dashboard
 * 
 * Comprehensive analytics dashboard that connects to the new backend BI APIs:
 * - /api/v1/bi/kpis/ - Key Performance Indicators
 * - /api/v1/bi/revenue/ - Revenue analytics
 * - /api/v1/bi/usage/ - Usage and occupancy analytics
 * - /api/v1/bi/growth/ - Growth metrics
 */
export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { user, role } = useAuthStore();
  const { activeClub } = useActiveClub();
  const { clubs, isLoading: clubsLoading } = useClubs();
  const { 
    filters, 
    biKpis, 
    biRevenue, 
    biUsage, 
    biGrowth, 
    biFetching, 
    error,
    loadBIDashboard 
  } = useAnalyticsStore();

  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Get context-specific clubs filter
  const getClubsFilter = () => {
    if (role === 'ROOT') return undefined; // Root sees all
    if (activeClub) return [activeClub.id];
    if (clubs?.length > 0) return [clubs[0].id];
    return undefined;
  };

  // Load initial data
  useEffect(() => {
    if (user && !clubsLoading) {
      const clubsFilter = getClubsFilter();
      loadBIDashboard(dateRange, clubsFilter);
    }
  }, [user, clubsLoading, activeClub, clubs, role]);

  const handleRefresh = () => {
    const clubsFilter = getClubsFilter();
    loadBIDashboard(dateRange, clubsFilter);
  };

  if (!user || clubsLoading) {
    return <LoadingState message={t('analytics.loading')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BIDashboard
          kpis={biKpis}
          revenue={biRevenue}
          usage={biUsage}
          growth={biGrowth}
          isLoading={biFetching}
          error={error}
          onRefresh={handleRefresh}
          userRole={role}
          activeClub={activeClub}
        />
      </div>
    </div>
  );
}
