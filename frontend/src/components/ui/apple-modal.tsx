'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { useDrawerGestures, isMobileDevice, triggerHapticFeedback } from '@/lib/utils/gesture-handler';
import { logAccessibilityAudit } from '@/lib/utils/accessibility-audit';

export type ModalPresentationStyle = 'sheet' | 'popover' | 'card' | 'fullscreen';
export type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface AppleModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  presentationStyle?: ModalPresentationStyle;
  size?: ModalSize;
  className?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  preventClose?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Apple-style spring configuration
const springConfig = {
  type: "spring" as const,
  damping: 30,
  stiffness: 300,
  mass: 0.8,
};

// Modal size configurations
const sizeConfig = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

// Backdrop animations
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2, ease: "easeOut" }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15, ease: "easeIn" }
  }
};

// Content animations based on presentation style
const getContentVariants = (style: ModalPresentationStyle) => {
  switch (style) {
    case 'sheet':
      return {
        hidden: { 
          opacity: 0,
          y: '100%',
          scale: 1
        },
        visible: { 
          opacity: 1,
          y: 0,
          scale: 1,
          transition: springConfig
        },
        exit: { 
          opacity: 0,
          y: '100%',
          scale: 1,
          transition: { duration: 0.2, ease: "easeIn" }
        }
      };
    case 'popover':
      return {
        hidden: { 
          opacity: 0,
          scale: 0.95,
          y: -20
        },
        visible: { 
          opacity: 1,
          scale: 1,
          y: 0,
          transition: springConfig
        },
        exit: { 
          opacity: 0,
          scale: 0.95,
          y: -20,
          transition: { duration: 0.15, ease: "easeIn" }
        }
      };
    case 'fullscreen':
      return {
        hidden: { 
          opacity: 0,
          scale: 0.98
        },
        visible: { 
          opacity: 1,
          scale: 1,
          transition: springConfig
        },
        exit: { 
          opacity: 0,
          scale: 0.98,
          transition: { duration: 0.2, ease: "easeIn" }
        }
      };
    default: // card
      return {
        hidden: { 
          opacity: 0,
          scale: 0.95,
          y: 20
        },
        visible: { 
          opacity: 1,
          scale: 1,
          y: 0,
          transition: springConfig
        },
        exit: { 
          opacity: 0,
          scale: 0.95,
          y: 20,
          transition: { duration: 0.15, ease: "easeIn" }
        }
      };
  }
};

// Get container classes based on presentation style
const getContainerClasses = (style: ModalPresentationStyle, size: ModalSize) => {
  const baseClasses = "fixed z-50";
  const sizeClass = sizeConfig[size];
  
  switch (style) {
    case 'sheet':
      return cn(
        baseClasses,
        "inset-x-0 bottom-0 mx-auto",
        sizeClass,
        "max-h-[90vh]"
      );
    case 'popover':
      return cn(
        baseClasses,
        "top-4 left-1/2 -translate-x-1/2",
        sizeClass
      );
    case 'fullscreen':
      return cn(
        baseClasses,
        "inset-0",
        "w-full h-full max-w-full"
      );
    default: // card
      return cn(
        baseClasses,
        "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        sizeClass
      );
  }
};

// Get content classes based on presentation style
const getContentClasses = (style: ModalPresentationStyle) => {
  const baseClasses = cn(
    "relative w-full",
    "bg-white/95 dark:bg-gray-900/95",
    "backdrop-blur-xl backdrop-saturate-150",
    "border border-white/20 dark:border-gray-800/50",
    "shadow-2xl shadow-black/25 dark:shadow-black/50"
  );
  
  switch (style) {
    case 'sheet':
      return cn(
        baseClasses,
        "rounded-t-3xl",
        "overflow-hidden"
      );
    case 'popover':
      return cn(
        baseClasses,
        "rounded-2xl",
        "shadow-xl shadow-black/15"
      );
    case 'fullscreen':
      return cn(
        baseClasses,
        "rounded-none",
        "h-full",
        "border-0"
      );
    default: // card
      return cn(
        baseClasses,
        "rounded-3xl"
      );
  }
};

export const AppleModal: React.FC<AppleModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  description,
  presentationStyle = 'card',
  size = 'md',
  className,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  preventClose = false,
  onOpenChange,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 100], [1, 0.8]);
  const isMobile = isMobileDevice();

  // Handle close with prevention check
  const handleClose = useCallback(() => {
    if (preventClose) return;
    
    // Add haptic feedback on mobile
    if (isMobile) {
      triggerHapticFeedback('light');
    }
    
    onClose();
    onOpenChange?.(false);
  }, [onClose, preventClose, onOpenChange, isMobile]);

  // Enhanced gesture handling for sheet presentation
  const drawerGestures = useDrawerGestures(
    handleClose,
    modalRef,
    presentationStyle !== 'sheet' || preventClose
  );

  // Handle keyboard events
  useEffect(() => {
    if (!closeOnEscape) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeOnEscape, handleClose]);

  // Handle focus management and accessibility audit
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstElement?.focus();

      // Run accessibility audit in development
      if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
          logAccessibilityAudit(modalRef.current!, `AppleModal (${presentationStyle})`);
        }, 100);
      }

      return () => {
        document.removeEventListener('keydown', handleTabKey);
      };
    }
  }, [isOpen, presentationStyle]);

  // Handle drag gesture for sheet presentation
  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    if (presentationStyle !== 'sheet') return;
    
    const shouldClose = info.velocity.y > 500 || info.offset.y > 100;
    if (shouldClose) {
      handleClose();
    }
  }, [presentationStyle, handleClose]);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence mode="wait" onExitComplete={() => onOpenChange?.(false)}>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeOnBackdropClick ? handleClose : undefined}
          />

          {/* Modal Container */}
          <div className={getContainerClasses(presentationStyle, size)}>
            <motion.div
              ref={modalRef}
              variants={getContentVariants(presentationStyle)}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag={presentationStyle === 'sheet' ? 'y' : false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={handleDragEnd}
              style={{ y, opacity }}
              className={cn(
                getContentClasses(presentationStyle),
                className
              )}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? "modal-title" : undefined}
              aria-describedby={description ? "modal-description" : undefined}
              {...(isMobile && presentationStyle === 'sheet' ? drawerGestures : {})}
            >
              {/* Drag Handle for Sheet */}
              {presentationStyle === 'sheet' && (
                <div className="flex justify-center pt-3 pb-1">
                  <div 
                    className={cn(
                      "w-10 h-1 rounded-full transition-all duration-200",
                      "bg-gray-300 dark:bg-gray-600",
                      isMobile && "hover:bg-gray-400 dark:hover:bg-gray-500 hover:w-12"
                    )}
                    aria-label="Drag to dismiss"
                  />
                </div>
              )}

              {/* Header */}
              {(title || description || showCloseButton) && (
                <div className={cn(
                  "flex items-start justify-between",
                  presentationStyle === 'sheet' ? "px-6 pt-4 pb-2" : "p-6 pb-4"
                )}>
                  <div className="flex-1">
                    {title && (
                      <h2 
                        id="modal-title"
                        className="text-headline-md font-semibold text-gray-900 dark:text-white"
                      >
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p 
                        id="modal-description"
                        className="mt-1 text-body-md text-gray-600 dark:text-gray-400"
                      >
                        {description}
                      </p>
                    )}
                  </div>
                  
                  {showCloseButton && (
                    <button
                      onClick={handleClose}
                      className={cn(
                        "flex items-center justify-center",
                        "w-8 h-8 rounded-full",
                        "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700",
                        "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                        "transition-all duration-150 ease-in-out",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                        "active:scale-95"
                      )}
                      aria-label="Close modal"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className={cn(
                presentationStyle === 'sheet' ? "px-6 pb-6" : "px-6 pb-6",
                title || description ? "" : "pt-6"
              )}>
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  // Use portal to render modal at document root
  return typeof window !== 'undefined' 
    ? createPortal(modalContent, document.body)
    : null;
};

// Modal Header Component
export const ModalHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn("space-y-1", className)}>
    {children}
  </div>
);

// Modal Title Component
export const ModalTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <h3 className={cn(
    "text-headline-sm font-semibold leading-tight text-gray-900 dark:text-white",
    className
  )}>
    {children}
  </h3>
);

// Modal Description Component
export const ModalDescription: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p className={cn(
    "text-body-md text-gray-600 dark:text-gray-400",
    className
  )}>
    {children}
  </p>
);

// Modal Footer Component
export const ModalFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn(
    "flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end",
    className
  )}>
    {children}
  </div>
);

// Modal Content Component for complex layouts
export const ModalContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn("space-y-4", className)}>
    {children}
  </div>
);

export default AppleModal;