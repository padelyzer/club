import * as React from 'react';

import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[88px] w-full rounded-xl border bg-white/70 backdrop-blur-md px-4 py-3 text-sm transition-all duration-200 shadow-apple hover:shadow-apple-lg focus:shadow-apple-lg placeholder:text-gray-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 resize-none',
          'border-gray-200/50 focus-visible:ring-primary-500/50 hover:border-gray-300/70 focus:border-primary-300/70 dark:bg-gray-900/70 dark:border-gray-700/50 dark:hover:border-gray-600/70 dark:placeholder:text-gray-400/70',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
