import { Tournament } from '@/types/tournament';
import {
  TournamentFormData,
  TournamentTemplateData,
} from '@/lib/validations/tournament-form';

// Props principales del formulario
export interface TournamentFormProps {
  isOpen: boolean;
  onClose: () => void;
  tournament?: Tournament | null;
  onSuccess?: (tournament: Tournament) => void;
  defaultTemplate?: TournamentTemplateData;
  mode?: 'create' | 'edit' | 'clone';
}

// Estado del wizard
export interface WizardState {
  currentStep: number;
  totalSteps: number;
  isValid: boolean[];
  completedSteps: boolean[];
  touched: boolean[];
}

// Props para cada paso del wizard
export interface WizardStepProps {
  data: Partial<TournamentFormData>;
  errors: any;
  register: any;
  watch: any;
  setValue: any;
  trigger: any;
  onNext?: () => void;
  onPrevious?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  isValid?: boolean;
}

// Props para el indicador de progreso
export interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: StepInfo[];
  completedSteps: boolean[];
  onStepClick?: (step: number) => void;
  allowStepNavigation?: boolean;
}

// Información de cada paso
export interface StepInfo {
  id: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<any>;
  isRequired?: boolean;
  estimatedTime?: string;
}

// Props para el selector de templates
export interface TemplateSelectorProps {
  selectedTemplate?: TournamentTemplateData;
  onTemplateSelect: (template: TournamentTemplateData | null) => void;
  onApplyTemplate: (template: TournamentTemplateData) => void;
  customTemplates?: TournamentTemplateData[];
  showCreateTemplate?: boolean;
}

// Props para la previsualización
export interface TournamentPreviewProps {
  data: Partial<TournamentFormData>;
  isVisible: boolean;
  onClose: () => void;
  onEdit: (step: number) => void;
}

// Props para el resumen final
export interface TournamentSummaryProps {
  data: TournamentFormData;
  onEdit: (step: number) => void;
  isSubmitting?: boolean;
}

// Estado del auto-guardado
export interface AutoSaveState {
  lastSaved: Date | null;
  isDirty: boolean;
  isSaving: boolean;
  hasError: boolean;
  draftId?: string;
}

// Props para el componente de auto-guardado
export interface AutoSaveIndicatorProps {
  state: AutoSaveState;
  onRetry?: () => void;
  onClearDraft?: () => void;
}

// Configuración del formulario
export interface TournamentFormConfig {
  enableAutoSave: boolean;
  autoSaveInterval: number; // ms
  enablePreview: boolean;
  enableTemplates: boolean;
  enableDraftRecovery: boolean;
  allowStepNavigation: boolean;
  showProgressEstimate: boolean;
  validateOnStepChange: boolean;
  maxImageSize: number; // bytes
  allowedImageTypes: string[];
}

// Estado de validación del formulario
export interface ValidationState {
  isValidating: boolean;
  validationErrors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  fieldStatus: Record<string, 'valid' | 'invalid' | 'warning' | 'pending'>;
}

// Props para campos con validación async
export interface AsyncValidationFieldProps {
  name: string;
  value: any;
  onValidation: (field: string, isValid: boolean, message?: string) => void;
  validationDelay?: number;
}

// Estado de disponibilidad de recursos
export interface ResourceAvailabilityState {
  courtsAvailable: boolean;
  dateConflicts: string[];
  capacityWarnings: string[];
  isChecking: boolean;
  lastChecked: Date | null;
}

// Props para el selector de fechas inteligente
export interface SmartDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  label: string;
  conflictDates?: string[];
  suggestedDates?: string[];
  onDateSuggestion?: (date: string) => void;
  validateAvailability?: boolean;
}

// Estado del estimador de duración
export interface TournamentDurationEstimate {
  estimatedDays: number;
  estimatedHours: number;
  matchesPerDay: number;
  totalMatches: number;
  restDaysSuggested: number;
  isCalculating: boolean;
}

// Props para el estimador de bracket
export interface BracketPreviewProps {
  format: string;
  maxParticipants: number;
  isDoublesOnly: boolean;
  onParticipantsChange?: (newMax: number) => void;
  showEstimate?: boolean;
}

// Tipos de eventos del formulario
export type TournamentFormEvent =
  | { type: 'STEP_CHANGE'; payload: { from: number; to: number } }
  | { type: 'VALIDATION_ERROR'; payload: { step: number; errors: any } }
  | { type: 'AUTO_SAVE'; payload: { success: boolean; draftId?: string } }
  | { type: 'TEMPLATE_APPLIED'; payload: { template: TournamentTemplateData } }
  | { type: 'PREVIEW_OPENED'; payload: { step: number } }
  | { type: 'FORM_SUBMITTED'; payload: { data: TournamentFormData } }
  | { type: 'FORM_RESET'; payload: {} };

// Props para el hook del formulario
export interface UseTournamentFormProps {
  tournament?: Tournament | null;
  defaultTemplate?: TournamentTemplateData;
  config?: Partial<TournamentFormConfig>;
  onEvent?: (event: TournamentFormEvent) => void;
}

// Estado retornado por el hook
export interface UseTournamentFormReturn {
  // Estado del formulario
  formState: WizardState;
  validationState: ValidationState;
  autoSaveState: AutoSaveState;
  resourceState: ResourceAvailabilityState;

  // Datos del formulario
  data: Partial<TournamentFormData>;
  errors: any;

  // Métodos del formulario
  register: any;
  watch: any;
  setValue: any;
  trigger: any;
  reset: any;

  // Navegación del wizard
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;

  // Gestión de templates
  applyTemplate: (template: TournamentTemplateData) => void;
  saveAsTemplate: (name: string) => void;

  // Previsualización
  openPreview: () => void;
  closePreview: () => void;

  // Envío del formulario
  submitForm: () => Promise<Tournament>;
  saveDraft: () => Promise<void>;
  loadDraft: (draftId: string) => Promise<void>;

  // Utilidades
  estimateDuration: () => TournamentDurationEstimate;
  checkResourceAvailability: () => Promise<void>;
  validateCurrentStep: () => Promise<boolean>;
}

// Constantes del formulario
export const TOURNAMENT_FORM_STEPS: StepInfo[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Tournament name, description, and image',
    isRequired: true,
    estimatedTime: '2 min',
  },
  {
    id: 'configuration',
    title: 'Tournament Configuration',
    description: 'Format, categories, and participants',
    isRequired: true,
    estimatedTime: '3 min',
  },
  {
    id: 'scheduling',
    title: 'Scheduling',
    description: 'Registration and tournament dates',
    isRequired: true,
    estimatedTime: '2 min',
  },
  {
    id: 'rules-prizes',
    title: 'Rules & Prizes',
    description: 'Tournament rules and prize distribution',
    isRequired: false,
    estimatedTime: '3 min',
  },
  {
    id: 'review',
    title: 'Review & Submit',
    description: 'Review all details before creating',
    isRequired: true,
    estimatedTime: '1 min',
  },
];

export const DEFAULT_FORM_CONFIG: TournamentFormConfig = {
  enableAutoSave: true,
  autoSaveInterval: 30000, // 30 segundos
  enablePreview: true,
  enableTemplates: true,
  enableDraftRecovery: true,
  allowStepNavigation: true,
  showProgressEstimate: true,
  validateOnStepChange: true,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
};
