'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  MapPin,
  DollarSign,
  Phone,
  Mail,
  ChevronDown,
  Zap,
  Star
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SwipeToRefresh, SwipeableCard } from '@/components/ui/GestureWrapper';
import { useMobileBookingMetrics } from '@/hooks/useMobileBookingMetrics';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useHaptic } from '@/lib/utils/haptic-feedback';

// Mobile-optimized schema with fewer required fields
const mobileBookingSchema = z.object({
  date: z.string().min(1, 'Fecha requerida'),
  slot: z.string().min(1, 'Horario requerido'),
  duration: z.number().min(60).max(120).default(90),
  playerName: z.string().min(2, 'Nombre requerido'),
  playerEmail: z.string().email('Email inválido'),
  playerPhone: z.string().optional(),
  playerCount: z.number().min(1).max(8).default(4),
});

type MobileBookingData = z.infer<typeof mobileBookingSchema>;

interface MobileBookingFlowProps {
  clubId: string;
  onSuccess?: (reservation: any) => void;
  onCancel?: () => void;
  startWithPartnerStep?: boolean;
}

interface QuickSlot {
  courtId: string;
  courtName: string;
  startTime: string;
  price: number;
  popularity: number;
}

interface MobileBookingData {
  courts: Array<{
    id: string;
    name: string;
    price: number;
    type: string;
    surface: string;
    isActive: boolean;
    popularSlots: string[];
  }>;
  availability: {
    date: string;
    quickSlots: QuickSlot[];
    allSlots: any;
    conflicts: any[];
  };
  pricing: {
    currency: string;
    durations: Array<{
      minutes: number;
      label: string;
    }>;
  };
}

const MOBILE_STEPS = [
  { id: 'quick-select', label: 'Elegir', icon: Zap },
  { id: 'details', label: 'Confirmar', icon: User },
  { id: 'success', label: 'Listo', icon: Check },
] as const;

type MobileStep = typeof MOBILE_STEPS[number]['id'];

export const MobileBookingFlow = ({ 
  clubId, 
  onSuccess, 
  onCancel 
}: MobileBookingFlowProps) => {
  const [currentStep, setCurrentStep] = useState<MobileStep>('quick-select');
  const [bookingData, setBookingData] = useState<MobileBookingData | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<QuickSlot | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(90);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Initialize mobile booking metrics
  const metrics = useMobileBookingMetrics();
  
  // Initialize haptic feedback
  const haptic = useHaptic();

  const form = useForm<MobileBookingData>({
    resolver: zodResolver(mobileBookingSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      duration: 90,
      playerCount: 4,
    },
  });

  // Load mobile-optimized booking data with retry logic
  const loadBookingData = async (date: string, isRetry = false) => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(`/api/mobile/quick-book?clubId=${clubId}&date=${date}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 503) {
          throw new Error('service_unavailable');
        }
        throw new Error('Failed to load booking data');
      }
      
      const data = await response.json();
      setBookingData(data);
      setRetryCount(0); // Reset retry count on success
      
    } catch (error: any) {
            
      if (error.name === 'AbortError') {
        setLoadError('La conexión está tardando más de lo esperado');
      } else if (error.message === 'service_unavailable') {
        setLoadError('El servicio está temporalmente no disponible');
      } else if (!navigator.onLine) {
        setLoadError('Sin conexión a internet');
      } else {
        setLoadError('Error al cargar los horarios disponibles');
      }
      
      if (!isRetry) {
        toast.error('Error al cargar disponibilidad', {
          action: {
            label: 'Reintentar',
            onClick: () => {
              setRetryCount(prev => prev + 1);
              loadBookingData(date, true);
            }
          }
        });
      }
      
      metrics.trackError('data-loading', error.message || 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clubId) {
      // Start tracking when component mounts
      metrics.startTracking();
      metrics.trackStepChange('quick-select');
      
      loadBookingData(form.watch('date'));
    }
  }, [clubId, form.watch('date')]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success('Conexión restaurada');
      // Reload data when coming back online
      if (bookingData === null) {
        loadBookingData(form.watch('date'));
      }
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      toast.error('Sin conexión a internet', {
        duration: Infinity,
        id: 'offline-toast'
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [bookingData]);

  const handleSlotSelect = (slot: QuickSlot) => {
    setSelectedSlot(slot);
    form.setValue('slot', `${slot.courtId}-${slot.startTime}`);
    haptic.selectionChanged();
  };

  const handleNext = () => {
    if (currentStep === 'quick-select' && selectedSlot) {
      setCurrentStep('details');
      metrics.trackStepChange('details');
      haptic.impact('light');
    }
  };

  const handleBack = () => {
    if (currentStep === 'details') {
      setCurrentStep('quick-select');
      metrics.trackStepChange('quick-select');
      haptic.impact('light');
    }
  };

  const handleSubmit = async (data: MobileBookingData) => {
    if (!selectedSlot) return;

    setIsSubmitting(true);
    
    try {
      // Add network check before submission
      if (!navigator.onLine) {
        throw new Error('offline');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      
      const response = await fetch('/api/mobile/quick-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          clubId,
          courtId: selectedSlot.courtId,
          date: data.date,
          startTime: selectedSlot.startTime,
          duration: selectedDuration,
          playerName: data.playerName,
          playerEmail: data.playerEmail,
          playerPhone: data.playerPhone,
          playerCount: data.playerCount,
        }),
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 409 || errorData.code === 'SLOT_UNAVAILABLE') {
          throw new Error('slot_unavailable');
        } else if (response.status === 422) {
          throw new Error('validation_error');
        }
        
        throw new Error(errorData.error || 'Booking failed');
      }

      const result = await response.json();
      setCurrentStep('success');
      metrics.trackStepChange('success');
      metrics.trackCompletion();
      
      // Success haptic feedback
      haptic.notification('success');
      
      onSuccess?.(result.reservation);
      
      // Auto-close after 3 seconds on success
      setTimeout(() => {
        onCancel?.();
      }, 3000);

    } catch (error: any) {
            metrics.trackError('details', error.message || 'Booking submission failed');
      
      let errorMessage = 'Error al crear la reserva';
      let actionLabel = 'Reintentar';
      let shouldRetry = true;
      
      if (error.name === 'AbortError') {
        errorMessage = 'La reserva está tardando más de lo esperado';
      } else if (error.message === 'offline') {
        errorMessage = 'Sin conexión a internet';
      } else if (error.message === 'slot_unavailable') {
        errorMessage = 'Este horario ya no está disponible';
        actionLabel = 'Elegir otro';
        shouldRetry = false;
      } else if (error.message === 'validation_error') {
        errorMessage = 'Por favor verifica los datos ingresados';
        shouldRetry = false;
      }
      
      haptic.notification('error');
      toast.error(errorMessage, {
        action: shouldRetry ? {
          label: actionLabel,
          onClick: () => {
            if (error.message === 'slot_unavailable') {
              setCurrentStep('quick-select');
              loadBookingData(data.date);
            } else {
              handleSubmit(data);
            }
          }
        } : undefined
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    enter: { x: 300, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium">
          Sin conexión - Algunas funciones no están disponibles
        </div>
      )}
      
      {/* Mobile Header with Progress */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold">Nueva Reserva</h1>
          {onCancel && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                metrics.trackAbandonment(currentStep);
                haptic.impact('light');
                onCancel?.();
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
        
        {/* Mobile Progress Bar */}
        <div className="flex items-center space-x-2">
          {MOBILE_STEPS.map((step, index) => {
            const isActive = step.id === currentStep;
            const isCompleted = MOBILE_STEPS.findIndex(s => s.id === currentStep) > index;
            const Icon = step.icon;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold transition-all',
                  isActive && 'bg-primary-500 text-white',
                  isCompleted && 'bg-green-500 text-white',
                  !isActive && !isCompleted && 'bg-gray-200 text-gray-500 dark:bg-gray-700'
                )}>
                  {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                {index < MOBILE_STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-1 mx-2 rounded transition-colors',
                    (isCompleted || (isActive && index < MOBILE_STEPS.findIndex(s => s.id === currentStep))) 
                      ? 'bg-primary-500' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1: Quick Select */}
          {currentStep === 'quick-select' && (
            <motion.div
              key="quick-select"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <SwipeToRefresh 
                onRefresh={() => loadBookingData(form.watch('date'))}
                className="h-full"
              >
                <div className="p-4 space-y-4">
                  {/* Date Selector - Mobile Optimized */}
                  <Card className="p-4">
                    <Label className="text-sm font-medium mb-2 block">Fecha</Label>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...form.register('date')}
                      className="text-base h-14 px-4" // 56px height for better touch
                      onChange={(e) => {
                        form.setValue('date', e.target.value);
                        if (!isOffline) {
                          loadBookingData(e.target.value);
                        }
                      }}
                      disabled={isOffline}
                    />
                  </Card>

                  {/* Duration Selector - Touch Optimized */}
                  <Card className="p-4">
                    <Label className="text-sm font-medium mb-3 block">Duración</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {bookingData?.pricing.durations.map((duration: any) => (
                        <Button
                          key={duration.minutes}
                          type="button"
                          variant={selectedDuration === duration.minutes ? 'default' : 'outline'}
                          className="h-14 text-base font-medium" // 56px for better touch (exceeds 44px minimum)
                          onClick={(e) => {
                            metrics.trackTouchInteraction('duration-selector', e.target);
                            setSelectedDuration(duration.minutes);
                            form.setValue('duration', duration.minutes);
                            haptic.selectionChanged();
                          }}
                        >
                          {duration.label}
                        </Button>
                      ))}
                    </div>
                  </Card>

                  {/* Quick Slots - Mobile First */}
                  {loadError ? (
                    <Card className="p-8 text-center">
                      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">
                        {loadError}
                      </p>
                      <Button
                        onClick={() => loadBookingData(form.watch('date'))}
                        variant="outline"
                        className="mt-4"
                      >
                        <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                        Reintentar
                      </Button>
                    </Card>
                  ) : isLoading ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Skeleton className="w-4 h-4" />
                        <Skeleton className="w-32 h-5" />
                      </div>
                      {/* Loading Skeleton for 3 slots */}
                      {[1, 2, 3].map((i) => (
                        <Card key={i} className="p-4 animate-pulse">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Skeleton className="w-16 h-8" />
                              <div>
                                <Skeleton className="w-24 h-5 mb-2" />
                                <Skeleton className="w-32 h-4" />
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Skeleton className="w-12 h-4" />
                              <Skeleton className="w-6 h-6 rounded-full" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : bookingData?.availability.quickSlots.length ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500" />
                        <Label className="text-sm font-medium">Horarios Populares</Label>
                      </div>
                      
                      {bookingData.availability.quickSlots.map((slot: any, index: any) => (
                        <SwipeableCard
                          key={`${slot.courtId}-${slot.startTime}`}
                          className="mb-2"
                          rightAction={{
                            icon: <Check className="w-5 h-5" />,
                            label: 'Seleccionar',
                            color: 'bg-green-500'
                          }}
                          onSwipeRight={() => {
                            handleSlotSelect(slot);
                            haptic.impact('medium');
                          }}
                        >
                          <Card 
                            className={cn(
                              'p-4 cursor-pointer transition-all border-2 active:scale-[0.98]',
                              selectedSlot?.courtId === slot.courtId && selectedSlot?.startTime === slot.startTime
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                              // Ensure minimum touch target (Apple HIG: 44x44px minimum)
                              'min-h-[72px]'
                            )}
                            onClick={(e) => {
                              metrics.trackTouchInteraction('slot-selector', e.target);
                              handleSlotSelect(slot);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl font-bold text-primary-600">
                                  {slot.startTime}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100">
                                    {slot.courtName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {selectedDuration} min • ${((selectedDuration / 60) * slot.price).toFixed(0)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {/* Popularity indicator */}
                                <div className="flex items-center gap-1">
                                  {[...Array(Math.ceil(slot.popularity / 25))].map((_, i) => (
                                    <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  ))}
                                </div>
                                
                                {selectedSlot?.courtId === slot.courtId && selectedSlot?.startTime === slot.startTime && (
                                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        </SwipeableCard>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">Sin horarios disponibles</p>
                      <p className="text-sm text-gray-400 mt-1">Intenta otra fecha</p>
                    </Card>
                  )}
                </div>
              </SwipeToRefresh>
            </motion.div>
          )}

          {/* Step 2: Details */}
          {currentStep === 'details' && (
            <motion.div
              key="details"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
              <form onSubmit={form.handleSubmit(handleSubmit)} className="h-full flex flex-col">
                <div className="flex-1 p-4 space-y-4">
                  {/* Booking Summary */}
                  <Card className="p-4 bg-primary-50 dark:bg-primary-900/10">
                    <div className="flex items-center gap-3 mb-3">
                      <MapPin className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                        Resumen
                      </h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Pista:</span>
                        <span className="font-medium">{selectedSlot?.courtName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Horario:</span>
                        <span className="font-medium">{selectedSlot?.startTime} ({selectedDuration}min)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Precio:</span>
                        <span className="font-semibold text-primary-600">
                          ${selectedSlot ? ((selectedDuration / 60) * selectedSlot.price).toFixed(0) : '0'}
                        </span>
                      </div>
                    </div>
                  </Card>

                  {/* Player Details - Mobile Optimized */}
                  <Card className="p-4 space-y-4">
                    <h3 className="font-semibold mb-3">Datos de contacto</h3>
                    
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Nombre completo *</Label>
                      <Input
                        {...form.register('playerName')}
                        className="text-base h-14 px-4" // 56px height for better touch
                        placeholder="Tu nombre"
                        autoComplete="name"
                      />
                      {form.formState.errors.playerName && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.playerName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Email *</Label>
                      <Input
                        type="email"
                        {...form.register('playerEmail')}
                        className="text-base h-14 px-4"
                        placeholder="tu@email.com"
                        autoComplete="email"
                      />
                      {form.formState.errors.playerEmail && (
                        <p className="text-sm text-red-500 mt-1">
                          {form.formState.errors.playerEmail.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Teléfono</Label>
                      <Input
                        type="tel"
                        {...form.register('playerPhone')}
                        className="text-base h-14 px-4"
                        placeholder="+56 9 1234 5678"
                        autoComplete="tel"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Número de jugadores</Label>
                      <div className="grid grid-cols-4 gap-3">
                        {[2, 3, 4, 6].map(count => (
                          <Button
                            key={count}
                            type="button"
                            variant={form.watch('playerCount') === count ? 'default' : 'outline'}
                            className="h-14 text-lg font-medium"
                            onClick={() => {
                              form.setValue('playerCount', count);
                              haptic.selectionChanged();
                            }}
                          >
                            {count}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Mobile Action Buttons */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 flex-1 text-base font-medium"
                      onClick={handleBack}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Atrás
                    </Button>
                    <Button
                      type="submit"
                      className="h-14 flex-2 text-base font-medium"
                      disabled={isSubmitting || !form.formState.isValid}
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Confirmando...
                        </div>
                      ) : (
                        <>
                          Confirmar Reserva
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {currentStep === 'success' && (
            <motion.div
              key="success"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2 }}
              className="h-full flex items-center justify-center p-4"
            >
              <Card className="p-8 text-center max-w-sm w-full">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="w-8 h-8 text-white" />
                </motion.div>
                
                <h2 className="text-xl font-bold text-green-600 mb-2">
                  ¡Reserva Confirmada!
                </h2>
                
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Tu reserva ha sido creada exitosamente
                </p>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>{selectedSlot?.courtName}</p>
                  <p>{selectedSlot?.startTime} - {selectedDuration} minutos</p>
                  <p>{form.watch('date')}</p>
                </div>

                <Button
                  className="w-full mt-6 h-14 text-base font-medium"
                  onClick={onCancel}
                >
                  Cerrar
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Action Button for Step 1 */}
      {currentStep === 'quick-select' && selectedSlot && (
        <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <Button
            className="w-full h-14 text-base font-semibold"
            onClick={handleNext}
          >
            Continuar con {selectedSlot.courtName}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};