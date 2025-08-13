'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Clock,
  Medal,
  FileText,
  Settings,
  UserPlus,
  Download,
  Bell,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { LeaguesService } from '@/lib/api/services/leagues.service';
import { LeagueDetail } from '@/types/league';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { LeagueStandings } from './league-standings';
import { LeagueMatches } from './league-matches';
import { LeagueRegistrations } from './league-registrations';
import { LeagueStats } from './league-stats';

export const LeagueDetailPage = () => {
  const params = useParams();
  const leagueId = Number(params.id);
  const [activeTab, setActiveTab] = useState('standings');

  const {
    data: league,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: () => LeaguesService.getLeague(leagueId),
    enabled: !!leagueId,
  });

  if (isLoading)
    return <LoadingState message="Cargando detalles de la liga..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar la liga" />;
  if (!league) return <ErrorState message="Liga no encontrada" />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'registration_open':
        return 'bg-green-100 text-green-800';
      case 'registration_closed':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Borrador';
      case 'registration_open':
        return 'Inscripciones Abiertas';
      case 'registration_closed':
        return 'Inscripciones Cerradas';
      case 'active':
        return 'Activa';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8" />
              <h1 className="text-3xl font-bold">{league.name}</h1>
              <Badge className={getStatusColor(league.status)}>
                {getStatusText(league.status)}
              </Badge>
            </div>

            {league.description && (
              <p className="text-blue-100 mb-4 max-w-2xl">
                {league.description}
              </p>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-200" />
                <div>
                  <p className="text-sm text-blue-200">Fecha de inicio</p>
                  <p className="font-medium">
                    {format(new Date(league.start_date), 'd MMM yyyy', {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-200" />
                <div>
                  <p className="text-sm text-blue-200">Participantes</p>
                  <p className="font-medium">
                    {league.current_participants} / {league.max_participants}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-200" />
                <div>
                  <p className="text-sm text-blue-200">Club</p>
                  <p className="font-medium">{league.club_name}</p>
                </div>
              </div>

              {league.entry_fee && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-200" />
                  <div>
                    <p className="text-sm text-blue-200">Inscripción</p>
                    <p className="font-medium">
                      ${league.entry_fee} {league.currency || 'MXN'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar
            </Button>

            {league.status === 'registration_open' && (
              <Button
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Inscribirse
              </Button>
            )}

            <Button
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab || ''} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="standings" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Clasificación
          </TabsTrigger>
          <TabsTrigger value="matches" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Partidos
          </TabsTrigger>
          <TabsTrigger
            value="registrations"
            className="flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Inscripciones
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <Medal className="w-4 h-4" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Información
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="standings" className="space-y-6">
            <LeagueStandings leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="matches" className="space-y-6">
            <LeagueMatches leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="registrations" className="space-y-6">
            <LeagueRegistrations leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <LeagueStats leagueId={leagueId} />
          </TabsContent>

          <TabsContent value="info" className="space-y-6">
            <LeagueInfo league={league} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

// League Information Tab Component
const LeagueInfo = ({ league }: { league: LeagueDetail }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Información General
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Tipo de Liga
            </label>
            <p className="text-sm">{league.type}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Deporte</label>
            <p className="text-sm capitalize">{league.sport}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Fecha de Fin
            </label>
            <p className="text-sm">
              {format(new Date(league.end_date), "d 'de' MMMM 'de' yyyy", {
                locale: es,
              })}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Límite de Inscripción
            </label>
            <p className="text-sm">
              {format(
                new Date(league.registration_deadline),
                "d 'de' MMMM 'de' yyyy",
                { locale: es }
              )}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Organizador
            </label>
            <p className="text-sm">{league.organizer.name}</p>
            <p className="text-xs text-gray-500">{league.organizer.email}</p>
          </div>
        </div>
      </Card>

      {/* Match Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Configuración de Partidos
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Duración por Partido
            </label>
            <p className="text-sm">{league.match_duration} minutos</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Sets por Partido
            </label>
            <p className="text-sm">{league.sets_per_match}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Juegos por Set
            </label>
            <p className="text-sm">{league.games_per_set}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Tie Break
            </label>
            <p className="text-sm">{league.tie_break ? 'Sí' : 'No'}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Punto de Oro
            </label>
            <p className="text-sm">{league.golden_point ? 'Sí' : 'No'}</p>
          </div>
        </div>
      </Card>

      {/* Scoring System */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Sistema de Puntuación
        </h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Puntos por Victoria
            </label>
            <p className="text-sm">{league.scoring_system.win_points}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Puntos por Empate
            </label>
            <p className="text-sm">{league.scoring_system.draw_points}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Puntos por Derrota
            </label>
            <p className="text-sm">{league.scoring_system.loss_points}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">
              Puntos por Walkover
            </label>
            <p className="text-sm">{league.scoring_system.walkover_points}</p>
          </div>
        </div>
      </Card>

      {/* Courts and Categories */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Canchas y Categorías
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500 mb-2 block">
              Canchas Disponibles
            </label>
            <div className="flex flex-wrap gap-2">
              {league.courts.map((court) => (
                <Badge key={court.id} variant="outline">
                  {court.name}
                </Badge>
              ))}
            </div>
          </div>

          {league.categories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 mb-2 block">
                Categorías
              </label>
              <div className="flex flex-wrap gap-2">
                {league.categories.map((category) => (
                  <Badge key={category} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Rules and Prizes */}
      {(league.rules || league.prizes) && (
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Reglas y Premios
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {league.rules && (
              <div>
                <h4 className="font-medium mb-2">Reglas</h4>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                  {league.rules}
                </div>
              </div>
            )}

            {league.prizes && (
              <div>
                <h4 className="font-medium mb-2">Premios</h4>
                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                  {league.prizes}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
