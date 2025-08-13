import React from 'react';
import { TournamentStandings, Standing } from '@/types/tournament';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Users2,
} from 'lucide-react';

interface TournamentStandingsProps {
  standings: TournamentStandings;
}

export default function TournamentStandingsComponent({
  standings,
}: TournamentStandingsProps) {
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Trophy className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Trophy className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="text-lg font-semibold text-gray-600">
            {position}
          </span>
        );
    }
  };

  const getParticipantName = (participant: any) => {
    if (participant.type === 'team') {
      return participant.team?.name || 'Team';
    }
    if (participant.player) {
      return `${participant.player.firstName} ${participant.player.lastName}`;
    }
    return 'Unknown';
  };

  const getDifferentialColor = (differential: number) => {
    if (differential > 0) return 'text-green-600';
    if (differential < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getWinRate = (won: number, played: number) => {
    if (played === 0) return 0;
    return Math.round((won / played) * 100);
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Tournament Standings</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {new Date(standings.lastUpdated).toLocaleString()}
          </p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Pos
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Participant
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  P
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  W
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  L
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Sets
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Games
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Diff
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Pts
                </th>
                <th className="text-center py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  Win%
                </th>
              </tr>
            </thead>
            <tbody>
              {standings.standings.map((standing: Standing, index: number) => (
                <tr
                  key={standing.participant.id}
                  className={`
                    border-b border-gray-100 dark:border-gray-800
                    ${index === 0 ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}
                    ${index === 1 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                    ${index === 2 ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                  `}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center">
                      {getPositionIcon(standing.position)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {standing.participant.type === 'team' ? (
                        <Users2 className="h-4 w-4 text-gray-400" />
                      ) : (
                        <User className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="font-medium">
                        {getParticipantName(standing.participant)}
                      </span>
                      {standing.participant.seed && (
                        <Badge variant="outline" className="text-xs">
                          Seed #{standing.participant.seed}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="text-center py-4 px-4">{standing.played}</td>
                  <td className="text-center py-4 px-4 text-green-600 font-medium">
                    {standing.won}
                  </td>
                  <td className="text-center py-4 px-4 text-red-600">
                    {standing.lost}
                  </td>
                  <td className="text-center py-4 px-4">
                    {standing.setsWon}-{standing.setsLost}
                  </td>
                  <td className="text-center py-4 px-4">
                    {standing.gamesWon}-{standing.gamesLost}
                  </td>
                  <td
                    className={`text-center py-4 px-4 font-medium ${getDifferentialColor(standing.differential)}`}
                  >
                    {standing.differential > 0 ? '+' : ''}
                    {standing.differential}
                  </td>
                  <td className="text-center py-4 px-4 font-bold">
                    {standing.points}
                  </td>
                  <td className="text-center py-4 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-medium">
                        {getWinRate(standing.won, standing.played)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {standings.standings.map((standing: Standing, index: number) => (
            <Card
              key={standing.participant.id}
              className={`p-4 ${
                index === 0
                  ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getPositionIcon(standing.position)}
                  <div>
                    <p className="font-medium">
                      {getParticipantName(standing.participant)}
                    </p>
                    {standing.participant.seed && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Seed #{standing.participant.seed}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{standing.points}</p>
                  <p className="text-xs text-gray-600">Points</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-600">Played</p>
                  <p className="font-medium">{standing.played}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Won</p>
                  <p className="font-medium text-green-600">{standing.won}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Lost</p>
                  <p className="font-medium text-red-600">{standing.lost}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Win%</p>
                  <p className="font-medium">
                    {getWinRate(standing.won, standing.played)}%
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
                <span className="text-gray-600">
                  Sets: {standing.setsWon}-{standing.setsLost}
                </span>
                <span
                  className={`font-medium ${getDifferentialColor(standing.differential)}`}
                >
                  Diff: {standing.differential > 0 ? '+' : ''}
                  {standing.differential}
                </span>
              </div>
            </Card>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Legend:</span> P = Played, W = Won, L
            = Lost, Diff = Game Differential, Pts = Points
          </p>
        </div>
      </div>
    </Card>
  );
}
