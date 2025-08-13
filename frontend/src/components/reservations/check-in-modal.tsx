'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle, 
  CreditCard, 
  DollarSign, 
  User, 
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Banknote,
  Smartphone,
  CreditCard as CardIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Reservation } from '@/types/reservation';
import { 
  ProfessionalModal,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter
} from '@/components/ui/professional/ProfessionalModal';
import { Button } from '@/components/ui/professional/Button';
import { Card } from '@/components/ui/professional/Card';
import { Input } from '@/components/ui/professional/Input';
import { ProfessionalSelect } from '@/components/ui/professional/ProfessionalForm';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  onCheckIn: (reservationId: number, paymentData?: any) => Promise<void>;
  onPayment: (reservationId: number, paymentData: any) => Promise<void>;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  reservation,
  onCheckIn,
  onPayment,
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'confirm'>('details');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!reservation) return null;

  const isPaid = reservation.payment_status === 'paid';
  const needsPayment = !isPaid && reservation.status === 'confirmed';

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentMethod || !paymentAmount) {
      return;
    }

    setLoading(true);
    try {
      await onPayment(reservation.id, {
        method: paymentMethod,
        amount: parseFloat(paymentAmount),
        date: new Date().toISOString(),
      });
      setStep('confirm');
    } catch (error) {
          } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await onCheckIn(reservation.id);
      onClose();
    } catch (error) {
          } finally {
      setLoading(false);
    }
  };

  const paymentOptions = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'app', label: 'App móvil' },
  ];

  return (
    <ProfessionalModal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-lg">
        <ModalHeader>
          <ModalTitle>
            {step === 'details' && 'Check-in de Reserva'}
            {step === 'payment' && 'Capturar Pago'}
            {step === 'confirm' && 'Confirmar Check-in'}
          </ModalTitle>
          <p className="text-sm text-gray-600 mt-1">
            {step === 'details' && 'Revisa los detalles y procede con el check-in'}
            {step === 'payment' && 'Registra el pago de la reserva'}
            {step === 'confirm' && 'La reserva está lista para check-in'}
          </p>
        </ModalHeader>

        <ModalBody>
          <AnimatePresence mode="wait">
            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Reservation Info */}
                <Card variant="glass" padding="default" className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Cliente</p>
                      <p className="font-medium text-gray-900">
                        {reservation.player_name || 'Sin cliente'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Fecha</p>
                      <p className="font-medium text-gray-900">
                        {new Date(reservation.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Horario</p>
                      <p className="font-medium text-gray-900">
                        {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Cancha</p>
                      <p className="font-medium text-gray-900">
                        {typeof reservation.court === 'string' ? `Cancha ${reservation.court}` : reservation.court?.name || 'Sin cancha'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Payment Status */}
                <Card 
                  variant="glass" 
                  padding="default"
                  className={cn(
                    "border",
                    isPaid ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isPaid ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {isPaid ? 'Pago completado' : 'Pago pendiente'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Total: ${reservation.total_price || 0}
                        </p>
                      </div>
                    </div>
                    {!isPaid && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPaymentAmount(String(reservation.total_price || 0));
                          setStep('payment');
                        }}
                      >
                        Capturar pago
                      </Button>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Payment Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Método de pago
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'cash', label: 'Efectivo', icon: Banknote },
                        { value: 'card', label: 'Tarjeta', icon: CardIcon },
                        { value: 'transfer', label: 'Transferencia', icon: DollarSign },
                        { value: 'app', label: 'App móvil', icon: Smartphone },
                      ].map(method => (
                        <motion.button
                          key={method.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setPaymentMethod(method.value)}
                          className={cn(
                            "p-4 rounded-xl border-2 transition-all",
                            "flex flex-col items-center gap-2",
                            paymentMethod === method.value
                              ? "border-[#007AFF] bg-[#007AFF]/5"
                              : "border-gray-200 hover:border-gray-300"
                          )}
                        >
                          <method.icon className={cn(
                            "w-6 h-6",
                            paymentMethod === method.value
                              ? "text-[#007AFF]"
                              : "text-gray-500"
                          )} />
                          <span className={cn(
                            "text-sm font-medium",
                            paymentMethod === method.value
                              ? "text-[#007AFF]"
                              : "text-gray-700"
                          )}>
                            {method.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto a pagar
                    </label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      leftIcon={<DollarSign className="w-4 h-4" />}
                      placeholder="0.00"
                      className="text-xl font-semibold"
                    />
                  </div>

                  {paymentMethod === 'card' && (
                    <Card variant="glass" padding="default" className="bg-blue-50 border-blue-200">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <p className="text-sm text-blue-800">
                          Procesa la tarjeta en el terminal físico
                        </p>
                      </div>
                    </Card>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </motion.div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Pago registrado
                </h3>
                <p className="text-gray-600">
                  La reserva está lista para check-in
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </ModalBody>

        <ModalFooter>
          {step === 'details' && (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={isPaid ? handleCheckIn : () => {
                  setPaymentAmount(String(reservation.total_price || 0));
                  setStep('payment');
                }}
                disabled={loading}
              >
                {isPaid ? 'Hacer Check-in' : 'Continuar'}
              </Button>
            </>
          )}

          {step === 'payment' && (
            <>
              <Button 
                variant="secondary" 
                onClick={() => setStep('details')}
                disabled={loading}
              >
                Atrás
              </Button>
              <Button
                onClick={handlePaymentSubmit}
                disabled={!paymentMethod || !paymentAmount || loading}
              >
                Confirmar pago
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <Button
              onClick={handleCheckIn}
              disabled={loading}
              className="w-full"
            >
              Completar Check-in
            </Button>
          )}
        </ModalFooter>
      </div>
    </ProfessionalModal>
  );
};