import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  // Base styles - Alto contraste y Apple-inspired
  [
    'flex w-full transition-all duration-200',
    'text-gray-900 placeholder:text-gray-400',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ],
  {
    variants: {
      variant: {
        // Default - Bordes limpios
        default: [
          'bg-white border border-gray-200',
          'hover:border-gray-300',
          'focus-visible:border-[#007AFF] focus-visible:ring-[#007AFF]/20',
        ],
        
        // Glass - Glassmorphism sutil
        glass: [
          'bg-white/80 backdrop-blur-md border border-white/20',
          'hover:bg-white/90 hover:border-white/30',
          'focus-visible:border-[#007AFF] focus-visible:ring-[#007AFF]/20',
        ],
        
        // Filled - Fondo gris Apple-style
        filled: [
          'bg-gray-50 border border-gray-100',
          'hover:bg-gray-100 hover:border-gray-200',
          'focus-visible:bg-white focus-visible:border-[#007AFF] focus-visible:ring-[#007AFF]/20',
        ],
        
        // Minimal - Sin bordes, solo bottom border
        minimal: [
          'bg-transparent border-0 border-b-2 border-gray-200',
          'rounded-none px-0',
          'hover:border-gray-300',
          'focus-visible:border-[#007AFF] focus-visible:ring-0',
        ],
      },
      
      size: {
        sm: 'h-8 px-3 py-1 text-sm rounded-md',
        default: 'h-10 px-3 py-2 text-sm rounded-lg',
        lg: 'h-12 px-4 py-3 text-base rounded-xl',
      },
      
      state: {
        default: '',
        error: [
          'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500/20',
          'text-red-900 placeholder:text-red-400',
        ],
        success: [
          'border-green-300 focus-visible:border-green-500 focus-visible:ring-green-500/20',
        ],
        warning: [
          'border-yellow-300 focus-visible:border-yellow-500 focus-visible:ring-yellow-500/20',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      state: 'default',
    },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    size, 
    state,
    type = 'text',
    leftIcon,
    rightIcon,
    loading,
    ...props 
  }, ref) => {
    // Si hay iconos, renderizamos un wrapper
    if (leftIcon || rightIcon || loading) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            type={type}
            className={cn(
              inputVariants({ variant, size, state }),
              leftIcon && 'pl-10',
              (rightIcon || loading) && 'pr-10',
              className
            )}
            ref={ref}
            {...props}
          />
          
          {loading ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <svg 
                className="h-4 w-4 animate-spin text-gray-400" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          ) : rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(inputVariants({ variant, size, state, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

// Componente Label acompañante
const Label = forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    required?: boolean;
    size?: 'sm' | 'default' | 'lg';
  }
>(({ className, required, size = 'default', children, ...props }, ref) => {
  const sizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
    lg: 'text-base',
  };

  return (
    <label
      ref={ref}
      className={cn(
        'block font-medium text-gray-700 mb-1.5',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-red-500 ml-1">*</span>
      )}
    </label>
  );
});

Label.displayName = 'Label';

// Componente FieldError para mensajes de error
const FieldError = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'mt-1.5 text-xs text-red-600 flex items-center gap-1',
      className
    )}
    {...props}
  />
));

FieldError.displayName = 'FieldError';

// Componente FieldHelp para texto de ayuda
const FieldHelp = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'mt-1.5 text-xs text-gray-500',
      className
    )}
    {...props}
  />
));

FieldHelp.displayName = 'FieldHelp';

export { Input, Label, FieldError, FieldHelp, inputVariants };