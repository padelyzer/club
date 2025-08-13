import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  CreditCard, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle,
  MapPin,
  DollarSign,
  Search
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TimeSlotPicker } from './time-slot-picker';
import { PartnerSelectionStep } from './partner-selection-step';
import { ClientSearchStep } from './client-search-step';
import { useCreateReservationWithConflictCheck } from '@/lib/api/hooks/useReservations';
import { CreateReservationRequest, CreateReservationPartner } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const bookingSchema = z.object({
  date: z.string().min(1, 'Fecha es requerida'),
  startTime: z.string().min(1, 'Hora de inicio es requerida'),
  endTime: z.string().min(1, 'Hora de término es requerida'),
  court: z.string().min(1, 'Cancha es requerida'),
  playerName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  playerEmail: z.string().email('Email inválido'),
  playerPhone: z.string().optional(),
  playerCount: z.number().min(1).max(8).default(4),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingFlowProps {
  clubId: string;
  courtId?: string;
  onSuccess?: (reservation: any) => void;
  onCancel?: () => void;
  startWithPartnerStep?: boolean;
}

const STEPS = [
  { id: 'datetime', label: 'Fecha y Hora', icon: Calendar },
  { id: 'client', label: 'Cliente', icon: Search },
  { id: 'partners', label: 'Compañeros', icon: User },
  { id: 'confirmation', label: 'Confirmación', icon: Check },
] as const;

type Step = typeof STEPS[number]['id'];

interface Client {
  id: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  phone_number: string;
  rating: number;
  level?: {
    name: string;
  };
}

export const BookingFlow = ({ 
  clubId, 
  courtId, 
  onSuccess, 
  onCancel,
  startWithPartnerStep = false
}: BookingFlowProps) => {
  const [currentStep, setCurrentStep] = useState<Step>(startWithPartnerStep ? 'partners' : 'datetime');
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [selectedCourtId, setSelectedCourtId] = useState<string>(courtId || '');
  const [selectedPartners, setSelectedPartners] = useState<CreateReservationPartner[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [visitorData, setVisitorData] = useState<{ name: string; phone: string; email?: string } | null>(null);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      playerCount: 4,
    },
  });

  const createReservation = useCreateReservationWithConflictCheck();

  const onSubmit = async (data: BookingFormData) => {
    try {
      const reservationData: CreateReservationRequest = {
        club: clubId,
        court: data.court || selectedCourtId,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        player_name: selectedClient ? `${selectedClient.user.first_name} ${selectedClient.user.last_name}` : (visitorData?.name || data.playerName),
        player_email: selectedClient ? selectedClient.user.email : (visitorData?.email || data.playerEmail),
        player_phone: selectedClient ? selectedClient.phone_number : (visitorData?.phone || data.playerPhone),
        player_count: data.playerCount,
        notes: data.notes,
        partners: selectedPartners.length > 0 ? selectedPartners : undefined,
        is_partner_match: selectedPartners.length > 0,
        client: selectedClient?.id || undefined,
      };

      const reservation = await createReservation.mutateAsync(reservationData);
      onSuccess?.(reservation);
    } catch (error: any) {
            // Error handling is done by the mutation
    }
  };

  const handleTimeSelect = (startTime: string, endTime: string, price: number, courtId: string) => {
    form.setValue('startTime', startTime);
    form.setValue('endTime', endTime);
    form.setValue('court', courtId);
    setSelectedPrice(price);
    setSelectedCourtId(courtId);
  };

  const nextStep = () => {
    const currentIndex = STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const prevStep = () => {
    const currentIndex = STEPS.findIndex(step => step.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 'datetime':
        return form.watch('date') && form.watch('startTime') && form.watch('endTime') && form.watch('court');
      case 'client':
        return selectedClient || (visitorData && visitorData.name && visitorData.phone);
      case 'partners':
        return startWithPartnerStep ? selectedPartners.length > 0 : true; // Partners required if starting with partner step
      case 'confirmation':
        return true;
      default:
        return false;
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = STEPS.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                  isActive && 'border-primary-500 bg-primary-500 text-white',
                  isCompleted && 'border-green-500 bg-green-500 text-white',
                  !isActive && !isCompleted && 'border-gray-300 text-gray-500'
                )}>
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <div className="ml-3">
                  <div className={cn(
                    'text-sm font-medium',
                    isActive && 'text-primary-600',
                    isCompleted && 'text-green-600',
                    !isActive && !isCompleted && 'text-gray-500'
                  )}>
                    {step.label}
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-4 bg-gray-300 transition-colors',
                    (isCompleted || (isActive && index < STEPS.findIndex(s => s.id === currentStep))) && 'bg-primary-500'
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {/* Step 1: Date & Time Selection */}
          {currentStep === 'datetime' && (
            <motion.div
              key="datetime"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">🔥 FUNCIONANDO - Selecciona fecha y hora</h2>
                  <p className="text-gray-600">Elige cuándo quieres jugar</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      id="date"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...form.register('date')}
                      className="mt-1"
                    />
                    {form.formState.errors.date && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.date.message}
                      </p>
                    )}
                  </div>

                  {form.watch('date') && (
                    <TimeSlotPicker
                      control={form.control}
                      date={form.watch('date')}
                      clubId={clubId}
                      courtId={courtId}
                      onTimeSelect={handleTimeSelect}
                      error={form.formState.errors.startTime?.message}
                    />
                  )}
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Client Selection */}
          {currentStep === 'client' && (
            <motion.div
              key="client"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Selecciona cliente</h2>
                  <p className="text-gray-600">Busca un cliente existente o ingresa datos de visitante</p>
                </div>

                <ClientSearchStep
                  onClientSelect={setSelectedClient}
                  onVisitorInfo={setVisitorData}
                  selectedClient={selectedClient}
                  visitorData={visitorData}
                />
              </Card>
            </motion.div>
          )}

          {/* Step 3: Partner Selection */}
          {currentStep === 'partners' && (
            <motion.div
              key="partners"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Selecciona compañeros</h2>
                  <p className="text-gray-600">Invita a otros jugadores a tu reserva (opcional)</p>
                </div>

                <PartnerSelectionStep
                  date={form.watch('date')}
                  startTime={form.watch('startTime')}
                  endTime={form.watch('endTime')}
                  selectedPartners={selectedPartners}
                  onPartnersChange={setSelectedPartners}
                  maxPartners={3}
                />

                {/* Player count and notes form */}
                <div className="mt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="playerCount">Número de jugadores</Label>
                      <Input
                        id="playerCount"
                        type="number"
                        min="1"
                        max="8"
                        {...form.register('playerCount', { valueAsNumber: true })}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notas adicionales</Label>
                    <Textarea
                      id="notes"
                      {...form.register('notes')}
                      className="mt-1"
                      placeholder="Comentarios especiales, equipamiento, etc."
                      rows={3}
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 'confirmation' && (
            <motion.div
              key="confirmation"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2">Confirmar reserva</h2>
                  <p className="text-gray-600">Revisa los detalles antes de confirmar</p>
                </div>

                <div className="space-y-6">
                  {/* Reservation Summary */}
                  <div className="bg-primary-50 dark:bg-primary-900/10 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <MapPin className="w-5 h-5 text-primary-600" />
                      <h3 className="font-semibold text-primary-900 dark:text-primary-100">
                        Resumen de la reserva
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary-600" />
                        <span className="text-sm">
                          {new Date(form.watch('date')).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary-600" />
                        <span className="text-sm">
                          {form.watch('startTime')} - {form.watch('endTime')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary-600" />
                        <span className="text-sm">
                          {form.watch('playerCount')} jugadores
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary-600" />
                        <span className="text-sm font-semibold">
                          ${selectedPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Partner Information */}
                  {selectedPartners.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Compañeros invitados</h4>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="space-y-3">
                          {selectedPartners.map((partner, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 text-sm font-medium">
                                  {partner.full_name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{partner.full_name}</p>
                                  <p className="text-xs text-gray-500">{partner.email}</p>
                                </div>
                              </div>
                              {partner.is_primary && (
                                <Badge variant="secondary" className="text-xs">
                                  Jugador principal
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Client/Visitor Information */}
                  <div>
                    <h4 className="font-medium mb-3">Información de contacto</h4>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Tipo:</span>
                          <span className="ml-2 font-medium">
                            {selectedClient ? 'Cliente registrado' : 'Visitante'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Nombre:</span>
                          <span className="ml-2 font-medium">
                            {selectedClient 
                              ? `${selectedClient.user.first_name} ${selectedClient.user.last_name}`
                              : visitorData?.name
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2">
                            {selectedClient ? selectedClient.user.email : visitorData?.email || 'No proporcionado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Teléfono:</span>
                          <span className="ml-2">
                            {selectedClient ? selectedClient.phone_number : visitorData?.phone}
                          </span>
                        </div>
                        {form.watch('notes') && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">Notas:</span>
                            <span className="ml-2">{form.watch('notes')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  {createReservation.error && (
                    <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {createReservation.error instanceof Error 
                          ? createReservation.error.message 
                          : 'Error al crear la reserva'
                        }
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <div>
            {currentStep !== 'datetime' && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={createReservation.isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={createReservation.isPending}
                className="ml-2"
              >
                Cancelar
              </Button>
            )}
          </div>

          <div>
            {currentStep !== 'confirmation' ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!canProceedToNextStep() || createReservation.isPending}
              >
                Siguiente
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createReservation.isPending}
                className="min-w-[120px]"
              >
                {createReservation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Confirmando...
                  </div>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Reserva
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};