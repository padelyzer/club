'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Trophy,
  Clock,
  Users,
  Target,
  Activity,
  Award,
  Calendar,
  Zap,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { LeaguesService } from '@/lib/api/services/leagues.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LeagueStatsProps {
  leagueId: number;
}

export const LeagueStats = ({ leagueId }: LeagueStatsProps) => {
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['league-stats', leagueId],
    queryFn: () => LeaguesService.getLeagueStats(leagueId),
    enabled: !!leagueId,
  });

  if (isLoading) return <LoadingState message="Cargando estadísticas..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar las estadísticas" />;
  if (!stats) return <ErrorState message="No hay estadísticas disponibles" />;

  const completionPercentage =
    stats.total_matches > 0
      ? Math.round((stats.completed_matches / stats.total_matches) * 100)
      : 0;

  const participationRate =
    stats.total_players > 0
      ? Math.round((stats.active_players / stats.total_players) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-purple-500" />
          Estadísticas
        </h2>
        <p className="text-gray-600 mt-1">
          Análisis detallado del rendimiento de la liga
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Partidos</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.total_matches}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={completionPercentage || ''} className="flex-1" />
                  <span className="text-sm text-gray-500">
                    {completionPercentage}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jugadores Activos</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.active_players}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={participationRate || ''} className="flex-1" />
                  <span className="text-sm text-gray-500">
                    {participationRate}%
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sets Jugados</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.total_sets_played.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {stats.total_games_played.toLocaleString()} juegos
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Duración Promedio</p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.average_match_duration}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  minutos por partido
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Progreso de la Liga
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    Partidos Completados
                  </span>
                  <span className="text-sm font-medium">
                    {stats.completed_matches}/{stats.total_matches}
                  </span>
                </div>
                <Progress value={completionPercentage || ''} className="h-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    Partidos Próximos
                  </span>
                  <span className="text-sm font-medium">
                    {stats.upcoming_matches}
                  </span>
                </div>
                <Progress
                  value={
                    stats.total_matches > 0
                      ? (stats.upcoming_matches / stats.total_matches) * 100
                      : 0
                   || ''}
                  className="h-2"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">
                    Participación de Jugadores
                  </span>
                  <span className="text-sm font-medium">
                    {stats.active_players}/{stats.total_players}
                  </span>
                </div>
                <Progress value={participationRate || ''} className="h-2" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Mejores Jugadores
            </h3>

            <div className="space-y-3">
              {stats.top_scorers.slice(0, 5).map((player: any, index: any) => (
                <div
                  key={player.player_id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-800'
                          : index === 1
                            ? 'bg-gray-100 text-gray-800'
                            : index === 2
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {player.player_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {player.matches_won} victorias
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {player.win_percentage.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Records and Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-500" />
              Récords de la Liga
            </h3>

            <div className="space-y-4">
              {stats.highest_scoring_match && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium text-gray-900">
                      Partido con más juegos
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.highest_scoring_match.teams}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stats.highest_scoring_match.score} •{' '}
                    {stats.highest_scoring_match.total_games} juegos
                  </p>
                </div>
              )}

              {stats.longest_match && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-gray-900">
                      Partido más largo
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {stats.longest_match.teams}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stats.longest_match.duration} minutos
                  </p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-500" />
              Resultados Recientes
            </h3>

            <div className="space-y-3">
              {stats.recent_results.slice(0, 5).map((match: any, index: any) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {match.home_team.name} vs {match.away_team.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(match.scheduled_date), 'd MMM', {
                        locale: es,
                      })}{' '}
                      • {match.court.name}
                    </p>
                  </div>

                  {match.status === 'completed' &&
                    match.home_score !== undefined &&
                    match.away_score !== undefined && (
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {match.home_score} - {match.away_score}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {match.duration
                            ? `${match.duration}min`
                            : 'Finalizado'}
                        </Badge>
                      </div>
                    )}
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
