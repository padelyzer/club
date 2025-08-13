// Import/Export types and interfaces
import { ApiClient, ApiClientFilters } from './client';

// Export format types
export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

// Import/Export progress states
export type ProgressState =
  | 'idle'
  | 'preparing'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

// Duplicate resolution strategies
export type DuplicateStrategy = 'skip' | 'update' | 'duplicate' | 'ask';

// Import error types
export interface ImportError {
  row: number;
  field?: string;
  value?: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

// Import validation warning
export interface ImportWarning {
  row: number;
  field?: string;
  value?: string;
  message: string;
  suggestion?: string;
}

// Import result interface
export interface ImportResult {
  total_rows: number;
  processed_rows: number;
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  error_count: number;
  errors: ImportError[];
  warnings: ImportWarning[];
  duplicates_found: number;
  processing_time: number;
}

// Field mapping for CSV import
export interface FieldMapping {
  csv_column: string;
  system_field: keyof ApiClient | null;
  is_required: boolean;
  default_value?: string;
  transform?:
    | 'uppercase'
    | 'lowercase'
    | 'capitalize'
    | 'trim'
    | 'phone_format'
    | 'date_format';
}

// Import configuration
export interface ImportConfig {
  file: File;
  has_header: boolean;
  delimiter: string;
  encoding: string;
  field_mappings: FieldMapping[];
  duplicate_strategy: DuplicateStrategy;
  validate_email: boolean;
  validate_phone: boolean;
  skip_invalid_rows: boolean;
  chunk_size: number;
}

// Export configuration
export interface ExportConfig {
  format: ExportFormat;
  filename?: string;
  include_headers: boolean;
  selected_fields: (keyof ApiClient)[];
  filters?: ApiClientFilters;
  include_stats: boolean;
  custom_fields?: {
    name: string;
    expression: string;
  }[];
  template_id?: string;
}

// Export template
export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  format: ExportFormat;
  config: Omit<ExportConfig, 'format'>;
  created_at: string;
  updated_at: string;
  is_default: boolean;
}

// Progress tracking
export interface OperationProgress {
  id: string;
  type: 'import' | 'export';
  state: ProgressState;
  progress_percentage: number;
  current_step: string;
  total_steps: number;
  completed_steps: number;
  estimated_time_remaining?: number;
  start_time: string;
  end_time?: string;
  error_message?: string;
  result?: ImportResult | ExportResult;
}

// Export result
export interface ExportResult {
  filename: string;
  format: ExportFormat;
  total_records: number;
  file_size: number;
  download_url: string;
  expires_at: string;
}

// CSV detection result
export interface CSVDetectionResult {
  delimiter: string;
  has_header: boolean;
  encoding: string;
  columns: string[];
  sample_rows: string[][];
  confidence: number;
}

// Field suggestion for auto-mapping
export interface FieldSuggestion {
  csv_column: string;
  suggested_field: keyof ApiClient;
  confidence: number;
  reason: string;
}

// Import preview data
export interface ImportPreviewData {
  headers: string[];
  sample_rows: any[][];
  total_rows: number;
  field_suggestions: FieldSuggestion[];
  validation_summary: {
    valid_rows: number;
    invalid_rows: number;
    warnings_count: number;
    errors_count: number;
  };
}

// Duplicate detection result
export interface DuplicateDetection {
  csv_row: number;
  existing_client: ApiClient;
  match_fields: string[];
  match_confidence: number;
  suggested_action: DuplicateStrategy;
}

// Batch operation status
export interface BatchOperationStatus {
  operation_id: string;
  type: 'import' | 'export';
  status: ProgressState;
  created_at: string;
  updated_at: string;
  user_id: string;
  config: ImportConfig | ExportConfig;
  progress: OperationProgress;
}

// Import step types for wizard
export type ImportStep =
  | 'upload'
  | 'configure'
  | 'mapping'
  | 'preview'
  | 'duplicates'
  | 'processing'
  | 'results';

// Export step types for wizard
export type ExportStep =
  | 'configure'
  | 'fields'
  | 'filters'
  | 'processing'
  | 'download';

// UI state for import/export modals
export interface ImportModalState {
  isOpen: boolean;
  currentStep: ImportStep;
  config: Partial<ImportConfig>;
  previewData?: ImportPreviewData;
  duplicates: DuplicateDetection[];
  progress?: OperationProgress;
  result?: ImportResult;
}

export interface ExportModalState {
  isOpen: boolean;
  currentStep: ExportStep;
  config: Partial<ExportConfig>;
  templates: ExportTemplate[];
  selectedTemplate?: ExportTemplate;
  progress?: OperationProgress;
  result?: ExportResult;
}

// File validation rules
export interface FileValidationRules {
  max_file_size: number; // in bytes
  allowed_extensions: string[];
  max_rows: number;
  required_columns?: string[];
}

// System field definitions for mapping
export interface SystemField {
  key: keyof ApiClient;
  label: string;
  type: 'string' | 'email' | 'phone' | 'date' | 'number' | 'boolean';
  required: boolean;
  validation_rules?: {
    min_length?: number;
    max_length?: number;
    pattern?: string;
    options?: string[];
  };
  description?: string;
  example?: string;
}

// Available system fields for client import
export const CLIENT_SYSTEM_FIELDS: SystemField[] = [
  {
    key: 'first_name',
    label: 'Nombre',
    type: 'string',
    required: true,
    validation_rules: { min_length: 1, max_length: 50 },
    example: 'Juan',
  },
  {
    key: 'last_name',
    label: 'Apellido',
    type: 'string',
    required: true,
    validation_rules: { min_length: 1, max_length: 50 },
    example: 'Pérez',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    validation_rules: { pattern: '^[^@]+@[^@]+\\.[^@]+$' },
    example: 'juan.perez@email.com',
  },
  {
    key: 'phone',
    label: 'Teléfono',
    type: 'phone',
    required: false,
    validation_rules: { min_length: 8, max_length: 20 },
    example: '+34 666 777 888',
  },
  {
    key: 'birth_date',
    label: 'Fecha de Nacimiento',
    type: 'date',
    required: false,
    example: '1990-01-15',
  },
  {
    key: 'document_type',
    label: 'Tipo de Documento',
    type: 'string',
    required: false,
    validation_rules: { options: ['dni', 'passport', 'other'] },
    example: 'dni',
  },
  {
    key: 'document_number',
    label: 'Número de Documento',
    type: 'string',
    required: false,
    validation_rules: { max_length: 20 },
    example: '12345678A',
  },
];

// Common CSV delimiters for auto-detection
export const CSV_DELIMITERS = [',', ';', '\t', '|'] as const;

// Common file encodings for auto-detection
export const FILE_ENCODINGS = ['UTF-8', 'ISO-8859-1', 'Windows-1252'] as const;

// Default file validation rules
export const DEFAULT_FILE_VALIDATION: FileValidationRules = {
  max_file_size: 10 * 1024 * 1024, // 10MB
  allowed_extensions: ['.csv', '.xlsx', '.xls'],
  max_rows: 10000,
};

// Default export templates
export const DEFAULT_EXPORT_TEMPLATES: Omit<
  ExportTemplate,
  'id' | 'created_at' | 'updated_at'
>[] = [
  {
    name: 'Clientes Básico',
    description: 'Exportación básica con información esencial',
    format: 'csv',
    is_default: true,
    config: {
      include_headers: true,
      selected_fields: ['first_name', 'last_name', 'email', 'phone'],
      include_stats: false,
    },
  },
  {
    name: 'Clientes Completo',
    description: 'Exportación completa con todas las propiedades',
    format: 'xlsx',
    is_default: false,
    config: {
      include_headers: true,
      selected_fields: [
        'first_name',
        'last_name',
        'email',
        'phone',
        'birth_date',
        'document_type',
        'document_number',
        'created_at',
        'updated_at',
      ],
      include_stats: true,
    },
  },
  {
    name: 'Reporte PDF',
    description: 'Reporte formateado para impresión',
    format: 'pdf',
    is_default: false,
    config: {
      include_headers: true,
      selected_fields: ['first_name', 'last_name', 'email', 'phone'],
      include_stats: true,
    },
  },
];
