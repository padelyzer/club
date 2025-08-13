'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useUIStore } from '@/store/ui';
import { cn } from '@/lib/utils';
import { InvoiceDetailModal } from '@/components/finance/invoice-detail-modal';
import { PaymentDetailModal } from '@/components/finance/payment-detail-modal';
import { EditReservationModal } from '@/components/reservations/edit-reservation-modal';
import { NotificationCenterPWA } from '@/components/notifications/NotificationCenterPWA';

interface ModalProps {
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  onClose?: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  size = 'md',
  className,
  onClose,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
}) => {
  const { activeModal, closeModal } = useUIStore();
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeModal();
    }
  };

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape]);

  // Focus management
  useEffect(() => {
    if (activeModal && modalRef.current) {
      modalRef.current.focus();
    }
  }, [activeModal]);

  // Prevent body scroll
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);

  if (!activeModal) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-none m-4',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={closeOnOverlayClick ? handleClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={cn(
          'relative w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl transform transition-all',
          sizeClasses[size],
          size === 'full' ? 'h-full' : 'max-h-[90vh]',
          className
        )}
      >
        {/* Close button */}
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        )}

        {/* Content */}
        <div
          className={cn(
            'p-6',
            size === 'full'
              ? 'h-full overflow-hidden'
              : 'max-h-full overflow-y-auto'
          )}
        >
          {children || <ModalContent modalId={activeModal} />}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

// Modal content router based on activeModal
const ModalContent: React.FC<{ modalId: string }> = ({ modalId }) => {
  switch (modalId) {
    case 'invoice-detail':
      return <InvoiceDetailModal />;

    case 'payment-detail':
      return <PaymentDetailModal />;

    case 'edit-reservation':
      return <EditReservationModal />;

    case 'new-reservation':
      return (
        <div>
          <h2
            id="modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
          >
            New Reservation
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create a new court reservation form will go here.
          </p>
        </div>
      );

    case 'notifications':
      return <NotificationCenterPWA />;

    case 'settings':
      return (
        <div>
          <h2
            id="modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
          >
            Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Settings panel will go here.
          </p>
        </div>
      );

    case 'user-menu':
      return (
        <div>
          <h2
            id="modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
          >
            User Menu
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            User menu options will go here.
          </p>
        </div>
      );

    case 'search':
      return (
        <div>
          <h2
            id="modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
          >
            Search
          </h2>
          <input
            type="text"
            placeholder="Search..."
            autoFocus
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      );

    default:
      return (
        <div>
          <h2
            id="modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-4"
          >
            Modal
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Unknown modal: {modalId}
          </p>
        </div>
      );
  }
};
