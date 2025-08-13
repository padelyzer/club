import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Check,
  X,
  AlertCircle,
  UserCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Modal } from '@/components/layout/Modal';
import { cn } from '@/lib/utils';
import { PartnerRequest, CreateReservationRequest } from '@/lib/api/types';
import { convertPartnerRequestToReservation } from '@/lib/utils/partner-invitations';
import { toast } from '@/lib/toast';

interface PartnerRequestToReservationProps {
  partnerRequest: PartnerRequest;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (reservation: any) => void;
}

export const PartnerRequestToReservationModal = ({
  partnerRequest,
  isOpen,
  onClose,
  onSuccess,
}: PartnerRequestToReservationProps) => {
  const { t } = useTranslation();
  const [isConverting, setIsConverting] = useState(false);
  const [step, setStep] = useState<'confirm' | 'selecting-court' | 'converting'>('confirm');

  const handleConvert = async () => {
    setIsConverting(true);
    setStep('converting');

    try {
      // Mock reservation details - in real app, this would come from court selection
      const reservationDetails: Omit<CreateReservationRequest, 'partners' | 'is_partner_match'> = {
        club: 'club_1', // Would be selected by user
        court: 'court_1', // Would be selected by user
        date: partnerRequest.proposed_date || new Date().toISOString().split('T')[0],
        start_time: partnerRequest.proposed_time || '18:00',
        end_time: '19:30', // Would calculate based on duration
        player_name: partnerRequest.receiver.full_name, // Current user
        player_email: '', // Would come from user context
        player_count: 4,
        notes: `Converted from partner request: ${partnerRequest.message}`,
      };

      const reservation = await convertPartnerRequestToReservation(
        partnerRequest,
        reservationDetails
      );

      toast.success('¡Reserva creada exitosamente!');
      onSuccess?.(reservation);
      onClose();
    } catch (error) {
            toast.error('Error al crear la reserva');
    } finally {
      setIsConverting(false);
      setStep('confirm');
    }
  };

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
          <UserCheck className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('reservations.acceptPartnerRequest')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('reservations.acceptPartnerRequestDescription')}
        </p>
      </div>

      {/* Partner Request Details */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={partnerRequest.sender.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              {partnerRequest.sender.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {partnerRequest.sender.full_name}
                </h4>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {partnerRequest.sender.level_name && (
                    <Badge variant="secondary" className="text-xs">
                      {partnerRequest.sender.level_name}
                    </Badge>
                  )}
                  <span>{partnerRequest.sender.rating} rating</span>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/20">
                {t(`reservations.matchType.${partnerRequest.match_type}`)}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {partnerRequest.message}
            </p>
            
            {/* Proposed Details */}
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
              {partnerRequest.proposed_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(partnerRequest.proposed_date).toLocaleDateString('es-ES')}</span>
                </div>
              )}
              {partnerRequest.proposed_time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{partnerRequest.proposed_time}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Conversion Details */}
      <Alert>
        <Zap className="h-4 w-4" />
        <AlertDescription>
          {t('reservations.partnerRequestConversionNote')}
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1"
          disabled={isConverting}
        >
          <X className="mr-2 h-4 w-4" />
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleConvert}
          className="flex-1"
          disabled={isConverting}
        >
          <Check className="mr-2 h-4 w-4" />
          {t('reservations.acceptAndCreateReservation')}
        </Button>
      </div>
    </div>
  );

  const renderConvertingStep = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('reservations.creatingReservation')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {t('reservations.creatingReservationDescription')}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3">
        {[
          { key: 'validating', label: t('reservations.validatingPartnerRequest') },
          { key: 'checking', label: t('reservations.checkingAvailability') },
          { key: 'creating', label: t('reservations.creatingReservation') },
          { key: 'notifying', label: t('reservations.sendingNotifications') },
        ].map((stepItem, index) => (
          <div key={stepItem.key} className="flex items-center gap-3 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></div>
            </div>
            <span className="text-gray-600 dark:text-gray-400">{stepItem.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('reservations.partnerRequestToReservation')}
      size="md"
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {step === 'confirm' && renderConfirmStep()}
        {step === 'converting' && renderConvertingStep()}
      </motion.div>
    </Modal>
  );
};

// Component for inline partner request conversion (without modal)
export const PartnerRequestConverter = ({
  partnerRequest,
  onSuccess,
  className,
}: {
  partnerRequest: PartnerRequest;
  onSuccess?: (reservation: any) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const [isConverting, setIsConverting] = useState(false);

  const handleQuickConvert = async () => {
    setIsConverting(true);

    try {
      const reservationDetails: Omit<CreateReservationRequest, 'partners' | 'is_partner_match'> = {
        club: 'club_1',
        court: 'court_1',
        date: partnerRequest.proposed_date || new Date().toISOString().split('T')[0],
        start_time: partnerRequest.proposed_time || '18:00',
        end_time: '19:30',
        player_name: partnerRequest.receiver.full_name,
        player_email: '',
        player_count: 4,
        notes: `Converted from partner request: ${partnerRequest.message}`,
      };

      const reservation = await convertPartnerRequestToReservation(
        partnerRequest,
        reservationDetails
      );

      toast.success('¡Reserva creada exitosamente!');
      onSuccess?.(reservation);
    } catch (error) {
            toast.error('Error al crear la reserva');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <Card className={cn('p-4 border-green-200 dark:border-green-800', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {t('reservations.quickReservation')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('reservations.quickReservationDescription')}
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleQuickConvert}
          disabled={isConverting}
          size="sm"
          className="min-w-[120px]"
        >
          {isConverting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              <span>{t('common.creating')}</span>
            </div>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              {t('reservations.createReservation')}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};