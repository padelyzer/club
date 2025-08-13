'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Clock,
  Users,
  Building2,
  CreditCard,
  Settings,
  BarChart3,
  Calendar,
  Shield,
  Star,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Club } from '@/types/club';
import { useActiveClubId, useClubsUIStore, useActiveClubStore } from '@/store/clubs';
import { useClubStats } from '@/lib/api/hooks/useClubs';
import { Modal } from '@/components/layout/Modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClubDetailProps {
  isOpen: boolean;
  onClose: () => void;
  club: Club;
}

export const ClubDetail: React.FC<ClubDetailProps> = ({
  isOpen,
  onClose,
  club,
}) => {
  const { t } = useTranslation();
  // Use optimized selectors
  const activeClubId = useActiveClubId();
  const openForm = useClubsUIStore((state) => state.openForm);
  const switchClub = useActiveClubStore((state) => state.switchClub);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'schedule' | 'services' | 'stats'
  >('overview');
  const [imageError, setImageError] = useState(false);

  const { data: stats, isLoading: statsLoading } = useClubStats(club.id);
  const isActive = activeClubId === club.id;

  const tabs = [
    { id: 'overview', label: t('clubs.overview'), icon: Building2 },
    { id: 'schedule', label: t('clubs.schedule'), icon: Calendar },
    { id: 'services', label: t('clubs.services'), icon: Settings },
    { id: 'stats', label: t('clubs.statistics'), icon: BarChart3 },
  ];

  const handleEdit = () => {
    openForm(club);
    onClose();
  };

  const handleSetActive = () => {
    switchClub(club.id);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" as any>
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-t-lg overflow-hidden">
            {club.cover_image && !imageError ? (
              <img
                src={club.cover_image}
                alt={club.name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="h-24 w-24 text-white/20" />
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* Club Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
            <div className="flex items-end justify-between">
              <div className="flex items-end space-x-4">
                {/* Logo */}
                {club.logo_url ? (
                  <img
                    src={club.logo_url}
                    alt={club.name}
                    className="h-20 w-20 rounded-lg border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-lg border-4 border-white shadow-lg bg-white flex items-center justify-center">
                    <Building2 className="h-10 w-10 text-gray-400" />
                  </div>
                )}

                {/* Name and Location */}
                <div className="text-white pb-2">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {club.name}
                    {isActive && (
                      <Badge
                        variant="primary"
                        size="sm"
                        className="bg-white/20 backdrop-blur-sm"
                      >
                        {t('clubs.active')}
                      </Badge>
                    )}
                  </h2>
                  <p className="flex items-center mt-1 text-white/80">
                    <MapPin className="h-4 w-4 mr-1" />
                    {club.address?.city || 'Sin ubicación'}, {club.address?.state || ''}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pb-2">
                {!isActive && (
                  <Button
                    onClick={handleSetActive}
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                  >
                    {t('clubs.setActive')}
                  </Button>
                )}
                <Button
                  onClick={handleEdit}
                  size="sm"
                  variant="secondary"
                  className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-white/30"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-6 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
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
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Description */}
                {club.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {t('clubs.about')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {club.description}
                    </p>
                  </div>
                )}

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {t('clubs.contactInfo')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start space-x-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t('clubs.phone')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {club.phone}
                        </p>
                        {club.secondary_phone && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {club.secondary_phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t('clubs.email')}
                        </p>
                        <a
                          href={`mailto:${club.email}`}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        >
                          {club.email}
                        </a>
                      </div>
                    </div>

                    {club.website && (
                      <div className="flex items-start space-x-3">
                        <Globe className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {t('clubs.website')}
                          </p>
                          <a
                            href={club.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          >
                            {club.website}
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start space-x-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {t('clubs.address')}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {club.address}
                          <br />
                          {club.address?.city || 'Sin ubicación'}, {club.address?.state || ''}{' '}
                          {club.postal_code}
                          <br />
                          {club.country}
                        </p>
                        {club.google_maps_url && (
                          <a
                            href={club.google_maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-1 inline-block"
                          >
                            {t('clubs.viewOnMap')}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Social Media */}
                  {(club.instagram || club.facebook) && (
                    <div className="mt-4 flex items-center space-x-4">
                      {club.instagram && (
                        <a
                          href={`https://instagram.com/${club.instagram}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Instagram className="h-5 w-5" />
                          <span>@{club.instagram}</span>
                        </a>
                      )}
                      {club.facebook && (
                        <a
                          href={`https://facebook.com/${club.facebook}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Facebook className="h-5 w-5" />
                          <span>{club.facebook}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Features and Payment Methods */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      {t('clubs.features')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {club.features.map((feature) => (
                        <Badge key={feature} variant="secondary">
                          {t(`clubs.features.${feature}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                      {t('clubs.paymentMethods')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {club.payment_methods.map((method) => (
                        <Badge key={method} variant="secondary">
                          <CreditCard className="h-3 w-3 mr-1" />
                          {t(`payment.methods.${method}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Booking Rules */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    {t('clubs.bookingRules')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('clubs.advanceBooking')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {club.booking_rules.advance_booking_days}{' '}
                        {t('common.days')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('clubs.cancellationNotice')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {club.booking_rules.cancellation_hours}{' '}
                        {t('common.hours')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('clubs.minDuration')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {club.booking_rules.min_booking_duration}{' '}
                        {t('common.minutes')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('clubs.maxDuration')}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {club.booking_rules.max_booking_duration}{' '}
                        {t('common.minutes')}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'schedule' && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('clubs.operatingHours')}
                </h3>
                <div className="space-y-2">
                  {club.schedule.map((day) => (
                    <div
                      key={day.day}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg',
                        day.is_open
                          ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                          : 'bg-gray-50 dark:bg-gray-800/50'
                      )}
                    >
                      <span
                        className={cn(
                          'font-medium capitalize',
                          day.is_open
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {t(`days.${day.day}`)}
                      </span>
                      <span
                        className={cn(
                          day.is_open
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {day.is_open && day.open_time && day.close_time
                          ? `${day.open_time} - ${day.close_time}`
                          : t('clubs.closed')}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'services' && (
              <motion.div
                key="services"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('clubs.availableServices')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {club.services.map((service) => (
                    <div
                      key={service.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        service.is_available
                          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {service.name}
                          </h4>
                          {service.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                        {service.price && (
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            ${service.price}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
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
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t(`clubs.serviceCategories.${service.category}`)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'stats' && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('clubs.performanceMetrics')}
                </h3>

                {statsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : stats ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Revenue Stats */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                        {t('analytics.revenue')}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.today')}
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            ${stats.revenue.today.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.thisWeek')}
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            ${stats.revenue.this_week.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.thisMonth')}
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            ${stats.revenue.this_month.toLocaleString()}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center">
                            {stats.revenue.trend > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            <span
                              className={cn(
                                'text-sm font-medium',
                                stats.revenue.trend > 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              )}
                            >
                              {stats.revenue.trend > 0 ? '+' : ''}
                              {stats.revenue.trend}%
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                              {t('analytics.vsLastMonth')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Occupancy Stats */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                        {t('analytics.occupancy')}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.current')}
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {stats.occupancy.current}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.todayAverage')}
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {stats.occupancy.today_average}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.weekAverage')}
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {stats.occupancy.week_average}%
                          </span>
                        </div>
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.peakHours')}:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {stats.occupancy.peak_hours.map((hour) => (
                              <Badge key={hour} variant="secondary" size="sm">
                                {hour}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bookings Stats */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                        {t('analytics.bookings')}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {stats.bookings.today}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('analytics.today')}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-600">
                            {stats.bookings.pending}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('reservations.status.pending')}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {stats.bookings.confirmed}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('reservations.status.confirmed')}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-red-600">
                            {stats.bookings.cancelled}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {t('reservations.status.cancelled')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Members Stats */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">
                        {t('analytics.members')}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.total')}
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {stats.members.total}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.active')}
                          </span>
                          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {stats.members.active}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('analytics.newThisMonth')}
                          </span>
                          <span className="text-lg font-semibold text-green-600">
                            +{stats.members.new_this_month}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('analytics.noDataAvailable')}
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};
