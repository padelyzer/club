'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Trophy,
  Users,
  Target,
  Info,
  AlertTriangle,
  CheckCircle,
  Settings,
  Zap,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { WizardStepProps } from '../tournament-form-types';
import { TournamentFormat, TournamentCategory } from '@/types/tournament';

// Configuraciones por formato
const formatConfigurations = {
  elimination: {
    icon: Zap,
    description: 'Fast-paced elimination tournament',
    validParticipants: [4, 8, 16, 32, 64, 128],
    estimatedDuration: '1-3 days',
    features: ['Single elimination', 'Quick completion', 'High intensity'],
    pros: ['Fast tournament', 'Clear winner', 'Less court time needed'],
    cons: ['Early elimination', 'Less play time per player'],
  },
  'round-robin': {
    icon: Target,
    description: 'Everyone plays everyone',
    validParticipants: [4, 6, 8, 10, 12, 16],
    estimatedDuration: '3-7 days',
    features: [
      'Everyone plays multiple games',
      'Fair competition',
      'Complete standings',
    ],
    pros: ['More games per player', 'Fair ranking', 'No early elimination'],
    cons: ['Longer duration', 'More court time needed'],
  },
  groups: {
    icon: Users,
    description: 'Group stage followed by knockout',
    validParticipants: [8, 12, 16, 20, 24, 32],
    estimatedDuration: '4-8 days',
    features: [
      'Group stage + knockout',
      'Balanced competition',
      'Multiple chances',
    ],
    pros: [
      'Multiple play opportunities',
      'Exciting knockout phase',
      'Fair seeding',
    ],
    cons: ['Complex organization', 'Longer tournament'],
  },
  mixed: {
    icon: Settings,
    description: 'Custom format combination',
    validParticipants: [8, 16, 24, 32, 48, 64],
    estimatedDuration: '5-10 days',
    features: ['Flexible format', 'Custom rules', 'Advanced organization'],
    pros: ['Highly customizable', 'Unique experience', 'Advanced features'],
    cons: ['Complex setup', 'Requires experience'],
  },
};

// Configuraciones por categoría
const categoryConfigurations = {
  open: {
    description: 'Open to all skill levels',
    skillLevel: 'Any',
    ageRange: 'Any age',
    recommendations: 'Perfect for inclusive tournaments',
  },
  beginner: {
    description: 'For new and learning players',
    skillLevel: 'Beginner',
    ageRange: 'Any age',
    recommendations: 'Focus on fun and learning',
  },
  intermediate: {
    description: 'For developing players',
    skillLevel: 'Intermediate',
    ageRange: 'Any age',
    recommendations: 'Competitive but accessible',
  },
  advanced: {
    description: 'For experienced players',
    skillLevel: 'Advanced',
    ageRange: 'Any age',
    recommendations: 'High-level competition',
  },
  professional: {
    description: 'Professional level competition',
    skillLevel: 'Professional',
    ageRange: '18+',
    recommendations: 'Requires certification',
  },
  senior: {
    description: 'For senior players',
    skillLevel: 'Any',
    ageRange: '50+',
    recommendations: 'Age-appropriate competition',
  },
  junior: {
    description: 'For young players',
    skillLevel: 'Any',
    ageRange: 'Under 18',
    recommendations: 'Development focused',
  },
};

// Componente de selector de formato
const FormatSelector: React.FC<{
  selectedFormat: TournamentFormat | undefined;
  onFormatChange: (format: TournamentFormat) => void;
  maxParticipants: number;
  onMaxParticipantsChange: (max: number) => void;
}> = ({
  selectedFormat,
  onFormatChange,
  maxParticipants,
  onMaxParticipantsChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(formatConfigurations).map(([format, config]) => {
          const Icon = config.icon;
          const isSelected = selectedFormat === format;

          return (
            <div
              key={format}
              className={cn(
                'p-4 border rounded-lg cursor-pointer transition-all duration-200',
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
              onClick={() => {
                onFormatChange(format as TournamentFormat);
                // Auto-ajustar participantes si el actual no es válido
                if (!config.validParticipants.includes(maxParticipants)) {
                  onMaxParticipantsChange(
                    config.validParticipants[2] || config.validParticipants[0]
                  );
                }
              }}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    isSelected
                      ? 'bg-blue-100 dark:bg-blue-800'
                      : 'bg-gray-100 dark:bg-gray-800'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5',
                      isSelected
                        ? 'text-blue-600'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  />
                </div>
                <div className="flex-1">
                  <h4
                    className={cn(
                      'font-medium capitalize',
                      isSelected
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-gray-100'
                    )}
                  >
                    {t(`tournaments.formats.${format}.name`)}
                  </h4>
                  <p
                    className={cn(
                      'text-sm mt-1',
                      isSelected
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400'
                    )}
                  >
                    {config.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge
                      variant={isSelected ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {config.estimatedDuration}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalles del formato seleccionado */}
      {selectedFormat && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t(`tournaments.formats.${selectedFormat}.name`)}{' '}
            {t('tournaments.form.details')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tournaments.form.features')}
              </h5>
              <ul className="space-y-1">
                {formatConfigurations[selectedFormat].features.map(
                  (feature, index) => (
                    <li
                      key={index}
                      className="flex items-center text-gray-600 dark:text-gray-400"
                    >
                      <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                      {feature}
                    </li>
                  )
                )}
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tournaments.form.pros')}
              </h5>
              <ul className="space-y-1">
                {formatConfigurations[selectedFormat].pros.map((pro, index) => (
                  <li
                    key={index}
                    className="flex items-center text-green-600 dark:text-green-400"
                  >
                    <CheckCircle className="h-3 w-3 mr-2" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('tournaments.form.considerations')}
              </h5>
              <ul className="space-y-1">
                {formatConfigurations[selectedFormat].cons.map((con, index) => (
                  <li
                    key={index}
                    className="flex items-center text-yellow-600 dark:text-yellow-400"
                  >
                    <AlertTriangle className="h-3 w-3 mr-2" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export const TournamentConfiguration: React.FC<WizardStepProps> = ({
  data,
  errors,
  register,
  watch,
  setValue,
  trigger,
}) => {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState({
    min: data.minParticipants || 8,
    max: data.maxParticipants || 16,
  });

  const watchFormat = watch('format') as TournamentFormat;
  const watchCategory = watch('category') as TournamentCategory;
  const watchMaxParticipants = watch('maxParticipants');
  const watchMinParticipants = watch('minParticipants');
  const watchIsDoublesOnly = watch('isDoublesOnly');
  const watchAllowMixedGender = watch('allowMixedGender');

  // Validar participantes según el formato
  const validateParticipants = (format: TournamentFormat, max: number) => {
    if (!format) return true;
    const config = formatConfigurations[format];
    return config.validParticipants.includes(max);
  };

  // Efecto para ajustar participantes cuando cambia el formato
  useEffect(() => {
    if (
      watchFormat &&
      !validateParticipants(watchFormat, watchMaxParticipants)
    ) {
      const config = formatConfigurations[watchFormat];
      const suggestedMax =
        config.validParticipants.find((p) => p >= watchMaxParticipants) ||
        config.validParticipants[0];
      setValue('maxParticipants', suggestedMax);
      if (watchMinParticipants > suggestedMax) {
        setValue('minParticipants', Math.max(2, Math.floor(suggestedMax / 2)));
      }
    }
  }, [watchFormat, watchMaxParticipants, watchMinParticipants, setValue]);

  const getValidParticipants = (format: TournamentFormat) => {
    if (!format) return [];
    return formatConfigurations[format].validParticipants;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/20 rounded-full">
          <Trophy className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('tournaments.form.steps.configuration.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('tournaments.form.steps.configuration.description')}
        </p>
      </div>

      {/* Formato del torneo */}
      <div>
        <Label className="text-base font-medium mb-4 block">
          {t('tournaments.form.fields.format')} *
        </Label>
        <FormatSelector
          selectedFormat={watchFormat}
          onFormatChange={(format) => setValue('format', format)}
          maxParticipants={watchMaxParticipants}
          onMaxParticipantsChange={(max) => setValue('maxParticipants', max)}
        />
        {errors.format && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {errors.format.message}
          </p>
        )}
      </div>

      {/* Categoría */}
      <div>
        <Label htmlFor="category" className="text-base font-medium">
          {t('tournaments.form.fields.category')} *
        </Label>
        <Select
          value={watchCategory || ''}
          onValueChange={(value) =>
            setValue('category', value as TournamentCategory)
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue
              placeholder={t('tournaments.form.placeholders.category')}
            />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryConfigurations).map(
              ([category, config]) => (
                <SelectItem key={category} value={category || ''}>
                  <div className="flex flex-col">
                    <span className="font-medium capitalize">
                      {t(`tournaments.categories.${category}.name`)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {config.description}
                    </span>
                  </div>
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        {errors.category && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            {errors.category.message}
          </p>
        )}

        {/* Información de la categoría seleccionada */}
        {watchCategory && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">
                  {t('tournaments.form.skillLevel')}:
                </span>
                <p className="font-medium">
                  {categoryConfigurations[watchCategory].skillLevel}
                </p>
              </div>
              <div>
                <span className="text-gray-500">
                  {t('tournaments.form.ageRange')}:
                </span>
                <p className="font-medium">
                  {categoryConfigurations[watchCategory].ageRange}
                </p>
              </div>
              <div>
                <span className="text-gray-500">
                  {t('tournaments.form.recommendation')}:
                </span>
                <p className="font-medium">
                  {categoryConfigurations[watchCategory].recommendations}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="maxParticipants">
            {t('tournaments.form.fields.maxParticipants')} *
          </Label>
          <Select
            value={watchMaxParticipants?.toString() || ''}
            onValueChange={(value) => {
              const num = parseInt(value);
              setValue('maxParticipants', num);
              if (watchMinParticipants > num) {
                setValue('minParticipants', Math.max(2, Math.floor(num / 2)));
              }
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue
                placeholder={t('tournaments.form.placeholders.maxParticipants')}
              />
            </SelectTrigger>
            <SelectContent>
              {watchFormat &&
                getValidParticipants(watchFormat).map((num) => (
                  <SelectItem key={num} value={num.toString() || ''}>
                    {num} {t('tournaments.form.participants')}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.maxParticipants && (
            <p className="mt-1 text-sm text-red-600">
              {errors.maxParticipants.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="minParticipants">
            {t('tournaments.form.fields.minParticipants')} *
          </Label>
          <Input
            id="minParticipants"
            type="number"
            {...register('minParticipants', {
              valueAsNumber: true,
              min: 2,
              max: watchMaxParticipants || 64,
            })}
            className="mt-1"
            max={watchMaxParticipants}
            min={2}
          />
          {errors.minParticipants && (
            <p className="mt-1 text-sm text-red-600">
              {errors.minParticipants.message}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {t('tournaments.form.hints.minParticipants')}
          </p>
        </div>
      </div>

      {/* Opciones adicionales */}
      <div className="space-y-4">
        <h4 className="text-base font-medium text-gray-900 dark:text-gray-100">
          {t('tournaments.form.additionalOptions')}
        </h4>

        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('isDoublesOnly')}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-900 dark:text-gray-100">
              {t('tournaments.form.fields.doublesOnly')}
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('allowMixedGender')}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-900 dark:text-gray-100">
              {t('tournaments.form.fields.allowMixedGender')}
            </span>
          </label>
        </div>
      </div>

      {/* Estimación de duración */}
      {watchFormat && watchMaxParticipants && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            {t('tournaments.form.tournamentEstimate')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-green-700 dark:text-green-300">
                {t('tournaments.form.duration')}:
              </span>
              <p className="font-medium">
                {formatConfigurations[watchFormat].estimatedDuration}
              </p>
            </div>
            <div>
              <span className="text-green-700 dark:text-green-300">
                {t('tournaments.form.participants')}:
              </span>
              <p className="font-medium">
                {watchMinParticipants}-{watchMaxParticipants}
              </p>
            </div>
            <div>
              <span className="text-green-700 dark:text-green-300">
                {t('tournaments.form.matches')}:
              </span>
              <p className="font-medium">
                {watchFormat === 'elimination'
                  ? watchMaxParticipants - 1
                  : watchFormat === 'round-robin'
                    ? Math.floor(
                        (watchMaxParticipants * (watchMaxParticipants - 1)) / 2
                      )
                    : '~' + Math.floor(watchMaxParticipants * 1.5)}
              </p>
            </div>
            <div>
              <span className="text-green-700 dark:text-green-300">
                {t('tournaments.form.type')}:
              </span>
              <p className="font-medium">
                {watchIsDoublesOnly
                  ? t('tournaments.form.doublesOnly')
                  : t('tournaments.form.singlesDoubles')}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
