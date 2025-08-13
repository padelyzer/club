'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationError {
  field: string;
  message: string;
  section: string;
}

interface FormValidationSummaryProps {
  errors: ValidationError[];
  warnings?: string[];
  isSubmitting?: boolean;
  onFieldFocus?: (field: string) => void;
  className?: string;
}

export function FormValidationSummary({
  errors,
  warnings = [],
  isSubmitting,
  onFieldFocus,
  className,
}: FormValidationSummaryProps) {
  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasErrors && !hasWarnings && !isSubmitting) {
    return null;
  }

  // Group errors by section
  const errorsBySection = errors.reduce((acc, error) => {
    if (!acc[error.section]) {
      acc[error.section] = [];
    }
    acc[error.section].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  return (
    <Card className={cn('p-4 border-l-4', className, {
      'border-l-red-500 bg-red-50 dark:bg-red-900/10': hasErrors,
      'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10': !hasErrors && hasWarnings,
      'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10': isSubmitting,
    })}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {hasErrors && (
            <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          )}
          {!hasErrors && hasWarnings && (
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
          )}
          {isSubmitting && !hasErrors && !hasWarnings && (
            <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          )}
          
          <div className="flex-1">
            <h3 className={cn('font-medium', {
              'text-red-800 dark:text-red-200': hasErrors,
              'text-yellow-800 dark:text-yellow-200': !hasErrors && hasWarnings,
              'text-blue-800 dark:text-blue-200': isSubmitting && !hasErrors && !hasWarnings,
            })}>
              {hasErrors && 'Errores de Validación'}
              {!hasErrors && hasWarnings && 'Advertencias'}
              {isSubmitting && !hasErrors && !hasWarnings && 'Enviando formulario...'}
            </h3>
            
            {hasErrors && (
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Por favor corrige los siguientes errores antes de continuar:
              </p>
            )}
            
            {!hasErrors && hasWarnings && (
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Revisa las siguientes advertencias:
              </p>
            )}
          </div>
        </div>

        {/* Errors by Section */}
        {hasErrors && (
          <div className="space-y-3">
            {Object.entries(errorsBySection).map(([section, sectionErrors]) => (
              <div key={section} className="space-y-2">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 capitalize">
                  {section}
                </h4>
                <ul className="space-y-1">
                  {sectionErrors.map((error, index) => (
                    <li key={index} className="text-sm text-red-700 dark:text-red-300">
                      <button
                        type="button"
                        onClick={() => onFieldFocus?.(error.field)}
                        className="text-left hover:underline focus:underline focus:outline-none"
                      >
                        • {error.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="space-y-2">
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Progress during submission */}
        {isSubmitting && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Creando club y configurando suscripción...
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// Field validation indicator component
interface FieldValidationProps {
  error?: string;
  warning?: string;
  success?: boolean;
  className?: string;
}

export function FieldValidation({ error, warning, success, className }: FieldValidationProps) {
  if (!error && !warning && !success) return null;

  return (
    <div className={cn('flex items-center gap-1 mt-1', className)}>
      {error && (
        <>
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs text-red-600 dark:text-red-400">{error}</span>
        </>
      )}
      {!error && warning && (
        <>
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <span className="text-xs text-yellow-600 dark:text-yellow-400">{warning}</span>
        </>
      )}
      {!error && !warning && success && (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-xs text-green-600 dark:text-green-400">Válido</span>
        </>
      )}
    </div>
  );
}