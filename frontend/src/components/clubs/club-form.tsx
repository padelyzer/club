'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import {
  X,
  Save,
  Loader2,
  Upload,
  Plus,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  CreditCard,
  Shield,
  Image as ImageIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Club, ClubFormData, DaySchedule } from '@/types/club';
import { useCreateClub, useUpdateClub } from '@/lib/api/hooks/useClubs';
import { mapFormDataToClub, mapClubToFormData } from '@/lib/api/adapters/club-form.adapter';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { ClubImageUpload } from './club-image-upload';

interface ClubFormProps {
  isOpen: boolean;
  onClose: () => void;
  club?: Club | null;
  onSuccess?: () => void;
}

const defaultSchedule: DaySchedule[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
].map((day) => ({
  day: day as any,
  is_open: day !== 'sunday',
  open_time: '08:00',
  close_time: '22:00',
  breaks: [],
}));

const availableFeatures = [
  'parking',
  'changing_rooms',
  'pro_shop',
  'cafeteria',
  'wifi',
  'air_conditioning',
  'showers',
  'lockers',
  'equipment_rental',
  'coaching',
];

const paymentMethods = ['cash', 'card', 'transfer', 'online'];

export const ClubForm: React.FC<ClubFormProps> = ({
  isOpen,
  onClose,
  club,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<
    'basic' | 'location' | 'schedule' | 'services'
  >('basic');

  const createMutation = useCreateClub();
  const updateMutation = useUpdateClub();

  const isEditing = !!club;
  const mutation = isEditing ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ClubFormData>({
    defaultValues: {
      name: '',
      description: '',
      location: {
        address: '',
        city: '',
        state: '',
        country: '',
        postal_code: '',
      },
      contact: {
        phone: '',
        email: '',
        website: '',
      },
      schedule: defaultSchedule,
      services: [],
      features: [],
      payment_methods: [],
      booking_rules: {
        advance_booking_days: 30,
        min_booking_duration: 60,
        max_booking_duration: 120,
        cancellation_hours: 24,
        allow_recurring_bookings: true,
        max_recurring_weeks: 12,
        require_payment_confirmation: false,
      },
    },
  });

  const schedule = watch('schedule');
  const features = watch('features');
  const selectedPaymentMethods = watch('payment_methods');

  useEffect(() => {
    if (club) {
      const formData = mapClubToFormData(club);
      reset(formData);
    }
  }, [club, reset]);

  const onSubmit = async (data: ClubFormData) => {
    try {
      const apiData = mapFormDataToClub(data);
      if (isEditing) {
        await mutation.mutateAsync({ id: club.id, data: apiData });
      } else {
        await mutation.mutateAsync(apiData);
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  const toggleFeature = (feature: string) => {
    const current = features || [];
    if (current.includes(feature)) {
      setValue(
        'features',
        current.filter((f) => f !== feature)
      );
    } else {
      setValue('features', [...current, feature]);
    }
  };

  const togglePaymentMethod = (method: string) => {
    const current = selectedPaymentMethods || [];
    if (current.includes(method)) {
      setValue(
        'payment_methods',
        current.filter((m) => m !== method)
      );
    } else {
      setValue('payment_methods', [...current, method]);
    }
  };

  const updateDaySchedule = (
    dayIndex: number,
    field: keyof DaySchedule,
    value: any
  ) => {
    const newSchedule = [...schedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    setValue('schedule', newSchedule);
  };

  const tabs = [
    { id: 'basic', label: t('clubs.basicInfo'), icon: Shield },
    { id: 'location', label: t('clubs.location'), icon: MapPin },
    { id: 'schedule', label: t('clubs.schedule'), icon: Clock },
    { id: 'services', label: t('clubs.servicesAndFeatures'), icon: CreditCard },
    { id: 'images', label: t('clubs.images'), icon: ImageIcon },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" as any>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col h-full max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? t('clubs.editClub') : t('clubs.addClub')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-6 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    'flex items-center space-x-2 py-3 px-1 border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="name">{t('clubs.name')} *</Label>
                <Input
                  id="name"
                  {...register('name', { required: t('validation.required') })}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">{t('clubs.description')}</Label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">{t('clubs.phone')} *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('contact.phone', {
                      required: t('validation.required'),
                    })}
                    className={errors.contact?.phone ? 'border-red-500' : ''}
                  />
                  {errors.contact?.phone && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.contact.phone.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email">{t('clubs.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('contact.email', {
                      required: t('validation.required'),
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: t('validation.invalidEmail'),
                      },
                    })}
                    className={errors.contact?.email ? 'border-red-500' : ''}
                  />
                  {errors.contact?.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.contact.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="website">{t('clubs.website')}</Label>
                  <Input
                    id="website"
                    type="url"
                    {...register('contact.website')}
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp">{t('clubs.whatsapp')}</Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    {...register('contact.whatsapp')}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="address">{t('clubs.address')} *</Label>
                <Input
                  id="address"
                  {...register('location.address', {
                    required: t('validation.required'),
                  })}
                  className={errors.location?.address ? 'border-red-500' : ''}
                />
                {errors.location?.address && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.location.address.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">{t('clubs.city')} *</Label>
                  <Input
                    id="city"
                    {...register('location.city', {
                      required: t('validation.required'),
                    })}
                    className={errors.location?.city ? 'border-red-500' : ''}
                  />
                  {errors.location?.city && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.location.city.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="state">{t('clubs.state')} *</Label>
                  <Input
                    id="state"
                    {...register('location.state', {
                      required: t('validation.required'),
                    })}
                    className={errors.location?.state ? 'border-red-500' : ''}
                  />
                  {errors.location?.state && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.location.state.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="country">{t('clubs.country')} *</Label>
                  <Input
                    id="country"
                    {...register('location.country', {
                      required: t('validation.required'),
                    })}
                    className={errors.location?.country ? 'border-red-500' : ''}
                  />
                  {errors.location?.country && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.location.country.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="postal_code">{t('clubs.postalCode')} *</Label>
                  <Input
                    id="postal_code"
                    {...register('location.postal_code', {
                      required: t('validation.required'),
                    })}
                    className={
                      errors.location?.postal_code ? 'border-red-500' : ''
                    }
                  />
                  {errors.location?.postal_code && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.location.postal_code.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('clubs.operatingHours')}
                </h3>
                <div className="space-y-3">
                  {schedule.map((day, index) => (
                    <div
                      key={day.day}
                      className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center flex-1">
                        <input
                          type="checkbox"
                          checked={day.is_open}
                          onChange={(e) =>
                            updateDaySchedule(
                              index,
                              'is_open',
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <label className="ml-3 font-medium text-gray-900 dark:text-gray-100 capitalize">
                          {t(`days.${day.day}`)}
                        </label>
                      </div>

                      {day.is_open && (
                        <div className="flex items-center space-x-2">
                          <input
                            type="time"
                            value={day.open_time || '08:00'}
                            onChange={(e) =>
                              updateDaySchedule(
                                index,
                                'open_time',
                                e.target.value
                              )
                            }
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={day.close_time || '22:00'}
                            onChange={(e) =>
                              updateDaySchedule(
                                index,
                                'close_time',
                                e.target.value
                              )
                            }
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('clubs.bookingRules')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="advance_booking_days">
                      {t('clubs.advanceBookingDays')}
                    </Label>
                    <Input
                      id="advance_booking_days"
                      type="number"
                      min="1"
                      max="365"
                      {...register('booking_rules.advance_booking_days', {
                        valueAsNumber: true,
                        min: 1,
                        max: 365,
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cancellation_hours">
                      {t('clubs.cancellationHours')}
                    </Label>
                    <Input
                      id="cancellation_hours"
                      type="number"
                      min="0"
                      max="168"
                      {...register('booking_rules.cancellation_hours', {
                        valueAsNumber: true,
                        min: 0,
                        max: 168,
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="min_booking_duration">
                      {t('clubs.minBookingDuration')} ({t('common.minutes')})
                    </Label>
                    <Input
                      id="min_booking_duration"
                      type="number"
                      min="30"
                      max="240"
                      step="30"
                      {...register('booking_rules.min_booking_duration', {
                        valueAsNumber: true,
                        min: 30,
                        max: 240,
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_booking_duration">
                      {t('clubs.maxBookingDuration')} ({t('common.minutes')})
                    </Label>
                    <Input
                      id="max_booking_duration"
                      type="number"
                      min="30"
                      max="480"
                      step="30"
                      {...register('booking_rules.max_booking_duration', {
                        valueAsNumber: true,
                        min: 30,
                        max: 480,
                      })}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('booking_rules.allow_recurring_bookings')}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {t('clubs.allowRecurringBookings')}
                    </span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register(
                        'booking_rules.require_payment_confirmation'
                      )}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-900 dark:text-gray-100">
                      {t('clubs.requirePaymentConfirmation')}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('clubs.features')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {availableFeatures.map((feature) => (
                    <label
                      key={feature}
                      className={cn(
                        'flex items-center p-3 rounded-lg border cursor-pointer transition-colors',
                        features?.includes(feature)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={features?.includes(feature) || false}
                        onChange={() => toggleFeature(feature)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                        {t(`clubs.features.${feature}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  {t('clubs.paymentMethods')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method}
                      className={cn(
                        'flex items-center p-3 rounded-lg border cursor-pointer transition-colors',
                        selectedPaymentMethods?.includes(method)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={
                          selectedPaymentMethods?.includes(method) || false
                        }
                        onChange={() => togglePaymentMethod(method)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                        {t(`payment.methods.${method}`)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-6">
              {club?.id ? (
                <ClubImageUpload
                  clubId={club.id}
                  currentLogoUrl={club.logo_url}
                  currentCoverUrl={club.cover_image_url}
                  onLogoUploaded={(logoUrl) => {
                    // Update the form data or refetch club data
                    // For now, we'll just show a success message
                  }}
                  onCoverUploaded={(coverUrl) => {
                    // Update the form data or refetch club data
                    // For now, we'll just show a success message
                  }}
                />
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('clubs.imageUploadAfterSave')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('clubs.imageUploadAfterSaveDescription')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? t('common.update') : t('common.create')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
