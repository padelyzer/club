'use client';

import { motion } from 'framer-motion';
import { Plus, Trophy, Calendar, Users, Award, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Mock data for tournaments
const mockTournaments = [
  {
    id: 1,
    name: 'Torneo de Primavera',
    status: 'upcoming',
    startDate: '2025-08-15',
    endDate: '2025-08-20',
    participants: 32,
    maxParticipants: 64,
    prize: 1500,
    category: 'Profesional',
    format: 'Eliminación directa',
    courts: ['Pista Central', 'Pista Cristal'],
  },
  {
    id: 2,
    name: 'Copa de Verano',
    status: 'ongoing',
    startDate: '2025-07-28',
    endDate: '2025-08-05',
    participants: 24,
    maxParticipants: 32,
    prize: 800,
    category: 'Amateur',
    format: 'Round Robin',
    courts: ['Pista Exterior 1', 'Pista Exterior 2'],
  },
  {
    id: 3,
    name: 'Torneo Masters',
    status: 'completed',
    startDate: '2025-07-01',
    endDate: '2025-07-10',
    participants: 16,
    maxParticipants: 16,
    prize: 2000,
    category: 'Elite',
    format: 'Eliminación directa',
    courts: ['Pista Premium'],
    winner: 'Equipo Campeón',
  },
];

const statusConfig = {
  upcoming: {
    label: 'Próximo',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  },
  ongoing: {
    label: 'En Curso',
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  completed: {
    label: 'Finalizado',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  },
};

export default function TournamentsPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Torneos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona y participa en torneos de pádel
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Torneo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Torneos Activos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                2
              </p>
            </div>
            <Trophy className="h-8 w-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Participantes
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                56
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Próximos Partidos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                12
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Premios Totales
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                €4,300
              </p>
            </div>
            <Award className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockTournaments.map((tournament, index) => (
          <motion.div
            key={tournament.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Tournament Header */}
              <div className="h-32 bg-gradient-to-br from-yellow-400 to-orange-500 relative">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-4 left-4">
                  <h3 className="text-xl font-bold text-white">
                    {tournament.name}
                  </h3>
                  <p className="text-white/80">{tournament.category}</p>
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <Badge
                    className={
                      statusConfig[
                        tournament.status as keyof typeof statusConfig
                      ].color
                    }
                  >
                    {
                      statusConfig[
                        tournament.status as keyof typeof statusConfig
                      ].label
                    }
                  </Badge>
                </div>
              </div>

              {/* Tournament Info */}
              <div className="p-6">
                {/* Dates */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-gray-600 dark:text-gray-400">
                    Fechas
                  </span>
                  <span className="font-medium">
                    {new Date(tournament.startDate).toLocaleDateString()} -{' '}
                    {new Date(tournament.endDate).toLocaleDateString()}
                  </span>
                </div>

                {/* Participants */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Participantes
                  </span>
                  <span className="font-medium">
                    {tournament.participants}/{tournament.maxParticipants}
                  </span>
                </div>

                {/* Prize */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Award className="w-4 h-4" />
                    Premio
                  </span>
                  <span className="font-medium">€{tournament.prize}</span>
                </div>

                {/* Format */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-gray-600 dark:text-gray-400">
                    Formato
                  </span>
                  <span className="font-medium">{tournament.format}</span>
                </div>

                {/* Winner (if completed) */}
                {tournament.status === 'completed' && tournament.winner && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                        Ganador: {tournament.winner}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {tournament.status === 'upcoming' && (
                    <Button variant="outline" size="sm" className="flex-1">
                      Inscribirse
                    </Button>
                  )}
                  {tournament.status === 'ongoing' && (
                    <Button variant="outline" size="sm" className="flex-1">
                      Ver Bracket
                    </Button>
                  )}
                  {tournament.status === 'completed' && (
                    <Button variant="outline" size="sm" className="flex-1">
                      Ver Resultados
                    </Button>
                  )}
                  <Button size="sm">Ver Detalles</Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State (shown when no tournaments) */}
      {mockTournaments.length === 0 && (
        <Card className="p-12 text-center">
          <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No hay torneos disponibles
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Crea el primer torneo para comenzar a organizar competiciones.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primer Torneo
          </Button>
        </Card>
      )}
    </div>
  );
}
