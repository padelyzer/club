'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useProfileStore } from '@/store/profileStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Shield } from 'lucide-react';
import { AccountDeletionRequest } from '@/types/profile';

export function AccountDeletion() {
  const { t } = useTranslation();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const {
    loadingStates,
    errors,
    requestAccountDeletion,
    cancelAccountDeletion,
    confirmAccountDeletion,
  } = useProfileStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors: formErrors },
  } = useForm<AccountDeletionRequest>({
    defaultValues: {
      deleteImmediately: false,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: AccountDeletionRequest) => {
    setShowConfirmation(true);
  };

  const handleConfirmDeletion = async () => {
    try {
      if (confirmText === 'DELETE') {
        await confirmAccountDeletion(watchedValues.password);
        // Account deletion confirmed - user will be logged out
      }
    } catch (error) {
          }
  };

  const handleScheduleDeletion = async () => {
    try {
      await requestAccountDeletion(watchedValues);
      setShowConfirmation(false);
    } catch (error) {
          }
  };

  return (
    <div className="space-y-6">
      {/* Warning Card */}
      <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <div>
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-100">
              {t('profile.account.deleteAccount')}
            </h2>
            <p className="text-red-700 dark:text-red-300">
              {t('profile.account.deleteAccountWarning')}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {t('profile.account.deleteAccountDescription')}
          </p>

          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
            <li>All your personal data will be permanently deleted</li>
            <li>Your reservations and match history will be removed</li>
            <li>You will lose access to all tournaments and clubs</li>
            <li>This action cannot be undone</li>
          </ul>
        </div>
      </Card>

      {/* Deletion Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t('profile.account.deleteReason')}
              </Label>
              <select
                id="reason"
                {...register('reason', { required: 'Please select a reason' })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">Select a reason</option>
                <option value="not_using">Not using the service anymore</option>
                <option value="privacy_concerns">Privacy concerns</option>
                <option value="found_alternative">
                  Found a better alternative
                </option>
                <option value="too_expensive">Too expensive</option>
                <option value="technical_issues">Technical issues</option>
                <option value="other">Other</option>
              </select>
              {formErrors.reason && (
                <p className="text-sm text-red-600">
                  {formErrors.reason.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback">
                {t('profile.account.deleteFeedback')}
              </Label>
              <textarea
                id="feedback"
                {...register('feedback')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-800 resize-none"
                placeholder={t('profile.account.deleteFeedbackPlaceholder')}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="schedule"
                  {...register('deleteImmediately')}
                  value="false"
                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                />
                <Label htmlFor="schedule" className="flex-1">
                  {t('profile.account.scheduleForDeletion')}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Account will be deleted in 30 days. You can cancel anytime
                    during this period.
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  id="immediate"
                  {...register('deleteImmediately')}
                  value="true"
                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                />
                <Label htmlFor="immediate" className="flex-1">
                  {t('profile.account.deleteImmediately')}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Account will be deleted immediately and cannot be recovered.
                  </p>
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {t('profile.account.finalPassword')}
              </Label>
              <Input
                id="password"
                type="password"
                {...register('password', {
                  required: 'Password is required to delete account',
                })}
                className="border-red-300 focus:border-red-500 focus:ring-red-500"
                placeholder="Enter your password to confirm"
              />
              {formErrors.password && (
                <p className="text-sm text-red-600">
                  {formErrors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="submit"
              disabled={loadingStates.profile}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
            >
              {loadingStates.profile ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Proceed with Deletion</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4 p-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('profile.account.confirmDeletion')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  This action cannot be undone. All your data will be
                  permanently deleted.
                </p>
              </div>

              {watchedValues.deleteImmediately ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('profile.account.typeDELETE')}</Label>
                    <Input
                      value={confirmText || ''}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="text-center font-mono"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button
                      onClick={() => setShowConfirmation(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConfirmDeletion}
                      disabled={
                        confirmText !== 'DELETE' || loadingStates.profile
                      }
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {loadingStates.profile ? 'Deleting...' : 'Delete Account'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setShowConfirmation(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleScheduleDeletion}
                    disabled={loadingStates.profile}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    {loadingStates.profile
                      ? 'Scheduling...'
                      : 'Schedule Deletion'}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {errors.profile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.profile}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
