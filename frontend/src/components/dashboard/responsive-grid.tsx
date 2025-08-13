import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: ReactNode;
  className?: string;
  minItemWidth?: number;
  gap?: number;
}

export const ResponsiveGrid = ({
  children,
  className,
  minItemWidth = 280,
  gap = 24,
}: ResponsiveGridProps) => {
  return (
    <div
      className={cn('grid gap-6', className)}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
        gap: `${gap}px`,
      }}
    >
      {children}
    </div>
  );
};
