'use client';

import React, { useState, useRef } from 'react';
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
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  Camera,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Save,
  Edit,
  Mail,
  Phone,
  User,
  MapPin,
  Calendar,
  FileText,
} from 'lucide-react';
import { ProfileUpdateRequest } from '@/types/profile';

const profileSchema = z.object({
  firstName: z.string().min(1, 'profile.validation.required'),
  lastName: z.string().min(1, 'profile.validation.required'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  nationality: z.string().optional(),
  timezone: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileForm() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const {
    profile,
    editMode,
    loadingStates,
    errors,
    updateProfile,
    uploadAvatar,
    deleteAvatar,
    setEditMode,
    setUnsavedChanges,
  } = useProfileStore();

  const {
    register,
    handleSubmit,
    formState: { errors: formErrors, isDirty },
    watch,
    reset,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phoneNumber: profile?.phoneNumber || '',
      dateOfBirth: profile?.dateOfBirth
        ? profile.dateOfBirth.split('T')[0]
        : '',
      gender: profile?.gender || undefined,
      nationality: profile?.nationality || '',
      timezone: profile?.timezone || '',
      bio: profile?.bio || '',
    },
  });

  // Watch for form changes to update unsaved changes state
  const watchedFields = watch();
  React.useEffect(() => {
    setUnsavedChanges(isDirty);
  }, [isDirty, setUnsavedChanges]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updateData: ProfileUpdateRequest = {
        ...data,
        dateOfBirth: data.dateOfBirth || undefined,
      };

      await updateProfile(updateData);
      setIsEditing(false);
      setEditMode(false);
      reset(data);
    } catch (error) {
          }
  };

  const handleCancel = () => {
    reset({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      phoneNumber: profile?.phoneNumber || '',
      dateOfBirth: profile?.dateOfBirth
        ? profile.dateOfBirth.split('T')[0]
        : '',
      gender: profile?.gender || undefined,
      nationality: profile?.nationality || '',
      timezone: profile?.timezone || '',
      bio: profile?.bio || '',
    });
    setIsEditing(false);
    setEditMode(false);
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('profile.validation.invalidFileType'));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert(t('profile.validation.fileTooLarge'));
      return;
    }

    setUploadingAvatar(true);
    try {
      await uploadAvatar(file);
    } catch (error) {
          } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarDelete = async () => {
    try {
      await deleteAvatar();
    } catch (error) {
          }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (!profile) {
    return <LoadingState message={t('profile.loading')} />;
  }

  return (
    <div className="space-y-6">
      {/* Personal Information Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('profile.personalInfo.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('profile.personalInfo.subtitle')}
            </p>
          </div>

          {!isEditing && !editMode && (
            <Button
              onClick={() => {
                setIsEditing(true);
                setEditMode(true);
              }}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>{t('common.edit')}</span>
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative">
              <Avatar
                src={profile.avatar}
                alt={`${profile.firstName} ${profile.lastName}`}
                size="lg"
                className="w-20 h-20 ring-4 ring-gray-100 dark:ring-gray-700"
              >
                {getInitials(profile.firstName, profile.lastName)}
              </Avatar>

              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />

                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  className="flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{t('profile.personalInfo.uploadAvatar')}</span>
                </Button>

                {profile.avatar && (
                  <Button
                    type="button"
                    onClick={handleAvatarDelete}
                    variant="outline"
                    size="sm"
                    disabled={uploadingAvatar}
                    className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                    <span>{t('profile.personalInfo.removeAvatar')}</span>
                  </Button>
                )}
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                JPG, PNG up to 5MB
              </p>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="firstName"
                className="flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>{t('profile.personalInfo.firstName')}</span>
              </Label>
              <Input
                id="firstName"
                {...register('firstName')}
                disabled={!isEditing && !editMode}
                className={`${!isEditing && !editMode ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
              />
              {formErrors.firstName && (
                <p className="text-sm text-red-600">
                  {t(formErrors.firstName.message || '')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{t('profile.personalInfo.lastName')}</span>
              </Label>
              <Input
                id="lastName"
                {...register('lastName')}
                disabled={!isEditing && !editMode}
                className={`${!isEditing && !editMode ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
              />
              {formErrors.lastName && (
                <p className="text-sm text-red-600">
                  {t(formErrors.lastName.message || '')}
                </p>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{t('profile.personalInfo.email')}</span>
              </Label>
              <div className="relative">
                <Input
                  value={profile.email || ''}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800 pr-10"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  {profile.isVerified ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Badge
                  variant={profile.isVerified ? 'default' : 'secondary'}
                  className={
                    profile.isVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }
                >
                  {profile.isVerified
                    ? t('profile.contact.emailVerified')
                    : t('profile.contact.emailNotVerified')}
                </Badge>
                {!profile.isVerified && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-blue-600"
                  >
                    {t('profile.contact.verifyEmail')}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="phoneNumber"
                className="flex items-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>{t('profile.personalInfo.phoneNumber')}</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                {...register('phoneNumber')}
                disabled={!isEditing && !editMode}
                className={`${!isEditing && !editMode ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label
                htmlFor="dateOfBirth"
                className="flex items-center space-x-2"
              >
                <Calendar className="w-4 h-4" />
                <span>{t('profile.personalInfo.dateOfBirth')}</span>
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
                disabled={!isEditing && !editMode}
                className={`${!isEditing && !editMode ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">{t('profile.personalInfo.gender')}</Label>
              <select
                id="gender"
                {...register('gender')}
                disabled={!isEditing && !editMode}
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 ${
                  !isEditing && !editMode ? 'bg-gray-50 dark:bg-gray-800' : ''
                }`}
              >
                <option value="">{t('common.selectOption')}</option>
                <option value="male">
                  {t('profile.personalInfo.genderOptions.male')}
                </option>
                <option value="female">
                  {t('profile.personalInfo.genderOptions.female')}
                </option>
                <option value="other">
                  {t('profile.personalInfo.genderOptions.other')}
                </option>
                <option value="prefer_not_to_say">
                  {t('profile.personalInfo.genderOptions.prefer_not_to_say')}
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="nationality"
                className="flex items-center space-x-2"
              >
                <MapPin className="w-4 h-4" />
                <span>{t('profile.personalInfo.nationality')}</span>
              </Label>
              <Input
                id="nationality"
                {...register('nationality')}
                disabled={!isEditing && !editMode}
                className={`${!isEditing && !editMode ? 'bg-gray-50 dark:bg-gray-800' : ''}`}
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>{t('profile.personalInfo.bio')}</span>
            </Label>
            <textarea
              id="bio"
              {...register('bio')}
              disabled={!isEditing && !editMode}
              rows={4}
              className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 resize-none ${
                !isEditing && !editMode ? 'bg-gray-50 dark:bg-gray-800' : ''
              }`}
              placeholder={t('profile.personalInfo.bioPlaceholder')}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {watchedFields.bio?.length || 0} / 500
            </p>
          </div>

          {/* Action Buttons */}
          {(isEditing || editMode) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700"
            >
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loadingStates.profile}
              >
                {t('common.cancel')}
              </Button>

              <Button
                type="submit"
                disabled={loadingStates.profile || !isDirty}
                className="flex items-center space-x-2"
              >
                {loadingStates.profile ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {loadingStates.profile
                    ? t('profile.saving')
                    : t('common.save')}
                </span>
              </Button>
            </motion.div>
          )}
        </form>

        {/* Error Display */}
        {errors.profile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-300">
                {errors.profile}
              </p>
            </div>
          </motion.div>
        )}
      </Card>
    </div>
  );
}
