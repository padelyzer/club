'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Play,
  CheckCircle,
  XCircle,
  Edit,
  Filter,
  Search,
  Plus,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { LeaguesService } from '@/lib/api/services/leagues.service';
import { LeagueMatch } from '@/types/league';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

interface LeagueMatchesProps {
  leagueId: number;
}

export const LeagueMatches = ({ leagueId }: LeagueMatchesProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const {
    data: matches,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['league-matches', leagueId, statusFilter, roundFilter],
    queryFn: () =>
      LeaguesService.getLeagueMatches(leagueId, {
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
        round: roundFilter !== 'all' ? parseInt(roundFilter) : undefined,
      }),
    enabled: !!leagueId,
  });

  const updateMatchMutation = useMutation({
    mutationFn: ({ matchId, data }: { matchId: number; data: any }) =>
      LeaguesService.updateMatch(leagueId, matchId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league-matches', leagueId] });
      toast.success('Partido actualizado exitosamente');
    },
    onError: () => {
      toast.error('Error al actualizar el partido');
    },
  });

  if (isLoading) return <LoadingState message="Cargando partidos..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar los partidos" />;
  if (!matches?.length) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Sin partidos programados
        </h3>
        <p className="text-gray-500">
          Los partidos aparecerán cuando se genere el calendario.
        </p>
        <Button className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Generar Calendario
        </Button>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'postponed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Programado';
      case 'in_progress':
        return 'En Progreso';
      case 'completed':
        return 'Completado';
      case 'cancelled':
        return 'Cancelado';
      case 'postponed':
        return 'Pospuesto';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <Play className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      case 'postponed':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Filter matches based on search term
  const filteredMatches = matches.filter((match) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      match.home_team.name.toLowerCase().includes(searchLower) ||
      match.away_team.name.toLowerCase().includes(searchLower) ||
      match.court.name.toLowerCase().includes(searchLower)
    );
  });

  // Group matches by round
  const matchesByRound = filteredMatches.reduce(
    (acc, match) => {
      const round = match.round;
      if (!acc[round]) acc[round] = [];
      acc[round].push(match);
      return acc;
    },
    {} as Record<number, LeagueMatch[]>
  );

  const handleQuickAction = (
    match: LeagueMatch,
    action: 'start' | 'complete' | 'cancel'
  ) => {
    let updateData: any = {};

    switch (action) {
      case 'start':
        updateData = { status: 'in_progress' };
        break;
      case 'complete':
        updateData = { status: 'completed' };
        break;
      case 'cancel':
        updateData = { status: 'cancelled' };
        break;
    }

    updateMatchMutation.mutate({
      matchId: match.id,
      data: updateData,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-500" />
            Partidos
          </h2>
          <p className="text-gray-600 mt-1">Calendario completo de la liga</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar equipos o cancha..."
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>

          <Select value={statusFilter || ''} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="scheduled">Programados</SelectItem>
              <SelectItem value="in_progress">En Progreso</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={roundFilter || ''} onValueChange={setRoundFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Jornada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {[...new Set(matches.map((m) => m.round))].sort().map((round) => (
                <SelectItem key={round} value={round.toString() || ''}>
                  Jornada {round}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Matches grouped by round */}
      <div className="space-y-8">
        {Object.entries(matchesByRound)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([round, roundMatches]) => (
            <div key={round}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                  {round}
                </div>
                Jornada {round}
                <Badge variant="outline" className="ml-2">
                  {roundMatches.length} partidos
                </Badge>
              </h3>

              <div className="grid gap-4">
                {roundMatches.map((match: any, index: any) => (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        {/* Match Info */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                          {/* Teams */}
                          <div className="md:col-span-2">
                            <div className="flex items-center justify-between">
                              {/* Home Team */}
                              <div className="text-right flex-1">
                                <div className="font-medium text-gray-900">
                                  {match.home_team.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {match.home_team.players
                                    .map((p: any) => p.name)
                                    .join(' / ')}
                                </div>
                              </div>

                              {/* Score */}
                              <div className="mx-4 text-center">
                                {match.status === 'completed' ? (
                                  <div className="font-bold text-lg">
                                    <span
                                      className={cn(
                                        match.home_score! > match.away_score!
                                          ? 'text-green-600'
                                          : 'text-gray-600'
                                      )}
                                    >
                                      {match.home_score}
                                    </span>
                                    <span className="mx-2 text-gray-400">
                                      -
                                    </span>
                                    <span
                                      className={cn(
                                        match.away_score! > match.home_score!
                                          ? 'text-green-600'
                                          : 'text-gray-600'
                                      )}
                                    >
                                      {match.away_score}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-gray-400 font-medium">
                                    vs
                                  </div>
                                )}
                              </div>

                              {/* Away Team */}
                              <div className="text-left flex-1">
                                <div className="font-medium text-gray-900">
                                  {match.away_team.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {match.away_team.players
                                    .map((p: any) => p.name)
                                    .join(' / ')}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Date & Time */}
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(match.scheduled_date), 'd MMM', {
                                locale: es,
                              })}
                            </div>
                            <div className="flex items-center justify-center gap-1 text-sm text-gray-600 mt-1">
                              <Clock className="w-4 h-4" />
                              {format(new Date(match.scheduled_date), 'HH:mm')}
                            </div>
                          </div>

                          {/* Court */}
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              {match.court.name}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="text-center">
                            <Badge className={getStatusColor(match.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(match.status)}
                                {getStatusText(match.status)}
                              </div>
                            </Badge>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {match.status === 'scheduled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickAction(match, 'start')}
                              disabled={updateMatchMutation.isPending}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}

                          {match.status === 'in_progress' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleQuickAction(match, 'complete')
                              }
                              disabled={updateMatchMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}

                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Sets detail for completed matches */}
                      {match.status === 'completed' &&
                        match.sets &&
                        match.sets.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-center gap-4">
                              <span className="text-sm text-gray-500">
                                Sets:
                              </span>
                              {match.sets.map((set: any, idx: any) => (
                                <div key={idx} className="text-sm">
                                  <span
                                    className={cn(
                                      set.home_score > set.away_score
                                        ? 'font-bold text-green-600'
                                        : 'text-gray-600'
                                    )}
                                  >
                                    {set.home_score}
                                  </span>
                                  <span className="mx-1 text-gray-400">-</span>
                                  <span
                                    className={cn(
                                      set.away_score > set.home_score
                                        ? 'font-bold text-green-600'
                                        : 'text-gray-600'
                                    )}
                                  >
                                    {set.away_score}
                                  </span>
                                </div>
                              ))}
                              {match.duration && (
                                <span className="text-xs text-gray-500 ml-4">
                                  {match.duration} min
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {filteredMatches.length === 0 && (
        <Card className="p-8 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Sin resultados
          </h3>
          <p className="text-gray-500">
            No se encontraron partidos que coincidan con los filtros
            seleccionados.
          </p>
        </Card>
      )}
    </div>
  );
};
