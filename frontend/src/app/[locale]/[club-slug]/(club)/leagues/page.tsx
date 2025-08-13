'use client';

import { useState } from 'react';
import { Plus, Trophy, Calendar, Users, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LeaguesList } from '@/components/leagues/leagues-list';
import { LeagueFilters } from '@/components/leagues/league-filters';
import { LeagueForm } from '@/components/leagues/league-form';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

export default function LeaguesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    sport: 'all',
    clubId: undefined as number | undefined,
  });

  const { openModal } = useUIStore();
  const { user } = useAuthStore();

  const handleCreateLeague = () => {
    openModal('league-form');
  };

  const stats = [
    {
      label: 'Active Leagues',
      value: '12',
      icon: Trophy,
      change: '+2 from last month',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
    },
    {
      label: 'Upcoming Matches',
      value: '48',
      icon: Calendar,
      change: '8 this week',
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
    },
    {
      label: 'Total Players',
      value: '234',
      icon: Users,
      change: '+15 new registrations',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
    },
  ];

  const canCreateLeague = user?.is_superuser || user?.is_staff;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leagues</h1>
          <p className="text-muted-foreground">
            Manage and track competitive leagues and tournaments
          </p>
        </div>
        {canCreateLeague && (
          <Button onClick={handleCreateLeague} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Create League
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-lg border bg-card p-6"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p
                    className={cn(
                      'text-xs',
                      stat.changeType === 'positive' && 'text-green-600',
                      stat.changeType === 'negative' && 'text-red-600',
                      stat.changeType === 'neutral' && 'text-muted-foreground'
                    )}
                  >
                    {stat.change}
                  </p>
                </div>
                <div className="rounded-full bg-muted p-3">
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search leagues by name..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(showFilters && 'bg-muted')}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {Object.values(filters).some(
            (v) => v !== 'all' && v !== undefined
          ) && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {
                Object.values(filters).filter(
                  (v) => v !== 'all' && v !== undefined
                ).length
              }
            </span>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <LeagueFilters
            filters={{
              status: filters.status,
              sport: filters.sport,
              ...(filters.clubId !== undefined && { clubId: filters.clubId })
            }}
            onFiltersChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Leagues List */}
      <LeaguesList 
        searchQuery={searchQuery} 
        filters={{
          status: filters.status,
          sport: filters.sport,
          ...(filters.clubId !== undefined && { clubId: filters.clubId })
        }} 
      />

      {/* League Form Modal */}
      <LeagueForm />
    </div>
  );
}
