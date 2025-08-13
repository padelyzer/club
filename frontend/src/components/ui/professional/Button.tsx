import React, { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { professionalDesignSystem } from '@/styles/professional-design-system';

const buttonVariants = cva(
  // Base styles - Minimalista y Apple-inspired
  [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'select-none cursor-pointer',
  ],
  {
    variants: {
      variant: {
        // Primary - Azul vibrante Apple
        primary: [
          'bg-[#007AFF] text-white',
          'hover:bg-[#0066CC] active:bg-[#0052A3]',
          'shadow-sm hover:shadow-md',
          'focus-visible:ring-[#007AFF]/20',
        ],
        
        // Secondary - Glassmorphism sutil
        secondary: [
          'bg-white/80 backdrop-blur-md text-gray-700',
          'border border-white/20',
          'hover:bg-white/90 hover:shadow-md',
          'active:bg-white/95',
          'focus-visible:ring-gray-300/20',
        ],
        
        // Outline - Bordes definidos
        outline: [
          'border border-gray-200 bg-white text-gray-700',
          'hover:bg-gray-50 hover:border-gray-300',
          'active:bg-gray-100',
          'focus-visible:ring-gray-300/20',
        ],
        
        // Ghost - Minimalista puro
        ghost: [
          'text-gray-600 bg-transparent',
          'hover:bg-gray-100 hover:text-gray-900',
          'active:bg-gray-200',
          'focus-visible:ring-gray-300/20',
        ],
        
        // Destructive - Error state
        destructive: [
          'bg-red-500 text-white',
          'hover:bg-red-600 active:bg-red-700',
          'shadow-sm hover:shadow-md',
          'focus-visible:ring-red-500/20',
        ],
        
        // Success - Estado positivo
        success: [
          'bg-green-500 text-white',
          'hover:bg-green-600 active:bg-green-700',
          'shadow-sm hover:shadow-md',
          'focus-visible:ring-green-500/20',
        ],
      },
      
      size: {
        sm: 'h-8 px-3 text-sm font-medium rounded-md',
        default: 'h-10 px-4 text-sm font-medium rounded-lg',
        lg: 'h-12 px-6 text-base font-medium rounded-xl',
        xl: 'h-14 px-8 text-base font-semibold rounded-xl',
        icon: 'h-10 w-10 rounded-lg',
      },
      
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : 'button';
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg 
            className="mr-2 h-4 w-4 animate-spin" 
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
        )}
        
        {!loading && leftIcon && (
          <span className="mr-2 flex-shrink-0">
            {leftIcon}
          </span>
        )}
        
        <span className="truncate">
          {children}
        </span>
        
        {!loading && rightIcon && (
          <span className="ml-2 flex-shrink-0">
            {rightIcon}
          </span>
        )}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };