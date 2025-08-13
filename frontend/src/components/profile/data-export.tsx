'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useProfileStore } from '@/store/profileStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  Download,
  FileText,
  Calendar,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { DataExportRequest } from '@/types/profile';

export function DataExport() {
  const { t } = useTranslation();
  const [showExportForm, setShowExportForm] = useState(false);

  const {
    dataExports,
    loadingStates,
    errors,
    requestDataExport,
    loadDataExports,
    downloadDataExport,
    deleteDataExport,
  } = useProfileStore();

  const { register, handleSubmit, watch, reset } = useForm<DataExportRequest>({
    defaultValues: {
      format: 'json',
      includePersonalData: true,
      includeReservations: true,
      includeMatches: true,
      includeTournaments: true,
      includePayments: false,
    },
  });

  useEffect(() => {
    loadDataExports();
  }, [loadDataExports]);

  const onSubmit = async (data: DataExportRequest) => {
    try {
      await requestDataExport(data);
      setShowExportForm(false);
      reset();
    } catch (error) {
          }
  };

  const handleDownload = async (exportId: string) => {
    try {
      await downloadDataExport(exportId);
    } catch (error) {
          }
  };

  const handleDelete = async (exportId: string) => {
    if (confirm('Are you sure you want to delete this export?')) {
      try {
        await deleteDataExport(exportId);
      } catch (error) {
              }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.dataExport.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('profile.dataExport.subtitle')}
            </p>
          </div>

          <Button
            onClick={() => setShowExportForm(true)}
            className="flex items-center space-x-2"
            disabled={loadingStates.dataExport}
          >
            <Download className="w-4 h-4" />
            <span>{t('profile.dataExport.requestExport')}</span>
          </Button>
        </div>

        {/* Export Form */}
        {showExportForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('profile.dataExport.exportFormat')}</Label>
                  <select
                    {...register('format')}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>{t('profile.dataExport.includeData')}</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      key: 'includePersonalData',
                      label: t('profile.dataExport.dataOptions.personalData'),
                    },
                    {
                      key: 'includeReservations',
                      label: t('profile.dataExport.dataOptions.reservations'),
                    },
                    {
                      key: 'includeMatches',
                      label: t('profile.dataExport.dataOptions.matches'),
                    },
                    {
                      key: 'includeTournaments',
                      label: t('profile.dataExport.dataOptions.tournaments'),
                    },
                    {
                      key: 'includePayments',
                      label: t('profile.dataExport.dataOptions.payments'),
                    },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        {...register(key as keyof DataExportRequest)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExportForm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  disabled={loadingStates.dataExport}
                  className="flex items-center space-x-2"
                >
                  {loadingStates.dataExport ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{t('profile.dataExport.requestExport')}</span>
                </Button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Export History */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('profile.dataExport.exportHistory')}
          </h3>

          {dataExports.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{t('profile.dataExport.noExports')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dataExports.map((exportData) => (
                <motion.div
                  key={exportData.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-600" />
                        <span className="font-medium text-gray-900 dark:text-white">
                          {exportData.format.toUpperCase()} Export
                        </span>
                        <Badge className={getStatusColor(exportData.status)}>
                          {t(
                            `profile.dataExport.exportStatus.${exportData.status}`
                          )}
                        </Badge>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(
                              exportData.requestedAt
                            ).toLocaleDateString()}
                          </span>
                        </div>

                        {exportData.fileSize && (
                          <span>{formatFileSize(exportData.fileSize)}</span>
                        )}

                        {exportData.expiresAt && (
                          <span>
                            {t('profile.dataExport.expiresOn')}{' '}
                            {new Date(
                              exportData.expiresAt
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {exportData.status === 'completed' &&
                        exportData.downloadUrl && (
                          <Button
                            onClick={() => handleDownload(exportData.id)}
                            variant="outline"
                            size="sm"
                            className="flex items-center space-x-1"
                          >
                            <Download className="w-4 h-4" />
                            <span>{t('profile.dataExport.download')}</span>
                          </Button>
                        )}

                      <Button
                        onClick={() => handleDelete(exportData.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {errors.dataExport && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.dataExport}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
