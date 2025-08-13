'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLeague } from '@/lib/api/hooks/useLeagues';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeagueStandings } from '@/components/leagues/league-standings';
import { LeagueMatches } from '@/components/leagues/league-matches';
import { LeagueRegistrations } from '@/components/leagues/league-registrations';
import { LeagueStats } from '@/components/leagues/league-stats';
import {
  ArrowLeft,
  Edit,
  Calendar,
  MapPin,
  Users,
  Trophy,
  Settings,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

export default function LeagueDetailPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const leagueId = Number(params.id);
  const [activeTab, setActiveTab] = useState('standings');

  const { data: league, isLoading, error } = useLeague(leagueId);

  const canManageLeague =
    user?.is_superuser ||
    user?.is_staff ||
    (user?.club_memberships?.some(membership => 
      membership.role === 'owner' && membership.club.id === league?.club_id
    ));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      case 'registration_open':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'active':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error || !league) {
    return <ErrorState message="Failed to load league details" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/leagues')}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{league.name}</h1>
              <Badge className={cn(getStatusColor(league.status))}>
                {league.status.replace('_', ' ')}
              </Badge>
            </div>
            {league.description && (
              <p className="text-muted-foreground mt-1">{league.description}</p>
            )}
          </div>
        </div>
        {canManageLeague && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              {t('common.settings')}
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </Button>
          </div>
        )}
      </div>

      {/* League Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('leagues.duration')}
                </p>
                <p className="font-medium">
                  {format(new Date(league.start_date), 'MMM d')} -{' '}
                  {format(new Date(league.end_date), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('leagues.location')}
                </p>
                <p className="font-medium">{league.club_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('leagues.participants')}
                </p>
                <p className="font-medium">
                  {league.current_participants} / {league.max_participants}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('leagues.format')}
                </p>
                <p className="font-medium capitalize">
                  {league.type.replace('_', ' ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab || ''}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="standings">{t('leagues.standings')}</TabsTrigger>
          <TabsTrigger value="matches">{t('leagues.matches')}</TabsTrigger>
          <TabsTrigger value="registrations">
            {t('leagues.registrations')}
          </TabsTrigger>
          <TabsTrigger value="statistics">
            {t('leagues.statistics')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-4">
          <LeagueStandings leagueId={leagueId} />
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <LeagueMatches leagueId={leagueId} />
        </TabsContent>

        <TabsContent value="registrations" className="space-y-4">
          <LeagueRegistrations
            leagueId={leagueId}
          />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          <LeagueStats leagueId={leagueId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
