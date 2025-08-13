import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from '@/lib/toast';

import {
  tournamentFormSchema,
  validateStep,
  defaultTournamentFormData,
  TournamentFormData,
  TournamentTemplateData,
  predefinedTemplates,
} from '@/lib/validations/tournament-form';
import {
  UseTournamentFormProps,
  UseTournamentFormReturn,
  WizardState,
  ValidationState,
  AutoSaveState,
  ResourceAvailabilityState,
  TournamentDurationEstimate,
  TournamentFormEvent,
  DEFAULT_FORM_CONFIG,
  TOURNAMENT_FORM_STEPS,
} from '../tournament-form-types';
import { useTournamentStore } from '@/store/tournamentsStore';

// Simulate API calls
const simulateAsyncOperation = (delay: number = 1000) =>
  new Promise((resolve) => setTimeout(resolve, delay));

export const useTournamentForm = ({
  tournament,
  defaultTemplate,
  config = DEFAULT_FORM_CONFIG,
  onEvent,
}: UseTournamentFormProps = {}): UseTournamentFormReturn => {
  const { t } = useTranslation();
  const { addTournament, updateTournament } = useTournamentStore();

  // Form setup
  const form = useForm<TournamentFormData>({
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
      ...(tournament && {
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

  // State management
  const [formState, setFormState] = useState<WizardState>({
    currentStep: 0,
    totalSteps: TOURNAMENT_FORM_STEPS.length,
    isValid: new Array(TOURNAMENT_FORM_STEPS.length).fill(false),
    completedSteps: new Array(TOURNAMENT_FORM_STEPS.length).fill(false),
    touched: new Array(TOURNAMENT_FORM_STEPS.length).fill(false),
  });

  const [validationState, setValidationState] = useState<ValidationState>({
    isValidating: false,
    validationErrors: {},
    warnings: {},
    fieldStatus: {},
  });

  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    lastSaved: null,
    isDirty: false,
    isSaving: false,
    hasError: false,
  });

  const [resourceState, setResourceState] = useState<ResourceAvailabilityState>(
    {
      courtsAvailable: true,
      dateConflicts: [],
      capacityWarnings: [],
      isChecking: false,
      lastChecked: null,
    }
  );

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [customTemplates, setCustomTemplates] = useState<
    TournamentTemplateData[]
  >([]);
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const draftKeyRef = useRef<string>(`tournament_draft_${Date.now()}`);

  const data = form.watch();

  // Event dispatcher
  const dispatchEvent = useCallback(
    (event: TournamentFormEvent) => {
      onEvent?.(event);
    },
    [onEvent]
  );

  // Step validation
  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    setValidationState((prev) => ({ ...prev, isValidating: true }));

    try {
      const stepData = form.getValues();
      const isValid = validateStep(formState.currentStep + 1, stepData);

      if (!isValid) {
        await form.trigger();
        dispatchEvent({
          type: 'VALIDATION_ERROR',
          payload: {
            step: formState.currentStep,
            errors: form.formState.errors,
          },
        });
      }

      return isValid;
    } finally {
      setValidationState((prev) => ({ ...prev, isValidating: false }));
    }
  }, [formState.currentStep, form, dispatchEvent]);

  // Navigation
  const goToStep = useCallback(
    async (stepIndex: number) => {
      if (stepIndex < 0 || stepIndex >= TOURNAMENT_FORM_STEPS.length) return;

      // Validate current step before advancing
      if (stepIndex > formState.currentStep && config.validateOnStepChange) {
        const isValid = await validateCurrentStep();
        if (!isValid) return;
      }

      const fromStep = formState.currentStep;

      setFormState((prev) => ({
        ...prev,
        currentStep: stepIndex,
        touched: prev.touched.map((touched, index) =>
          index <= stepIndex ? true : touched
        ),
        completedSteps: prev.completedSteps.map((completed, index) =>
          index < stepIndex ? true : completed
        ),
      }));

      dispatchEvent({
        type: 'STEP_CHANGE',
        payload: { from: fromStep, to: stepIndex },
      });
    },
    [
      formState.currentStep,
      config.validateOnStepChange,
      validateCurrentStep,
      dispatchEvent,
    ]
  );

  const nextStep = useCallback(() => {
    goToStep(formState.currentStep + 1);
  }, [formState.currentStep, goToStep]);

  const previousStep = useCallback(() => {
    goToStep(formState.currentStep - 1);
  }, [formState.currentStep, goToStep]);

  // Template management
  const applyTemplate = useCallback(
    (template: TournamentTemplateData) => {
      form.reset({
        ...form.getValues(),
        format: template.format,
        category: template.category,
        maxParticipants: template.maxParticipants,
        minParticipants: template.minParticipants,
        entryFee: template.entryFee,
        prizeMoney: template.prizeMoney,
        pointsSystem: template.pointsSystem,
        rules: template.rules,
      });

      toast.success(
        t('tournaments.form.templateApplied', { name: template.name })
      );

      dispatchEvent({
        type: 'TEMPLATE_APPLIED',
        payload: { template },
      });
    },
    [form, t, dispatchEvent]
  );

  const saveAsTemplate = useCallback(
    async (name: string) => {
      try {
        const currentData = form.getValues();
        const template: TournamentTemplateData = {
          name,
          description: currentData.description,
          format: currentData.format!,
          category: currentData.category!,
          maxParticipants: currentData.maxParticipants!,
          minParticipants: currentData.minParticipants!,
          entryFee: currentData.entryFee!,
          prizeMoney: currentData.prizeMoney!,
          pointsSystem: currentData.pointsSystem!,
          rules: currentData.rules,
          isDefault: false,
        };

        // Save to local storage (in real app, would save to backend)
        const existingTemplates = JSON.parse(
          localStorage.getItem('custom_tournament_templates') || '[]'
        );
        existingTemplates.push(template);
        localStorage.setItem(
          'custom_tournament_templates',
          JSON.stringify(existingTemplates)
        );

        setCustomTemplates(existingTemplates);
        toast.success(t('tournaments.form.templateSaved', { name }));
      } catch (error) {
        toast.error(t('tournaments.form.templateSaveError'));
      }
    },
    [form, t]
  );

  // Auto-save functionality
  const saveDraft = useCallback(async () => {
    if (!config.enableAutoSave) return;

    setAutoSaveState((prev) => ({ ...prev, isSaving: true, hasError: false }));

    try {
      const draftData = {
        ...form.getValues(),
        timestamp: new Date().toISOString(),
        step: formState.currentStep,
      };

      localStorage.setItem(draftKeyRef.current, JSON.stringify(draftData));

      setAutoSaveState((prev) => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        isDirty: false,
      }));

      dispatchEvent({
        type: 'AUTO_SAVE',
        payload: { success: true, draftId: draftKeyRef.current },
      });
    } catch (error) {
      setAutoSaveState((prev) => ({
        ...prev,
        isSaving: false,
        hasError: true,
      }));

      dispatchEvent({
        type: 'AUTO_SAVE',
        payload: { success: false },
      });
    }
  }, [config.enableAutoSave, form, formState.currentStep, dispatchEvent]);

  const loadDraft = useCallback(
    async (draftId: string) => {
      try {
        const draftData = JSON.parse(localStorage.getItem(draftId) || '{}');
        if (draftData.timestamp) {
          form.reset(draftData);
          setFormState((prev) => ({
            ...prev,
            currentStep: draftData.step || 0,
          }));
          toast.success(t('tournaments.form.draftLoaded'));
        }
      } catch (error) {
        toast.error(t('tournaments.form.draftLoadError'));
      }
    },
    [form, t]
  );

  // Resource availability checking
  const checkResourceAvailability = useCallback(async () => {
    const { startDate, endDate, maxParticipants } = form.getValues();

    if (!startDate || !endDate) return;

    setResourceState((prev) => ({ ...prev, isChecking: true }));

    try {
      // Simulate API call to check court availability
      await simulateAsyncOperation(1500);

      // Mock availability check
      const dateConflicts = [];
      const capacityWarnings = [];

      // Simulate some conflicts
      const conflictDate = new Date(startDate);
      conflictDate.setDate(conflictDate.getDate() + 2);
      if (Math.random() > 0.7) {
        dateConflicts.push(conflictDate.toISOString().split('T')[0]);
      }

      // Check capacity
      if (maxParticipants > 32) {
        capacityWarnings.push(t('tournaments.form.warnings.highCapacity'));
      }

      setResourceState((prev) => ({
        ...prev,
        isChecking: false,
        courtsAvailable: dateConflicts.length === 0,
        dateConflicts,
        capacityWarnings,
        lastChecked: new Date(),
      }));
    } catch (error) {
      setResourceState((prev) => ({ ...prev, isChecking: false }));
      toast.error(t('tournaments.form.availabilityCheckError'));
    }
  }, [form, t]);

  // Duration estimation
  const estimateDuration = useCallback((): TournamentDurationEstimate => {
    const { format, maxParticipants, pointsSystem } = form.getValues();

    let totalMatches = 0;
    let matchDuration = 75; // minutes

    // Calculate matches based on format
    switch (format) {
      case 'elimination':
        totalMatches = (maxParticipants || 16) - 1;
        break;
      case 'round-robin':
        const participants = maxParticipants || 16;
        totalMatches = Math.floor((participants * (participants - 1)) / 2);
        break;
      case 'groups':
        totalMatches = Math.floor((maxParticipants || 16) * 1.5);
        break;
      default:
        totalMatches = Math.floor((maxParticipants || 16) * 1.2);
    }

    // Adjust duration based on points system
    switch (pointsSystem) {
      case 'tiebreak':
        matchDuration = 50;
        break;
      case 'no-advantage':
        matchDuration = 60;
        break;
      case 'advantage':
        matchDuration = 90;
        break;
    }

    const totalMinutes = totalMatches * matchDuration;
    const matchesPerDay = Math.floor(480 / matchDuration); // 8 hours per day
    const estimatedDays = Math.ceil(totalMatches / matchesPerDay);

    return {
      estimatedDays,
      estimatedHours: Math.ceil(totalMinutes / 60),
      matchesPerDay,
      totalMatches,
      restDaysSuggested: estimatedDays > 3 ? 1 : 0,
      isCalculating: false,
    };
  }, [form]);

  // Form submission
  const submitForm = useCallback(async (): Promise<any> => {
    try {
      const formData = form.getValues();

      // Final validation
      const validationResult = await form.trigger();
      if (!validationResult) {
        throw new Error(t('tournaments.form.validationFailed'));
      }

      // Create tournament object
      const tournamentData = {
        ...formData,
        id: tournament?.id || Date.now().toString(),
        currentParticipants: 0,
        status: 'upcoming' as const,
        club: { id: '1', name: 'Default Club' }, // This would come from user's selected club
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Simulate API call
      await simulateAsyncOperation(2000);

      // Update store
      if (tournament) {
        updateTournament(tournament.id, tournamentData);
        toast.success(t('tournaments.form.tournamentUpdated'));
      } else {
        addTournament(tournamentData as any);
        toast.success(t('tournaments.form.tournamentCreated'));
      }

      // Clear draft
      if (config.enableAutoSave) {
        localStorage.removeItem(draftKeyRef.current);
      }

      dispatchEvent({
        type: 'FORM_SUBMITTED',
        payload: { data: formData },
      });

      return tournamentData;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('tournaments.form.submitError');
      toast.error(message);
      throw error;
    }
  }, [
    form,
    tournament,
    updateTournament,
    addTournament,
    config.enableAutoSave,
    t,
    dispatchEvent,
  ]);

  // Preview management
  const openPreview = useCallback(() => {
    setIsPreviewOpen(true);
    dispatchEvent({
      type: 'PREVIEW_OPENED',
      payload: { step: formState.currentStep },
    });
  }, [formState.currentStep, dispatchEvent]);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!config.enableAutoSave) return;

    const handleAutoSave = () => {
      if (autoSaveState.isDirty && !autoSaveState.isSaving) {
        saveDraft();
      }
    };

    autoSaveTimerRef.current = setInterval(
      handleAutoSave,
      config.autoSaveInterval
    );

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [
    config.enableAutoSave,
    config.autoSaveInterval,
    autoSaveState.isDirty,
    autoSaveState.isSaving,
    saveDraft,
  ]);

  // Mark as dirty on form changes
  useEffect(() => {
    if (config.enableAutoSave) {
      setAutoSaveState((prev) => ({ ...prev, isDirty: true }));
    }
  }, [data, config.enableAutoSave]);

  // Load custom templates on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem('custom_tournament_templates') || '[]'
      );
      setCustomTemplates(stored);
    } catch (error) {
          }
  }, []);

  return {
    // State
    formState,
    validationState,
    autoSaveState,
    resourceState,
    data,
    errors: form.formState.errors,

    // Form methods
    register: form.register,
    watch: form.watch,
    setValue: form.setValue,
    trigger: form.trigger,
    reset: form.reset,

    // Navigation
    nextStep,
    previousStep,
    goToStep,

    // Templates
    applyTemplate,
    saveAsTemplate,

    // Preview
    openPreview,
    closePreview,

    // Submission
    submitForm,
    saveDraft,
    loadDraft,

    // Utilities
    estimateDuration,
    checkResourceAvailability,
    validateCurrentStep,
  };
};
