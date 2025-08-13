'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Medal,
  Award,
  Download,
  RefreshCw,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { LeaguesService } from '@/lib/api/services/leagues.service';
import { LeagueStanding } from '@/types/league';
import { cn } from '@/lib/utils';

interface LeagueStandingsProps {
  leagueId: number;
}

export const LeagueStandings = ({ leagueId }: LeagueStandingsProps) => {
  const [sortBy, setSortBy] = useState<'position' | 'points' | 'goal_diff'>(
    'position'
  );

  const {
    data: standings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['league-standings', leagueId],
    queryFn: () => LeaguesService.getLeagueStandings(leagueId),
    enabled: !!leagueId,
  });

  if (isLoading) return <LoadingState message="Cargando clasificación..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar la clasificación" />;
  if (!standings?.length) {
    return (
      <Card className="p-8 text-center">
        <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Sin clasificación disponible
        </h3>
        <p className="text-gray-500">
          La clasificación aparecerá cuando se jueguen los primeros partidos.
        </p>
      </Card>
    );
  }

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getPositionColor = (position: number) => {
    if (position <= 3) return 'bg-gradient-to-r from-yellow-50 to-yellow-100';
    if (position <= 8) return 'bg-green-50';
    return '';
  };

  const getFormIcon = (result: string) => {
    switch (result) {
      case 'W':
        return (
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            W
          </div>
        );
      case 'L':
        return (
          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            L
          </div>
        );
      case 'D':
        return (
          <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
            D
          </div>
        );
      default:
        return <div className="w-6 h-6 bg-gray-300 rounded-full" />;
    }
  };

  const calculateGoalDifference = (standing: LeagueStanding) => {
    return standing.sets_for - standing.sets_against;
  };

  const sortedStandings = [...standings].sort((a, b) => {
    switch (sortBy) {
      case 'points':
        return b.points - a.points;
      case 'goal_diff':
        return calculateGoalDifference(b) - calculateGoalDifference(a);
      default:
        return a.position - b.position;
    }
  });

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const blob = await LeaguesService.exportStandings(leagueId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `league-standings.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
          }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Clasificación
          </h2>
          <p className="text-gray-600 mt-1">
            Posiciones actuales de todos los equipos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>

          <div className="relative">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            {/* Add dropdown for export options */}
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-16 text-center">Pos</TableHead>
                <TableHead className="min-w-[200px]">Equipo</TableHead>
                <TableHead className="text-center w-16">PJ</TableHead>
                <TableHead className="text-center w-16">PG</TableHead>
                <TableHead className="text-center w-16">PE</TableHead>
                <TableHead className="text-center w-16">PP</TableHead>
                <TableHead className="text-center w-20">SF</TableHead>
                <TableHead className="text-center w-20">SC</TableHead>
                <TableHead className="text-center w-20">Dif</TableHead>
                <TableHead className="text-center w-20 font-bold">
                  Pts
                </TableHead>
                <TableHead className="text-center min-w-[120px]">
                  Últimos 5
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStandings.map((standing, index) => {
                const goalDiff = calculateGoalDifference(standing);

                return (
                  <motion.tr
                    key={standing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'group hover:bg-gray-50 transition-colors',
                      getPositionColor(standing.position)
                    )}
                  >
                    <TableCell className="text-center font-medium">
                      <div className="flex items-center justify-center gap-2">
                        {getPositionIcon(standing.position)}
                        <span className="text-lg font-bold">
                          {standing.position}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {standing.team_name}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {standing.players.map((player: any, idx: any) => (
                              <span
                                key={player.id}
                                className="text-xs text-gray-500"
                              >
                                {player.name}
                                {idx < standing.players.length - 1 && ' / '}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-medium">
                      {standing.matches_played}
                    </TableCell>

                    <TableCell className="text-center text-green-600 font-medium">
                      {standing.matches_won}
                    </TableCell>

                    <TableCell className="text-center text-gray-600 font-medium">
                      {standing.matches_drawn}
                    </TableCell>

                    <TableCell className="text-center text-red-600 font-medium">
                      {standing.matches_lost}
                    </TableCell>

                    <TableCell className="text-center font-medium">
                      {standing.sets_for}
                    </TableCell>

                    <TableCell className="text-center font-medium">
                      {standing.sets_against}
                    </TableCell>

                    <TableCell className="text-center font-medium">
                      <span
                        className={cn(
                          goalDiff > 0 && 'text-green-600',
                          goalDiff < 0 && 'text-red-600',
                          goalDiff === 0 && 'text-gray-600'
                        )}
                      >
                        {goalDiff > 0 ? '+' : ''}
                        {goalDiff}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className="font-bold text-lg px-3 py-1 bg-blue-100 text-blue-800"
                      >
                        {standing.points}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {standing.form.slice(-5).map((result: any, idx: any) => (
                          <div key={idx}>{getFormIcon(result)}</div>
                        ))}
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">PJ:</span> Partidos Jugados
          </div>
          <div>
            <span className="font-medium">PG:</span> Partidos Ganados
          </div>
          <div>
            <span className="font-medium">PE:</span> Partidos Empatados
          </div>
          <div>
            <span className="font-medium">PP:</span> Partidos Perdidos
          </div>
          <div>
            <span className="font-medium">SF:</span> Sets a Favor
          </div>
          <div>
            <span className="font-medium">SC:</span> Sets en Contra
          </div>
          <div>
            <span className="font-medium">Dif:</span> Diferencia de Sets
          </div>
          <div>
            <span className="font-medium">Pts:</span> Puntos
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium mb-2">Últimos 5 resultados:</h4>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              {getFormIcon('W')}
              <span>Victoria</span>
            </div>
            <div className="flex items-center gap-2">
              {getFormIcon('D')}
              <span>Empate</span>
            </div>
            <div className="flex items-center gap-2">
              {getFormIcon('L')}
              <span>Derrota</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
