import React, { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  // Base styles - Minimalista con glassmorphism opcional
  [
    'rounded-xl overflow-hidden',
    'transition-all duration-250 ease-out',
  ],
  {
    variants: {
      variant: {
        // Default - Fondo sólido limpio
        default: [
          'bg-white border border-gray-200',
          'shadow-sm hover:shadow-md',
        ],
        
        // Glass - Glassmorphism sutil con alto contraste
        glass: [
          'bg-white/80 backdrop-blur-md',
          'border border-white/20',
          'shadow-lg',
        ],
        
        // Elevated - Para modales y elementos importantes
        elevated: [
          'bg-white border border-gray-100',
          'shadow-xl',
        ],
        
        // Subtle - Para fondos secundarios
        subtle: [
          'bg-gray-50 border border-gray-100',
          'shadow-none',
        ],
        
        // Interactive - Para cards clickeables
        interactive: [
          'bg-white border border-gray-200',
          'shadow-sm hover:shadow-lg hover:border-gray-300',
          'cursor-pointer',
          'hover:-translate-y-0.5',
        ],
      },
      
      padding: {
        none: 'p-0',
        sm: 'p-4',
        default: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      
      size: {
        sm: 'max-w-sm',
        default: 'max-w-none',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
      size: 'default',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, size, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, size, className }))}
      {...props}
    />
  )
);

Card.displayName = 'Card';

// Sub-componentes para estructura
const CardHeader = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { centerContent?: boolean }
>(({ className, centerContent = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-2',
      centerContent && 'items-center text-center',
      className
    )}
    {...props}
  />
));

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & { 
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  }
>(({ className, as: Comp = 'h3', ...props }, ref) => (
  <Comp
    ref={ref as any}
    className={cn(
      'text-xl font-semibold leading-tight text-gray-900',
      'tracking-tight',
      className
    )}
    {...props}
  />
));

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      'text-sm text-gray-600 leading-relaxed',
      className
    )}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('space-y-4', className)}
    {...props}
  />
));

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  }
>(({ className, justify = 'end', ...props }, ref) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center', 
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3',
        justifyClasses[justify],
        className
      )}
      {...props}
    />
  );
});

CardFooter.displayName = 'CardFooter';

export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  cardVariants 
};