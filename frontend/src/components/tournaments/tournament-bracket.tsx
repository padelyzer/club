import React, { useState } from 'react';
import {
  TournamentBracket,
  TournamentMatch,
  TournamentRound,
} from '@/types/tournament';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, ChevronRight, User, Users2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TournamentBracketProps {
  bracket: TournamentBracket;
  onMatchUpdate?: (matchId: string, data: any) => void;
  interactive?: boolean;
}

export default function TournamentBracketComponent({
  bracket,
  onMatchUpdate,
  interactive = true,
}: TournamentBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(
    null
  );
  const [hoveredMatch, setHoveredMatch] = useState<string | null>(null);
  const [matchScores, setMatchScores] = useState<{ team1: string; team2: string }>({ 
    team1: '', 
    team2: '' 
  });

  const renderMatch = (
    match: TournamentMatch,
    roundIndex: number,
    matchIndex: number
  ) => {
    const isCompleted = match.status === 'completed';
    const isLive = match.status === 'in_progress';
    const isHovered = hoveredMatch === match.id;
    const isSelected = selectedMatch?.id === match.id;

    const participant1Name =
      match.participant1?.type === 'team'
        ? match.participant1.team?.name
        : match.participant1?.player
          ? `${match.participant1.player.firstName} ${match.participant1.player.lastName}`
          : 'TBD';

    const participant2Name =
      match.participant2?.type === 'team'
        ? match.participant2.team?.name
        : match.participant2?.player
          ? `${match.participant2.player.firstName} ${match.participant2.player.lastName}`
          : 'TBD';

    const winner =
      match.winner === 'team1' ? 1 : match.winner === 'team2' ? 2 : null;

    return (
      <motion.div
        key={match.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: roundIndex * 0.1 + matchIndex * 0.05 }}
        className={`
          relative bg-white dark:bg-gray-800 rounded-lg border-2 transition-all duration-200
          ${isHovered ? 'border-blue-400 shadow-lg' : 'border-gray-200 dark:border-gray-700'}
          ${isSelected ? 'ring-2 ring-blue-500' : ''}
          ${interactive ? 'cursor-pointer' : ''}
        `}
        onMouseEnter={() => setHoveredMatch(match.id)}
        onMouseLeave={() => setHoveredMatch(null)}
        onClick={() => interactive && setSelectedMatch(match)}
      >
        {/* Match Number */}
        <div className="absolute -top-3 left-3 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-medium">
          Match {match.bracketPosition}
        </div>

        {/* Live Badge */}
        {isLive && (
          <div className="absolute -top-3 right-3">
            <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
          </div>
        )}

        {/* Participants */}
        <div className="p-3 space-y-2">
          {/* Participant 1 */}
          <div
            className={`
              flex items-center justify-between p-2 rounded transition-colors
              ${winner === 1 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}
              ${match.participant1?.seed ? '' : 'opacity-50'}
            `}
          >
            <div className="flex items-center gap-2">
              {match.participant1?.seed && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  #{match.participant1.seed}
                </span>
              )}
              <div className="flex items-center gap-1">
                {match.participant1?.type === 'team' ? (
                  <Users2 className="h-3 w-3 text-gray-400" />
                ) : (
                  <User className="h-3 w-3 text-gray-400" />
                )}
                <span
                  className={`text-sm ${winner === 1 ? 'font-semibold' : ''}`}
                >
                  {participant1Name}
                </span>
              </div>
            </div>
            {isCompleted && (
              <span
                className={`text-sm font-bold ${winner === 1 ? 'text-green-600' : 'text-gray-400'}`}
              >
                {match.team1?.score || 0}
              </span>
            )}
          </div>

          {/* VS Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-gray-800 px-2 text-xs text-gray-500">
                VS
              </span>
            </div>
          </div>

          {/* Participant 2 */}
          <div
            className={`
              flex items-center justify-between p-2 rounded transition-colors
              ${winner === 2 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}
              ${match.participant2?.seed ? '' : 'opacity-50'}
            `}
          >
            <div className="flex items-center gap-2">
              {match.participant2?.seed && (
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  #{match.participant2.seed}
                </span>
              )}
              <div className="flex items-center gap-1">
                {match.participant2?.type === 'team' ? (
                  <Users2 className="h-3 w-3 text-gray-400" />
                ) : (
                  <User className="h-3 w-3 text-gray-400" />
                )}
                <span
                  className={`text-sm ${winner === 2 ? 'font-semibold' : ''}`}
                >
                  {participant2Name}
                </span>
              </div>
            </div>
            {isCompleted && (
              <span
                className={`text-sm font-bold ${winner === 2 ? 'text-green-600' : 'text-gray-400'}`}
              >
                {match.team2?.score || 0}
              </span>
            )}
          </div>
        </div>

        {/* Match Details */}
        {match.scheduledDate && (
          <div className="px-3 pb-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(match.scheduledDate).toLocaleDateString()} • Court{' '}
              {match.courtAssigned || 'TBA'}
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  const renderRound = (round: TournamentRound, roundIndex: number) => {
    const roundNames = {
      1: 'Finals',
      2: 'Semi-finals',
      3: 'Quarter-finals',
      4: 'Round of 16',
      5: 'Round of 32',
    };

    const getRoundName = () => {
      const roundsFromEnd = bracket.totalRounds - roundIndex;
      return (
        round.name || roundNames[roundsFromEnd] || `Round ${round.roundNumber}`
      );
    };

    return (
      <div key={round.id} className="flex flex-col">
        {/* Round Header */}
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getRoundName()}
          </h3>
          {round.startDate && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(round.startDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Matches */}
        <div className="flex flex-col gap-8 justify-center flex-1">
          {round.matches.map((match, matchIndex) => (
            <div key={match.id} className="relative">
              {renderMatch(match, roundIndex, matchIndex)}

              {/* Connector to next round */}
              {roundIndex < bracket.rounds.length - 1 && (
                <div className="absolute top-1/2 -right-8 transform -translate-y-1/2">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Tournament Bracket
        </h2>
        {bracket.winner && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Champion:
            </span>
            <Badge
              variant="default"
              className="bg-gradient-to-r from-yellow-400 to-amber-600"
            >
              {bracket.winner.type === 'team'
                ? bracket.winner.team?.name
                : bracket.winner.player
                  ? `${bracket.winner.player.firstName} ${bracket.winner.player.lastName}`
                  : 'TBD'}
            </Badge>
          </div>
        )}
      </div>

      {/* Bracket Visualization */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px] p-4">
          <div className="grid grid-flow-col auto-cols-fr gap-8">
            {bracket.rounds.map((round, index) => renderRound(round, index))}
          </div>
        </div>
      </div>

      {/* Match Details Modal */}
      <AnimatePresence>
        {selectedMatch && interactive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMatch(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">
                Update Match Result
              </h3>
              
              {/* Match Details */}
              <div className="space-y-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Round {selectedMatch.round} - Match {selectedMatch.bracketPosition}
                </div>
                
                {/* Score Input */}
                <div className="space-y-3">
                  {/* Team 1 */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {selectedMatch.participant1?.type === 'team'
                          ? selectedMatch.participant1.team?.name
                          : selectedMatch.participant1?.player
                            ? `${selectedMatch.participant1.player.firstName} ${selectedMatch.participant1.player.lastName}`
                            : 'TBD'}
                      </div>
                      {selectedMatch.participant1?.seed && (
                        <div className="text-xs text-gray-500">Seed #{selectedMatch.participant1.seed}</div>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="Score"
                      value={matchScores.team1 || ''}
                      onChange={(e) => setMatchScores({ ...matchScores, team1: e.target.value })}
                      className="w-20 px-3 py-2 border rounded-md text-center"
                    />
                  </div>
                  
                  {/* Team 2 */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        {selectedMatch.participant2?.type === 'team'
                          ? selectedMatch.participant2.team?.name
                          : selectedMatch.participant2?.player
                            ? `${selectedMatch.participant2.player.firstName} ${selectedMatch.participant2.player.lastName}`
                            : 'TBD'}
                      </div>
                      {selectedMatch.participant2?.seed && (
                        <div className="text-xs text-gray-500">Seed #{selectedMatch.participant2.seed}</div>
                      )}
                    </div>
                    <input
                      type="number"
                      min="0"
                      placeholder="Score"
                      value={matchScores.team2 || ''}
                      onChange={(e) => setMatchScores({ ...matchScores, team2: e.target.value })}
                      className="w-20 px-3 py-2 border rounded-md text-center"
                    />
                  </div>
                </div>
                
                {/* Match Info */}
                {selectedMatch.scheduledDate && (
                  <div className="pt-3 border-t">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div>Date: {new Date(selectedMatch.scheduledDate).toLocaleDateString()}</div>
                      {selectedMatch.courtAssigned && (
                        <div>Court: {selectedMatch.courtAssigned}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMatch(null);
                    setMatchScores({ team1: '', team2: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (onMatchUpdate && matchScores.team1 && matchScores.team2) {
                      onMatchUpdate(selectedMatch.id, {
                        team1Score: parseInt(matchScores.team1),
                        team2Score: parseInt(matchScores.team2),
                      });
                    }
                    setSelectedMatch(null);
                    setMatchScores({ team1: '', team2: '' });
                  }}
                  disabled={!matchScores.team1 || !matchScores.team2}
                >
                  Save Result
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
