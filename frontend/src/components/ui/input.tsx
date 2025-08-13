import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-xl border bg-white/70 backdrop-blur-md px-4 py-3 text-sm transition-all duration-200 shadow-apple hover:shadow-apple-lg focus:shadow-apple-lg file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900/70 dark:placeholder:text-gray-400/70',
          error
            ? 'border-danger-300/50 focus-visible:ring-danger-500/50 bg-danger-50/20 dark:border-danger-600/50 dark:bg-danger-900/10'
            : 'border-gray-200/50 focus-visible:ring-primary-500/50 hover:border-gray-300/70 focus:border-primary-300/70 dark:border-gray-700/50 dark:hover:border-gray-600/70',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
