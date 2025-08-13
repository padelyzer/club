import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Club } from '@/types/club';
import { cn } from '@/lib/utils';

interface ClubInfoProps {
  club: Club;
  variant?: 'compact' | 'detailed';
  className?: string;
}

export const ClubInfo: React.FC<ClubInfoProps> = ({ 
  club, 
  variant = 'compact',
  className 
}) => {
  const { t } = useTranslation();

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="h-4 w-4 mr-1 shrink-0" />
          <span className="truncate">
            {club.city || t('clubs.noLocation')}
            {club.state && `, ${club.state}`}
          </span>
        </div>
        {club.phone && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Phone className="h-4 w-4 mr-1 shrink-0" />
            <span className="truncate">{club.phone}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center text-gray-600 dark:text-gray-400">
        <MapPin className="h-4 w-4 mr-2 shrink-0" />
        <div>
          <p className="text-sm">
            {club.address || ''}
            {club.address && (club.city || club.state) && ', '}
            {club.city || t('clubs.noLocation')}
            {club.state && `, ${club.state}`}
          </p>
          {club.postal_code && (
            <p className="text-xs text-muted-foreground">
              {club.postal_code}
              {club.country && `, ${club.country}`}
            </p>
          )}
        </div>
      </div>

      {club.phone && (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Phone className="h-4 w-4 mr-2 shrink-0" />
          <span>{club.phone}</span>
        </div>
      )}

      {club.email && (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Mail className="h-4 w-4 mr-2 shrink-0" />
          <span className="truncate">{club.email}</span>
        </div>
      )}
    </div>
  );
};