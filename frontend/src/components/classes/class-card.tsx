'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
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
  Trophy,
  Target,
} from 'lucide-react';
import { Class } from '@/types/class';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/tooltip';

interface ClassCardProps {
  classItem: Class;
  variant?: 'default' | 'compact' | 'featured';
  onSelect?: (classItem: Class) => void;
  onBook?: (classItem: Class) => void;
  onEdit?: (classItem: Class) => void;
  onDelete?: (classItem: Class) => void;
  onMarkAttendance?: (classItem: Class) => void;
  showActions?: boolean;
  isSelected?: boolean;
}

const getStatusColor = (status: Class['status']) => {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'in_progress':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'completed':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (status: Class['status']) => {
  switch (status) {
    case 'scheduled':
      return <Calendar className="h-3 w-3" />;
    case 'in_progress':
      return <CheckCircle className="h-3 w-3" />;
    case 'completed':
      return <CheckCircle className="h-3 w-3" />;
    case 'cancelled':
      return <XCircle className="h-3 w-3" />;
    default:
      return <Calendar className="h-3 w-3" />;
  }
};

const getLevelColor = (level: Class['level']) => {
  switch (level) {
    case 'beginner':
      return 'bg-green-100 text-green-800';
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800';
    case 'advanced':
      return 'bg-orange-100 text-orange-800';
    case 'professional':
      return 'bg-red-100 text-red-800';
    case 'mixed':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCategoryIcon = (category: Class['category']) => {
  switch (category) {
    case 'group':
      return <Users className="h-3 w-3" />;
    case 'private':
      return <Target className="h-3 w-3" />;
    case 'semi-private':
      return <Users className="h-3 w-3" />;
    case 'intensive':
      return <Trophy className="h-3 w-3" />;
    case 'clinic':
      return <Trophy className="h-3 w-3" />;
    default:
      return <Users className="h-3 w-3" />;
  }
};

export function ClassCard({
  classItem,
  variant = 'default',
  onSelect,
  onBook,
  onEdit,
  onDelete,
  onMarkAttendance,
  showActions = true,
  isSelected = false,
}: ClassCardProps) {
  const { t, i18n } = useTranslation();
  const [isHovered, setIsHovered] = useState(false);

  const locale = i18n.language === 'es' ? es : enUS;
  const classDate = parseISO(classItem.date);
  const availableSpots =
    classItem.maxParticipants - classItem.currentParticipants;
  const occupancyPercentage =
    (classItem.currentParticipants / classItem.maxParticipants) * 100;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(classItem);
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
          className={`p-4 cursor-pointer transition-all duration-200 ${
            isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          onClick={handleCardClick}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold truncate">
                  {classItem.name}
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {classItem.instructor.firstName}{' '}
                  {classItem.instructor.lastName}
                </p>
              </div>
              <Badge className={`${getLevelColor(classItem.level)} text-xs`}>
                {t(`classes.levels.${classItem.level}`, classItem.level)}
              </Badge>
            </div>

            {/* Time & Participants */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>{classItem.startTime}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>
                  {classItem.currentParticipants}/{classItem.maxParticipants}
                </span>
              </div>
            </div>

            {/* Status */}
            <Badge
              className={`${getStatusColor(classItem.status)} text-xs w-full justify-center`}
            >
              {getStatusIcon(classItem.status)}
              <span className="ml-1">
                {t(`classes.statuses.${classItem.status}`, classItem.status)}
              </span>
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
          className={`p-6 cursor-pointer transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 ${
            isSelected
              ? 'border-blue-500 bg-blue-100'
              : 'border-blue-200 hover:border-blue-300'
          }`}
          onClick={handleCardClick}
        >
          <div className="space-y-4">
            {/* Header with Featured Badge */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3 mr-1" />
                    {t('classes.featured', 'Featured')}
                  </Badge>
                  <Badge className={getLevelColor(classItem.level)}>
                    {t(`classes.levels.${classItem.level}`, classItem.level)}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {classItem.name}
                </h3>
                {classItem.description && (
                  <p className="text-sm text-muted-foreground">
                    {classItem.description}
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
                        onClick={() =>
                          stopPropagation(event as any, () => onEdit(classItem))
                        }
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {t('common.edit', 'Edit')}
                      </DropdownMenuItem>
                    )}
                    {onMarkAttendance && classItem.status === 'scheduled' && (
                      <DropdownMenuItem
                        onClick={() =>
                          stopPropagation(event as any, () =>
                            onMarkAttendance(classItem)
                          )
                        }
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('classes.markAttendance', 'Mark Attendance')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onDelete && (
                      <DropdownMenuItem
                        onClick={() =>
                          stopPropagation(event as any, () =>
                            onDelete(classItem)
                          )
                        }
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete', 'Delete')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Instructor */}
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <img
                  src={
                    classItem.instructor.profileImage || '/default-avatar.png'
                  }
                  alt={`${classItem.instructor.firstName} ${classItem.instructor.lastName}`}
                />
              </Avatar>
              <div>
                <p className="font-semibold text-gray-900">
                  {classItem.instructor.firstName}{' '}
                  {classItem.instructor.lastName}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-muted-foreground">
                      {classItem.instructor.rating.toFixed(1)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {classItem.instructor.totalClasses}{' '}
                    {t('classes.classesCount', 'classes')}
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
                    {format(classDate, 'EEEE, MMMM d', { locale })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {classItem.startTime} - {classItem.endTime}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{classItem.club.name}</span>
                </div>
                {classItem.court && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground ml-6">
                      {t('classes.court', 'Court')} {classItem.court.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress and Price */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-green-600">
                  {classItem.currency} {classItem.price}
                  <span className="text-sm text-muted-foreground ml-1">
                    / {t('classes.perPerson', 'per person')}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {classItem.currentParticipants}/{classItem.maxParticipants}{' '}
                    {t('classes.participants', 'participants')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {availableSpots > 0
                      ? t(
                          'classes.spotsAvailable',
                          '{{count}} spots available',
                          { count: availableSpots }
                        )
                      : t('classes.fullyBooked', 'Fully booked')}
                  </p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-300 ${
                    occupancyPercentage >= 100
                      ? 'bg-red-500'
                      : occupancyPercentage >= 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            {showActions && (
              <div className="flex gap-2 pt-2">
                {onBook &&
                  classItem.status === 'scheduled' &&
                  availableSpots > 0 && (
                    <Button
                      onClick={(e) =>
                        stopPropagation(e, () => onBook(classItem))
                      }
                      className="flex-1"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('classes.book', 'Book Now')}
                    </Button>
                  )}

                {onBook &&
                  classItem.status === 'scheduled' &&
                  availableSpots === 0 && (
                    <Button
                      variant="outline"
                      onClick={(e) =>
                        stopPropagation(e, () => onBook(classItem))
                      }
                      className="flex-1"
                    >
                      {t('classes.joinWaitingList', 'Join Waiting List')}
                    </Button>
                  )}

                <Button
                  variant="outline"
                  onClick={(e) =>
                    stopPropagation(e, () => onSelect?.(classItem))
                  }
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t('classes.details', 'Details')}
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
        className={`p-4 cursor-pointer transition-all duration-200 ${
          isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
        }`}
        onClick={handleCardClick}
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold truncate">
                  {classItem.name}
                </h3>
                <Badge className={getLevelColor(classItem.level)}>
                  {t(`classes.levels.${classItem.level}`, classItem.level)}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(classItem.status)}>
                  {getStatusIcon(classItem.status)}
                  <span className="ml-1">
                    {t(
                      `classes.statuses.${classItem.status}`,
                      classItem.status
                    )}
                  </span>
                </Badge>
                <Badge variant="outline">
                  {getCategoryIcon(classItem.category)}
                  <span className="ml-1">
                    {t(
                      `classes.categories.${classItem.category}`,
                      classItem.category
                    )}
                  </span>
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
                      onClick={() =>
                        stopPropagation(event as any, () => onEdit(classItem))
                      }
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t('common.edit', 'Edit')}
                    </DropdownMenuItem>
                  )}
                  {onMarkAttendance && classItem.status === 'scheduled' && (
                    <DropdownMenuItem
                      onClick={() =>
                        stopPropagation(event as any, () =>
                          onMarkAttendance(classItem)
                        )
                      }
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {t('classes.markAttendance', 'Mark Attendance')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={() =>
                        stopPropagation(event as any, () => onDelete(classItem))
                      }
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete', 'Delete')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Instructor & Details */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <img
                src={classItem.instructor.profileImage || '/default-avatar.png'}
                alt={`${classItem.instructor.firstName} ${classItem.instructor.lastName}`}
              />
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {classItem.instructor.firstName} {classItem.instructor.lastName}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span>{classItem.instructor.rating.toFixed(1)}</span>
                </div>
                <span>•</span>
                <span>{format(classDate, 'MMM d, HH:mm', { locale })}</span>
              </div>
            </div>
          </div>

          {/* Location & Participants */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{classItem.club.name}</span>
              {classItem.court && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {classItem.court.name}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {classItem.currentParticipants}/{classItem.maxParticipants}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('classes.occupancy', 'Occupancy')}</span>
              <span>{Math.round(occupancyPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  occupancyPercentage >= 100
                    ? 'bg-red-500'
                    : occupancyPercentage >= 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Price & Actions */}
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-green-600">
              {classItem.currency} {classItem.price}
            </div>

            {showActions && (
              <div className="flex gap-2">
                {onBook &&
                  classItem.status === 'scheduled' &&
                  availableSpots > 0 && (
                    <Button
                      size="sm"
                      onClick={(e) =>
                        stopPropagation(e, () => onBook(classItem))
                      }
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {t('classes.book', 'Book')}
                    </Button>
                  )}

                {onBook &&
                  classItem.status === 'scheduled' &&
                  availableSpots === 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) =>
                        stopPropagation(e, () => onBook(classItem))
                      }
                    >
                      {t('classes.waitlist', 'Waitlist')}
                    </Button>
                  )}
              </div>
            )}
          </div>

          {/* Waiting List Info */}
          {classItem.waitingList.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {t(
                'classes.waitingListCount',
                '{{count}} people on waiting list',
                {
                  count: classItem.waitingList.length,
                }
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
