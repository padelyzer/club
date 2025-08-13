'use client';

import { useState } from 'react';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import {
  User,
  CreditCard,
  Calendar,
  Clock,
  Users,
  DollarSign,
} from 'lucide-react';

interface ClassBookingProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: any;
  onSuccess?: () => void;
}

export const ClassBooking = ({
  isOpen,
  onClose,
  classItem,
  onSuccess,
}: ClassBookingProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    participants: 1,
    paymentMethod: 'card',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
            onSuccess?.();
      onClose();
    } catch (error) {
          } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculatePrice = () => {
    return classItem?.pricePerPerson * formData.participants || 0;
  };

  if (!isOpen || !classItem) return null;

  return (
    <Modal size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            {t('classes.bookClass', 'Book Class')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              'classes.bookingDescription',
              'Complete the booking for this class'
            )}
          </p>
        </div>

        {/* Class Info */}
        <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{classItem.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {classItem.startTime} - {classItem.endTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {classItem.currentParticipants}/{classItem.maxParticipants}{' '}
                participants
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>${classItem.pricePerPerson} per person</span>
            </div>
          </div>
        </Card>

        {/* Client Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {t('classes.clientInformation', 'Client Information')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">
                <User className="h-4 w-4 inline mr-2" />
                {t('classes.clientName', 'Client Name')}
              </Label>
              <Input
                id="clientName"
                value={formData.clientName || ''}
                onChange={(e) => handleChange('clientName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientEmail">
                {t('classes.clientEmail', 'Email')}
              </Label>
              <Input
                id="clientEmail"
                type="email"
                value={formData.clientEmail || ''}
                onChange={(e) => handleChange('clientEmail', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientPhone">
                {t('classes.clientPhone', 'Phone')}
              </Label>
              <Input
                id="clientPhone"
                value={formData.clientPhone || ''}
                onChange={(e) => handleChange('clientPhone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="participants">
                <Users className="h-4 w-4 inline mr-2" />
                {t('classes.participants', 'Number of Participants')}
              </Label>
              <select
                id="participants"
                value={formData.participants || ''}
                onChange={(e) =>
                  handleChange('participants', parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              >
                {Array.from(
                  {
                    length: Math.min(
                      4,
                      classItem.maxParticipants - classItem.currentParticipants
                    ),
                  },
                  (_, i) => (
                    <option key={i + 1} value={i + 1 || ''}>
                      {i + 1} {i === 0 ? 'participant' : 'participants'}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <Label htmlFor="paymentMethod">
            <CreditCard className="h-4 w-4 inline mr-2" />
            {t('classes.paymentMethod', 'Payment Method')}
          </Label>
          <select
            id="paymentMethod"
            value={formData.paymentMethod || ''}
            onChange={(e) => handleChange('paymentMethod', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
          >
            <option value="card">{t('payments.card', 'Credit Card')}</option>
            <option value="cash">{t('payments.cash', 'Cash')}</option>
            <option value="transfer">
              {t('payments.transfer', 'Bank Transfer')}
            </option>
          </select>
        </div>

        {/* Price Summary */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="font-medium">
                {t('classes.totalPrice', 'Total Price')}:
              </span>
            </div>
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${calculatePrice().toFixed(2)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {formData.participants} × ${classItem.pricePerPerson} per person
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t('common.processing')
              : t('classes.confirmBooking', 'Confirm Booking')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
