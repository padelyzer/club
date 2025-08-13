'use client';

import { motion } from 'framer-motion';
import {
  Plus,
  Calendar,
  Users,
  Clock,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Mock data for classes
const mockClasses = [
  {
    id: 1,
    name: 'Pádel Iniciación',
    instructor: 'Carlos Martínez',
    date: '2025-07-29',
    time: '09:00',
    duration: 90,
    level: 'Principiante',
    participants: 8,
    maxParticipants: 12,
    court: 'Pista Central',
    price: 25,
    status: 'scheduled',
  },
  {
    id: 2,
    name: 'Técnica Avanzada',
    instructor: 'Ana García',
    date: '2025-07-29',
    time: '11:00',
    duration: 120,
    level: 'Avanzado',
    participants: 6,
    maxParticipants: 8,
    court: 'Pista Premium',
    price: 40,
    status: 'scheduled',
  },
  {
    id: 3,
    name: 'Pádel Junior',
    instructor: 'Luis Rodríguez',
    date: '2025-07-30',
    time: '16:00',
    duration: 60,
    level: 'Junior',
    participants: 10,
    maxParticipants: 14,
    court: 'Pista Exterior 1',
    price: 15,
    status: 'completed',
  },
  {
    id: 4,
    name: 'Entrenamiento Competición',
    instructor: 'María López',
    date: '2025-07-31',
    time: '19:00',
    duration: 150,
    level: 'Competición',
    participants: 4,
    maxParticipants: 6,
    court: 'Pista Cristal',
    price: 50,
    status: 'scheduled',
  },
];

const levelConfig = {
  Principiante: {
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  Intermedio: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  },
  Avanzado: {
    color:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
  },
  Competición: {
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
  Junior: {
    color:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  },
};

const statusConfig = {
  scheduled: { label: 'Programada', color: 'bg-blue-100 text-blue-800' },
  ongoing: { label: 'En Curso', color: 'bg-green-100 text-green-800' },
  completed: { label: 'Completada', color: 'bg-gray-100 text-gray-800' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

export default function ClassesPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Clases
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona las clases y entrenamientos del club
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Instructores
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva Clase
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Clases Hoy
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                3
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Instructores Activos
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                8
              </p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Estudiantes
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                28
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Próximas Clases
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                12
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>
      </div>

      {/* Classes List */}
      <div className="grid gap-6">
        {mockClasses.map((classItem, index) => (
          <motion.div
            key={classItem.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                {/* Class Info */}
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {classItem.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Instructor: {classItem.instructor}
                    </p>
                  </div>
                </div>

                {/* Status & Level Badges */}
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      levelConfig[classItem.level as keyof typeof levelConfig]
                        .color
                    }
                  >
                    {classItem.level}
                  </Badge>
                  <Badge
                    className={
                      statusConfig[
                        classItem.status as keyof typeof statusConfig
                      ].color
                    }
                  >
                    {
                      statusConfig[
                        classItem.status as keyof typeof statusConfig
                      ].label
                    }
                  </Badge>
                </div>
              </div>

              {/* Class Details */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(classItem.date).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {classItem.time} ({classItem.duration}min)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {classItem.participants}/{classItem.maxParticipants}{' '}
                    estudiantes
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    €{classItem.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    • {classItem.court}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Ocupación</span>
                  <span>
                    {Math.round(
                      (classItem.participants / classItem.maxParticipants) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(classItem.participants / classItem.maxParticipants) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                {classItem.status === 'scheduled' && (
                  <>
                    <Button size="sm" variant="outline">
                      Ver Detalles
                    </Button>
                    <Button size="sm">Gestionar</Button>
                  </>
                )}
                {classItem.status === 'completed' && (
                  <Button size="sm" variant="outline">
                    Ver Resultados
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State (shown when no classes) */}
      {mockClasses.length === 0 && (
        <Card className="p-12 text-center">
          <GraduationCap className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No hay clases programadas
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comienza creando la primera clase para tus estudiantes.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primera Clase
          </Button>
        </Card>
      )}
    </div>
  );
}
