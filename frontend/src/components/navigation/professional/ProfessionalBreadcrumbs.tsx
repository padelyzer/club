import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  active?: boolean;
}

interface ProfessionalBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate?: (item: BreadcrumbItem) => void;
  showHome?: boolean;
  separator?: React.ReactNode;
  className?: string;
}

export const ProfessionalBreadcrumbs = memo<ProfessionalBreadcrumbsProps>(({
  items,
  onNavigate,
  showHome = true,
  separator,
  className
}) => {
  const { t } = useTranslation();

  const allItems: BreadcrumbItem[] = showHome 
    ? [
        {
          id: 'home',
          label: t('navigation.home'),
          href: '/dashboard',
          icon: Home
        },
        ...items
      ]
    : items;

  const containerVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.nav
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('flex items-center space-x-1 text-sm', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-1">
        {allItems.map((item, index) => {
          const isLast = index === allItems.length - 1;
          const isClickable = !isLast && (item.href || onNavigate);

          return (
            <motion.li
              key={item.id}
              variants={itemVariants}
              className="flex items-center"
            >
              {index > 0 && (
                <div className="mx-2 text-gray-400">
                  {separator || <ChevronRight className="w-4 h-4" />}
                </div>
              )}

              <div className="flex items-center">
                {isClickable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate?.(item)}
                    className={cn(
                      'gap-2 text-gray-600 hover:text-gray-900',
                      'px-2 py-1 h-auto font-medium',
                      isLast && 'text-gray-900 cursor-default'
                    )}
                  >
                    {item.icon && (
                      <item.icon className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-32 sm:max-w-none">
                      {item.label}
                    </span>
                  </Button>
                ) : (
                  <div className={cn(
                    'flex items-center gap-2 px-2 py-1',
                    isLast 
                      ? 'text-gray-900 font-semibold' 
                      : 'text-gray-600'
                  )}>
                    {item.icon && (
                      <item.icon className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-32 sm:max-w-none">
                      {item.label}
                    </span>
                  </div>
                )}
              </div>
            </motion.li>
          );
        })}
      </ol>
    </motion.nav>
  );
}, (prevProps, nextProps) => {
  return (
    JSON.stringify(prevProps.items.map(i => ({ 
      id: i.id, 
      label: i.label, 
      active: i.active 
    }))) === JSON.stringify(nextProps.items.map(i => ({ 
      id: i.id, 
      label: i.label, 
      active: i.active 
    }))) &&
    prevProps.showHome === nextProps.showHome
  );
});

ProfessionalBreadcrumbs.displayName = 'ProfessionalBreadcrumbs';

export default ProfessionalBreadcrumbs;