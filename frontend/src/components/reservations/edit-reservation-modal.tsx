'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parse, addMinutes, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/lib/toast';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/states/loading-state';
import { useUIStore } from '@/store/ui';
import { useReservationStore } from '@/store/reservations';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { ClientsService } from '@/lib/api/services/clients.service';
import { CourtsService } from '@/lib/api/services/courts.service';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  DollarSign,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reservation } from '@/lib/api/types';

// Form validation schema
const editReservationSchema = z.object({
  court_id: z.string().min(1, 'Court is required'),
  client_id: z.string().min(1, 'Client is required'),
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  duration: z
    .number()
    .min(30, 'Minimum duration is 30 minutes')
    .max(240, 'Maximum duration is 4 hours'),
  notes: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed']),
  payment_status: z.enum(['pending', 'paid', 'refunded']),
});

type EditReservationFormData = z.infer<typeof editReservationSchema>;

export const EditReservationModal = () => {
  const { t } = useTranslation();
  const { closeModal } = useUIStore();
  const { selectedReservation, setSelectedReservation } = useReservationStore();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch courts
  const { data: courtsData, isLoading: isLoadingCourts } = useQuery({
    queryKey: ['courts', 'available'],
    queryFn: () => CourtsService.list({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch clients
  const { data: clientsData, isLoading: isLoadingClients } = useQuery({
    queryKey: ['clients', 'active'],
    queryFn: () => ClientsService.list({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  const courts = courtsData?.results || [];
  const clients = clientsData?.results || [];

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<EditReservationFormData>({
    resolver: zodResolver(editReservationSchema),
    defaultValues: selectedReservation
      ? {
          court_id: selectedReservation.court.id,
          client_id: selectedReservation.client.id,
          date: selectedReservation.date,
          start_time: selectedReservation.start_time,
          duration: differenceInMinutes(
            parse(selectedReservation.end_time, 'HH:mm', new Date()),
            parse(selectedReservation.start_time, 'HH:mm', new Date())
          ),
          notes: selectedReservation.notes || '',
          status: selectedReservation.status,
          payment_status: selectedReservation.payment_status,
        }
      : undefined,
  });

  const selectedCourtId = watch('court_id');
  const selectedDate = watch('date');
  const selectedStartTime = watch('start_time');
  const selectedDuration = watch('duration');
  const selectedCourt = courts.find((c: any) => c.id === selectedCourtId);

  // Update reservation mutation
  const updateReservationMutation = useMutation({
    mutationFn: async (data: EditReservationFormData) => {
      if (!selectedReservation) throw new Error('No reservation selected');

      const startTime = parse(data.start_time, 'HH:mm', new Date());
      const endTime = format(addMinutes(startTime, data.duration), 'HH:mm');

      const updateData = {
        court_id: data.court_id,
        client_id: data.client_id,
        date: data.date,
        start_time: data.start_time,
        end_time: endTime,
        notes: data.notes,
        status: data.status,
        payment_status: data.payment_status,
      };

      return ReservationsService.update(selectedReservation.id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success(t('reservations.updateSuccess'));
      handleClose();
    },
    onError: (error) => {
      toast.error(t('reservations.updateError'));
          },
  });

  // Check availability mutation
  const checkAvailabilityMutation = useMutation({
    mutationFn: async (data: EditReservationFormData) => {
      const startTime = parse(data.start_time, 'HH:mm', new Date());
      const endTime = format(addMinutes(startTime, data.duration), 'HH:mm');

      return ReservationsService.checkAvailability({
        court_id: data.court_id,
        date: data.date,
        start_time: data.start_time,
        end_time: endTime,
        exclude_reservation_id: selectedReservation?.id,
      });
    },
  });

  const handleClose = () => {
    setSelectedReservation(null);
    closeModal();
    reset();
  };

  const onSubmit = async (data: EditReservationFormData) => {
    setIsSubmitting(true);

    try {
      // Check availability first
      const availability = await checkAvailabilityMutation.mutateAsync(data);

      if (!availability.available) {
        toast.error(t('reservations.timeSlotNotAvailable'));
        setIsSubmitting(false);
        return;
      }

      // Update reservation
      await updateReservationMutation.mutateAsync(data);
    } catch (error) {
          } finally {
      setIsSubmitting(false);
    }
  };

  const calculatePrice = () => {
    if (!selectedCourt || !selectedDuration) return 0;
    const hours = selectedDuration / 60;
    return selectedCourt.price_per_hour * hours;
  };

  const getStatusIcon = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPaymentStatusColor = (status: Reservation['payment_status']) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    }
  };

  if (!selectedReservation) {
    return null;
  }

  const isLoading = isLoadingCourts || isLoadingClients;

  return (
    <Modal size="lg" onClose={handleClose}>
      {(isLoading || isSubmitting) && <LoadingState overlay />}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {t('reservations.editReservation')}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('reservations.editReservationDescription')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(selectedReservation.status)}
            <Badge
              className={cn(
                'text-sm',
                getStatusColor(selectedReservation.status)
              )}
            >
              {t(`reservations.status.${selectedReservation.status}`)}
            </Badge>
          </div>
        </div>

        {/* Current Reservation Info */}
        <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <AlertCircle className="h-4 w-4" />
            {t('reservations.currentReservationInfo')}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">
                {t('reservations.originalDate')}:
              </span>{' '}
              <span className="font-medium">
                {format(new Date(selectedReservation.date), 'PPP', {
                  locale: es,
                })}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">
                {t('reservations.originalTime')}:
              </span>{' '}
              <span className="font-medium">
                {selectedReservation.start_time} -{' '}
                {selectedReservation.end_time}
              </span>
            </div>
          </div>
        </Card>

        {/* Client Selection */}
        <div className="space-y-2">
          <Label htmlFor="client_id">
            <User className="h-4 w-4 inline mr-2" />
            {t('reservations.client')}
          </Label>
          <select
            id="client_id"
            {...register('client_id')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
          >
            <option value="">{t('reservations.selectClient')}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id || ''}>
                {client.first_name} {client.last_name} - {client.email}
              </option>
            ))}
          </select>
          {errors.client_id && (
            <p className="text-sm text-red-500">{errors.client_id.message}</p>
          )}
        </div>

        {/* Court Selection */}
        <div className="space-y-2">
          <Label htmlFor="court_id">
            <MapPin className="h-4 w-4 inline mr-2" />
            {t('reservations.court')}
          </Label>
          <select
            id="court_id"
            {...register('court_id')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
          >
            <option value="">{t('reservations.selectCourt')}</option>
            {courts.map((court: any) => (
              <option key={court.id} value={court.id || ''}>
                {court.name} - ${court.price_per_hour}/hr
              </option>
            ))}
          </select>
          {errors.court_id && (
            <p className="text-sm text-red-500">{errors.court_id.message}</p>
          )}
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date">
              <Calendar className="h-4 w-4 inline mr-2" />
              {t('reservations.date')}
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">
              <Clock className="h-4 w-4 inline mr-2" />
              {t('reservations.startTime')}
            </Label>
            <Input id="start_time" type="time" {...register('start_time')} />
            {errors.start_time && (
              <p className="text-sm text-red-500">
                {errors.start_time.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">
              <Clock className="h-4 w-4 inline mr-2" />
              {t('reservations.duration')}
            </Label>
            <select
              id="duration"
              {...register('duration', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            >
              <option value={30 || ''}>30 {t('common.minutes')}</option>
              <option value={60 || ''}>1 {t('common.hour')}</option>
              <option value={90 || ''}>1.5 {t('common.hours')}</option>
              <option value={120 || ''}>2 {t('common.hours')}</option>
              <option value={150 || ''}>2.5 {t('common.hours')}</option>
              <option value={180 || ''}>3 {t('common.hours')}</option>
              <option value={240 || ''}>4 {t('common.hours')}</option>
            </select>
            {errors.duration && (
              <p className="text-sm text-red-500">{errors.duration.message}</p>
            )}
          </div>
        </div>

        {/* Status Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">
              <RefreshCw className="h-4 w-4 inline mr-2" />
              {t('reservations.reservationStatus')}
            </Label>
            <select
              id="status"
              {...register('status')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            >
              <option value="pending">
                {t('reservations.status.pending')}
              </option>
              <option value="confirmed">
                {t('reservations.status.confirmed')}
              </option>
              <option value="cancelled">
                {t('reservations.status.cancelled')}
              </option>
              <option value="completed">
                {t('reservations.status.completed')}
              </option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_status">
              <DollarSign className="h-4 w-4 inline mr-2" />
              {t('reservations.paymentStatus')}
            </Label>
            <select
              id="payment_status"
              {...register('payment_status')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
            >
              <option value="pending">
                {t('reservations.paymentStatus.pending')}
              </option>
              <option value="paid">
                {t('reservations.paymentStatus.paid')}
              </option>
              <option value="refunded">
                {t('reservations.paymentStatus.refunded')}
              </option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">
            <FileText className="h-4 w-4 inline mr-2" />
            {t('reservations.notes')}
          </Label>
          <Textarea
            id="notes"
            {...register('notes')}
            rows={3}
            placeholder={t('reservations.notesPlaceholder')}
          />
        </div>

        {/* Price Display */}
        {selectedCourt && selectedDuration && (
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium">
                  {t('reservations.totalPrice')}:
                </span>
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${calculatePrice().toFixed(2)}
              </span>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || checkAvailabilityMutation.isPending}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.saveChanges')
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
