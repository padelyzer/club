'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Card } from './Card';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

// Base Modal Props
interface ProfessionalModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  closable?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

/**
 * Professional Modal Component
 * Modern modal with glassmorphism, smooth animations, and accessibility features
 */
export const ProfessionalModal: React.FC<ProfessionalModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  closable = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className,
}) => {
  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full m-4',
  };

  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => closeOnOverlayClick && onClose()}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'relative w-full',
              sizeClasses[size],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <Card variant="elevated" padding="none" className="backdrop-blur-xl border-white/20 shadow-2xl max-h-[90vh] overflow-hidden">
              {closable && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 h-8 w-8 hover:bg-white/60"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              
              <div className="max-h-[90vh] overflow-y-auto">
                {children}
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Modal Header
interface ModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, className }) => {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
      {children}
    </div>
  );
};

// Modal Title
interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalTitle: React.FC<ModalTitleProps> = ({ children, className }) => {
  return (
    <h2 className={cn('text-xl font-semibold text-gray-900', className)}>
      {children}
    </h2>
  );
};

// Modal Body
interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className }) => {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
};

// Modal Footer
interface ModalFooterProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ 
  children, 
  align = 'right',
  className 
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div className={cn(
      'px-6 py-4 border-t border-gray-200 flex items-center gap-3',
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  );
};

// Confirmation Modal
interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'default' | 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'default',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false,
}) => {
  const typeConfig = {
    default: {
      icon: <Info className="w-6 h-6 text-[#007AFF]" />,
      confirmVariant: 'primary' as const,
      iconBg: 'bg-[#007AFF]/10',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      confirmVariant: 'primary' as const,
      iconBg: 'bg-amber-100',
    },
    danger: {
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      confirmVariant: 'destructive' as const,
      iconBg: 'bg-red-100',
    },
  };

  const config = typeConfig[type];

  return (
    <ProfessionalModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <ModalBody className="text-center">
        <div className={cn('w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4', config.iconBg)}>
          {config.icon}
        </div>
        
        <ModalTitle className="mb-2">{title}</ModalTitle>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </ModalBody>
    </ProfessionalModal>
  );
};

// Alert Modal
interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttonText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'Entendido',
}) => {
  const typeConfig = {
    success: {
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
      iconBg: 'bg-green-100',
    },
    error: {
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
      iconBg: 'bg-red-100',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      iconBg: 'bg-amber-100',
    },
    info: {
      icon: <Info className="w-6 h-6 text-[#007AFF]" />,
      iconBg: 'bg-[#007AFF]/10',
    },
  };

  const config = typeConfig[type];

  return (
    <ProfessionalModal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
    >
      <ModalBody className="text-center">
        <div className={cn('w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-4', config.iconBg)}>
          {config.icon}
        </div>
        
        <ModalTitle className="mb-2">{title}</ModalTitle>
        
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        
        <Button
          variant="primary"
          onClick={onClose}
          fullWidth
        >
          {buttonText}
        </Button>
      </ModalBody>
    </ProfessionalModal>
  );
};

// Loading Modal
interface LoadingModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  title = 'Cargando...',
  message = 'Por favor espera mientras procesamos tu solicitud.',
}) => {
  return (
    <ProfessionalModal
      isOpen={isOpen}
      onClose={() => {}}
      size="sm"
      closable={false}
      closeOnOverlayClick={false}
      closeOnEscape={false}
    >
      <ModalBody className="text-center">
        <div className="w-12 h-12 mx-auto mb-4">
          <div className="w-12 h-12 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin" />
        </div>
        
        <ModalTitle className="mb-2">{title}</ModalTitle>
        
        <p className="text-gray-600">
          {message}
        </p>
      </ModalBody>
    </ProfessionalModal>
  );
};

// Form Modal
interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  loading = false,
  size = 'md',
}) => {
  return (
    <ProfessionalModal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      closeOnOverlayClick={!loading}
      closeOnEscape={!loading}
    >
      <form onSubmit={onSubmit}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
        </ModalHeader>
        
        <ModalBody>
          {children}
        </ModalBody>
        
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {submitText}
          </Button>
        </ModalFooter>
      </form>
    </ProfessionalModal>
  );
};

// Modal Hook
export const useModal = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);
  const toggleModal = () => setIsOpen(!isOpen);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
};

export default {
  ProfessionalModal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ConfirmationModal,
  AlertModal,
  LoadingModal,
  FormModal,
  useModal,
};