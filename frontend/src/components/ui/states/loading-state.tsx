'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  fullScreen?: boolean;
  message?: string;
  className?: string;
}

export const LoadingState = ({
  fullScreen = false,
  message = 'Loading...',
  className,
}: LoadingStateProps) => {
  const content = (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <motion.div
        className="relative"
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <div className="w-16 h-16">
          <svg
            className="animate-spin"
            viewBox="0 0 50 50"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="80 40"
              className="text-primary"
            />
          </svg>
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-4 text-sm text-text-secondary"
      >
        {message}
      </motion.p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        {content}
      </div>
    );
  }

  return content;
};
