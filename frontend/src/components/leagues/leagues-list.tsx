'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  ChevronRight,
  MoreVertical,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLeagues } from '@/lib/api/hooks/useLeagues';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoadingState } from '@/components/ui/states/loading-state';
import { EmptyState } from '@/components/ui/EmptyState';
import { League } from '@/types/league';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface LeaguesListProps {
  searchQuery: string;
  filters: {
    status: string;
    sport: string;
    clubId?: number;
  };
}

export function LeaguesList({ searchQuery, filters }: LeaguesListProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading, error } = useLeagues({
    search: searchQuery,
    status: filters.status !== 'all' ? (filters.status as any) : undefined,
    sport: filters.sport !== 'all' ? filters.sport : undefined,
    club_id: filters.clubId,
    page,
    page_size: pageSize,
  });

  const handleLeagueClick = (league: League) => {
    router.push(`/leagues/${league.id}`);
  };

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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'round_robin':
        return '🔄';
      case 'single_elimination':
        return '🏆';
      case 'double_elimination':
        return '🎯';
      case 'groups':
        return '👥';
      default:
        return '🏅';
    }
  };

  const canManageLeague = (league: League) => {
    return (
      user?.role === 'admin' ||
      (user?.role === 'club_owner' && league.club_id === user?.club_id)
    );
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load leagues. Please try again.
        </p>
      </div>
    );
  }

  if (!data?.results.length) {
    return (
      <EmptyState
        icon={Trophy as any}
        title="No leagues found"
        description={
          searchQuery ||
          Object.values(filters).some((v) => v !== 'all' && v !== undefined)
            ? 'Try adjusting your search or filters'
            : 'Create your first league to get started'
        }
        action={
          user?.role === 'admin' || user?.role === 'club_owner'
            ? {
                label: 'Create League',
                onClick: () => router.push('/leagues/new'),
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {data.results.map((league) => (
          <div
            key={league.id}
            className="group relative overflow-hidden rounded-lg border bg-card hover:shadow-md transition-all duration-200 cursor-pointer"
            onClick={() => handleLeagueClick(league)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{getTypeIcon(league.type)}</span>
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {league.name}
                    </h3>
                    <Badge
                      className={cn('ml-auto', getStatusColor(league.status))}
                    >
                      {league.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  {league.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {league.description}
                    </p>
                  )}
                </div>
                {canManageLeague(league) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/leagues/${league.id}/edit`);
                        }}
                      >
                        Edit League
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/leagues/${league.id}/schedule`);
                        }}
                      >
                        Manage Schedule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/leagues/${league.id}/registrations`);
                        }}
                      >
                        View Registrations
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle delete
                        }}
                      >
                        Delete League
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(league.start_date), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{league.club_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {league.current_participants}/{league.max_participants}{' '}
                    players
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Trophy className="h-4 w-4" />
                  <span className="capitalize">
                    {league.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {league.entry_fee && league.entry_fee > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Entry Fee
                  </span>
                  <span className="font-semibold">
                    {league.currency} {league.entry_fee.toFixed(2)}
                  </span>
                </div>
              )}

              {league.status === 'registration_open' && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Registration closes on{' '}
                    {format(
                      new Date(league.registration_deadline),
                      'MMM d, yyyy'
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data.count > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, data.count)} of {data.count} leagues
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page * pageSize >= data.count}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
