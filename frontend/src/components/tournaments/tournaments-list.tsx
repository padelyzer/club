import React, { useState } from 'react';
import { Tournament } from '@/types/tournament';
import TournamentCard from './tournament-card';
import { useTournamentRegistration } from '@/lib/api/hooks/useTournaments';
import { useAuthStore } from '@/store/auth';
import { useUIStore } from '@/store/ui';
import { useTournamentStore } from '@/store/tournamentsStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface TournamentsListProps {
  tournaments: Tournament[];
  viewMode: 'grid' | 'list';
  isLoading?: boolean;
}

export default function TournamentsList({
  tournaments,
  viewMode,
  isLoading = false,
}: TournamentsListProps) {
  const { user } = useAuthStore();
  const { openModal } = useUIStore();
  const { setSelectedTournament } = useTournamentStore();
  const {
    canRegister,
    register,
    loading: registrationLoading,
  } = useTournamentRegistration();

  const handleRegister = (tournament: Tournament) => {
    if (!user) {
      // Open login modal or redirect to login
      openModal('login');
      return;
    }

    // Set the selected tournament and open registration modal
    setSelectedTournament(tournament);
    openModal('tournament-registration');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const gridClassName =
    viewMode === 'grid'
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
      : 'flex flex-col gap-4';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewMode}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className={gridClassName}
      >
        {tournaments.map((tournament, index) => (
          <motion.div
            key={tournament.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <TournamentCard
              tournament={tournament}
              onRegister={handleRegister}
              canRegister={canRegister(tournament.id)}
            />
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
