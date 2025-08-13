import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClubFeaturesProps {
  features?: string[];
  services?: string[];
  variant?: 'badges' | 'list';
  max?: number;
  className?: string;
}

export const ClubFeatures = memo<ClubFeaturesProps>(({
  features = [],
  services = [],
  variant = 'badges',
  max = 3,
  className,
}) => {
  const { t } = useTranslation();
  const allItems = [...features, ...services];
  const displayItems = max ? allItems.slice(0, max) : allItems;
  const remainingCount = allItems.length - displayItems.length;

  if (variant === 'list') {
    return (
      <div className={cn('space-y-2', className)}>
        {displayItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <Check className="h-3 w-3 text-green-600 shrink-0" />
            <span className="text-gray-600 dark:text-gray-400">{item}</span>
          </div>
        ))}
        {remainingCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {t('common.andMore', { count: remainingCount })}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {displayItems.map((item, index) => (
        <Badge key={index} variant="secondary" className="text-xs">
          {item}
        </Badge>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} {t('common.more')}
        </Badge>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  const featuresEqual = JSON.stringify(prevProps.features) === JSON.stringify(nextProps.features);
  const servicesEqual = JSON.stringify(prevProps.services) === JSON.stringify(nextProps.services);
  return (
    featuresEqual &&
    servicesEqual &&
    prevProps.variant === nextProps.variant &&
    prevProps.max === nextProps.max
  );
});

ClubFeatures.displayName = 'ClubFeatures';