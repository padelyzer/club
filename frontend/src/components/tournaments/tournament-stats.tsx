'use client';

import React from 'react';
import { Tournament, TournamentMatch, TournamentParticipant } from '@/types/tournament';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Trophy,
  Target,
  TrendingUp,
  Users,
  Activity,
  Clock,
  Award,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface TournamentStatsProps {
  tournament: Tournament;
  matches: TournamentMatch[];
  participants: TournamentParticipant[];
}

interface PlayerStats {
  playerId: string;
  playerName: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  avgMatchDuration: number;
}

export function TournamentStats({
  tournament,
  matches,
  participants,
}: TournamentStatsProps) {
  // Calculate overall tournament statistics
  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'completed').length;
  const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

  // Calculate match statistics
  const avgMatchDuration = matches
    .filter(m => m.duration)
    .reduce((sum, m) => sum + (m.duration || 0), 0) / 
    (matches.filter(m => m.duration).length || 1);

  const matchesByStatus = matches.reduce((acc, match) => {
    acc[match.status] = (acc[match.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate player statistics
  const playerStats: PlayerStats[] = participants.map(participant => {
    const playerId = participant.player?.id || participant.team?.id || '';
    const playerName = participant.player 
      ? `${participant.player.firstName} ${participant.player.lastName}`
      : participant.team?.name || 'Unknown';

    const playerMatches = matches.filter(match => 
      (match.participant1?.id === participant.id || match.participant2?.id === participant.id) &&
      match.status === 'completed'
    );

    const matchesWon = playerMatches.filter(match => {
      if (match.participant1?.id === participant.id) {
        return match.winner === 'team1';
      } else {
        return match.winner === 'team2';
      }
    }).length;

    const totalSets = playerMatches.reduce((acc, match) => {
      const team1Sets = match.team1?.setsWon || 0;
      const team2Sets = match.team2?.setsWon || 0;
      return acc + team1Sets + team2Sets;
    }, 0);

    const setsWon = playerMatches.reduce((acc, match) => {
      if (match.participant1?.id === participant.id) {
        return acc + (match.team1?.setsWon || 0);
      } else {
        return acc + (match.team2?.setsWon || 0);
      }
    }, 0);

    const avgDuration = playerMatches.reduce((sum, m) => sum + (m.duration || 0), 0) / 
      (playerMatches.length || 1);

    return {
      playerId,
      playerName,
      matchesPlayed: playerMatches.length,
      matchesWon,
      matchesLost: playerMatches.length - matchesWon,
      setsWon,
      setsLost: totalSets - setsWon,
      gamesWon: 0, // Would need detailed game data
      gamesLost: 0,
      winRate: playerMatches.length > 0 ? (matchesWon / playerMatches.length) * 100 : 0,
      avgMatchDuration: avgDuration,
    };
  }).sort((a, b) => b.winRate - a.winRate);

  // Top performers
  const topPerformers = playerStats.slice(0, 5);

  // Match duration distribution
  const durationData = matches
    .filter(m => m.duration)
    .map(m => ({
      name: `Match ${m.bracketPosition}`,
      duration: m.duration,
    }));

  // Status distribution for pie chart
  const statusData = Object.entries(matchesByStatus).map(([status, count]) => ({
    name: status.replace('_', ' ').toUpperCase(),
    value: count,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tournament Progress
                </p>
                <p className="text-2xl font-bold">
                  {progressPercentage.toFixed(0)}%
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
            <Progress value={progressPercentage || ''} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Matches Completed
                </p>
                <p className="text-2xl font-bold">
                  {completedMatches}/{totalMatches}
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Players
                </p>
                <p className="text-2xl font-bold">
                  {participants.length}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Match Duration
                </p>
                <p className="text-2xl font-bold">
                  {Math.round(avgMatchDuration)} min
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topPerformers.map((player, index) => (
              <div key={player.playerId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-100 text-yellow-700' :
                    index === 1 ? 'bg-gray-100 text-gray-700' :
                    index === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{player.playerName}</p>
                    <p className="text-sm text-gray-600">
                      {player.matchesWon}W - {player.matchesLost}L
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{player.winRate.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500">Win Rate</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Match Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Match Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Match Duration Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Match Durations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={durationData.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="duration" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Player Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Detailed Player Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-3 font-medium">Player</th>
                  <th className="pb-3 font-medium text-center">Matches</th>
                  <th className="pb-3 font-medium text-center">Won</th>
                  <th className="pb-3 font-medium text-center">Lost</th>
                  <th className="pb-3 font-medium text-center">Sets W/L</th>
                  <th className="pb-3 font-medium text-center">Win Rate</th>
                  <th className="pb-3 font-medium text-center">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {playerStats.map((player) => (
                  <tr key={player.playerId} className="border-b">
                    <td className="py-3 font-medium">{player.playerName}</td>
                    <td className="py-3 text-center">{player.matchesPlayed}</td>
                    <td className="py-3 text-center text-green-600">{player.matchesWon}</td>
                    <td className="py-3 text-center text-red-600">{player.matchesLost}</td>
                    <td className="py-3 text-center">
                      {player.setsWon}/{player.setsLost}
                    </td>
                    <td className="py-3 text-center">
                      <Badge variant={player.winRate >= 50 ? 'default' : 'secondary'}>
                        {player.winRate.toFixed(0)}%
                      </Badge>
                    </td>
                    <td className="py-3 text-center">{Math.round(player.avgMatchDuration)} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}