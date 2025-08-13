'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary/error-boundary';
import { usePathname } from 'next/navigation';

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

export function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  const pathname = usePathname();

  return (
    <ErrorBoundary
      level="page"
      resetKeys={[pathname]}
      resetOnPropsChange
      onError={(error, errorInfo) => {
        // Send error to monitoring service
              }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Section-level error boundary
export function SectionErrorBoundary({ 
  children,
  name,
}: { 
  children: ReactNode;
  name: string;
}) {
  return (
    <ErrorBoundary
      level="section"
      onError={(error, errorInfo) => {
        :`, error, errorInfo);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Component-level error boundary  
export function ComponentErrorBoundary({ 
  children,
  fallback,
}: { 
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return (
    <ErrorBoundary
      level="component"
      fallback={fallback}
      showDetails={false}
    >
      {children}
    </ErrorBoundary>
  );
}

// Async component error boundary
export function AsyncBoundary({ 
  children,
  fallback,
  errorFallback,
}: { 
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
}) {
  return (
    <ErrorBoundary
      level="component"
      fallback={errorFallback}
    >
      {children}
    </ErrorBoundary>
  );
}