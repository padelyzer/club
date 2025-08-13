'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { es, en } from 'date-fns/locale';
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
import { LoadingState } from '@/components/ui/states/loading-state';

interface ClassesListProps {
  classes: Class[];
  loading?: boolean;
  onClassSelect: (classItem: Class) => void;
  onBookClass: (classItem: Class) => void;
  onEditClass: (classItem: Class) => void;
  onDeleteClass?: (classItem: Class) => void;
  onMarkAttendance: (classItem: Class) => void;
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
    case 'postponed':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
    case 'postponed':
      return <AlertCircle className="h-3 w-3" />;
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

export function ClassesList({
  classes,
  loading = false,
  onClassSelect,
  onBookClass,
  onEditClass,
  onDeleteClass,
  onMarkAttendance,
}: ClassesListProps) {
  const { t, i18n } = useTranslation();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const locale = i18n.language === 'es' ? es : en;

  if (loading) {
    return (
      <LoadingState
        message={t('classes.loadingClasses', 'Loading classes...')}
      />
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          {t('classes.noClassesFound', 'No classes found')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t(
            'classes.adjustFilters',
            'Try adjusting your filters or search criteria'
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {classes.map((classItem, index) => {
          const classDate = parseISO(classItem.date);
          const availableSpots =
            classItem.maxParticipants - classItem.currentParticipants;
          const occupancyPercentage =
            (classItem.currentParticipants / classItem.maxParticipants) * 100;

          return (
            <motion.div
              key={classItem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onHoverStart={() => setHoveredCard(classItem.id)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <Card
                className={`p-6 transition-all duration-200 cursor-pointer ${
                  hoveredCard === classItem.id
                    ? 'shadow-lg scale-[1.02]'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Main Content */}
                  <div
                    className="flex-1 space-y-3"
                    onClick={() => onClassSelect(classItem)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {classItem.name}
                          </h3>
                          <Badge className={getLevelColor(classItem.level)}>
                            {t(
                              `classes.levels.${classItem.level}`,
                              classItem.level
                            )}
                          </Badge>
                          <Badge className={getStatusColor(classItem.status)}>
                            {getStatusIcon(classItem.status)}
                            <span className="ml-1">
                              {t(
                                `classes.statuses.${classItem.status}`,
                                classItem.status
                              )}
                            </span>
                          </Badge>
                        </div>

                        {classItem.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {classItem.description}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onEditClass(classItem)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            {t('common.edit', 'Edit')}
                          </DropdownMenuItem>
                          {classItem.status === 'scheduled' && (
                            <DropdownMenuItem
                              onClick={() => onMarkAttendance(classItem)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {t('classes.markAttendance', 'Mark Attendance')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {onDeleteClass && (
                            <DropdownMenuItem
                              onClick={() => onDeleteClass(classItem)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('common.delete', 'Delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      {/* Instructor */}
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <img
                            src={
                              classItem.instructor.profileImage ||
                              '/default-avatar.png'
                            }
                            alt={`${classItem.instructor.firstName} ${classItem.instructor.lastName}`}
                          />
                        </Avatar>
                        <div>
                          <p className="font-medium text-gray-900">
                            {classItem.instructor.firstName}{' '}
                            {classItem.instructor.lastName}
                          </p>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-muted-foreground">
                              {classItem.instructor.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {format(classDate, 'EEE, MMM d', { locale })}
                          </p>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {classItem.startTime} - {classItem.endTime}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{classItem.club.name}</p>
                          {classItem.court && (
                            <p className="text-xs text-muted-foreground">
                              {t('classes.court', 'Court')}{' '}
                              {classItem.court.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Participants */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {classItem.currentParticipants}/
                            {classItem.maxParticipants}
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
                          style={{
                            width: `${Math.min(occupancyPercentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-green-600">
                        {classItem.currency} {classItem.price}
                        <span className="text-sm text-muted-foreground ml-1">
                          / {t('classes.perPerson', 'per person')}
                        </span>
                      </div>

                      {/* Waiting List Info */}
                      {classItem.waitingList.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {t('classes.waitingList', 'Waiting list')}:{' '}
                          {classItem.waitingList.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 lg:w-32">
                    {classItem.status === 'scheduled' && availableSpots > 0 && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookClass(classItem);
                        }}
                        className="w-full"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('classes.book', 'Book')}
                      </Button>
                    )}

                    {classItem.status === 'scheduled' &&
                      availableSpots === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookClass(classItem);
                          }}
                          className="w-full"
                        >
                          {t('classes.joinWaitingList', 'Join Waiting List')}
                        </Button>
                      )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClassSelect(classItem);
                      }}
                      className="w-full"
                    >
                      {t('classes.viewDetails', 'View Details')}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
