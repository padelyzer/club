'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap,
  Users,
  MapPin,
} from 'lucide-react';
import { format, addDays, differenceInDays, isAfter, isBefore } from 'date-fns';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WizardStepProps } from '../tournament-form-types';

// Validador de fechas inteligente
const SmartDateValidator: React.FC<{
  registrationStart: string;
  registrationEnd: string;
  tournamentStart: string;
  tournamentEnd: string;
}> = ({
  registrationStart,
  registrationEnd,
  tournamentStart,
  tournamentEnd,
}) => {
  const { t } = useTranslation();

  const getValidationStatus = () => {
    if (
      !registrationStart ||
      !registrationEnd ||
      !tournamentStart ||
      !tournamentEnd
    ) {
      return { isValid: false, warnings: [], errors: [] };
    }

    const regStart = new Date(registrationStart);
    const regEnd = new Date(registrationEnd);
    const tournStart = new Date(tournamentStart);
    const tournEnd = new Date(tournamentEnd);
    const now = new Date();

    const errors = [];
    const warnings = [];

    // Validaciones críticas
    if (isAfter(regStart, regEnd)) {
      errors.push(t('tournaments.form.errors.registrationStartAfterEnd'));
    }
    if (isAfter(regEnd, tournStart)) {
      errors.push(t('tournaments.form.errors.registrationEndAfterTournament'));
    }
    if (isAfter(tournStart, tournEnd)) {
      errors.push(t('tournaments.form.errors.tournamentStartAfterEnd'));
    }

    // Validaciones de tiempo
    if (isBefore(regStart, now)) {
      warnings.push(t('tournaments.form.warnings.registrationInPast'));
    }

    const regPeriod = differenceInDays(regEnd, regStart);
    if (regPeriod < 3) {
      warnings.push(t('tournaments.form.warnings.shortRegistrationPeriod'));
    }
    if (regPeriod > 60) {
      warnings.push(t('tournaments.form.warnings.longRegistrationPeriod'));
    }

    const timeToTournament = differenceInDays(tournStart, regEnd);
    if (timeToTournament < 1) {
      warnings.push(t('tournaments.form.warnings.shortPreparationTime'));
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  const status = getValidationStatus();

  if (
    !registrationStart ||
    !registrationEnd ||
    !tournamentStart ||
    !tournamentEnd
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      {status.errors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
              {t('tournaments.form.dateErrors')}
            </h4>
          </div>
          <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
            {status.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {status.warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center mb-2">
            <Info className="h-4 w-4 text-yellow-600 mr-2" />
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('tournaments.form.dateWarnings')}
            </h4>
          </div>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
            {status.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {status.isValid && status.warnings.length === 0 && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              {t('tournaments.form.datesValid')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Generador de sugerencias de fechas
const DateSuggestions: React.FC<{
  onApplySuggestion: (dates: {
    registrationStart: string;
    registrationEnd: string;
    tournamentStart: string;
    tournamentEnd: string;
  }) => void;
}> = ({ onApplySuggestion }) => {
  const { t } = useTranslation();

  const generateSuggestions = () => {
    const now = new Date();
    const suggestions = [
      {
        name: t('tournaments.form.suggestions.quickTournament'),
        description: t('tournaments.form.suggestions.quickDescription'),
        dates: {
          registrationStart: format(addDays(now, 2), 'yyyy-MM-dd'),
          registrationEnd: format(addDays(now, 9), 'yyyy-MM-dd'),
          tournamentStart: format(addDays(now, 12), 'yyyy-MM-dd'),
          tournamentEnd: format(addDays(now, 14), 'yyyy-MM-dd'),
        },
      },
      {
        name: t('tournaments.form.suggestions.standardTournament'),
        description: t('tournaments.form.suggestions.standardDescription'),
        dates: {
          registrationStart: format(addDays(now, 7), 'yyyy-MM-dd'),
          registrationEnd: format(addDays(now, 21), 'yyyy-MM-dd'),
          tournamentStart: format(addDays(now, 28), 'yyyy-MM-dd'),
          tournamentEnd: format(addDays(now, 35), 'yyyy-MM-dd'),
        },
      },
      {
        name: t('tournaments.form.suggestions.majorTournament'),
        description: t('tournaments.form.suggestions.majorDescription'),
        dates: {
          registrationStart: format(addDays(now, 14), 'yyyy-MM-dd'),
          registrationEnd: format(addDays(now, 42), 'yyyy-MM-dd'),
          tournamentStart: format(addDays(now, 56), 'yyyy-MM-dd'),
          tournamentEnd: format(addDays(now, 70), 'yyyy-MM-dd'),
        },
      },
    ];

    return suggestions;
  };

  const suggestions = generateSuggestions();

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {t('tournaments.form.suggestedTimelines')}
      </h4>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
            onClick={() => onApplySuggestion(suggestion.dates)}
          >
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900 dark:text-gray-100">
                  {suggestion.name}
                </h5>
                <p className="text-xs text-gray-500 mt-1">
                  {suggestion.description}
                </p>
              </div>
              <Button variant="outline" size="sm">
                {t('tournaments.form.apply')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Timeline visual
const TournamentTimeline: React.FC<{
  registrationStart: string;
  registrationEnd: string;
  tournamentStart: string;
  tournamentEnd: string;
}> = ({
  registrationStart,
  registrationEnd,
  tournamentStart,
  tournamentEnd,
}) => {
  const { t } = useTranslation();

  if (
    !registrationStart ||
    !registrationEnd ||
    !tournamentStart ||
    !tournamentEnd
  ) {
    return null;
  }

  const events = [
    {
      date: registrationStart,
      label: t('tournaments.form.timeline.registrationOpens'),
      icon: Users,
      color: 'blue',
    },
    {
      date: registrationEnd,
      label: t('tournaments.form.timeline.registrationCloses'),
      icon: Clock,
      color: 'yellow',
    },
    {
      date: tournamentStart,
      label: t('tournaments.form.timeline.tournamentStarts'),
      icon: Zap,
      color: 'green',
    },
    {
      date: tournamentEnd,
      label: t('tournaments.form.timeline.tournamentEnds'),
      icon: CheckCircle,
      color: 'purple',
    },
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300',
    yellow:
      'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500 text-yellow-700 dark:text-yellow-300',
    green:
      'bg-green-100 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300',
    purple:
      'bg-purple-100 dark:bg-purple-900/20 border-purple-500 text-purple-700 dark:text-purple-300',
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
        {t('tournaments.form.tournamentTimeline')}
      </h4>
      <div className="space-y-3">
        {events.map((event, index) => {
          const Icon = event.icon;
          return (
            <div key={index} className="flex items-center space-x-3">
              <div
                className={cn(
                  'p-2 rounded-lg border',
                  colorClasses[event.color as keyof typeof colorClasses]
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {event.label}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(event.date), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {differenceInDays(new Date(event.date), new Date()) > 0
                  ? `${differenceInDays(new Date(event.date), new Date())} ${t('tournaments.form.daysFromNow')}`
                  : t('tournaments.form.today')}
              </Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TournamentScheduling: React.FC<WizardStepProps> = ({
  data,
  errors,
  register,
  watch,
  setValue,
}) => {
  const { t } = useTranslation();
  const [showSuggestions, setShowSuggestions] = useState(false);

  const watchRegistrationStart = watch('registrationStartDate');
  const watchRegistrationEnd = watch('registrationEndDate');
  const watchTournamentStart = watch('startDate');
  const watchTournamentEnd = watch('endDate');

  // Auto-sugerir fechas cuando se cambia una fecha clave
  const handleDateChange = (field: string, value: string) => {
    setValue(field as any, value);

    // Auto-completar fechas relacionadas si están vacías
    if (field === 'registrationStartDate' && value && !watchRegistrationEnd) {
      const regStart = new Date(value);
      setValue(
        'registrationEndDate',
        format(addDays(regStart, 14), 'yyyy-MM-dd')
      );
    }

    if (field === 'registrationEndDate' && value && !watchTournamentStart) {
      const regEnd = new Date(value);
      setValue('startDate', format(addDays(regEnd, 3), 'yyyy-MM-dd'));
    }

    if (field === 'startDate' && value && !watchTournamentEnd) {
      const tournStart = new Date(value);
      setValue('endDate', format(addDays(tournStart, 3), 'yyyy-MM-dd'));
    }
  };

  const applyDateSuggestion = (dates: any) => {
    setValue('registrationStartDate', dates.registrationStart);
    setValue('registrationEndDate', dates.registrationEnd);
    setValue('startDate', dates.tournamentStart);
    setValue('endDate', dates.tournamentEnd);
    setShowSuggestions(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full">
          <Calendar className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('tournaments.form.steps.scheduling.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('tournaments.form.steps.scheduling.description')}
        </p>
      </div>

      {/* Sugerencias de fechas */}
      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className="text-sm"
        >
          <Zap className="h-4 w-4 mr-2" />
          {t('tournaments.form.quickSetup')}
        </Button>
      </div>

      {showSuggestions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <DateSuggestions onApplySuggestion={applyDateSuggestion} />
        </motion.div>
      )}

      {/* Fechas de registro */}
      <div>
        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('tournaments.form.registrationPeriod')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="registrationStartDate">
              {t('tournaments.form.fields.registrationStartDate')} *
            </Label>
            <Input
              id="registrationStartDate"
              type="date"
              {...register('registrationStartDate')}
              onChange={(e) =>
                handleDateChange('registrationStartDate', e.target.value)
              }
              className={cn(
                'mt-1',
                errors.registrationStartDate && 'border-red-500'
              )}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            {errors.registrationStartDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.registrationStartDate.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {t('tournaments.form.hints.registrationStart')}
            </p>
          </div>

          <div>
            <Label htmlFor="registrationEndDate">
              {t('tournaments.form.fields.registrationEndDate')} *
            </Label>
            <Input
              id="registrationEndDate"
              type="date"
              {...register('registrationEndDate')}
              onChange={(e) =>
                handleDateChange('registrationEndDate', e.target.value)
              }
              className={cn(
                'mt-1',
                errors.registrationEndDate && 'border-red-500'
              )}
              min={watchRegistrationStart || format(new Date(), 'yyyy-MM-dd')}
            />
            {errors.registrationEndDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.registrationEndDate.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {t('tournaments.form.hints.registrationEnd')}
            </p>
          </div>
        </div>
      </div>

      {/* Fechas del torneo */}
      <div>
        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('tournaments.form.tournamentDates')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="startDate">
              {t('tournaments.form.fields.startDate')} *
            </Label>
            <Input
              id="startDate"
              type="date"
              {...register('startDate')}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className={cn('mt-1', errors.startDate && 'border-red-500')}
              min={watchRegistrationEnd || format(new Date(), 'yyyy-MM-dd')}
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.startDate.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {t('tournaments.form.hints.tournamentStart')}
            </p>
          </div>

          <div>
            <Label htmlFor="endDate">
              {t('tournaments.form.fields.endDate')} *
            </Label>
            <Input
              id="endDate"
              type="date"
              {...register('endDate')}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className={cn('mt-1', errors.endDate && 'border-red-500')}
              min={watchTournamentStart || format(new Date(), 'yyyy-MM-dd')}
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.endDate.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {t('tournaments.form.hints.tournamentEnd')}
            </p>
          </div>
        </div>
      </div>

      {/* Validación de fechas */}
      <SmartDateValidator
        registrationStart={watchRegistrationStart}
        registrationEnd={watchRegistrationEnd}
        tournamentStart={watchTournamentStart}
        tournamentEnd={watchTournamentEnd}
      />

      {/* Timeline visual */}
      <TournamentTimeline
        registrationStart={watchRegistrationStart}
        registrationEnd={watchRegistrationEnd}
        tournamentStart={watchTournamentStart}
        tournamentEnd={watchTournamentEnd}
      />

      {/* Información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resumen de plazos */}
        {watchRegistrationStart &&
          watchRegistrationEnd &&
          watchTournamentStart && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
                {t('tournaments.form.schedulesSummary')}
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">
                    {t('tournaments.form.registrationPeriod')}:
                  </span>
                  <span className="font-medium">
                    {differenceInDays(
                      new Date(watchRegistrationEnd),
                      new Date(watchRegistrationStart)
                    )}{' '}
                    {t('tournaments.form.days')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-300">
                    {t('tournaments.form.preparationTime')}:
                  </span>
                  <span className="font-medium">
                    {differenceInDays(
                      new Date(watchTournamentStart),
                      new Date(watchRegistrationEnd)
                    )}{' '}
                    {t('tournaments.form.days')}
                  </span>
                </div>
                {watchTournamentEnd && (
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">
                      {t('tournaments.form.tournamentDuration')}:
                    </span>
                    <span className="font-medium">
                      {differenceInDays(
                        new Date(watchTournamentEnd),
                        new Date(watchTournamentStart)
                      ) + 1}{' '}
                      {t('tournaments.form.days')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Recordatorios automáticos */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('tournaments.form.automaticReminders')}
          </h4>
          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
              {t('tournaments.form.reminderFeatures.registrationOpen')}
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
              {t('tournaments.form.reminderFeatures.registrationClosing')}
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
              {t('tournaments.form.reminderFeatures.tournamentApproaching')}
            </div>
            <div className="flex items-center">
              <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
              {t('tournaments.form.reminderFeatures.matchReminders')}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
