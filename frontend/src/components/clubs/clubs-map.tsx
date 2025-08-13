'use client';

import { Club } from '@/types/club';
import { Card } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ClubsMapProps {
  clubs: Club[];
  selectedClub?: Club | null;
  onSelectClub?: (club: Club) => void;
}

export function ClubsMap({ clubs, selectedClub, onSelectClub }: ClubsMapProps) {
  const { t } = useTranslation();

  // Placeholder component - in production, this would integrate with Google Maps or similar
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <MapPin className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          {t('clubs.mapView')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
          {t('clubs.mapDescription')}
        </p>
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          {clubs.length} {t('clubs.clubsFound')}
        </div>
      </div>
    </Card>
  );
}