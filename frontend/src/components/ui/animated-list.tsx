'use client';

import React from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { springPresets, staggerTimings } from '@/lib/animations/spring-presets';
import { useHapticFeedback } from '@/lib/animations/haptic-feedback';
import { cn } from '@/lib/utils';

export interface AnimatedListProps<T = any> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  className?: string;
  itemClassName?: string;
  staggerDelay?: number;
  animationType?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'scale' | 'cascade';
  enableReorder?: boolean;
  onReorder?: (newItems: T[]) => void;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingItems?: number;
  onItemPress?: (item: T, index: number) => void;
  hapticFeedback?: boolean;
}

// Loading skeleton component
const ListItemSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <motion.div
    className={cn(
      'h-16 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden',
      className
    )}
    initial={{ opacity: 0.6 }}
    animate={{ opacity: 1 }}
    transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1 }}
  >
    <motion.div
      className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
      animate={{ x: ['-100%', '100%'] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
    />
  </motion.div>
);

// Animation variants for different list types
const getListVariants = (animationType: string, staggerDelay: number) => {
  const baseContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: staggerDelay / 2,
        staggerDirection: -1,
      },
    },
  };

  const variants = {
    fadeIn: {
      container: baseContainer,
      item: {
        hidden: { opacity: 0 },
        visible: { 
          opacity: 1,
          transition: springPresets.gentle,
        },
        exit: { opacity: 0 },
      },
    },
    
    slideUp: {
      container: baseContainer,
      item: {
        hidden: { opacity: 0, y: 30 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: springPresets.fluid,
        },
        exit: { opacity: 0, y: -30 },
      },
    },
    
    slideLeft: {
      container: baseContainer,
      item: {
        hidden: { opacity: 0, x: 30 },
        visible: { 
          opacity: 1, 
          x: 0,
          transition: springPresets.fluid,
        },
        exit: { opacity: 0, x: -30 },
      },
    },
    
    scale: {
      container: baseContainer,
      item: {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { 
          opacity: 1, 
          scale: 1,
          transition: springPresets.bouncy,
        },
        exit: { opacity: 0, scale: 0.8 },
      },
    },
    
    cascade: {
      container: {
        ...baseContainer,
        visible: {
          ...baseContainer.visible,
          transition: {
            staggerChildren: staggerDelay * 2,
            delayChildren: 0.2,
          },
        },
      },
      item: {
        hidden: { opacity: 0, y: 50, scale: 0.9 },
        visible: { 
          opacity: 1, 
          y: 0, 
          scale: 1,
          transition: springPresets.bouncy,
        },
        exit: { opacity: 0, y: -50, scale: 0.9 },
      },
    },
  };

  return variants[animationType as keyof typeof variants] || variants.slideUp;
};

// Reorderable list item wrapper
const ReorderableItem: React.FC<{
  item: any;
  children: React.ReactNode;
  className?: string;
  onPress?: () => void;
  hapticFeedback?: boolean;
}> = ({ item, children, className, onPress, hapticFeedback = true }) => {
  const haptic = useHapticFeedback();

  const handlePress = React.useCallback((event: React.MouseEvent) => {
    if (hapticFeedback) {
      haptic.trigger('light', event.currentTarget as HTMLElement);
    }
    onPress?.();
  }, [haptic, hapticFeedback, onPress]);

  return (
    <Reorder.Item
      value={item || ''}
      className={className}
      whileDrag={{ 
        scale: 1.05, 
        rotate: 2,
        zIndex: 50,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      }}
      dragElastic={0.1}
      onMouseDown={handlePress}
      onTouchStart={handlePress}
    >
      {children}
    </Reorder.Item>
  );
};

// Regular list item wrapper
const ListItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  variants: any;
  onPress?: () => void;
  hapticFeedback?: boolean;
}> = ({ children, className, variants, onPress, hapticFeedback = true }) => {
  const haptic = useHapticFeedback();

  const handlePress = React.useCallback((event: React.MouseEvent) => {
    if (hapticFeedback) {
      haptic.trigger('light', event.currentTarget as HTMLElement);
    }
    onPress?.();
  }, [haptic, hapticFeedback, onPress]);

  return (
    <motion.div
      variants={variants.item}
      className={className}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={springPresets.gentle}
      onClick={onPress ? handlePress : undefined}
      style={{ cursor: onPress ? 'pointer' : 'default' }}
    >
      {children}
    </motion.div>
  );
};

// Main animated list component
export function AnimatedList<T = any>({
  items,
  renderItem,
  keyExtractor = (_, index) => index.toString(),
  className,
  itemClassName,
  staggerDelay = staggerTimings.comfortable,
  animationType = 'slideUp',
  enableReorder = false,
  onReorder,
  emptyState,
  loading = false,
  loadingItems = 5,
  onItemPress,
  hapticFeedback = true,
}: AnimatedListProps<T>) {
  const variants = getListVariants(animationType, staggerDelay);

  // Show loading state
  if (loading) {
    return (
      <motion.div
        variants={variants.container}
        initial="hidden"
        animate="visible"
        className={cn('space-y-3', className)}
      >
        {Array.from({ length: loadingItems }).map((_, index) => (
          <motion.div key={`skeleton-${index}`} variants={variants.item}>
            <ListItemSkeleton className={itemClassName} />
          </motion.div>
        ))}
      </motion.div>
    );
  }

  // Show empty state
  if (!items.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springPresets.gentle}
        className={cn('flex items-center justify-center py-12', className)}
      >
        {emptyState || (
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No items found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </motion.div>
    );
  }

  // Reorderable list
  if (enableReorder && onReorder) {
    return (
      <Reorder.Group
        axis="y"
        values={items}
        onReorder={onReorder}
        className={cn('space-y-2', className)}
      >
        <AnimatePresence>
          {items.map((item, index) => {
            const key = keyExtractor(item, index);
            return (
              <ReorderableItem
                key={key}
                item={item}
                className={itemClassName}
                onPress={onItemPress ? () => onItemPress(item, index) : undefined}
                hapticFeedback={hapticFeedback}
              >
                {renderItem(item, index)}
              </ReorderableItem>
            );
          })}
        </AnimatePresence>
      </Reorder.Group>
    );
  }

  // Regular animated list
  return (
    <motion.div
      variants={variants.container}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn('space-y-2', className)}
    >
      <AnimatePresence>
        {items.map((item, index) => {
          const key = keyExtractor(item, index);
          return (
            <ListItem
              key={key}
              variants={variants}
              className={itemClassName}
              onPress={onItemPress ? () => onItemPress(item, index) : undefined}
              hapticFeedback={hapticFeedback}
            >
              {renderItem(item, index)}
            </ListItem>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

// Specialized grid list component
export interface AnimatedGridProps<T = any> extends Omit<AnimatedListProps<T>, 'className'> {
  columns?: number;
  gap?: number;
  className?: string;
}

export function AnimatedGrid<T = any>({
  columns = 3,
  gap = 4,
  className,
  ...listProps
}: AnimatedGridProps<T>) {
  return (
    <div 
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
      style={{ gap: `${gap * 0.25}rem` }}
    >
      <AnimatedList
        {...listProps}
        animationType="scale"
        staggerDelay={staggerTimings.tight}
      />
    </div>
  );
}

// Infinite scroll wrapper
export interface InfiniteAnimatedListProps<T = any> extends AnimatedListProps<T> {
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFetchingNextPage?: boolean;
  loadingComponent?: React.ReactNode;
}

export function InfiniteAnimatedList<T = any>({
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  loadingComponent,
  ...listProps
}: InfiniteAnimatedListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  React.useEffect(() => {
    if (!hasNextPage || !fetchNextPage) return;

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const sentinel = container.lastElementChild;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage, isFetchingNextPage, listProps.items]);

  return (
    <div ref={containerRef}>
      <AnimatedList {...listProps} />
      {isFetchingNextPage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex justify-center"
        >
          {loadingComponent || (
            <div className="flex items-center gap-2 text-muted-foreground">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              />
              Loading more...
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

export default AnimatedList;