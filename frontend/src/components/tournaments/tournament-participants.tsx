import React, { useState } from 'react';
import { TournamentParticipant, TournamentFormat } from '@/types/tournament';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User,
  Users2,
  Trophy,
  Search,
  Star,
  Shield,
  Filter,
} from 'lucide-react';

interface TournamentParticipantsProps {
  participants: TournamentParticipant[];
  format: TournamentFormat;
  onParticipantClick?: (participant: TournamentParticipant) => void;
}

export default function TournamentParticipants({
  participants,
  format,
  onParticipantClick,
}: TournamentParticipantsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeed, setFilterSeed] = useState(false);

  const filteredParticipants = participants.filter((participant) => {
    const name =
      participant.type === 'team'
        ? participant.team?.name
        : participant.player
          ? `${participant.player.firstName} ${participant.player.lastName}`
          : '';

    const matchesSearch = name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesSeed =
      !filterSeed || (participant.seed && participant.seed <= 8);

    return matchesSearch && matchesSeed;
  });

  const getParticipantName = (participant: TournamentParticipant) => {
    if (participant.type === 'team') {
      return participant.team?.name || 'Team';
    }
    if (participant.player) {
      return `${participant.player.firstName} ${participant.player.lastName}`;
    }
    return 'Unknown';
  };

  const getStatusColor = (status: TournamentParticipant['status']) => {
    switch (status) {
      case 'registered':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'withdrawn':
        return 'bg-red-100 text-red-800';
      case 'disqualified':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelIcon = (level?: string) => {
    switch (level) {
      case 'professional':
        return <Trophy className="h-4 w-4 text-purple-500" />;
      case 'advanced':
        return <Star className="h-4 w-4 text-blue-500" />;
      case 'intermediate':
        return <Shield className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const sortedParticipants = [...filteredParticipants].sort((a, b) => {
    // Sort by seed first (if available)
    if (a.seed && b.seed) {
      return a.seed - b.seed;
    }
    if (a.seed) return -1;
    if (b.seed) return 1;

    // Then by registration date
    return (
      new Date(a.registrationDate).getTime() -
      new Date(b.registrationDate).getTime()
    );
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search participants..."
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={filterSeed ? 'default' : 'outline'}
          onClick={() => setFilterSeed(!filterSeed)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Top Seeds Only
        </Button>
      </div>

      {/* Participants Count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredParticipants.length} of {participants.length}{' '}
          participants
        </p>
        {format === 'groups' && <Badge variant="outline">Groups Format</Badge>}
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedParticipants.map((participant) => (
          <Card
            key={participant.id}
            className={`p-4 transition-all hover:shadow-md ${
              onParticipantClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onParticipantClick?.(participant)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {participant.type === 'team' ? (
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <Users2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {getParticipantName(participant)}
                  </p>
                  {participant.seed && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Seed #{participant.seed}
                    </p>
                  )}
                </div>
              </div>
              {participant.seed && participant.seed <= 3 && (
                <Trophy
                  className={`h-5 w-5 ${
                    participant.seed === 1
                      ? 'text-yellow-500'
                      : participant.seed === 2
                        ? 'text-gray-400'
                        : 'text-amber-600'
                  }`}
                />
              )}
            </div>

            {/* Participant Details */}
            {participant.type === 'team' && participant.team && (
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="h-3 w-3" />
                  <span>
                    {participant.team.player1.firstName}{' '}
                    {participant.team.player1.lastName}
                  </span>
                  {getLevelIcon(participant.team.player1.level)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <User className="h-3 w-3" />
                  <span>
                    {participant.team.player2.firstName}{' '}
                    {participant.team.player2.lastName}
                  </span>
                  {getLevelIcon(participant.team.player2.level)}
                </div>
              </div>
            )}

            {participant.type === 'player' && participant.player && (
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  {getLevelIcon(participant.player.level)}
                  <span className="capitalize">{participant.player.level}</span>
                </div>
                {participant.player.winRate !== undefined && (
                  <div>
                    Win Rate:{' '}
                    <span className="font-medium">
                      {Math.round(participant.player.winRate)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Status and Payment */}
            <div className="flex items-center justify-between">
              <Badge
                variant="secondary"
                className={getStatusColor(participant.status)}
              >
                {participant.status}
              </Badge>
              {participant.paid ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-300"
                >
                  Paid
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-yellow-50 text-yellow-700 border-yellow-300"
                >
                  Payment Pending
                </Badge>
              )}
            </div>

            {/* Registration Date */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Registered:{' '}
              {new Date(participant.registrationDate).toLocaleDateString()}
            </p>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredParticipants.length === 0 && (
        <div className="text-center py-12">
          <Users2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || filterSeed
              ? 'No participants match your filters'
              : 'No participants registered yet'}
          </p>
        </div>
      )}
    </div>
  );
}
