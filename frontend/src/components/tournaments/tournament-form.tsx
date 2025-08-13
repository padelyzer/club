'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Trophy,
  Users,
  Calendar,
  FileText,
  Eye,
} from 'lucide-react';

import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import {
  tournamentFormSchema,
  validateStep,
  defaultTournamentFormData,
  TournamentFormData,
} from '@/lib/validations/tournament-form';
import {
  TournamentFormProps,
  WizardState,
  TOURNAMENT_FORM_STEPS,
  DEFAULT_FORM_CONFIG,
  StepInfo,
} from './tournament-form-types';

// Componentes de pasos (importar después de crear)
import { TournamentBasicInfo } from './steps/tournament-basic-info';
import { TournamentConfiguration } from './steps/tournament-configuration';
import { TournamentScheduling } from './steps/tournament-scheduling';
import { TournamentRulesPrizes } from './steps/tournament-rules-prizes';
import { TournamentReview } from './steps/tournament-review';

// Componente del indicador de progreso
const ProgressIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  steps: StepInfo[];
  completedSteps: boolean[];
  onStepClick?: (step: number) => void;
  allowNavigation?: boolean;
}> = ({
  currentStep,
  totalSteps,
  steps,
  completedSteps,
  onStepClick,
  allowNavigation = true,
}) => {
  const { t } = useTranslation();

  const getStepIcon = (step: StepInfo, index: number) => {
    const isCompleted = completedSteps[index];
    const isCurrent = currentStep === index;

    if (isCompleted) {
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    }

    // Iconos específicos por paso
    switch (step.id) {
      case 'basic-info':
        return (
          <FileText
            className={cn(
              'h-5 w-5',
              isCurrent ? 'text-blue-600' : 'text-gray-400'
            )}
          />
        );
      case 'configuration':
        return (
          <Trophy
            className={cn(
              'h-5 w-5',
              isCurrent ? 'text-blue-600' : 'text-gray-400'
            )}
          />
        );
      case 'scheduling':
        return (
          <Calendar
            className={cn(
              'h-5 w-5',
              isCurrent ? 'text-blue-600' : 'text-gray-400'
            )}
          />
        );
      case 'rules-prizes':
        return (
          <Users
            className={cn(
              'h-5 w-5',
              isCurrent ? 'text-blue-600' : 'text-gray-400'
            )}
          />
        );
      case 'review':
        return (
          <Eye
            className={cn(
              'h-5 w-5',
              isCurrent ? 'text-blue-600' : 'text-gray-400'
            )}
          />
        );
      default:
        return (
          <div
            className={cn(
              'h-5 w-5 rounded-full border-2',
              isCurrent ? 'border-blue-600 bg-blue-100' : 'border-gray-300'
            )}
          />
        );
    }
  };

  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {t('tournaments.form.progress')}
          </span>
          <span className="text-sm text-gray-500">
            {currentStep + 1} {t('common.of')} {totalSteps}
          </span>
        </div>
        <Progress
          value={((currentStep + 1) / totalSteps) * 100 || ''}
          className="h-2"
        />
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps[index];
          const isCurrent = currentStep === index;
          const isClickable =
            allowNavigation && (isCompleted || index <= currentStep);

          return (
            <div key={step.id} className="flex flex-col items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200',
                  isCurrent && 'ring-2 ring-blue-500 ring-opacity-50',
                  isCompleted && 'bg-green-50 border-green-500',
                  !isCompleted && !isCurrent && 'border-gray-300',
                  !isCompleted && isCurrent && 'border-blue-500 bg-blue-50',
                  isClickable && 'hover:scale-105 cursor-pointer',
                  !isClickable && 'cursor-not-allowed opacity-50'
                )}
              >
                {getStepIcon(step, index)}
              </button>

              <div className="mt-2 text-center">
                <div
                  className={cn(
                    'text-xs font-medium',
                    isCurrent ? 'text-blue-600' : 'text-gray-500'
                  )}
                >
                  {t(`tournaments.form.steps.${step.id}.title`)}
                </div>
                {step.estimatedTime && (
                  <div className="text-xs text-gray-400 flex items-center justify-center mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {step.estimatedTime}
                  </div>
                )}
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute top-5 w-full h-0.5 -z-10',
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  )}
                  style={{
                    left: '50%',
                    width: `${100 / steps.length}%`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Auto-save indicator
const AutoSaveIndicator: React.FC<{
  isSaving: boolean;
  lastSaved: Date | null;
  hasError: boolean;
}> = ({ isSaving, lastSaved, hasError }) => {
  const { t } = useTranslation();

  if (isSaving) {
    return (
      <div className="flex items-center text-xs text-gray-500">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        {t('common.saving')}...
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center text-xs text-red-500">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {t('tournaments.form.autoSaveError')}
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center text-xs text-green-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        {t('tournaments.form.savedAt')} {lastSaved.toLocaleTimeString()}
      </div>
    );
  }

  return null;
};

export const TournamentForm: React.FC<TournamentFormProps> = ({
  isOpen,
  onClose,
  tournament,
  onSuccess,
  defaultTemplate,
  mode = 'create',
}) => {
  const { t } = useTranslation();
  const isEditing = mode === 'edit' && !!tournament;

  // Estado del wizard
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 0,
    totalSteps: TOURNAMENT_FORM_STEPS.length,
    isValid: new Array(TOURNAMENT_FORM_STEPS.length).fill(false),
    completedSteps: new Array(TOURNAMENT_FORM_STEPS.length).fill(false),
    touched: new Array(TOURNAMENT_FORM_STEPS.length).fill(false),
  });

  // Estado del auto-guardado
  const [autoSaveState, setAutoSaveState] = useState({
    isSaving: false,
    lastSaved: null as Date | null,
    hasError: false,
  });

  // Estado de carga
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<TournamentFormData>({
    resolver: zodResolver(tournamentFormSchema),
    defaultValues: {
      ...defaultTournamentFormData,
      ...(defaultTemplate && {
        format: defaultTemplate.format,
        category: defaultTemplate.category,
        maxParticipants: defaultTemplate.maxParticipants,
        minParticipants: defaultTemplate.minParticipants,
        entryFee: defaultTemplate.entryFee,
        prizeMoney: defaultTemplate.prizeMoney,
        pointsSystem: defaultTemplate.pointsSystem,
        rules: defaultTemplate.rules,
      }),
      ...(isEditing &&
        tournament && {
          name: tournament.name,
          description: tournament.description,
          format: tournament.format,
          category: tournament.category,
          maxParticipants: tournament.maxParticipants,
          entryFee: tournament.entryFee,
          prizeMoney: tournament.prizeMoney,
          currency: tournament.currency,
          rules: tournament.rules,
          registrationStartDate: tournament.registrationStartDate,
          registrationEndDate: tournament.registrationEndDate,
          startDate: tournament.startDate,
          endDate: tournament.endDate,
          imageUrl: tournament.imageUrl,
        }),
    },
    mode: 'onChange',
  });

  const formData = watch();

  // Navegación del wizard
  const goToStep = useCallback(
    async (stepIndex: number) => {
      if (stepIndex < 0 || stepIndex >= TOURNAMENT_FORM_STEPS.length) return;

      // Validar paso actual antes de avanzar
      if (stepIndex > wizardState.currentStep) {
        const isValid = validateStep(wizardState.currentStep + 1, formData);
        if (!isValid) {
          await trigger(); // Mostrar errores
          return;
        }
      }

      setWizardState((prev) => ({
        ...prev,
        currentStep: stepIndex,
        touched: prev.touched.map((touched, index) =>
          index <= stepIndex ? true : touched
        ),
        completedSteps: prev.completedSteps.map((completed, index) =>
          index < stepIndex ? true : completed
        ),
      }));
    },
    [wizardState.currentStep, formData, trigger]
  );

  const nextStep = () => goToStep(wizardState.currentStep + 1);
  const previousStep = () => goToStep(wizardState.currentStep - 1);

  // Auto-guardado simulado
  useEffect(() => {
    if (!DEFAULT_FORM_CONFIG.enableAutoSave) return;

    const interval = setInterval(() => {
      if (Object.keys(formData).length > 0) {
        setAutoSaveState((prev) => ({ ...prev, isSaving: true }));

        // Simular guardado
        setTimeout(() => {
          setAutoSaveState((prev) => ({
            ...prev,
            isSaving: false,
            lastSaved: new Date(),
            hasError: false,
          }));
        }, 1000);
      }
    }, DEFAULT_FORM_CONFIG.autoSaveInterval);

    return () => clearInterval(interval);
  }, [formData]);

  // Envío del formulario
  const onSubmit = async (data: TournamentFormData) => {
    setIsSubmitting(true);
    try {
      const { tournamentsService } = await import('@/lib/api/services/tournaments.service');
      
      // Create tournament via API
      const newTournament = await tournamentsService.createTournament({
        name: data.name,
        description: data.description,
        format: data.format,
        category: data.category,
        maxParticipants: data.maxParticipants,
        entryFee: data.entryFee,
        prizeMoney: data.prizeMoney,
        currency: data.currency,
        rules: data.rules,
        registrationStartDate: data.registrationStartDate,
        registrationEndDate: data.registrationEndDate,
        startDate: data.startDate,
        endDate: data.endDate,
        imageUrl: data.imageUrl,
        status: 'upcoming' as const,
        currentParticipants: 0,
      });

      onSuccess?.(newTournament);
      onClose();
      
      // Show success notification
      const { toast } = await import('react-hot-toast');
      toast.success('Tournament created successfully!');
    } catch (error) {
            const { toast } = await import('react-hot-toast');
      toast.error('Failed to create tournament. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Renderizar paso actual
  const renderCurrentStep = () => {
    const stepProps = {
      data: formData,
      errors,
      register,
      watch,
      setValue,
      trigger,
      isFirst: wizardState.currentStep === 0,
      isLast: wizardState.currentStep === wizardState.totalSteps - 1,
    };

    switch (wizardState.currentStep) {
      case 0:
        return <TournamentBasicInfo {...stepProps} />;
      case 1:
        return <TournamentConfiguration {...stepProps} />;
      case 2:
        return <TournamentScheduling {...stepProps} />;
      case 3:
        return <TournamentRulesPrizes {...stepProps} />;
      case 4:
        return <TournamentReview {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" as any>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col h-full max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {isEditing
                  ? t('tournaments.form.editTournament')
                  : t('tournaments.form.createTournament')}
              </h2>
              <p className="text-sm text-gray-500">
                {t('tournaments.form.subtitle')}
              </p>
            </div>

            {/* Auto-save indicator */}
            <div className="ml-auto">
              <AutoSaveIndicator
                isSaving={autoSaveState.isSaving}
                lastSaved={autoSaveState.lastSaved}
                hasError={autoSaveState.hasError}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Preview button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
              disabled={wizardState.currentStep === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              {t('tournaments.form.preview')}
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <ProgressIndicator
            currentStep={wizardState.currentStep}
            totalSteps={wizardState.totalSteps}
            steps={TOURNAMENT_FORM_STEPS}
            completedSteps={wizardState.completedSteps}
            onStepClick={goToStep}
            allowNavigation={DEFAULT_FORM_CONFIG.allowStepNavigation}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={wizardState.currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-6"
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={previousStep}
            disabled={wizardState.currentStep === 0 || isSubmitting}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('common.previous')}
          </Button>

          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>

            {wizardState.currentStep === wizardState.totalSteps - 1 ? (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isEditing ? t('common.updating') : t('common.creating')}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? t('common.update') : t('common.create')}
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                {t('common.next')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
