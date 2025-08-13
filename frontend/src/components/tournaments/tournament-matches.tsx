import React, { useState, useEffect } from 'react';
import { TournamentMatch } from '@/types/tournament';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Users2,
  Edit2,
  Check,
  X,
  Wifi,
} from 'lucide-react';
import { format } from 'date-fns';
import { useWebSocket } from '@/hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';

interface TournamentMatchesProps {
  matches: TournamentMatch[];
  onUpdateMatch?: (matchId: string, data: any) => void;
  compact?: boolean;
}

export default function TournamentMatches({
  matches,
  onUpdateMatch,
  compact = false,
}: TournamentMatchesProps) {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scores, setScores] = useState<{
    [key: string]: { team1: number; team2: number };
  }>({});
  const [liveMatches, setLiveMatches] = useState<Set<string>>(new Set());
  const [liveScores, setLiveScores] = useState<{
    [key: string]: { team1: number; team2: number };
  }>({});

  // Subscribe to WebSocket for live match updates
  // Temporarily disabled until backend WebSocket is configured
  // const { subscribe, unsubscribe } = useWebSocket();

  // WebSocket subscription temporarily disabled
  // useEffect(() => {
  //   // Subscribe to tournament match updates
  //   const unsubscribeFunc = subscribe('tournament:match_update', (data: any) => {
  //     if (data.match && data.liveScore) {
  //       setLiveMatches((prev) => new Set(prev).add(data.match.id));
  //       setLiveScores((prev) => ({
  //         ...prev,
  //         [data.match.id]: {
  //           team1: data.liveScore.team1,
  //           team2: data.liveScore.team2,
  //         },
  //       }));
  //     }
      
  //     // If match is completed, remove from live matches
  //     if (data.match && data.match.status === 'completed') {
  //       setLiveMatches((prev) => {
  //         const newSet = new Set(prev);
  //         newSet.delete(data.match.id);
  //         return newSet;
  //       });
  //     }
  //   });

  //   return () => {
  //     unsubscribeFunc();
  //   };
  // }, [subscribe, unsubscribe]);

  const handleScoreUpdate = (matchId: string) => {
    const matchScores = scores[matchId];
    if (matchScores && onUpdateMatch) {
      onUpdateMatch(matchId, {
        team1Score: matchScores.team1,
        team2Score: matchScores.team2,
      });
      setEditingMatch(null);
    }
  };

  const getParticipantName = (participant: any) => {
    if (!participant) return 'TBD';
    if (participant.type === 'team') {
      return participant.team?.name || 'Team';
    }
    if (participant.player) {
      return `${participant.player.firstName} ${participant.player.lastName}`;
    }
    return 'TBD';
  };

  const statusColors = {
    pending: 'bg-gray-100 text-gray-800',
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const groupedMatches = matches.reduce(
    (acc, match) => {
      const roundKey = match.roundName || `Round ${match.round}`;
      if (!acc[roundKey]) {
        acc[roundKey] = [];
      }
      acc[roundKey].push(match);
      return acc;
    },
    {} as { [key: string]: TournamentMatch[] }
  );

  if (compact) {
    return (
      <div className="space-y-3">
        {matches.map((match) => (
          <Card key={match.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant="secondary"
                    className={
                      statusColors[match.status as keyof typeof statusColors] ||
                      ''
                    }
                  >
                    {match.status}
                  </Badge>
                  {match.roundName && (
                    <span className="text-sm text-gray-600">
                      {match.roundName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={match.winner === 'team1' ? 'font-semibold' : ''}
                  >
                    {getParticipantName(match.participant1)}
                  </span>
                  <span className="text-gray-400">vs</span>
                  <span
                    className={match.winner === 'team2' ? 'font-semibold' : ''}
                  >
                    {getParticipantName(match.participant2)}
                  </span>
                </div>
              </div>
              {(match.status === 'completed' || liveMatches.has(match.id)) && (
                <div className="flex items-center gap-2">
                  {liveMatches.has(match.id) && (
                    <Wifi className="h-4 w-4 text-red-500 animate-pulse" />
                  )}
                  <div className="text-lg font-bold">
                    {liveScores[match.id]?.team1 || match.team1?.score || 0} - {liveScores[match.id]?.team2 || match.team2?.score || 0}
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedMatches).map(([round, roundMatches]) => (
        <div key={round}>
          <h3 className="text-lg font-semibold mb-4">{round}</h3>
          <div className="space-y-4">
            {roundMatches.map((match) => (
              <Card key={match.id} className="overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={
                          statusColors[
                            match.status as keyof typeof statusColors
                          ] || ''
                        }
                      >
                        {match.status.replace('_', ' ')}
                      </Badge>
                      {(match.isLive || liveMatches.has(match.id)) && (
                        <Badge className="bg-red-500 text-white animate-pulse flex items-center gap-1">
                          <Wifi className="h-3 w-3" />
                          LIVE
                        </Badge>
                      )}
                    </div>
                    {match.status === 'scheduled' && onUpdateMatch && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMatch(match.id);
                          setScores({
                            ...scores,
                            [match.id]: {
                              team1: match.team1?.score || 0,
                              team2: match.team2?.score || 0,
                            },
                          });
                        }}
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Update Result
                      </Button>
                    )}
                  </div>

                  {/* Match Participants */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Participant 1 */}
                    <div
                      className={`p-4 rounded-lg ${match.winner === 'team1' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {match.participant1?.type === 'team' ? (
                          <Users2 className="h-4 w-4 text-gray-400" />
                        ) : (
                          <User className="h-4 w-4 text-gray-400" />
                        )}
                        {match.participant1?.seed && (
                          <Badge variant="outline" className="text-xs">
                            Seed #{match.participant1.seed}
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`font-medium ${match.winner === 'team1' ? 'text-green-700 dark:text-green-300' : ''}`}
                      >
                        {getParticipantName(match.participant1)}
                      </p>
                    </div>

                    {/* Score or VS */}
                    <div className="flex items-center justify-center">
                      {editingMatch === match.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            className="w-16 text-center"
                            value={scores[match.id]?.team1 || 0}
                            onChange={(e) =>
                              setScores({
                                ...scores,
                                [match.id]: {
                                  ...scores[match.id],
                                  team1: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                          />
                          <span className="text-lg font-bold">-</span>
                          <Input
                            type="number"
                            min="0"
                            className="w-16 text-center"
                            value={scores[match.id]?.team2 || 0}
                            onChange={(e) =>
                              setScores({
                                ...scores,
                                [match.id]: {
                                  ...scores[match.id],
                                  team2: parseInt(e.target.value) || 0,
                                },
                              })
                            }
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleScoreUpdate(match.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingMatch(null)}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : match.status === 'completed' || liveMatches.has(match.id) ? (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${match.id}-${liveScores[match.id]?.team1 || match.team1?.score || 0}-${liveScores[match.id]?.team2 || match.team2?.score || 0}`}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="text-3xl font-bold"
                          >
                            {liveScores[match.id]?.team1 || match.team1?.score || 0} - {liveScores[match.id]?.team2 || match.team2?.score || 0}
                          </motion.div>
                        </AnimatePresence>
                      ) : (
                        <span className="text-xl font-medium text-gray-400">
                          VS
                        </span>
                      )}
                    </div>

                    {/* Participant 2 */}
                    <div
                      className={`p-4 rounded-lg ${match.winner === 'team2' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {match.participant2?.type === 'team' ? (
                          <Users2 className="h-4 w-4 text-gray-400" />
                        ) : (
                          <User className="h-4 w-4 text-gray-400" />
                        )}
                        {match.participant2?.seed && (
                          <Badge variant="outline" className="text-xs">
                            Seed #{match.participant2.seed}
                          </Badge>
                        )}
                      </div>
                      <p
                        className={`font-medium ${match.winner === 'team2' ? 'text-green-700 dark:text-green-300' : ''}`}
                      >
                        {getParticipantName(match.participant2)}
                      </p>
                    </div>
                  </div>

                  {/* Match Details */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    {match.scheduledDate && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(match.scheduledDate), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}
                    {match.startTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{match.startTime}</span>
                      </div>
                    )}
                    {match.courtAssigned && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>Court {match.courtAssigned}</span>
                      </div>
                    )}
                    {match.duration && match.status === 'completed' && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{match.duration} min</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
