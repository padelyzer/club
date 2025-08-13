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
      changeType: 'positive' as 'positive' | 'neutral' | 'negative',
    },
    {
      label: 'Upcoming Matches',
      value: '48',
      icon: Calendar,
      change: '8 this week',
      changeType: 'neutral' as 'positive' | 'neutral' | 'negative',
    },
    {
      label: 'Total Players',
      value: '234',
      icon: Users,
      change: '+15 new registrations',
      changeType: 'positive' as 'positive' | 'neutral' | 'negative',
    },
  ];

  const canCreateLeague = user?.is_superuser || user?.is_staff || 
    user?.club_memberships?.some(membership => 
      membership.role === 'owner' || membership.role === 'admin'
    );

  return (
    <div className="space-y-4">
      {/* Apple-style Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Leagues</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and track competitive leagues and tournaments (12 active)
            </p>
          </div>
          {canCreateLeague && (
            <Button 
              onClick={handleCreateLeague} 
              className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create League
            </Button>
          )}
        </div>
      </div>

      {/* Apple-style Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const iconColors = {
            0: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
            1: { bg: 'bg-blue-50', text: 'text-blue-600' },
            2: { bg: 'bg-green-50', text: 'text-green-600' },
          };
          const colors = iconColors[index as keyof typeof iconColors] || iconColors[0];
          
          return (
            <div
              key={index}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p
                    className={cn(
                      'text-xs font-medium',
                      stat.changeType === 'positive' && 'text-green-600',
                      stat.changeType === 'negative' && 'text-red-600',
                      stat.changeType === 'neutral' && 'text-gray-500'
                    )}
                  >
                    {stat.change}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Apple-style Search and Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Input
              placeholder="Search leagues by name..."
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-10 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2",
              showFilters && "bg-gray-50"
            )}
          >
            <Filter className="h-4 w-4" />
            Filters
            {Object.values(filters).some(
              (v) => v !== 'all' && v !== undefined
            ) && (
              <span className="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white font-medium">
                {
                  Object.values(filters).filter(
                    (v) => v !== 'all' && v !== undefined
                  ).length
                }
              </span>
            )}
          </button>
        </div>
        
        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
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
      </div>

      {/* Apple-style Leagues List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <LeaguesList 
          searchQuery={searchQuery} 
          filters={{
            status: filters.status,
            sport: filters.sport,
            ...(filters.clubId !== undefined && { clubId: filters.clubId })
          }} 
        />
      </div>

      {/* League Form Modal */}
      <LeagueForm />
    </div>
  );
}
