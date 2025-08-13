import React from 'react';
import { 
  AlertTriangle, 
  Wifi, 
  RefreshCw, 
  Building2, 
  FileX, 
  Shield,
  ServerCrash,
  Search,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { designTokens } from '@/styles/design-tokens';

interface ErrorStateProps {
  title: string;
  message?: string;
  type?: 'error' | 'warning' | 'info' | 'network' | 'notFound' | 'permission' | 'timeout';
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

// Generic error state component
export const ClubErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  type = 'error',
  onRetry,
  retryLabel = 'Reintentar',
  className,
  children,
}) => {
  const getErrorIcon = () => {
    switch (type) {
      case 'network':
        return <Wifi className="w-12 h-12 text-red-500" />;
      case 'notFound':
        return <FileX className="w-12 h-12 text-gray-400" />;
      case 'permission':
        return <Shield className="w-12 h-12 text-orange-500" />;
      case 'timeout':
        return <Clock className="w-12 h-12 text-yellow-500" />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12 text-yellow-500" />;
      case 'info':
        return <Building2 className="w-12 h-12 text-blue-500" />;
      default:
        return <ServerCrash className="w-12 h-12 text-red-500" />;
    }
  };

  const getErrorColors = () => {
    switch (type) {
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'info':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      case 'permission':
        return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';
      default:
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    }
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <div className={cn('rounded-lg border p-8 max-w-md mx-auto', getErrorColors())}>
        <div className="flex justify-center mb-4">
          {getErrorIcon()}
        </div>
        
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          {title}
        </h3>
        
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>
        )}

        {children}

        {onRetry && (
          <Button 
            onClick={onRetry}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

// Specific error states for clubs
export const ClubLoadError: React.FC<{ error?: Error; onRetry?: () => void }> = ({ 
  error, 
  onRetry 
}) => (
  <ClubErrorState
    type="error"
    title="Error al cargar clubes"
    message={error?.message || "No pudimos cargar la lista de clubes. Por favor, intenta de nuevo."}
    onRetry={onRetry}
  />
);

export const ClubNotFoundError: React.FC<{ clubId?: string }> = ({ clubId }) => (
  <ClubErrorState
    type="notFound"
    title="Club no encontrado"
    message={clubId ? `El club con ID "${clubId}" no existe o no tienes acceso a él.` : "El club que buscas no existe."}
  />
);

export const ClubPermissionError: React.FC = () => (
  <ClubErrorState
    type="permission"
    title="Sin acceso a clubes"
    message="No tienes permisos para ver esta información. Contacta a tu administrador."
  />
);

export const ClubNetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ClubErrorState
    type="network"
    title="Error de conexión"
    message="No pudimos conectar con el servidor. Verifica tu conexión a internet."
    onRetry={onRetry}
    retryLabel="Reconectar"
  />
);

export const ClubFormError: React.FC<{ error?: Error; onRetry?: () => void }> = ({ 
  error, 
  onRetry 
}) => (
  <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
    <AlertTriangle className="h-4 w-4 text-red-500" />
    <AlertDescription className="text-red-700 dark:text-red-300">
      <strong>Error al guardar:</strong> {error?.message || "Ocurrió un error inesperado."}
      {onRetry && (
        <Button 
          variant="link" 
          size="sm" 
          onClick={onRetry}
          className="ml-2 h-auto p-0 text-red-700 dark:text-red-300"
        >
          Reintentar
        </Button>
      )}
    </AlertDescription>
  </Alert>
);

export const ClubTimeoutError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ClubErrorState
    type="timeout"
    title="Tiempo de espera agotado"
    message="La operación está tardando más de lo esperado. Por favor, intenta de nuevo."
    onRetry={onRetry}
  />
);

export const ClubEmptyState: React.FC<{ 
  title?: string; 
  message?: string; 
  action?: { label: string; onClick: () => void } 
}> = ({ 
  title = "No hay clubes", 
  message = "No se encontraron clubes que coincidan con tu búsqueda.",
  action 
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <Search className="w-16 h-16 text-gray-300 mb-4" />
    <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
      {title}
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
      {message}
    </p>
    {action && (
      <Button onClick={action.onClick} variant="outline">
        {action.label}
      </Button>
    )}
  </div>
);

// Inline error states for forms and inputs
export const InlineError: React.FC<{ message: string; className?: string }> = ({ 
  message, 
  className 
}) => (
  <div className={cn('flex items-center gap-2 text-sm text-red-600 dark:text-red-400', className)}>
    <AlertTriangle className="w-4 h-4 shrink-0" />
    <span>{message}</span>
  </div>
);

// Hook for consistent error handling
export const useClubErrorStates = () => {
  const showFormError = (error: Error) => {
    // You can integrate with your toast system here
  };

  const showNetworkError = (error: Error) => {
    // You can integrate with your toast system here
  };

  return {
    ClubErrorState,
    ClubLoadError,
    ClubNotFoundError,
    ClubPermissionError,
    ClubNetworkError,
    ClubFormError,
    ClubTimeoutError,
    ClubEmptyState,
    InlineError,
    showFormError,
    showNetworkError,
  };
};

// Error boundary component
interface ClubErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ClubErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{ error: Error; retry: () => void }> }>,
  ClubErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ClubErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // In production, could send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent && this.state.error) {
        return (
          <FallbackComponent 
            error={this.state.error} 
            retry={() => this.setState({ hasError: false, error: undefined })}
          />
        );
      }

      return (
        <ClubErrorState
          type="error"
          title="Error en el componente"
          message="Algo salió mal con este componente. Por favor, recarga la página."
          onRetry={() => window.location.reload()}
          retryLabel="Recargar página"
        />
      );
    }

    return this.props.children;
  }
}