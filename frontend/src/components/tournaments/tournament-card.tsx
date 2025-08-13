import React from 'react';
import { Tournament } from '@/types/tournament';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Clock,
  ChevronRight,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';

interface TournamentCardProps {
  tournament: Tournament;
  onRegister?: (tournament: Tournament) => void;
  canRegister?: boolean;
}

export default function TournamentCard({
  tournament,
  onRegister,
  canRegister = false,
}: TournamentCardProps) {
  const registrationOpen = tournament.status === 'registration_open';
  const spotsAvailable =
    tournament.currentParticipants < tournament.maxParticipants;
  const daysUntilStart = differenceInDays(
    new Date(tournament.startDate),
    new Date()
  );
  const isUpcoming =
    tournament.status === 'upcoming' ||
    tournament.status === 'registration_open';

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

  const categoryConfig = {
    open: { color: 'blue', label: 'Open' },
    beginner: { color: 'green', label: 'Beginner' },
    intermediate: { color: 'yellow', label: 'Intermediate' },
    advanced: { color: 'orange', label: 'Advanced' },
    professional: { color: 'red', label: 'Professional' },
    senior: { color: 'purple', label: 'Senior' },
    junior: { color: 'pink', label: 'Junior' },
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200 group">
      {/* Apple-style Image Header */}
      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden">
        {tournament.imageUrl ? (
          <img
            src={tournament.imageUrl}
            alt={tournament.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Trophy className="h-20 w-20 text-white/20" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Apple-style Status Badge */}
        <div className="absolute top-4 left-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            statusConfig[tournament.status].color === 'green' ? 'bg-green-100 text-green-700' :
            statusConfig[tournament.status].color === 'blue' ? 'bg-blue-100 text-blue-700' :
            statusConfig[tournament.status].color === 'yellow' ? 'bg-orange-100 text-orange-700' :
            statusConfig[tournament.status].color === 'purple' ? 'bg-purple-100 text-purple-700' :
            statusConfig[tournament.status].color === 'red' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          } backdrop-blur-sm bg-opacity-90`}>
            {statusConfig[tournament.status].label}
          </span>
        </div>

        {/* Apple-style Prize Money */}
        {tournament.prizeMoney > 0 && (
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5">
            <div className="flex items-center text-gray-900">
              <div className="w-4 h-4 rounded-md bg-green-100 flex items-center justify-center mr-2">
                <DollarSign className="h-3 w-3 text-green-600" />
              </div>
              <span className="font-semibold text-sm">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: tournament.currency,
                  minimumFractionDigits: 0,
                }).format(tournament.prizeMoney)}
              </span>
            </div>
          </div>
        )}

        {/* Tournament Name */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-lg font-bold text-white truncate">
            {tournament.name}
          </h3>
          <p className="text-sm text-white/90 mt-1 font-medium">
            {formatConfig[tournament.format].icon}{' '}
            {formatConfig[tournament.format].label}
          </p>
        </div>
      </div>

      {/* Apple-style Content */}
      <div className="p-5">
        {/* Category and Club */}
        <div className="flex items-center justify-between mb-4">
          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
            {categoryConfig[tournament.category].label}
          </span>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-4 h-4 rounded-md bg-gray-100 flex items-center justify-center mr-2">
              <MapPin className="h-3 w-3 text-gray-500" />
            </div>
            <span className="truncate max-w-[120px] font-medium">
              {tournament.club.name}
            </span>
          </div>
        </div>

        {/* Apple-style Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Dates */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {format(new Date(tournament.startDate), 'MMM d')}
              </p>
              {isUpcoming && (
                <p className="text-xs text-gray-500">
                  {daysUntilStart === 0
                    ? 'Today'
                    : daysUntilStart === 1
                      ? 'Tomorrow'
                      : `In ${daysUntilStart} days`}
                </p>
              )}
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {tournament.currentParticipants}/{tournament.maxParticipants}
              </p>
              <p className="text-xs text-gray-500">
                {spotsAvailable
                  ? `${tournament.maxParticipants - tournament.currentParticipants} spots left`
                  : 'Full'}
              </p>
            </div>
          </div>

          {/* Entry Fee */}
          {tournament.entryFee > 0 && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: tournament.currency,
                    minimumFractionDigits: 0,
                  }).format(tournament.entryFee)}
                </p>
                <p className="text-xs text-gray-500">Entry fee</p>
              </div>
            </div>
          )}

          {/* Registration Deadline */}
          {registrationOpen && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {format(new Date(tournament.registrationEndDate), 'MMM d')}
                </p>
                <p className="text-xs text-gray-500">Registration ends</p>
              </div>
            </div>
          )}
        </div>

        {/* Apple-style Progress Bar for spots */}
        {isUpcoming && (
          <div className="mb-4">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(tournament.currentParticipants / tournament.maxParticipants) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        {tournament.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {tournament.description}
          </p>
        )}

        {/* Apple-style Actions */}
        <div className="flex gap-3">
          <Link href={`/tournaments/${tournament.id}`} className="flex-1">
            <button className="w-full h-10 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center group">
              View Details
              <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>

          {canRegister && registrationOpen && spotsAvailable && onRegister && (
            <button
              onClick={() => onRegister(tournament)}
              className="flex-1 h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Register Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
