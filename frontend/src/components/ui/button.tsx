import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] backdrop-blur-sm',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-apple hover:bg-primary/90 hover:shadow-apple-lg',
        destructive:
          'bg-destructive text-destructive-foreground shadow-apple hover:bg-destructive/90 hover:shadow-apple-lg',
        outline:
          'border border-input/20 bg-background/50 text-foreground hover:bg-accent/50 hover:text-accent-foreground shadow-apple hover:shadow-apple-lg backdrop-blur-md',
        secondary:
          'bg-secondary/80 text-secondary-foreground hover:bg-secondary/60 shadow-apple hover:shadow-apple-lg backdrop-blur-sm',
        ghost: 'hover:bg-accent/50 hover:text-accent-foreground backdrop-blur-sm',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 py-2 min-h-[44px]',
        sm: 'h-11 rounded-md px-3 text-sm min-h-[44px]',
        lg: 'h-12 rounded-xl px-8 min-h-[48px] text-base',
        icon: 'h-11 w-11 min-h-[44px] min-w-[44px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
