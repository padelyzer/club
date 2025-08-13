'use client';

import { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Club } from '@/types/club';
import { Button } from '@/components/ui/button';

interface ClubSettingsProps {
  club: Club;
  onSave?: (settings: any) => void;
}

export const ClubSettings: React.FC<ClubSettingsProps> = ({ club, onSave }) => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    notifications: true,
    autoConfirmReservations: false,
    requirePayment: club.booking_rules.require_payment_confirmation,
    allowRecurring: club.booking_rules.allow_recurring_bookings,
  });

  const handleSave = () => {
    onSave?.(settings);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('clubs.manageSettings')}
          </h3>
        </div>
        <Button onClick={handleSave} size="sm">
          <Save className="h-4 w-4 mr-2" />
          {t('common.save')}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            {t('clubs.bookingRules')}
          </h4>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.requirePayment}
                onChange={(e) =>
                  setSettings({ ...settings, requirePayment: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('clubs.requirePaymentConfirmation')}
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.allowRecurring}
                onChange={(e) =>
                  setSettings({ ...settings, allowRecurring: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                {t('clubs.allowRecurringBookings')}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
