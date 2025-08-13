'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Star,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Play,
  Square,
  UserCheck,
  DollarSign,
} from 'lucide-react';
import { ClassSession } from '@/types/class';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { classUtils } from '@/lib/api/classes';
import { cn } from '@/lib/utils';

interface ClassSessionCardProps {
  session: ClassSession;
  variant?: 'default' | 'compact' | 'featured';
  onSelect?: (session: ClassSession) => void;
  onEnroll?: (session: ClassSession) => void;
  onEdit?: (session: ClassSession) => void;
  onDelete?: (session: ClassSession) => void;
  onStart?: (session: ClassSession) => void;
  onComplete?: (session: ClassSession) => void;
  onCancel?: (session: ClassSession) => void;
  onAttendance?: (session: ClassSession) => void;
  showActions?: boolean;
  isSelected?: boolean;
  className?: string;
}

const getStatusConfig = (status: string) => {
  const configs = {
    scheduled: {
      label: 'Programada',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: Calendar,
    },
    confirmed: {
      label: 'Confirmada',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle,
    },
    in_progress: {
      label: 'En Progreso',
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: Play,
    },
    completed: {
      label: 'Completada',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: CheckCircle,
    },
    cancelled: {
      label: 'Cancelada',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
    },
  };

  return configs[status as keyof typeof configs] || configs.scheduled;
};

const getEnrollmentStatusConfig = (session: ClassSession) => {
  const status = classUtils.getEnrollmentStatus(session);
  const availableSpots = classUtils.getAvailableSpots(session);

  const configs = {
    available: {
      label: `${availableSpots} disponibles`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    full: {
      label: 'Llena',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    waitlist: {
      label: 'Lista de espera',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    closed: {
      label: 'Cerrada',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  };

  return configs[status];
};

export function ClassSessionCard({
  session,
  variant = 'default',
  onSelect,
  onEnroll,
  onEdit,
  onDelete,
  onStart,
  onComplete,
  onCancel,
  onAttendance,
  showActions = true,
  isSelected = false,
  className,
}: ClassSessionCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusConfig = getStatusConfig(session.status);
  const enrollmentConfig = getEnrollmentStatusConfig(session);
  const StatusIcon = statusConfig.icon;
  
  const sessionDate = new Date(session.scheduled_datetime);
  const occupancyPercentage = (session.enrolled_count / session.max_participants) * 100;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(session);
    }
  };

  const stopPropagation = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  if (variant === 'compact') {
    return (
      <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
        <Card
          className={cn(
            'p-4 cursor-pointer transition-all duration-200',
            isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md',
            className
          )}
          onClick={handleCardClick}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold truncate">
                  {session.schedule.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {session.instructor.user.first_name} {session.instructor.user.last_name}
                </p>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: session.schedule.level.color }}
              />
            </div>

            {/* Time & Participants */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{classUtils.formatClassTime(session.scheduled_datetime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>
                  {session.enrolled_count}/{session.max_participants}
                </span>
              </div>
            </div>

            {/* Status */}
            <Badge className={cn(statusConfig.color, 'text-xs w-full justify-center')}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card
          className={cn(
            'p-6 cursor-pointer transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-50 border-2',
            isSelected
              ? 'border-blue-500 bg-blue-100'
              : 'border-blue-200 hover:border-blue-300',
            className
          )}
          onClick={handleCardClick}
        >
          <div className="space-y-4">
            {/* Header with Featured Badge */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3 mr-1" />
                    Destacada
                  </Badge>
                  <Badge
                    style={{
                      backgroundColor: session.schedule.level.color + '20',
                      color: session.schedule.level.color,
                      borderColor: session.schedule.level.color + '40',
                    }}
                  >
                    {session.schedule.level.display_name}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {session.schedule.name}
                </h3>
                {session.schedule.description && (
                  <p className="text-sm text-muted-foreground">
                    {session.schedule.description}
                  </p>
                )}
              </div>

              {showActions && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit && (
                      <DropdownMenuItem
                        onClick={(e) => stopPropagation(e, () => onEdit(session))}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {onAttendance && session.status === 'scheduled' && (
                      <DropdownMenuItem
                        onClick={(e) => stopPropagation(e, () => onAttendance(session))}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Asistencia
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={(e) => stopPropagation(e, () => onDelete(session))}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Instructor */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage
                  src={session.instructor.photo_url}
                  alt={`${session.instructor.user.first_name} ${session.instructor.user.last_name}`}
                />
                <AvatarFallback>
                  {session.instructor.user.first_name[0]}
                  {session.instructor.user.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-gray-900">
                  {session.instructor.user.first_name} {session.instructor.user.last_name}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-muted-foreground">
                      {session.instructor.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {session.instructor.years_experience} años experiencia
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {format(sessionDate, 'EEEE, d MMMM', { locale: es })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {classUtils.formatClassTime(session.scheduled_datetime)} ({session.duration_minutes}min)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {session.court?.name || session.location || 'Por definir'}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress and Price */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
                  <DollarSign className="h-5 w-5" />
                  {session.schedule.price}
                  <span className="text-sm text-muted-foreground ml-1">
                    / persona
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {session.enrolled_count}/{session.max_participants} participantes
                  </p>
                  <p className={cn('text-xs font-medium', enrollmentConfig.color)}>
                    {enrollmentConfig.label}
                  </p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={cn(
                    'h-3 rounded-full transition-all duration-300',
                    occupancyPercentage >= 100
                      ? 'bg-red-500'
                      : occupancyPercentage >= 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            {showActions && (
              <div className="flex gap-2 pt-2">
                {onEnroll && classUtils.canEnrollInSession(session).canEnroll && (
                  <Button
                    onClick={(e) => stopPropagation(e, () => onEnroll(session))}
                    className="flex-1"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Inscribirse
                  </Button>
                )}

                {onEnroll && !classUtils.canEnrollInSession(session).canEnroll && 
                 session.schedule.allow_waitlist && (
                  <Button
                    variant="outline"
                    onClick={(e) => stopPropagation(e, () => onEnroll(session))}
                    className="flex-1"
                  >
                    Lista de Espera
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={(e) => stopPropagation(e, () => onSelect?.(session))}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Detalles
                </Button>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200',
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md',
          className
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold truncate">
                  {session.schedule.name}
                </h3>
                <Badge
                  style={{
                    backgroundColor: session.schedule.level.color + '20',
                    color: session.schedule.level.color,
                    borderColor: session.schedule.level.color + '40',
                  }}
                >
                  {session.schedule.level.display_name}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusConfig.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline">
                  {session.schedule.class_type.display_name}
                </Badge>
              </div>
            </div>

            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem
                      onClick={(e) => stopPropagation(e, () => onEdit(session))}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {onStart && session.status === 'scheduled' && (
                    <DropdownMenuItem
                      onClick={(e) => stopPropagation(e, () => onStart(session))}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Iniciar Clase
                    </DropdownMenuItem>
                  )}
                  {onComplete && session.status === 'in_progress' && (
                    <DropdownMenuItem
                      onClick={(e) => stopPropagation(e, () => onComplete(session))}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completar
                    </DropdownMenuItem>
                  )}
                  {onAttendance && (
                    <DropdownMenuItem
                      onClick={(e) => stopPropagation(e, () => onAttendance(session))}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      Asistencia
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onCancel && session.status !== 'completed' && session.status !== 'cancelled' && (
                    <DropdownMenuItem
                      onClick={(e) => stopPropagation(e, () => onCancel(session))}
                      className="text-orange-600"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={(e) => stopPropagation(e, () => onDelete(session))}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Instructor & Details */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={session.instructor.photo_url}
                alt={`${session.instructor.user.first_name} ${session.instructor.user.last_name}`}
              />
              <AvatarFallback>
                {session.instructor.user.first_name[0]}
                {session.instructor.user.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session.instructor.user.first_name} {session.instructor.user.last_name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span>{session.instructor.rating.toFixed(1)}</span>
                </div>
                <span>•</span>
                <span>{format(sessionDate, 'd MMM, HH:mm', { locale: es })}</span>
              </div>
            </div>
          </div>

          {/* Location & Participants */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">
                {session.court?.name || session.location || 'Por definir'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {session.enrolled_count}/{session.max_participants}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Ocupación</span>
              <span>{Math.round(occupancyPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  occupancyPercentage >= 100
                    ? 'bg-red-500'
                    : occupancyPercentage >= 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                )}
                style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Price & Actions */}
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-green-600 flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {session.schedule.price}
            </div>

            {showActions && (
              <div className="flex gap-2">
                {onEnroll && classUtils.canEnrollInSession(session).canEnroll && (
                  <Button
                    size="sm"
                    onClick={(e) => stopPropagation(e, () => onEnroll(session))}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Inscribirse
                  </Button>
                )}

                {onEnroll && !classUtils.canEnrollInSession(session).canEnroll && 
                 session.schedule.allow_waitlist && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => stopPropagation(e, () => onEnroll(session))}
                  >
                    Lista Espera
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Enrollment Status */}
          <div className={cn(
            'text-xs text-center py-2 rounded-md',
            enrollmentConfig.bgColor,
            enrollmentConfig.color
          )}>
            {enrollmentConfig.label}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}