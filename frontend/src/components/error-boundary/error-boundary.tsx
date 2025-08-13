'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    
    // Update error count
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
    }));

    // Call error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Log to error reporting service
    this.logErrorToService(error, errorInfo);

    // Auto-reset after multiple errors (circuit breaker pattern)
    if (this.state.errorCount >= 3) {
      this.scheduleReset(5000); // Reset after 5 seconds
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      // Reset on props change if enabled
      if (resetOnPropsChange && prevProps.children !== this.props.children) {
        this.resetErrorBoundary();
        return;
      }

      // Reset when resetKeys change
      if (resetKeys && this.hasResetKeysChanged(resetKeys)) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private hasResetKeysChanged(resetKeys: Array<string | number>): boolean {
    if (resetKeys.length !== this.previousResetKeys.length) {
      this.previousResetKeys = [...resetKeys];
      return true;
    }

    for (let i = 0; i < resetKeys.length; i++) {
      if (resetKeys[i] !== this.previousResetKeys[i]) {
        this.previousResetKeys = [...resetKeys];
        return true;
      }
    }

    return false;
  }

  private scheduleReset(delay: number) {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.resetErrorBoundary();
    }, delay);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service (e.g., Sentry, LogRocket)
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        level: 'error',
        tags: {
          component: 'ErrorBoundary',
          level: this.props.level || 'component',
        },
      });
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
                                  }
  }

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    if (error) {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
      alert('Error details copied to clipboard!');
    }
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { 
      children, 
      fallback, 
      isolate = true, 
      level = 'component',
      showDetails = process.env.NODE_ENV === 'development'
    } = this.props;

    if (hasError && error) {
      // Custom fallback
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI based on level
      const errorUI = (
        <div className={cn(
          'flex items-center justify-center',
          level === 'page' && 'min-h-screen',
          level === 'section' && 'min-h-[400px]',
          level === 'component' && 'p-8'
        )}>
          <div className="text-center max-w-md mx-auto">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              
              <h2 className="text-2xl font-semibold mb-2">
                {level === 'page' && 'Page Error'}
                {level === 'section' && 'Section Error'}
                {level === 'component' && 'Component Error'}
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {level === 'page' && 'This page encountered an error and cannot be displayed.'}
                {level === 'section' && 'This section encountered an error and cannot be displayed.'}
                {level === 'component' && 'This component encountered an error and cannot be displayed.'}
              </p>

              {errorCount > 1 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                  This error has occurred {errorCount} times.
                </p>
              )}
            </div>

            {showDetails && (
              <div className="mb-6 text-left">
                <details className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <summary className="cursor-pointer font-medium text-sm mb-2">
                    Error Details
                  </summary>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Message:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-red-600 dark:text-red-400">
                        {error.message}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <strong>Stack Trace:</strong>
                        <pre className="mt-1 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400 max-h-32 overflow-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.resetErrorBoundary}
                size="sm"
                variant="default"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              {level === 'page' && (
                <Button
                  onClick={this.handleGoHome}
                  size="sm"
                  variant="outline"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              )}
              
              {showDetails && (
                <Button
                  onClick={this.handleReportError}
                  size="sm"
                  variant="outline"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Copy Error
                </Button>
              )}
            </div>
          </div>
        </div>
      );

      // Isolate error to prevent cascading
      if (isolate) {
        return <div className="error-boundary-container">{errorUI}</div>;
      }

      return errorUI;
    }

    return children;
  }
}

// Higher-order component for error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for error recovery
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // Log to service
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: errorInfo ? { react: errorInfo } : undefined,
      });
    }

    // Development logging
    if (process.env.NODE_ENV === 'development') {
            if (errorInfo) {
              }
    }
  };
}