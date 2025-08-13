'use client';

import { useState } from 'react';
import { Building2, Plus, Edit, Trash2, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Court } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ClubCourtsProps {
  courts: Court[];
  clubId: string;
  editable?: boolean;
  onAddCourt?: () => void;
  onEditCourt?: (court: Court) => void;
  onDeleteCourt?: (courtId: string) => void;
}

export const ClubCourts: React.FC<ClubCourtsProps> = ({
  courts,
  clubId,
  editable = false,
  onAddCourt,
  onEditCourt,
  onDeleteCourt,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('clubs.courts')} ({courts.length})
          </h3>
        </div>
        {editable && (
          <Button onClick={onAddCourt} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t('clubs.addCourt')}
          </Button>
        )}
      </div>

      {courts.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {t('clubs.noCourts')}
          </p>
          {editable && (
            <Button onClick={onAddCourt} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              {t('clubs.addFirstCourt')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courts.map((court) => (
            <div
              key={court.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {court.name}
                  </h4>
                  <Badge
                    variant={court.is_active ? 'success' : 'secondary'}
                    size="sm"
                    className="mt-1"
                  >
                    {court.is_active
                      ? t('common.active')
                      : t('common.inactive')}
                  </Badge>
                </div>

                {editable && (
                  <DropdownMenu
                    trigger={
                      <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                        <MoreVertical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    }
                    items={[
                      {
                        label: t('common.edit'),
                        icon: Edit,
                        onClick: () => onEditCourt?.(court),
                      },
                      {
                        type: 'separator',
                      },
                      {
                        label: t('common.delete'),
                        icon: Trash2,
                        onClick: () => onDeleteCourt?.(court.id),
                        variant: 'danger',
                      },
                    ]}
                  />
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('clubs.surface')}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 capitalize">
                    {court.surface}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('clubs.type')}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 capitalize">
                    {court.court_type}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {t('clubs.hourlyRate')}
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">
                    ${court.hourly_rate}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
