import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  Users,
  DollarSign,
  Check, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle,
  MapPin,
  Copy,
  Share2,
  CheckCircle2,
  Sparkles,
  CalendarDays,
  Search,
  UserCheck,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCourtAvailability } from '@/lib/api/hooks/useReservations';
import { useClientSearch } from '@/lib/api/hooks/useClients';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useCreateReservation } from '@/lib/api/hooks/useReservations';

// Types
interface BookingData {
  date: Date;
  duration: number; // in minutes
  startTime: string;
  court: string;
  courtName?: string;
  clientType: 'registered' | 'visitor';
  clientId?: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  splitCount: number; // Number of people splitting the cost
  totalPrice: number;
  pricePerPerson: number;
  pricePerHour?: number;
  playerName?: string;
  playerEmail?: string;
  playerPhone?: string;
}

// Visitor Form Component with local state to prevent parent re-renders
const VisitorForm = memo(({ 
  visitorName, 
  visitorPhone, 
  visitorEmail,
  onNameChange,
  onPhoneChange,
  onEmailChange
}: {
  visitorName: string;
  visitorPhone: string;
  visitorEmail: string;
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onEmailChange: (value: string) => void;
}) => {
  
  // Use local state to prevent parent re-renders
  const [localName, setLocalName] = useState(visitorName);
  const [localPhone, setLocalPhone] = useState(visitorPhone);
  const [localEmail, setLocalEmail] = useState(visitorEmail);

  // Sync local state with props when they change
  useEffect(() => {
    setLocalName(visitorName);
  }, [visitorName]);

  useEffect(() => {
    setLocalPhone(visitorPhone);
  }, [visitorPhone]);

  useEffect(() => {
    setLocalEmail(visitorEmail);
  }, [visitorEmail]);

  // Update parent state on blur
  const handleNameBlur = () => {
    if (localName !== visitorName) {
      onNameChange(localName);
    }
  };

  const handlePhoneBlur = () => {
    if (localPhone !== visitorPhone) {
      onPhoneChange(localPhone);
    }
  };

  const handleEmailBlur = () => {
    if (localEmail !== visitorEmail) {
      onEmailChange(localEmail);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="visitor-name" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del visitante
        </label>
        <input
          id="visitor-name"
          name="visitorName"
          type="text"
          autoComplete="name"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Nombre completo"
        />
      </div>
      <div>
        <label htmlFor="visitor-phone" className="block text-sm font-medium text-gray-700 mb-1">
          Teléfono
        </label>
        <input
          id="visitor-phone"
          name="visitorPhone"
          type="tel"
          autoComplete="tel"
          value={localPhone}
          onChange={(e) => setLocalPhone(e.target.value)}
          onBlur={handlePhoneBlur}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="+34 600 000 000"
        />
      </div>
      <div>
        <label htmlFor="visitor-email" className="block text-sm font-medium text-gray-700 mb-1">
          Correo electrónico
        </label>
        <input
          id="visitor-email"
          name="visitorEmail"
          type="email"
          autoComplete="email"
          value={localEmail}
          onChange={(e) => setLocalEmail(e.target.value)}
          onBlur={handleEmailBlur}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="email@ejemplo.com"
        />
      </div>
    </div>
  );
});

VisitorForm.displayName = 'VisitorForm';

interface OptimizedBookingFlowProps {
  clubId: string;
  onSuccess?: (reservation: any) => void;
  onCancel?: () => void;
}

interface PaymentLink {
  payment_token: string;
  check_in_code: string;
  amount: number;
  payment_link: string;
}

const DURATION_OPTIONS = [
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
  { value: 150, label: '2.5 horas' },
  { value: 180, label: '3 horas' },
  { value: 210, label: '3.5 horas' },
  { value: 240, label: '4 horas' },
];

const SPLIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const STEPS = [
  { id: 'datetime', label: 'Fecha y Duración', icon: Calendar },
  { id: 'court', label: 'Cancha y Hora', icon: MapPin },
  { id: 'client', label: 'Cliente', icon: User },
  { id: 'split', label: 'División de Pago', icon: Users },
  { id: 'confirmation', label: 'Confirmación', icon: Check },
] as const;

type Step = typeof STEPS[number]['id'] | 'payment-success';

export const OptimizedBookingFlow = ({ 
  clubId, 
  onSuccess, 
  onCancel 
}: OptimizedBookingFlowProps) => {
  const [currentStep, setCurrentStep] = useState<Step>('datetime');
  const [bookingData, setBookingData] = useState<Partial<BookingData>>({
    date: new Date(),
    duration: 90, // Default 1.5 hours
    splitCount: 1,
    clientType: 'registered', // Default to registered client
  });
  const [reservationResult, setReservationResult] = useState<any>(null);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const createReservation = useCreateReservation();

  // Client search functionality
  const { results: clientSearchResults, isLoading: isSearching } = useClientSearch(
    clientSearchQuery,
    clientSearchQuery.length >= 2 && bookingData.clientType === 'registered'
  );

  // Get availability for the selected date
  const { data: availability, isLoading, error } = useCourtAvailability(
    clubId,
    bookingData.date ? format(bookingData.date, 'yyyy-MM-dd') : '',
    undefined,
    currentStep === 'court' && !!bookingData.date
  );

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const goToStep = (step: Step) => {
    setCurrentStep(step);
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  };

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  };

  const calculatePricePerPerson = () => {
    if (bookingData.totalPrice && bookingData.splitCount) {
      return bookingData.totalPrice / bookingData.splitCount;
    }
    return 0;
  };

  const handleCreateReservation = async () => {
    if (!bookingData.date || !bookingData.court || !bookingData.startTime || !bookingData.duration) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    const endTime = calculateEndTime(bookingData.startTime, bookingData.duration);
    
    // Determine player data based on client type
    const playerName = bookingData.clientType === 'visitor' 
      ? bookingData.visitorName 
      : bookingData.playerName;
    const playerEmail = bookingData.clientType === 'visitor' 
      ? bookingData.visitorEmail 
      : bookingData.playerEmail;
    const playerPhone = bookingData.clientType === 'visitor' 
      ? bookingData.visitorPhone 
      : bookingData.playerPhone;

    const reservationData: any = {
      club: clubId,
      court: bookingData.court,
      date: format(bookingData.date, 'yyyy-MM-dd'),
      start_time: bookingData.startTime,
      end_time: endTime,
      player_name: playerName || '',
      player_phone: playerPhone || '',
      player_count: 4,
      price_per_hour: bookingData.pricePerHour || 0,
      notes: '',
      is_split_payment: (bookingData.splitCount || 1) > 1,
      split_count: bookingData.splitCount || 1,
    };

    // Only add player_email if it has a value (not empty string)
    if (playerEmail && playerEmail.trim() !== '') {
      reservationData.player_email = playerEmail;
    }

    // Add client field if it&apos;s a registered client
    if (bookingData.clientType === 'registered' && bookingData.clientId) {
      reservationData.client = bookingData.clientId;
    }

    
    try {
      const result = await createReservation.mutateAsync(reservationData);
            setReservationResult(result);
      
      // If split payment, get payment links
      if (result.is_split_payment && result.split_payments) {
        setPaymentLinks(result.split_payments);
        setCurrentStep('payment-success' as Step);
      } else {
        toast.success('Reserva creada exitosamente');
        onSuccess?.(result);
      }
    } catch (error: any) {
                              
      // Handle different error formats
      let errorMessage = 'Error al crear la reserva';
      
      if (error.response?.data) {
        // Check for field-specific errors
        if (typeof error.response.data === 'object' && !error.response.data.detail) {
          // Handle field validation errors
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, errors]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(', ')}`;
              }
              return `${field}: ${errors}`;
            })
            .join('\n');
          errorMessage = fieldErrors || errorMessage;
        } else {
          // Handle general error messages
          errorMessage = error.response.data.detail || 
                        error.response.data.message || 
                        error.response.data.error ||
                        errorMessage;
        }
      }
      
      toast.error(errorMessage);
    }
  };

  const copyPaymentLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast.success('Link copiado al portapapeles');
  };

  const sharePaymentLink = async (link: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Link de pago - Reserva de cancha',
          text: 'Por favor realiza tu pago para confirmar la reserva',
          url: link,
        });
      } catch (error) {
              }
    } else {
      copyPaymentLink(link);
    }
  };

  // Step 1: Date and Duration Selection
  const DateTimeStep = () => (
    <motion.div 
      className="p-4 space-y-4 bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Date Selection */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF] text-white">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1C1C1E]">Selecciona la fecha</h2>
            <p className="text-sm text-gray-500">Elige cuándo quieres jugar</p>
          </div>
        </div>
        
        <div className="relative">
          <Input
            type="date"
            value={bookingData.date ? format(bookingData.date, 'yyyy-MM-dd') : ''}
            onChange={(e) => {
              setBookingData(prev => ({
                ...prev,
                date: new Date(e.target.value)
              }));
            }}
            min={format(new Date(), 'yyyy-MM-dd')}
            className="w-full h-10 px-4 text-sm rounded-lg border-2 border-[#E5E5EA] focus:border-[#007AFF] focus:ring-0 text-[#1C1C1E] bg-white transition-all duration-200"
          />
        </div>
      </div>

      {/* Duration Selection */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF] text-white">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1C1C1E]">Duración de la reserva</h2>
            <p className="text-sm text-gray-500">¿Por cuánto tiempo quieres la cancha?</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-4 gap-2">
          {DURATION_OPTIONS.map((option) => (
            <motion.button
              key={option.value}
              onClick={() => setBookingData(prev => ({ ...prev, duration: option.value }))}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "p-3 rounded-xl border-2 transition-all duration-200 font-medium min-h-[50px] flex items-center justify-center",
                bookingData.duration === option.value
                  ? "border-[#007AFF] bg-[#007AFF] text-white shadow-lg shadow-blue-200"
                  : "border-[#E5E5EA] bg-white text-[#1C1C1E] hover:border-[#007AFF] hover:bg-[#F0F8FF]"
              )}
            >
              <div className="text-sm font-medium">{option.label}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end pt-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={goNext}
            disabled={!bookingData.date || !bookingData.duration}
            className="h-10 px-6 bg-[#007AFF] hover:bg-[#0056CC] text-white font-medium rounded-lg shadow-sm disabled:bg-[#F2F2F7] disabled:text-[#8E8E93] transition-all duration-200"
          >
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  // Step 2: Court and Time Selection
  const CourtTimeStep = () => {
    const calculateEndTime = (startTime: string, durationMinutes: number): string => {
      const [hours, minutes] = startTime.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes + durationMinutes;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    };

    const isTimeSlotAvailable = (court: any, slot: any) => {
      if (!bookingData.duration) return false;
      
      // For now, just check if the initial slot is available
      // The backend should handle the full duration availability check
      return slot.is_available;
    };

    if (isLoading) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          Cargando disponibilidad...
        </div>
      );
    }

    if (error || !availability) {
      return (
        <div className="text-center py-8 text-red-500">
          <AlertCircle className="w-8 h-8 mx-auto mb-4" />
          Error al cargar disponibilidad
        </div>
      );
    }

    return (
      <motion.div 
        className="p-4 space-y-4 bg-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF] text-white">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1C1C1E]">Selecciona cancha y horario</h2>
            <p className="text-sm text-gray-500">
              Duración: {bookingData.duration ? bookingData.duration / 60 : 0} horas
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {availability.availability
            .map((court: any) => ({
              ...court,
              availableSlots: court.slots.filter((slot: any) => isTimeSlotAvailable(court, slot))
            }))
            .filter((court: any) => court.availableSlots.length > 0)
            .map((court: any) => (
              <motion.div
                key={court.court.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-[#E5E5EA] rounded-xl p-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#34C759] text-white">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#1C1C1E]">{court.court.name}</h4>
                      <p className="text-xs text-gray-500">{court.availableSlots.length} horarios disponibles</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2">
                  {court.availableSlots.map((slot: any) => {
                    const endTime = calculateEndTime(slot.start_time, bookingData.duration || 90);
                    const totalPrice = (bookingData.duration || 90) / 60 * slot.price;
                    const isSelected = bookingData.startTime === slot.start_time && bookingData.court === court.court.id;
                    const durationHours = (bookingData.duration || 90) / 60;
                    
                    return (
                      <motion.button
                        key={slot.start_time}
                        onClick={() => {
                          setBookingData(prev => ({
                            ...prev,
                            startTime: slot.start_time,
                            court: court.court.id,
                            courtName: court.court.name,
                            pricePerHour: slot.price,
                            totalPrice: totalPrice
                          }));
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative p-2 rounded-lg border-2 transition-all duration-200 text-center min-h-[55px] flex flex-col justify-center",
                          isSelected
                            ? "border-[#007AFF] bg-[#007AFF] text-white shadow-md"
                            : "border-[#E5E5EA] bg-white text-[#1C1C1E] hover:border-[#007AFF] hover:bg-[#F0F8FF]"
                        )}
                      >
                        {/* Duration indicator */}
                        {durationHours > 1 && (
                          <div className={cn(
                            "absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center",
                            isSelected ? "bg-white text-[#007AFF]" : "bg-[#007AFF] text-white"
                          )}>
                            {durationHours}h
                          </div>
                        )}
                        
                        <div className="text-xs font-semibold">{slot.start_time}</div>
                        <div className={cn(
                          "text-xs opacity-80",
                          isSelected ? "text-blue-100" : "text-gray-500"
                        )}>→ {endTime}</div>
                        <div className={cn(
                          "text-xs font-bold mt-0.5",
                          isSelected ? "text-white" : "text-[#34C759]"
                        )}>${totalPrice}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          
          {availability.availability
            .map((court: any) => ({
              ...court,
              availableSlots: court.slots.filter((slot: any) => isTimeSlotAvailable(court, slot))
            }))
            .filter((court: any) => court.availableSlots.length > 0).length === 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12 bg-[#F2F2F7] rounded-2xl"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#FF3B30] bg-opacity-10 mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-[#FF3B30]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1C1C1E] mb-2">No hay horarios disponibles</h3>
                <p className="text-base text-gray-500">Intenta seleccionar otra fecha o una duración diferente</p>
              </motion.div>
            )}
        </div>

        <div className="flex justify-between pt-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              variant="outline" 
              onClick={goPrev}
              className="h-10 px-4 border-2 border-[#E5E5EA] text-[#1C1C1E] hover:border-[#007AFF] hover:text-[#007AFF] font-medium rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={goNext}
              disabled={!bookingData.startTime || !bookingData.court}
              className="h-10 px-6 bg-[#007AFF] hover:bg-[#0056CC] text-white font-medium rounded-lg shadow-sm disabled:bg-[#F2F2F7] disabled:text-[#8E8E93] transition-all duration-200"
            >
              Siguiente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Memoized handlers for visitor form
  const handleVisitorNameChange = useCallback((value: string) => {
    setBookingData(prev => ({ ...prev, visitorName: value }));
  }, []);

  const handleVisitorPhoneChange = useCallback((value: string) => {
    setBookingData(prev => ({ ...prev, visitorPhone: value }));
  }, []);

  const handleVisitorEmailChange = useCallback((value: string) => {
    setBookingData(prev => ({ ...prev, visitorEmail: value }));
  }, []);

  // Step 3: Client Selection - Memoized to prevent re-renders
  const ClientStep = useCallback(() => (
    <motion.div 
      className="p-4 space-y-4 bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Client Type Selection */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF] text-white">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[#1C1C1E]">Información del cliente</h2>
            <p className="text-sm text-gray-500">¿Quién va a jugar?</p>
          </div>
        </div>
        
        <RadioGroup
          value={bookingData.clientType || 'registered'}
          onValueChange={(value: 'registered' | 'visitor') => {
            setBookingData(prev => ({ 
              ...prev, 
              clientType: value,
              // Clear client data when switching types
              clientId: undefined,
              playerName: undefined,
              playerEmail: undefined,
              playerPhone: undefined,
              visitorName: undefined,
              visitorPhone: undefined,
              visitorEmail: undefined
            }));
            // Clear search query when switching types
            setClientSearchQuery('');
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <motion.label 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200",
                bookingData.clientType === 'registered' || !bookingData.clientType
                  ? "border-[#007AFF] bg-[#F0F8FF]"
                  : "border-[#E5E5EA] bg-white hover:border-[#007AFF] hover:bg-[#F0F8FF]"
              )}
            >
              <RadioGroupItem value="registered" className="text-[#007AFF]" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1C1C1E]">Cliente Registrado</div>
                <div className="text-xs text-gray-500">Buscar cliente existente</div>
              </div>
            </motion.label>
            
            <motion.label 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                "flex items-center space-x-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200",
                bookingData.clientType === 'visitor'
                  ? "border-[#007AFF] bg-[#F0F8FF]"
                  : "border-[#E5E5EA] bg-white hover:border-[#007AFF] hover:bg-[#F0F8FF]"
              )}
            >
              <RadioGroupItem value="visitor" className="text-[#007AFF]" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1C1C1E]">Visitante</div>
                <div className="text-xs text-gray-500">Cliente sin registro previo</div>
              </div>
            </motion.label>
          </div>
        </RadioGroup>
      </div>

      {/* Visitor Form */}
      {bookingData.clientType === 'visitor' && (
        <VisitorForm
          visitorName={bookingData.visitorName || ''}
          visitorPhone={bookingData.visitorPhone || ''}
          visitorEmail={bookingData.visitorEmail || ''}
          onNameChange={handleVisitorNameChange}
          onPhoneChange={handleVisitorPhoneChange}
          onEmailChange={handleVisitorEmailChange}
        />
      )}

      {/* Registered Client Search */}
      {bookingData.clientType === 'registered' && (
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium text-[#1C1C1E] mb-1 block">Buscar cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#007AFF] animate-spin" />
              )}
              <Input
                value={clientSearchQuery}
                placeholder="Buscar por nombre, email o teléfono..."
                className="h-10 pl-10 pr-10 text-sm rounded-lg border-2 border-[#E5E5EA] focus:border-[#007AFF] focus:ring-0 text-[#1C1C1E] bg-white transition-all duration-200"
                onChange={(e) => {
                  setClientSearchQuery(e.target.value);
                }}
              />
            </div>
          </div>
          
          {/* Search Results */}
          {clientSearchQuery.length >= 2 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {clientSearchResults.length > 0 ? (
                clientSearchResults.map((client) => (
                  <motion.button
                    key={client.id}
                    onClick={() => {
                      setBookingData(prev => ({
                        ...prev,
                        clientId: client.id,
                        playerName: `${client.first_name} ${client.last_name}`.trim(),
                        playerEmail: client.email,
                        playerPhone: client.phone
                      }));
                      setClientSearchQuery(`${client.first_name} ${client.last_name}`.trim());
                    }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      bookingData.clientId === client.id
                        ? "border-[#007AFF] bg-[#F0F8FF]"
                        : "border-[#E5E5EA] bg-white hover:border-[#007AFF] hover:bg-[#F0F8FF]"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#007AFF] text-white">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-semibold text-[#1C1C1E]">
                          {client.first_name} {client.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                        {client.phone && (
                          <div className="text-sm text-gray-500">{client.phone}</div>
                        )}
                      </div>
                      {bookingData.clientId === client.id && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#34C759]">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))
              ) : !isSearching ? (
                <div className="bg-[#F2F2F7] rounded-xl p-4 text-center">
                  <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    No se encontraron clientes con "{clientSearchQuery}"
                  </p>
                </div>
              ) : null}
            </div>
          )}
          
          {clientSearchQuery.length > 0 && clientSearchQuery.length < 2 && (
            <div className="bg-[#FFF4E6] rounded-xl p-4 text-center">
              <p className="text-sm text-[#FF9500]">
                Escribe al menos 2 caracteres para buscar
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-2">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            variant="outline" 
            onClick={goPrev}
            className="h-10 px-4 border-2 border-[#E5E5EA] text-[#1C1C1E] hover:border-[#007AFF] hover:text-[#007AFF] font-medium rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={goNext}
            disabled={
              bookingData.clientType === 'visitor' 
                ? !bookingData.visitorName || !bookingData.visitorPhone
                : !bookingData.clientId
            }
            className="h-10 px-6 bg-[#007AFF] hover:bg-[#0056CC] text-white font-medium rounded-lg shadow-sm disabled:bg-[#F2F2F7] disabled:text-[#8E8E93] transition-all duration-200"
          >
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  ), [bookingData, clientSearchQuery, clientSearchResults, isSearching, handleVisitorNameChange, handleVisitorPhoneChange, handleVisitorEmailChange, goPrev, goNext]);

  // Step 4: Payment Split
  const PaymentSplitStep = () => {
    // Calculate price per person directly without useEffect to avoid re-renders
    const pricePerPerson = calculatePricePerPerson();

    return (
      <motion.div 
        className="p-4 space-y-6 bg-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#007AFF] text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[#1C1C1E]">División del pago</h2>
            <p className="text-sm text-gray-500">¿Cuántas personas van a dividir el costo?</p>
          </div>
        </div>

        {/* Total Cost Display */}
        <div className="bg-gradient-to-r from-[#34C759] to-[#30D158] p-6 rounded-2xl text-white text-center">
          <div className="text-sm font-medium mb-1 opacity-90">Costo total de la reserva</div>
          <div className="text-4xl font-bold">${bookingData.totalPrice || 0}</div>
        </div>

        {/* Split Count Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium text-[#1C1C1E] block">Número de personas</Label>
          <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
            {SPLIT_OPTIONS.map((num) => {
              const isSelected = bookingData.splitCount === num;
              return (
                <motion.button
                  key={num}
                  onClick={() => setBookingData(prev => ({ ...prev, splitCount: num }))}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-4 rounded-xl border-2 transition-all duration-200 min-h-[60px] flex items-center justify-center font-semibold text-lg",
                    isSelected
                      ? "border-[#007AFF] bg-[#007AFF] text-white shadow-lg shadow-blue-200"
                      : "border-[#E5E5EA] bg-white text-[#1C1C1E] hover:border-[#007AFF] hover:bg-[#F0F8FF]"
                  )}
                >
                  {num}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Price Per Person Display */}
        <motion.div 
          className="bg-[#F0F8FF] border-2 border-[#007AFF] border-opacity-20 p-6 rounded-2xl text-center"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <DollarSign className="w-5 h-5 text-[#007AFF]" />
            <span className="text-base font-medium text-[#007AFF]">Costo por persona</span>
          </div>
          <div className="text-4xl font-bold text-[#007AFF] mb-2">
            ${pricePerPerson.toFixed(2)}
          </div>
          <div className="text-sm text-[#007AFF] opacity-80">
            Cada persona recibirá un código de check-in individual
          </div>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              variant="outline" 
              onClick={goPrev}
              className="h-12 px-6 border-2 border-[#E5E5EA] text-[#1C1C1E] hover:border-[#007AFF] hover:text-[#007AFF] font-medium rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Anterior
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button 
              onClick={goNext}
              className="h-12 px-8 bg-[#007AFF] hover:bg-[#0056CC] text-white font-medium rounded-lg shadow-sm transition-all duration-200"
            >
              Siguiente
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </motion.div>
        </div>
      </motion.div>
    );
  };

  // Step 5: Confirmation
  const ConfirmationStep = () => (
    <motion.div 
      className="p-6 space-y-8 bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#007AFF] text-white">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-[#1C1C1E]">Resumen de la reserva</h2>
          <p className="text-sm text-gray-500">Revisa los detalles antes de confirmar</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="space-y-4">
        <motion.div 
          className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF] text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-semibold text-[#1C1C1E]">Fecha y hora</h4>
          </div>
          <div className="space-y-2">
            <p className="text-base text-[#1C1C1E] font-medium">
              {bookingData.date && format(bookingData.date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </p>
            <p className="text-sm text-gray-500">
              {bookingData.startTime} - {bookingData.startTime && calculateEndTime(bookingData.startTime, bookingData.duration || 90)} • {(bookingData.duration || 0) / 60} horas
            </p>
          </div>
        </motion.div>

        <motion.div 
          className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#34C759] text-white">
              <MapPin className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-semibold text-[#1C1C1E]">Cancha</h4>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-base text-[#1C1C1E] font-medium">
              {bookingData.courtName || 'Cancha no seleccionada'}
            </p>
            <div className="text-right">
              <p className="text-lg font-bold text-[#34C759]">
                ${bookingData.totalPrice?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-gray-500">Precio total</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#FF9500] text-white">
              <User className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-semibold text-[#1C1C1E]">Cliente</h4>
          </div>
          <p className="text-base text-[#1C1C1E] font-medium">
            {bookingData.clientType === 'visitor' 
              ? bookingData.visitorName 
              : bookingData.playerName || 'Cliente registrado'}
          </p>
          {bookingData.clientType === 'visitor' ? (
            bookingData.visitorPhone && (
              <p className="text-sm text-gray-500 mt-1">{bookingData.visitorPhone}</p>
            )
          ) : (
            bookingData.playerEmail && (
              <p className="text-sm text-gray-500 mt-1">{bookingData.playerEmail}</p>
            )
          )}
        </motion.div>

        <motion.div 
          className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF] text-white">
              <Users className="w-5 h-5" />
            </div>
            <h4 className="text-lg font-semibold text-[#1C1C1E]">División de pago</h4>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-base text-[#1C1C1E] font-medium">
                {bookingData.splitCount} {bookingData.splitCount === 1 ? 'persona' : 'personas'}
              </p>
              <p className="text-sm text-gray-500">Códigos de check-in individuales</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#007AFF]">
                ${calculatePricePerPerson().toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">Por persona</p>
            </div>
          </div>
        </motion.div>

        {/* Warning Notice */}
        <motion.div 
          className="bg-[#FFF4E6] border-2 border-[#FF9500] border-opacity-20 p-4 rounded-2xl"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-[#FF9500]" />
            <p className="text-sm text-[#FF9500] font-medium">
              Se generarán {bookingData.splitCount} códigos de check-in individuales
            </p>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            variant="outline" 
            onClick={goPrev}
            className="h-12 px-6 border-2 border-[#E5E5EA] text-[#1C1C1E] hover:border-[#007AFF] hover:text-[#007AFF] font-medium rounded-lg transition-all duration-200"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Anterior
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={handleCreateReservation}
            disabled={createReservation.isLoading}
            className="h-12 px-8 bg-[#34C759] hover:bg-[#28A745] text-white font-medium rounded-lg shadow-sm disabled:bg-[#F2F2F7] disabled:text-[#8E8E93] transition-all duration-200"
          >
            {createReservation.isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creando...
              </>
            ) : (
              <>
                Confirmar Reserva
                <Sparkles className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Payment Success Step
  const PaymentSuccessStep = () => (
    <motion.div 
      className="p-4 space-y-6 bg-white"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* Success Header */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#34C759] to-[#30D158] mx-auto mb-6 shadow-lg shadow-green-200"
          animate={{ rotate: [0, 360] }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeInOut" }}
        >
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-[#1C1C1E] mb-2">¡Reserva Creada!</h1>
        <p className="text-base text-gray-500 mb-2">
          Tu reserva ha sido procesada exitosamente
        </p>
        <p className="text-sm text-[#34C759] font-medium">
          Se generaron {paymentLinks.length} links de pago individuales
        </p>
      </motion.div>

      {/* Payment Links */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#007AFF] text-white">
            <Share2 className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-semibold text-[#1C1C1E]">Links de pago</h3>
        </div>
        
        {paymentLinks.map((payment, index) => (
          <motion.div
            key={payment.payment_token}
            className="bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#007AFF] text-white text-sm font-semibold">
                  {index + 1}
                </div>
                <span className="text-lg font-semibold text-[#1C1C1E]">Jugador {index + 1}</span>
              </div>
              <div className="px-3 py-1 bg-[#34C759] text-white rounded-full text-sm font-medium">
                ${payment.amount.toFixed(2)}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={payment.payment_link}
                  readOnly
                  className="flex-1 text-xs font-mono bg-[#F2F2F7] border-[#E5E5EA] rounded-lg px-3 py-2"
                />
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    onClick={() => copyPaymentLink(payment.payment_link)}
                    className="h-10 px-3 bg-[#007AFF] hover:bg-[#0056CC] text-white rounded-lg transition-all duration-200"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="sm"
                    onClick={() => sharePaymentLink(payment.payment_link)}
                    className="h-10 px-3 bg-[#34C759] hover:bg-[#28A745] text-white rounded-lg transition-all duration-200"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
              
              <div className="bg-[#F0F8FF] p-3 rounded-xl">
                <p className="text-sm text-[#007AFF] font-medium">
                  Código de check-in: 
                  <span className="font-mono font-bold ml-2 text-[#1C1C1E]">
                    {payment.check_in_code}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Instructions */}
      <motion.div 
        className="bg-[#F0F8FF] border-2 border-[#007AFF] border-opacity-20 p-4 rounded-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-start space-x-3">
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#007AFF] text-white mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#007AFF] mb-1">Instrucciones importantes</h4>
            <p className="text-sm text-[#007AFF]">
              Comparte estos links con cada jugador. Cada persona deberá realizar su pago y 
              recibirá su código de check-in individual para acceder a la cancha.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Final Action */}
      <div className="flex justify-center pt-4">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button 
            onClick={() => onSuccess?.(reservationResult)}
            className="h-12 px-12 bg-gradient-to-r from-[#34C759] to-[#30D158] hover:from-[#28A745] hover:to-[#28A745] text-white font-medium rounded-xl shadow-lg shadow-green-200 transition-all duration-200"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Finalizar
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      {/* Enhanced Progress Indicator */}
      {currentStep !== 'payment-success' && (
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-[#E5E5EA] p-4">
          {/* Progress Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1C1C1E]">
                Paso {currentStepIndex + 1} de {STEPS.length}
              </h3>
              <p className="text-xs text-gray-500">{STEPS[currentStepIndex].label}</p>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-[#007AFF]">
                {Math.round(((currentStepIndex + 1) / STEPS.length) * 100)}%
              </span>
              <p className="text-xs text-gray-500">Completado</p>
            </div>
          </div>
          
          {/* Step Icons with Connectors */}
          <div className="relative flex items-center justify-between">
            {/* Background line container */}
            <div className="absolute left-0 right-0 top-4 flex items-center px-4">
              <div className="flex-1 h-0.5 bg-[#E5E5EA]" />
            </div>
            
            {/* Progress line */}
            <div className="absolute left-0 right-0 top-4 flex items-center px-4">
              <motion.div 
                className="h-0.5 bg-gradient-to-r from-[#34C759] to-[#007AFF]"
                initial={{ width: 0 }}
                animate={{ 
                  width: `${((currentStepIndex) / (STEPS.length - 1)) * 100}%` 
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            
            {STEPS.map((step, index) => {
              const isActive = currentStepIndex >= index;
              const isCurrent = step.id === currentStep;
              const isCompleted = currentStepIndex > index;
              
              return (
                <div key={step.id} className="relative flex flex-col items-center flex-1 group">
                  <motion.button
                    onClick={() => index <= currentStepIndex && goToStep(step.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "relative z-10 flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 mb-1 border-2",
                      isCompleted
                        ? "bg-[#34C759] border-[#34C759] text-white shadow-lg"
                        : isActive 
                        ? "bg-[#007AFF] border-[#007AFF] text-white shadow-lg" 
                        : "bg-white border-[#E5E5EA] text-[#8E8E93]",
                      isCurrent && "ring-4 ring-blue-100"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </motion.button>
                  {/* Always visible labels */}
                  <span className={cn(
                    "text-xs text-center font-medium leading-tight mt-1 transition-colors duration-200",
                    isActive ? "text-[#007AFF]" : "text-[#8E8E93]"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 'datetime' && <DateTimeStep />}
          {currentStep === 'court' && <CourtTimeStep />}
          {currentStep === 'client' && <ClientStep />}
          {currentStep === 'split' && <PaymentSplitStep />}
          {currentStep === 'confirmation' && <ConfirmationStep />}
          {currentStep === 'payment-success' && <PaymentSuccessStep />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};