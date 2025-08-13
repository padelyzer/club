import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export interface ErrorState {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, any>;
}

export interface UseErrorOptions {
  autoReset?: boolean;
  resetDelay?: number;
  onError?: (error: ErrorState) => void;
  transformError?: (error: any) => ErrorState;
}

export function useError(options: UseErrorOptions = {}) {
  const { t } = useTranslation();
  const [error, setError] = useState<ErrorState | null>(null);
  const [isError, setIsError] = useState(false);
  const resetTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    autoReset = false,
    resetDelay = 5000,
    onError,
    transformError,
  } = options;

  const clearError = useCallback(() => {
    setError(null);
    setIsError(false);
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
  }, []);

  const setErrorState = useCallback(
    (errorInput: any) => {
      let errorState: ErrorState;

      if (transformError) {
        errorState = transformError(errorInput);
      } else if (typeof errorInput === 'string') {
        errorState = { message: errorInput };
      } else if (errorInput instanceof Error) {
        errorState = {
          message: errorInput.message,
          details: { stack: errorInput.stack },
        };
      } else if (errorInput?.response?.data) {
        // Axios error
        const data = errorInput.response.data;
        errorState = {
          message: data.message || data.error || t('common.error'),
          code: data.code,
          details: data,
        };
      } else {
        errorState = {
          message: errorInput?.message || t('common.error'),
          ...errorInput,
        };
      }

      setError(errorState);
      setIsError(true);

      if (onError) {
        onError(errorState);
      }

      if (autoReset) {
        resetTimeoutRef.current = setTimeout(clearError, resetDelay);
      }
    },
    [autoReset, clearError, onError, resetDelay, t, transformError]
  );

  return {
    error,
    isError,
    setError: setErrorState,
    clearError,
  };
}

// Field-level error handling for forms
export function useFieldError() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = Object.keys(errors).length > 0;

  return {
    errors,
    setFieldError,
    clearFieldError,
    clearAllErrors,
    hasErrors,
  };
}

// Async error handling
export function useAsyncError() {
  const [error, setError] = useState<Error | null>(null);

  const throwError = useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Throw error to nearest error boundary
  if (error) {
    throw error;
  }

  return { throwError, resetError };
}

// API error transformer
export function transformAPIError(error: any): ErrorState {
  if (error.response) {
    // Server responded with error
    const { data, status } = error.response;
    
    if (status === 401) {
      return {
        message: 'Your session has expired. Please log in again.',
        code: 'UNAUTHORIZED',
      };
    }
    
    if (status === 403) {
      return {
        message: 'You do not have permission to perform this action.',
        code: 'FORBIDDEN',
      };
    }
    
    if (status === 404) {
      return {
        message: 'The requested resource was not found.',
        code: 'NOT_FOUND',
      };
    }
    
    if (status === 422 && data.errors) {
      // Validation errors
      const firstError = Object.values(data.errors)[0];
      return {
        message: Array.isArray(firstError) ? firstError[0] : firstError,
        code: 'VALIDATION_ERROR',
        details: data.errors,
      };
    }
    
    if (status >= 500) {
      return {
        message: 'A server error occurred. Please try again later.',
        code: 'SERVER_ERROR',
      };
    }
    
    return {
      message: data.message || data.error || 'An error occurred',
      code: data.code || `HTTP_${status}`,
      details: data,
    };
  }
  
  if (error.request) {
    // Request made but no response
    return {
      message: 'Unable to connect to the server. Please check your connection.',
      code: 'NETWORK_ERROR',
    };
  }
  
  // Other errors
  return {
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}