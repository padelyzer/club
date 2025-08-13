import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { feedback } from '@/components/ui/action-feedback';

interface RecoveryOptions {
  maxRetries?: number;
  delay?: number;
  backoffFactor?: number;
  onError?: (error: any, attempt: number) => void;
  onSuccess?: (result: any) => void;
  fallback?: any;
  showNotification?: boolean;
  fallbackUrl?: string;
}

export function useErrorRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const executeWithRecovery = useCallback(async <T>(
    fn: (signal?: AbortSignal) => Promise<T>,
    options: RecoveryOptions = {}
  ): Promise<T | undefined> => {
    const {
      maxRetries = 3,
      delay = 1000,
      backoffFactor = 2,
      onError,
      onSuccess,
      fallback,
      showNotification = true,
      fallbackUrl = '/'
    } = options;

    setIsRecovering(true);
    setLastError(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt);
        const result = await fn(abortControllerRef.current.signal);
        
        setIsRecovering(false);
        setRetryCount(0);
        if (onSuccess) onSuccess(result);
        
        if (showNotification && attempt > 0) {
          feedback.success('Operation completed successfully after retry');
        }
        
        return result;
      } catch (error: any) {
        setLastError(error);
        
        // Don't retry if aborted
        if (error.name === 'AbortError') {
          setIsRecovering(false);
          setRetryCount(0);
          return fallback;
        }

        // Don't retry on client errors (4xx)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          setIsRecovering(false);
          setRetryCount(0);
          if (onError) onError(error, attempt);
          
          if (showNotification) {
            feedback.error(error.message || 'Client error occurred', {
              action: {
                label: 'Go Back',
                onClick: () => router.push(fallbackUrl),
              },
            });
          }
          throw error;
        }

        // Last attempt
        if (attempt === maxRetries) {
          setIsRecovering(false);
          setRetryCount(0);
          if (onError) onError(error, attempt);
          
          if (showNotification) {
            feedback.error('Operation failed after multiple attempts', {
              action: {
                label: 'Try Again',
                onClick: async () => {
                  await executeWithRecovery(fn, options);
                },
              },
            });
          }
          
          if (fallback !== undefined) return fallback;
          throw error;
        }

        // Calculate delay with exponential backoff
        const retryDelay = delay * Math.pow(backoffFactor, attempt);
        
        if (showNotification) {
          if (attempt === 0) {
            feedback.warning(`Error occurred. Retrying...`);
          } else {
            toast.error(
              `Request failed. Retrying in ${Math.round(retryDelay / 1000)}s... (${attempt + 1}/${maxRetries})`
            );
          }
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }, [router]);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsRecovering(false);
      setRetryCount(0);
    }
  }, []);

  const reset = useCallback(() => {
    setIsRecovering(false);
    setLastError(null);
    setRetryCount(0);
  }, []);

  return {
    executeWithRecovery,
    isRecovering,
    lastError,
    retryCount,
    abort,
    reset
  };
}

// Hook for async error handling
export function useAsyncError() {
  const [error, setError] = useState<Error | null>(null);
  
  const throwError = useCallback((error: Error) => {
    setError(error);
  }, []);
  
  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return throwError;
}

// Hook for component-level error recovery
export function useComponentErrorRecovery(componentName: string) {
  const [hasError, setHasError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const maxErrors = 3;
  
  const handleError = useCallback((error: Error) => {
        setHasError(true);
    setErrorCount(prev => prev + 1);
    
    // Log to monitoring
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        tags: {
          component: componentName,
          errorCount: errorCount + 1,
        },
      });
    }
    
    // Auto-recover after timeout if not too many errors
    if (errorCount < maxErrors) {
      setTimeout(() => {
        setHasError(false);
      }, 3000);
    } else {
      feedback.error(`Component ${componentName} encountered too many errors`);
    }
  }, [componentName, errorCount, maxErrors]);
  
  const reset = useCallback(() => {
    setHasError(false);
    setErrorCount(0);
  }, []);
  
  return {
    hasError,
    errorCount,
    isRecoverable: errorCount < maxErrors,
    handleError,
    reset,
  };
}