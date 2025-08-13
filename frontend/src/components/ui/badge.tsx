import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
        secondary:
          'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        destructive:
          'border-transparent bg-danger-100 text-danger-800 dark:bg-danger-900 dark:text-danger-200',
        success:
          'border-transparent bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-200',
        warning:
          'border-transparent bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-200',
        outline:
          'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
