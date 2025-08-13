
'use client';

import dynamic from 'next/dynamic';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trophy, Calendar, Users, Award, Filter, Search } from 'lucide-react';

const TournamentBracket = dynamic(() => import('@/components/tournaments/tournament-bracket'), {
  loading: () => <div className="animate-pulse bg-gray-200 rounded h-32" />,
  ssr: false
});

const TournamentStats = dynamic(() => import('@/components/tournaments/tournament-stats'), {
  loading: () => <div className="animate-pulse bg-gray-200 rounded h-32" />,
  ssr: false
});
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { EmptyState } from '@/components/ui/states/empty-state';
import TournamentsList from '@/components/tournaments/tournaments-list';
import { TournamentForm } from '@/components/tournaments/tournament-form';
import { TournamentRegistrationModal } from '@/components/tournaments/tournament-registration-modal';
import { useTournaments } from '@/lib/api/hooks/useTournaments';
import { useUIStore } from '@/store/ui';
import { TournamentStatus, TournamentCategory, TournamentFormat } from '@/types/tournament';

const statusConfig = {
  upcoming: {
    label: 'Upcoming',
    color: 'bg-blue-100 text-blue-700',
  },
  registration_open: {
    label: 'Registration Open',
    color: 'bg-green-100 text-green-700',
  },
  registration_closed: {
    label: 'Registration Closed',
    color: 'bg-orange-100 text-orange-700',
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-purple-100 text-purple-700',
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-700',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700',
  },
};

export default function TournamentsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTournamentForm, setShowTournamentForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TournamentCategory | 'all'>('all');
  
  const { openModal } = useUIStore();
  
  const {
    tournaments,
    filteredTournaments,
    upcomingTournaments,
    activeTournaments,
    isLoading,
    error,
    filters,
    setFilters,
    loadTournaments,
  } = useTournaments();

  // Stats calculations
  const totalParticipants = tournaments.reduce((sum, t) => sum + t.currentParticipants, 0);
  const totalPrizeMoney = tournaments.reduce((sum, t) => sum + t.prizeMoney, 0);
  const upcomingMatches = tournaments
    .filter(t => t.status === 'in_progress')
    .length * 5; // Estimate matches per tournament

  // Filter tournaments based on search and filters
  const displayTournaments = filteredTournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tournament.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || tournament.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateTournament = () => {
    setShowTournamentForm(true);
  };

  const handleTournamentCreated = (tournament: any) => {
    setShowTournamentForm(false);
    loadTournaments(); // Refresh the list
  };

  if (isLoading) {
    return <LoadingState message="Loading tournaments..." fullScreen={false} />;
  }

  if (error) {
    return (
      <ErrorState 
        message={error} 
        onRetry={() => loadTournaments()} 
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Apple-style Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Tournaments
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage and participate in tournaments ({tournaments.length} total)
            </p>
          </div>
          <Button 
            onClick={handleCreateTournament} 
            className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Tournament
          </Button>
        </div>
      </div>

      {/* Apple-style Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">
                Active Tournaments
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTournaments.length}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">
                Total Participants
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {totalParticipants}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">
                Upcoming Matches
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {upcomingMatches}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium mb-1">
                Total Prize Money
              </p>
              <p className="text-2xl font-bold text-gray-900">
                ${totalPrizeMoney.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Award className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Apple-style Filters and Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tournaments..."
                value={searchQuery || ''}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-10 bg-gray-50 border-0 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 transition-all"
              />
            </div>
          </div>
          
          <Select value={statusFilter || ''} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-full lg:w-48 h-10 bg-white border-gray-200 rounded-lg">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="registration_open">Registration Open</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter || ''} onValueChange={(value: any) => setCategoryFilter(value)}>
            <SelectTrigger className="w-full lg:w-48 h-10 bg-white border-gray-200 rounded-lg">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-8 px-3 rounded-md transition-all font-medium text-sm ${
                viewMode === 'grid' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-8 px-3 rounded-md transition-all font-medium text-sm ${
                viewMode === 'list' 
                  ? 'bg-white shadow-sm text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Apple-style Tournaments List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {displayTournaments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
            <EmptyState
              icon={Trophy as any}
              title="No tournaments found"
              description="There are no tournaments matching your criteria. Create the first tournament to get started."
              action={
                <Button 
                  onClick={handleCreateTournament}
                  className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Tournament
                </Button>
              }
            />
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <TournamentsList
              tournaments={displayTournaments}
              viewMode={viewMode}
              isLoading={isLoading}
            />
          </div>
        )}
      </motion.div>

      {/* Tournament Form Modal */}
      {showTournamentForm && (
        <TournamentForm
          isOpen={showTournamentForm}
          onClose={() => setShowTournamentForm(false)}
          onSuccess={handleTournamentCreated}
          mode="create"
        />
      )}

      {/* Tournament Registration Modal */}
      <TournamentRegistrationModal />
    </div>
  );
}
