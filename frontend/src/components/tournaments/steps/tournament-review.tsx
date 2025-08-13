'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Eye,
  Edit,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Users,
  Trophy,
  DollarSign,
  FileText,
  Settings,
  MapPin,
  Clock,
  Award,
  Target,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WizardStepProps } from '../tournament-form-types';
import { TournamentFormData } from '@/lib/validations/tournament-form';

// Componente de sección de revisión
const ReviewSection: React.FC<{
  icon: React.ComponentType<any>;
  title: string;
  stepNumber: number;
  onEdit: () => void;
  children: React.ReactNode;
  isValid?: boolean;
  warnings?: string[];
}> = ({
  icon: Icon,
  title,
  stepNumber,
  onEdit,
  children,
  isValid = true,
  warnings = [],
}) => {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              isValid
                ? 'bg-green-100 dark:bg-green-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                isValid ? 'text-green-600' : 'text-red-600'
              )}
            />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {warnings.length > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                {warnings.length} warning{warnings.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isValid ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>
      <div className="p-4">
        {children}
        {warnings.length > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 mt-0.5" />
              <div>
                {warnings.map((warning, index) => (
                  <p
                    key={index}
                    className="text-xs text-yellow-700 dark:text-yellow-300"
                  >
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de detalle de información
const InfoDetail: React.FC<{
  label: string;
  value: string | number | React.ReactNode;
  highlight?: boolean;
}> = ({ label, value, highlight = false }) => {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}:</span>
      <span
        className={cn(
          'text-sm font-medium',
          highlight
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-gray-900 dark:text-gray-100'
        )}
      >
        {value}
      </span>
    </div>
  );
};

export const TournamentReview: React.FC<WizardStepProps> = ({
  data,
  errors,
}) => {
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Validaciones y warnings
  const getBasicInfoValidation = () => {
    const warnings = [];
    if (!data.imageUrl) warnings.push(t('tournaments.form.warnings.noImage'));
    if (data.description && data.description.length < 50)
      warnings.push(t('tournaments.form.warnings.shortDescription'));

    return {
      isValid: !errors.name && !errors.description,
      warnings,
    };
  };

  const getConfigurationValidation = () => {
    const warnings = [];
    if (
      data.minParticipants &&
      data.maxParticipants &&
      data.minParticipants < data.maxParticipants / 2
    ) {
      warnings.push(t('tournaments.form.warnings.lowMinParticipants'));
    }

    return {
      isValid: !errors.format && !errors.category && !errors.maxParticipants,
      warnings,
    };
  };

  const getSchedulingValidation = () => {
    const warnings = [];

    return {
      isValid:
        !errors.registrationStartDate &&
        !errors.registrationEndDate &&
        !errors.startDate &&
        !errors.endDate,
      warnings,
    };
  };

  const getRulesValidation = () => {
    const warnings = [];
    if (!data.prizeMoney || data.prizeMoney === 0)
      warnings.push(t('tournaments.form.warnings.noPrizeMoney'));

    return {
      isValid: !errors.entryFee && !errors.currency,
      warnings,
    };
  };

  // Formatear valores para mostrar
  const formatCurrency = (amount: number) => {
    const currency = data.currency || 'EUR';
    const symbol =
      currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency;
    return `${symbol}${amount?.toLocaleString() || 0}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return t('common.notSet');
    return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
  };

  const formatParticipants = () => {
    const min = data.minParticipants || 0;
    const max = data.maxParticipants || 0;
    return `${min}-${max} ${t('tournaments.form.participants')}`;
  };

  const estimatedMatches = () => {
    const max = data.maxParticipants || 0;
    switch (data.format) {
      case 'elimination':
        return max - 1;
      case 'round-robin':
        return Math.floor((max * (max - 1)) / 2);
      case 'groups':
        return Math.floor(max * 1.5);
      default:
        return Math.floor(max * 1.2);
    }
  };

  const goToStep = (step: number) => {
    // Esta función será manejada por el componente padre
      };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
          <Eye className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('tournaments.form.steps.review.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('tournaments.form.steps.review.description')}
        </p>
      </div>

      {/* Resumen destacado */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {data.name || t('tournaments.form.unnamed')}
          </h2>
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <Badge variant="secondary" className="capitalize">
              {data.format && t(`tournaments.formats.${data.format}.name`)}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {data.category &&
                t(`tournaments.categories.${data.category}.name`)}
            </Badge>
            <Badge variant="secondary">{formatParticipants()}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {t('tournaments.form.startDate')}
            </p>
            <p className="font-medium">
              {data.startDate
                ? format(new Date(data.startDate), 'MMM d, yyyy')
                : t('common.notSet')}
            </p>
          </div>
          <div className="text-center">
            <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {t('tournaments.form.participants')}
            </p>
            <p className="font-medium">{formatParticipants()}</p>
          </div>
          <div className="text-center">
            <Trophy className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {t('tournaments.form.estimatedMatches')}
            </p>
            <p className="font-medium">{estimatedMatches()}</p>
          </div>
          <div className="text-center">
            <DollarSign className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {t('tournaments.form.entryFee')}
            </p>
            <p className="font-medium">{formatCurrency(data.entryFee || 0)}</p>
          </div>
        </div>
      </div>

      {/* Secciones de revisión */}
      <div className="space-y-4">
        {/* Información Básica */}
        <ReviewSection
          icon={FileText as any}
          title={t('tournaments.form.steps.basicInfo.title')}
          stepNumber={1}
          onEdit={() => goToStep(0)}
          {...getBasicInfoValidation()}
        >
          <div className="space-y-2">
            <InfoDetail
              label={t('tournaments.form.fields.name')}
              value={data.name || t('common.notSet')}
              highlight
            />
            <InfoDetail
              label={t('tournaments.form.fields.description')}
              value={
                data.description ? (
                  <span className="text-sm">
                    {data.description.slice(0, 100) || ''}
                    {data.description.length > 100 ? '...' : ''}
                  </span>
                ) : (
                  t('common.notSet')
                )
              }
            />
            <InfoDetail
              label={t('tournaments.form.fields.image')}
              value={
                data.imageUrl ? (
                  <Badge variant="secondary" className="text-green-600">
                    {t('tournaments.form.imageUploaded') || ''}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500">
                    {t('tournaments.form.noImage')}
                  </Badge>
                )
              }
            />
          </div>
        </ReviewSection>

        {/* Configuración */}
        <ReviewSection
          icon={Settings as any}
          title={t('tournaments.form.steps.configuration.title')}
          stepNumber={2}
          onEdit={() => goToStep(1)}
          {...getConfigurationValidation()}
        >
          <div className="space-y-2">
            <InfoDetail
              label={t('tournaments.form.fields.format')}
              value={
                data.format
                  ? t(`tournaments.formats.${data.format || ''}.name`)
                  : t('common.notSet')
              }
              highlight
            />
            <InfoDetail
              label={t('tournaments.form.fields.category')}
              value={
                data.category
                  ? t(`tournaments.categories.${data.category || ''}.name`)
                  : t('common.notSet')
              }
              highlight
            />
            <InfoDetail
              label={t('tournaments.form.fields.maxParticipants')}
              value={data.maxParticipants || 0}
            />
            <InfoDetail
              label={t('tournaments.form.fields.minParticipants')}
              value={data.minParticipants || 0}
            />
            <InfoDetail
              label={t('tournaments.form.fields.doublesOnly')}
              value={data.isDoublesOnly ? t('common.yes') : t('common.no') || ''}
            />
            <InfoDetail
              label={t('tournaments.form.fields.allowMixedGender')}
              value={data.allowMixedGender ? t('common.yes') : t('common.no') || ''}
            />
          </div>
        </ReviewSection>

        {/* Programación */}
        <ReviewSection
          icon={Calendar as any}
          title={t('tournaments.form.steps.scheduling.title')}
          stepNumber={3}
          onEdit={() => goToStep(2)}
          {...getSchedulingValidation()}
        >
          <div className="space-y-2">
            <InfoDetail
              label={t('tournaments.form.fields.registrationStartDate')}
              value={formatDate(data.registrationStartDate || '')}
              highlight
            />
            <InfoDetail
              label={t('tournaments.form.fields.registrationEndDate')}
              value={formatDate(data.registrationEndDate || '')}
              highlight
            />
            <InfoDetail
              label={t('tournaments.form.fields.startDate')}
              value={formatDate(data.startDate || '')}
              highlight
            />
            <InfoDetail
              label={t('tournaments.form.fields.endDate')}
              value={formatDate(data.endDate || '')}
              highlight
            />
          </div>
        </ReviewSection>

        {/* Reglas y Premios */}
        <ReviewSection
          icon={Award as any}
          title={t('tournaments.form.steps.rules.title')}
          stepNumber={4}
          onEdit={() => goToStep(3)}
          {...getRulesValidation()}
        >
          <div className="space-y-2">
            <InfoDetail
              label={t('tournaments.form.fields.entryFee')}
              value={formatCurrency(data.entryFee || 0)}
              highlight
            />
            <InfoDetail
              label={t('tournaments.form.fields.prizeMoney')}
              value={formatCurrency(data.prizeMoney || 0)}
              highlight
            />
            <InfoDetail
              label={t('tournaments.form.fields.currency')}
              value={data.currency || 'EUR'}
            />
            <InfoDetail
              label={t('tournaments.form.fields.pointsSystem')}
              value={
                data.pointsSystem
                  ? t(`tournaments.pointsSystems.${data.pointsSystem || ''}`)
                  : t('common.standard')
              }
            />
            <InfoDetail
              label={t('tournaments.form.fields.requiresApproval')}
              value={data.requiresApproval ? t('common.yes') : t('common.no') || ''}
            />
            <InfoDetail
              label={t('tournaments.form.fields.allowWalkIns')}
              value={data.allowWalkIns ? t('common.yes') : t('common.no') || ''}
            />
            {data.rules && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('tournaments.form.fields.rules')}:
                </h5>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {data.rules}
                </p>
              </div>
            )}
          </div>
        </ReviewSection>
      </div>

      {/* Resumen final */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('tournaments.form.finalSummary')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('tournaments.form.tournamentDetails')}
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('tournaments.form.estimatedDuration')}:</span>
                <span className="font-medium">
                  {data.startDate && data.endDate
                    ? `${Math.ceil((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / (1000 * 60 * 60 * 24))} ${t('tournaments.form.days')}`
                    : t('common.notCalculated')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('tournaments.form.estimatedMatches')}:</span>
                <span className="font-medium">{estimatedMatches()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('tournaments.form.avgMatchDuration')}:</span>
                <span className="font-medium">
                  {data.pointsSystem === 'tiebreak'
                    ? '45-60 min'
                    : data.pointsSystem === 'no-advantage'
                      ? '60-75 min'
                      : '75-90 min'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('tournaments.form.financialSummary')}
            </h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('tournaments.form.maxRevenue')}:</span>
                <span className="font-medium">
                  {formatCurrency(
                    (data.entryFee || 0) * (data.maxParticipants || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('tournaments.form.totalPrizes')}:</span>
                <span className="font-medium">
                  {formatCurrency(data.prizeMoney || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('tournaments.form.netProfit')}:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(
                    (data.entryFee || 0) * (data.maxParticipants || 0) -
                      (data.prizeMoney || 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advertencias finales */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-yellow-600 mr-3 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              {t('tournaments.form.beforeSubmitting')}
            </h4>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• {t('tournaments.form.finalChecks.verifyDates')}</li>
              <li>• {t('tournaments.form.finalChecks.confirmPricing')}</li>
              <li>• {t('tournaments.form.finalChecks.reviewRules')}</li>
              <li>• {t('tournaments.form.finalChecks.checkAvailability')}</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
