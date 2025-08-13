'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useTournamentDetails } from '@/lib/api/hooks/useTournaments';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const TournamentBracket = dynamic(() => import('@/components/tournaments/tournament-bracket'), {
  loading: () => <div>Loading...</div>,
  ssr: false
})
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Clock,
  ChevronLeft,
  Share2,
  Download,
  Edit,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
;
import TournamentMatches from '@/components/tournaments/tournament-matches';
import TournamentStandings from '@/components/tournaments/tournament-standings';
import TournamentParticipants from '@/components/tournaments/tournament-participants';

export default function TournamentDetailPage() {
  const params = useParams();
  const tournamentId = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');

  const {
    tournament,
    bracket,
    groups,
    standings,
    participants,
    matches,
    progress,
    isLoading,
    error,
    updateMatch,
  } = useTournamentDetails(tournamentId);

  if (isLoading || !tournament) {
    return <LoadingState message="Loading tournament details..." fullScreen={false} />;
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={() => window.location.reload()} />
    );
  }

  const statusConfig = {
    upcoming: { color: 'blue', label: 'Upcoming' },
    registration_open: { color: 'green', label: 'Registration Open' },
    registration_closed: { color: 'yellow', label: 'Registration Closed' },
    in_progress: { color: 'purple', label: 'In Progress' },
    completed: { color: 'gray', label: 'Completed' },
    cancelled: { color: 'red', label: 'Cancelled' },
  };

  const formatConfig = {
    elimination: { icon: '🏆', label: 'Elimination' },
    'round-robin': { icon: '🔄', label: 'Round Robin' },
    groups: { icon: '👥', label: 'Groups' },
    mixed: { icon: '🎯', label: 'Mixed Format' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        {/* Back button */}
        <Link
          href="/tournaments"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to tournaments
        </Link>

        {/* Tournament Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-xl shadow-sm">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    {tournament.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={`
                        ${statusConfig[tournament.status].color === 'green' ? 'bg-green-100 text-green-800' : ''}
                        ${statusConfig[tournament.status].color === 'blue' ? 'bg-blue-100 text-blue-800' : ''}
                        ${statusConfig[tournament.status].color === 'yellow' ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${statusConfig[tournament.status].color === 'purple' ? 'bg-purple-100 text-purple-800' : ''}
                        ${statusConfig[tournament.status].color === 'red' ? 'bg-red-100 text-red-800' : ''}
                        ${statusConfig[tournament.status].color === 'gray' ? 'bg-gray-100 text-gray-800' : ''}
                      `}
                    >
                      {statusConfig[tournament.status].label}
                    </Badge>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatConfig[tournament.format].icon}{' '}
                      {formatConfig[tournament.format].label}
                    </span>
                  </div>
                </div>
              </div>

              {tournament.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {tournament.description}
                </p>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Start Date</span>
                  </div>
                  <p className="font-semibold">
                    {format(new Date(tournament.startDate), 'MMM d, yyyy')}
                  </p>
                </div>

                <div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Participants</span>
                  </div>
                  <p className="font-semibold">
                    {tournament.currentParticipants} /{' '}
                    {tournament.maxParticipants}
                  </p>
                </div>

                <div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>Location</span>
                  </div>
                  <p className="font-semibold">{tournament.club.name}</p>
                </div>

                <div>
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>Prize Pool</span>
                  </div>
                  <p className="font-semibold">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: tournament.currency,
                      minimumFractionDigits: 0,
                    }).format(tournament.prizeMoney)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              {tournament.status === 'in_progress' && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>Tournament Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress || ''} className="h-2" />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
              <Button variant="outline">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab || ''} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="standings">Standings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6">
            {/* Participants Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Participants</h2>
              <TournamentParticipants
                participants={participants || []}
                format={tournament.format}
              />
            </div>

            {/* Recent Matches */}
            {matches && matches.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Matches</h2>
                <TournamentMatches
                  matches={matches.slice(0, 5)}
                  onUpdateMatch={updateMatch}
                  compact
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bracket" className="mt-6">
          {bracket ? (
            <TournamentBracket bracket={bracket} onMatchUpdate={updateMatch} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Bracket will be generated once registration closes
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <TournamentMatches
            matches={matches || []}
            onUpdateMatch={updateMatch}
          />
        </TabsContent>

        <TabsContent value="standings" className="mt-6">
          {standings ? (
            <TournamentStandings standings={standings} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Standings will be available once matches begin
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
