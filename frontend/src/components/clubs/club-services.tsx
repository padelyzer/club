'use client';

import { Settings, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ClubService } from '@/types/club';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ClubServicesProps {
  services: ClubService[];
  editable?: boolean;
  onEdit?: () => void;
}

export const ClubServices: React.FC<ClubServicesProps> = ({
  services,
  editable = false,
  onEdit,
}) => {
  const { t } = useTranslation();

  const groupedServices = services.reduce(
    (acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    },
    {} as Record<string, ClubService[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('clubs.availableServices')}
          </h3>
        </div>
      </div>

      {Object.keys(groupedServices).length === 0 ? (
        <div className="text-center py-8">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('clubs.noServices')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedServices).map(
            ([category, categoryServices]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {t(`clubs.serviceCategories.${category}`)}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        service.is_available
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-gray-900 dark:text-gray-100">
                              {service.name}
                            </h5>
                            {service.is_available ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {service.description}
                            </p>
                          )}
                        </div>

                        {service.price && (
                          <div className="flex items-center text-lg font-semibold text-gray-900 dark:text-gray-100 ml-4">
                            <DollarSign className="h-4 w-4" />
                            {service.price}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            service.is_available ? 'success' : 'secondary'
                          }
                          size="sm"
                        >
                          {service.is_available
                            ? t('common.available')
                            : t('common.unavailable')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
