'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfileStore } from '@/store/profileStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  Shield,
  Lock,
  Smartphone,
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';
import { PasswordChangeRequest, TwoFactorVerification } from '@/types/profile';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'profile.validation.required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, lowercase, number and special character'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'profile.validation.passwordMismatch',
    path: ['confirmPassword'],
  });

const twoFactorSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
  backupCode: z.string().optional(),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type TwoFactorFormData = z.infer<typeof twoFactorSchema>;

export function SecuritySettings() {
  const { t } = useTranslation();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<{
    secret: string;
    qrCode: string;
  } | null>(null);
  const [copiedCodes, setCopiedCodes] = useState<Set<string>>(new Set());

  const {
    security,
    loadingStates,
    errors,
    changePassword,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    regenerateBackupCodes,
    updateSecuritySettings,
  } = useProfileStore();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const {
    register: registerTwoFactor,
    handleSubmit: handleTwoFactorSubmit,
    formState: { errors: twoFactorErrors },
    reset: resetTwoFactor,
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  });

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      resetPassword();
    } catch (error) {
          }
  };

  const handleSetupTwoFactor = async () => {
    try {
      const setup = await setupTwoFactor();
      setTwoFactorSecret(setup);
      setShowTwoFactorSetup(true);
    } catch (error) {
          }
  };

  const onTwoFactorSubmit = async (data: TwoFactorFormData) => {
    try {
      const verification: TwoFactorVerification = {
        code: data.code,
        backupCode: data.backupCode,
      };
      await enableTwoFactor(verification);
      setShowTwoFactorSetup(false);
      setTwoFactorSecret(null);
      resetTwoFactor();
    } catch (error) {
          }
  };

  const handleDisableTwoFactor = async () => {
    const code = prompt(t('profile.security.enterAuthCode'));
    if (!code) return;

    try {
      await disableTwoFactor({ code });
    } catch (error) {
          }
  };

  const handleRegenerateBackupCodes = async () => {
    try {
      await regenerateBackupCodes();
    } catch (error) {
          }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCodes((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setCopiedCodes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 2000);
    } catch (error) {
          }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score >= 80) return t('profile.security.strongPassword');
    if (score >= 60) return t('profile.security.moderatePassword');
    return t('profile.security.weakPassword');
  };

  if (!security) {
    return <LoadingState message={t('profile.loading')} />;
  }

  return (
    <div className="space-y-6">
      {/* Password Settings */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <Lock className="w-5 h-5" />
              <span>{t('profile.security.password')}</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {security.passwordLastChanged && (
                <span>
                  {t('profile.security.passwordLastChanged')}:{' '}
                  {new Date(security.passwordLastChanged).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>

        <form
          onSubmit={handlePasswordSubmit(onPasswordSubmit)}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              {t('profile.security.currentPassword')}
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? 'text' : 'password'}
                {...registerPassword('currentPassword')}
                disabled={loadingStates.security}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordErrors.currentPassword && (
              <p className="text-sm text-red-600">
                {t(passwordErrors.currentPassword.message || '')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {t('profile.security.newPassword')}
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? 'text' : 'password'}
                {...registerPassword('newPassword')}
                disabled={loadingStates.security}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordErrors.newPassword && (
              <p className="text-sm text-red-600">
                {passwordErrors.newPassword.message}
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('profile.security.passwordRequirements')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t('profile.security.confirmPassword')}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? 'text' : 'password'}
                {...registerPassword('confirmPassword')}
                disabled={loadingStates.security}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {passwordErrors.confirmPassword && (
              <p className="text-sm text-red-600">
                {t(passwordErrors.confirmPassword.message || '')}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loadingStates.security}
            className="flex items-center space-x-2"
          >
            {loadingStates.security ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Key className="w-4 h-4" />
            )}
            <span>{t('profile.security.changePassword')}</span>
          </Button>
        </form>
      </Card>

      {/* Two-Factor Authentication */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{t('profile.security.twoFactor')}</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {t('profile.security.twoFactorDescription')}
            </p>
          </div>

          <Badge
            variant={security.twoFactorEnabled ? 'default' : 'secondary'}
            className={
              security.twoFactorEnabled
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }
          >
            {security.twoFactorEnabled
              ? t('profile.security.twoFactorEnabled')
              : t('profile.security.twoFactorDisabled')}
          </Badge>
        </div>

        {!security.twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-6 h-6 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">
                    {t('profile.security.setupTwoFactor')}
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('profile.security.twoFactorDescription')}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSetupTwoFactor}
              disabled={loadingStates.security}
              className="flex items-center space-x-2"
            >
              <Shield className="w-4 h-4" />
              <span>{t('profile.security.enableTwoFactor')}</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900 dark:text-green-100">
                    {t('profile.security.twoFactorEnabled')}
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your account is protected with two-factor authentication
                  </p>
                </div>
              </div>
            </div>

            {/* Backup Codes */}
            {security.backupCodes && security.backupCodes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {t('profile.security.backupCodes')}
                  </h3>
                  <Button
                    onClick={handleRegenerateBackupCodes}
                    variant="outline"
                    size="sm"
                    disabled={loadingStates.security}
                    className="flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{t('profile.security.regenerateBackupCodes')}</span>
                  </Button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('profile.security.backupCodesDescription')}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {security.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border font-mono text-sm"
                    >
                      <span>{code}</span>
                      <button
                        onClick={() => copyToClipboard(code, `backup-${index}`)}
                        className="text-gray-400 hover:text-gray-600 ml-2"
                      >
                        {copiedCodes.has(`backup-${index}`) ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('profile.security.downloadBackupCodes')}</span>
                </Button>
              </div>
            )}

            <Button
              onClick={handleDisableTwoFactor}
              variant="outline"
              disabled={loadingStates.security}
              className="flex items-center space-x-2 text-red-600 hover:text-red-700"
            >
              <Shield className="w-4 h-4" />
              <span>{t('profile.security.disableTwoFactor')}</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Security Options */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Security Options
        </h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('profile.security.loginAlerts')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('profile.security.loginAlertsDescription')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.loginAlerts}
                onChange={(e) =>
                  updateSecuritySettings({ loginAlerts: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {t('profile.security.requirePassword')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('profile.security.requirePasswordDescription')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.requirePasswordForSensitiveActions}
                onChange={(e) =>
                  updateSecuritySettings({
                    requirePasswordForSensitiveActions: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {t('profile.security.sessionTimeout')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('profile.security.sessionTimeoutDescription')}
                </p>
              </div>
            </div>
            <select
              value={security.sessionTimeout || ''}
              onChange={(e) =>
                updateSecuritySettings({
                  sessionTimeout: parseInt(e.target.value),
                })
              }
              className="w-48 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15 || ''}>15 minutes</option>
              <option value={30 || ''}>30 minutes</option>
              <option value={60 || ''}>1 hour</option>
              <option value={120 || ''}>2 hours</option>
              <option value={480 || ''}>8 hours</option>
              <option value={0 || ''}>Never</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Two-Factor Setup Modal */}
      {showTwoFactorSetup && twoFactorSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
              <QrCode className="w-5 h-5" />
              <span>{t('profile.security.setupTwoFactor')}</span>
            </h3>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('profile.security.scanQRCode')}
                </p>
                <div
                  className="mx-auto bg-white p-4 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: twoFactorSecret.qrCode }}
                />
              </div>

              <form
                onSubmit={handleTwoFactorSubmit(onTwoFactorSubmit)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode">
                    {t('profile.security.enterAuthCode')}
                  </Label>
                  <Input
                    id="twoFactorCode"
                    {...registerTwoFactor('code')}
                    placeholder="123456"
                    maxLength={6}
                    className="text-center"
                  />
                  {twoFactorErrors.code && (
                    <p className="text-sm text-red-600">
                      {twoFactorErrors.code.message}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTwoFactorSetup(false);
                      setTwoFactorSecret(null);
                      resetTwoFactor();
                    }}
                    className="flex-1"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loadingStates.security}
                    className="flex-1"
                  >
                    {loadingStates.security ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      t('profile.security.enableTwoFactor')
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Error Display */}
      {errors.security && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {errors.security}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
