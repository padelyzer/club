'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar,
  Clock,
  MapPin,
  User,
  CreditCard,
  Check,
  ArrowLeft,
  ArrowRight,
  Users,
  Star,
  Wifi,
  Lightbulb,
  ShieldCheck,
  ChevronDown,
  Plus,
  Search,
  Phone,
  Mail,
  Share2,
  Copy,
  MessageCircle,
  Sparkles
} from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, isSameDay, isToday, parse, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { Court } from '@/types/court';
import { Client } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { useAvailability } from '@/hooks/useAvailability';
import { useClients } from '@/lib/api/hooks/useClients';
import { useCourts } from '@/lib/api/hooks/useCourts';
import { useCreateReservation } from '@/lib/api/hooks/useReservations';
import { toast } from '@/lib/toast';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';
import { 
  isIOSSafari, 
  IOSDateInput, 
  IOSTouchButton, 
  IOSTimeSlotGrid,
  useIOSViewportFix 
} from './ios-safari-fixes';

// Types
interface BookingStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
  price?: number;
}

interface BookingData {
  date: Date | null;
  duration: number;
  startTime: string;
  court: Court | null;
  clientType: 'registered' | 'visitor';
  client: Client | null;
  visitorData: {
    name: string;
    email: string;
    phone: string;
  };
  playerCount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  notes: string;
}

interface AppleBookingFlowProps {
  clubId?: string; // Optional, will use active club if not provided
  onSuccess: (reservation: any) => void;
  onCancel: () => void;
  initialDate?: Date;
  initialCourt?: string;
};

const steps: BookingStep[] = [
  { id: 'datetime', title: 'Fecha y Hora', icon: <Calendar className="w-4 h-4" />, completed: false },
  { id: 'court', title: 'Cancha', icon: <MapPin className="w-4 h-4" />, completed: false },
  { id: 'client', title: 'Cliente', icon: <User className="w-4 h-4" />, completed: false },
  { id: 'payment', title: 'Pago', icon: <CreditCard className="w-4 h-4" />, completed: false },
  { id: 'confirm', title: 'Confirmar', icon: <Check className="w-4 h-4" />, completed: false }
];

const durationOptions = [
  { value: 1, label: '1 hora' },
  { value: 1.5, label: '1.5 horas' },
  { value: 2, label: '2 horas' },
  { value: 2.5, label: '2.5 horas' },
  { value: 3, label: '3 horas' },
];

// Generate time slots from 7:00 to 22:00
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  for (let hour = 7; hour <= 22; hour++) {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    let price = 400; // Default price
    
    // Price tiers based on time
    if (hour >= 9 && hour < 15) price = 500;
    else if (hour >= 15 && hour < 18) price = 600;
    else if (hour >= 18 && hour < 22) price = 700;
    else if (hour === 22) price = 600;
    
    slots.push({ time, available: true, price });
  }
  return slots;
};

// Utility functions for court display
const getSurfaceIcon = (surface: string) => {
  switch (surface) {
    case 'glass': return '🧊';
    case 'wall': return '🧱';
    case 'mesh': return '🕸️';
    case 'mixed': return '🔄';
    default: return '🎾';
  }
};

const getAvailabilityColor = (available: boolean) => {
  return available ? 'text-green-500' : 'text-red-500';
};

// Remove mock data - will use real API data instead

export const AppleBookingFlow: React.FC<AppleBookingFlowProps> = ({
  clubId: propClubId,
  onSuccess,
  onCancel,
  initialDate,
  initialCourt,
}) => {
  // iOS Safari viewport fix
  useIOSViewportFix();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData>({
    date: initialDate || null,
    duration: 1.5,
    startTime: '',
    court: null,
    clientType: 'registered',
    client: null,
    visitorData: { name: '', email: '', phone: '' },
    playerCount: 2,
    paymentMethod: 'cash',
    notes: ''
  });

  // Get active club from store
  const activeClub = useActiveClubStore((state) => state.activeClub);
  const clubId = propClubId || activeClub?.id || '';

  // Don't render if we don't have club context yet
  if (!clubId || !activeClub) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información del club...</p>
        </div>
      </div>
    );
  }

  // API Hooks
  const createReservationMutation = useCreateReservation();

  // Debug useEffect to monitor bookingData changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Development mode
    }
  }, [bookingData]);

  // Calculate progress
  const progress = ((currentStep + 1) / steps.length) * 100;

  // Step validation with useMemo to prevent stale closures
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: // DateTime
        const hasDate = !!bookingData.date;
        const hasStartTime = !!bookingData.startTime && bookingData.startTime.length > 0;
        const hasDuration = !!bookingData.duration && bookingData.duration > 0;
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
          console.log('AppleBookingFlow: Checking canProceed', {
            hasDate,
            hasStartTime,
            hasDuration,
            date: bookingData.date,
            startTime: bookingData.startTime,
            duration: bookingData.duration,
            canProceed: hasDate && hasStartTime && hasDuration,
            timestamp: new Date().toISOString()
          });

        }
        
        return !!(hasDate && hasStartTime && hasDuration);
      case 1: // Court
        return !!bookingData.court;
      case 2: // Client
        return bookingData.clientType === 'visitor'
          ? !!(bookingData.visitorData.name && bookingData.visitorData.email)
          : !!bookingData.client;
      case 3: // Payment
        return !!bookingData.paymentMethod;
      case 4: // Confirm
        return true;
      default: return false;
    }
  }, [currentStep, bookingData]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const endTime = new Date(`2024-01-01 ${bookingData.startTime}`);
      endTime.setMinutes(endTime.getMinutes() + bookingData.duration * 60);
      
      const reservationData = {
        club: clubId,
        court: bookingData.court!.id,
        date: format(bookingData.date!, 'yyyy-MM-dd'),
        start_time: bookingData.startTime,
        end_time: format(endTime, 'HH:mm'),
        client: bookingData.clientType === 'registered' ? bookingData.client?.id : undefined,
        visitor_name: bookingData.clientType === 'visitor' ? bookingData.visitorData.name : undefined,
        visitor_email: bookingData.clientType === 'visitor' ? bookingData.visitorData.email : undefined,
        visitor_phone: bookingData.clientType === 'visitor' ? bookingData.visitorData.phone : undefined,
        players_count: bookingData.playerCount,
        notes: bookingData.notes,
        status: 'confirmed'
      };

      const reservation = await createReservationMutation.mutateAsync(reservationData);
      setShowSuccess(true);
      
      setTimeout(() => {
        onSuccess(reservation);
      }, 2000);
    } catch (error) {
      toast.error('Error al crear la reserva. Por favor intente nuevamente.');
          }
  };


  // Success Animation Component
  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 px-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          >
            <Sparkles className="w-10 h-10 text-green-600" />
          </motion.div>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-semibold text-gray-900 mb-2"
        >
          ¡Reserva Confirmada!
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-gray-600 mb-8 max-w-sm"
        >
          Tu cancha está reservada para el {bookingData.date && format(bookingData.date, 'dd/MM/yyyy', { locale: es })} a las {bookingData.startTime}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex gap-3"
        >
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors">
            <Share2 className="w-4 h-4" />
            Compartir
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors">
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Progress Bar */}
      <div className="px-6 pt-6 pb-4">
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
          <motion.div
            className="bg-blue-600 h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <h2 className="font-semibold text-gray-900">
            {steps[currentStep].title}
          </h2>
          <span className="text-gray-500">
            {currentStep + 1} de {steps.length}
          </span>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {currentStep === 0 && <DateTimeStep bookingData={bookingData} setBookingData={setBookingData} clubId={clubId} />}
            {currentStep === 1 && <CourtStep bookingData={bookingData} setBookingData={setBookingData} />}
            {currentStep === 2 && <ClientStep bookingData={bookingData} setBookingData={setBookingData} />}
            {currentStep === 3 && <PaymentStep bookingData={bookingData} setBookingData={setBookingData} />}
            {currentStep === 4 && <ConfirmStep bookingData={bookingData} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        {isIOSSafari() ? (
          <>
            <IOSTouchButton
              onClick={handlePrevious}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 0 ? 'Cancelar' : 'Anterior'}
            </IOSTouchButton>

            <IOSTouchButton
              onClick={handleNext}
              disabled={!canProceed}
              variant="primary"
              className={cn(
                'flex items-center gap-2',
                !canProceed && 'opacity-50 cursor-not-allowed'
              )}
            >
              {currentStep === steps.length - 1 ? 'Confirmar' : 'Siguiente'}
              {canProceed && currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
            </IOSTouchButton>
          </>
        ) : (
          <>
            <button
              onClick={handlePrevious}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {currentStep === 0 ? 'Cancelar' : 'Anterior'}
            </button>

            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={cn(
                'flex items-center gap-2 px-6 py-2 rounded-xl font-medium transition-all',
                canProceed
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              {currentStep === steps.length - 1 ? 'Confirmar' : 'Siguiente'}
              {canProceed && currentStep < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Step Components
const DateTimeStep: React.FC<{
bookingData: BookingData;
  setBookingData: React.Dispatch<React.SetStateAction<BookingData>>;
  clubId: string;
}> = ({ bookingData, setBookingData, clubId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(bookingData.date || new Date());
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Get availability data from API
  const { data: availabilityData, isLoading: isLoadingAvailability } = useAvailability(
    clubId || '',
    selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '',
    {
      includePricing: true,
      includeConflicts: false
    }
  );
  
  // Debug logging for availability data
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('AppleBookingFlow: Availability data', {
        clubId,
        selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        isLoading: isLoadingAvailability,
        hasData: !!availabilityData,
        courtsCount: availabilityData?.courts?.length || 0,
        availabilityData
      });
    }
  }, [availabilityData, isLoadingAvailability, clubId, selectedDate]);
  
  // Generate time slots with availability
  const timeSlots = React.useMemo(() => {
    const baseSlots = generateTimeSlots();
    
    // If no availability data, return all slots as available for now
    // This prevents blocking the user flow while we debug the API
    if (!availabilityData?.courts || availabilityData.courts.length === 0) {
      if (process.env.NODE_ENV === 'development') {
      // Development mode
    }
      return baseSlots.map(slot => ({ ...slot, available: true }));
    }
    
    // Check availability for each slot using the correct data structure
    return baseSlots.map(slot => {
      const hasAvailableCourt = availabilityData.courts.some(court => {
        if (!court.slots || court.slots.length === 0) return false;
        return court.slots.some(timeSlot => 
          timeSlot.start_time === slot.time && timeSlot.is_available
        );
      });

      return {
        ...slot,
        available: hasAvailableCourt
      };
    });
  }, [availabilityData, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Mini Calendar */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Selecciona la fecha</h3>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            // Check if the day is in the past
            const isPastDay = day < today && !isSameDay(day, today);
            const DayButton = isIOSSafari() ? IOSTouchButton : 'button';
            
            return (
              <DayButton
                key={index}
                onClick={() => {
                  if (!isPastDay) {
                    setSelectedDate(day);
                    // Don't reset startTime - let user keep their time selection
                    // They can change it if needed, but don't force them to
                    setBookingData(prev => ({ ...prev, date: day }));
                  }
                }}
                disabled={isPastDay}
                variant={isSameDay(day, selectedDate) ? 'primary' : 'outline'}
                className={cn(
                  'w-full p-3 rounded-xl text-center transition-all',
                  isPastDay
                    ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                    : isSameDay(day, selectedDate)
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700',
                  // iOS Safari minimum touch target
                  isIOSSafari() && 'min-h-[44px]'
                )}
              >
                <div className={cn(
                  "text-xs mb-1",
                  isPastDay 
                    ? "text-gray-400"
                    : isSameDay(day, selectedDate) 
                    ? "text-blue-100"
                    : "text-gray-500"
                )}>
                  {format(day, 'EEE', { locale: es })}
                </div>
                <div className="font-semibold">
                  {format(day, 'd')}
                </div>
              </DayButton>
            );
          })}
        </div>
      </div>

      {/* Duration Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Duración</h3>
        <div className="flex flex-wrap gap-2">
          {durationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setBookingData(prev => ({ ...prev, duration: option.value }))}
              className={cn(
                'relative px-4 py-2 rounded-xl font-medium transition-all',
                bookingData.duration === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Hora de inicio</h3>
        {isLoadingAvailability ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : isIOSSafari() ? (
          <IOSTimeSlotGrid
            slots={timeSlots
              .filter((slot) => {
                // Filter out past slots for today
                if (isToday(selectedDate)) {
                  const now = new Date();
                  const slotTime = parse(slot.time, 'HH:mm', selectedDate);
                  // Allow booking if the slot end time (slot + duration) is still in the future
                  // Add 30 minutes grace period for late arrivals
                  const slotEndTime = new Date(slotTime.getTime() + (bookingData.duration * 60 - 30) * 60 * 1000);
                  return isAfter(slotEndTime, now);
                }
                return true;
              })}
            selectedTime={bookingData.startTime}
            onSelectTime={(time) => setBookingData(prev => ({ ...prev, startTime: time }))}
          />
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {timeSlots
              .filter((slot) => {
                // Filter out past slots for today
                if (isToday(selectedDate)) {
                  const now = new Date();
                  const slotTime = parse(slot.time, 'HH:mm', selectedDate);
                  // Allow booking if the slot end time (slot + duration) is still in the future
                  // Add 30 minutes grace period for late arrivals
                  const slotEndTime = new Date(slotTime.getTime() + (bookingData.duration * 60 - 30) * 60 * 1000);
                  return isAfter(slotEndTime, now);
                }
                return true;
              })
              .map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => slot.available && setBookingData(prev => ({ ...prev, startTime: slot.time }))}
                  disabled={!slot.available}
                  className={cn(
                    'p-3 rounded-xl text-center transition-all',
                    !slot.available
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                      : bookingData.startTime === slot.time
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  )}
                >
                  <div className="font-medium">{slot.time}</div>
                  {slot.available && slot.price && (
                    <div className={cn(
                      "text-xs mt-1",
                      bookingData.startTime === slot.time ? "text-blue-100" : "text-gray-500"
                    )}>
                      ${slot.price}/h
                    </div>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

const CourtStep: React.FC<{
  bookingData: BookingData;
  setBookingData: React.Dispatch<React.SetStateAction<BookingData>>;
}> = ({ bookingData, setBookingData }) => {
  // Get courts from API
  const { data: courtsResponse, isLoading } = useCourts();
  const courts = courtsResponse?.results || [];
  
  // Filter only active courts
  const activeCourts = courts.filter(court => court.is_active && !court.is_maintenance);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Selecciona la cancha</h3>
      
      {activeCourts.map((court) => (
        <motion.button
          key={court.id}
          onClick={() => setBookingData(prev => ({ ...prev, court }))}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'w-full p-4 rounded-2xl border-2 text-left transition-all',
            bookingData.court?.id === court.id
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{getSurfaceIcon(court.surface_type)}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{court.name}</h4>
                  <p className="text-sm text-gray-500">Cancha #{court.number}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {court.has_lighting && (
                  <span className="flex items-center gap-1">
                    <Lightbulb className="w-4 h-4" />
                    Iluminación
                  </span>
                )}
                {court.has_roof && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Techo
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <div className={cn('w-2 h-2 rounded-full', getAvailabilityColor(true))} />'
                  Disponible
                </span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">
                ${court.price_per_hour}
              </div>
              <div className="text-sm text-gray-500">por hora</div>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

const ClientStep: React.FC<{
bookingData: BookingData;
  setBookingData: React.Dispatch<React.SetStateAction<BookingData>>;
}> = ({ bookingData, setBookingData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Get clients from API
  const { data: allClients = [], isLoading } = useClients();
  
  // Filter clients based on search
  const filteredClients = React.useMemo(() => {
    if (!searchTerm) return allClients;
    
    return allClients.filter(client =>
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allClients, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Client Type Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setBookingData(prev => ({ ...prev, clientType: 'registered' }))}
          className={cn(
            'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
            bookingData.clientType === 'registered'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600'
          )}
        >
          Cliente Registrado
        </button>
        <button
          onClick={() => setBookingData(prev => ({ ...prev, clientType: 'visitor' }))}
          className={cn(
            'flex-1 py-2 px-4 rounded-lg font-medium transition-all',
            bookingData.clientType === 'visitor'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600'
          )}
        >
          Visitante
        </button>
      </div>

      {bookingData.clientType === 'registered' ? (
        <div>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            /* Client List */
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {filteredClients.map((client) => (
              <button
                key={client.id}
                onClick={() => setBookingData(prev => ({ ...prev, client }))}
                className={cn(
                  'w-full p-4 rounded-xl border text-left transition-all',
                  bookingData.client?.id === client.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="font-medium text-blue-600">
                      {client.first_name[0]}{client.last_name[0]}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {client.first_name} {client.last_name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Datos del visitante</h3>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Nombre completo"
              value={bookingData.visitorData.name}
              onChange={(e) => setBookingData(prev => ({
                ...prev,
                visitorData: { ...prev.visitorData, name: e.target.value }
              }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="email"
              placeholder="Correo electrónico"
              value={bookingData.visitorData.email}
              onChange={(e) => setBookingData(prev => ({
                ...prev,
                visitorData: { ...prev.visitorData, email: e.target.value }
              }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <input
              type="tel"
              placeholder="Teléfono"
              value={bookingData.visitorData.phone}
              onChange={(e) => setBookingData(prev => ({
                ...prev,
                visitorData: { ...prev.visitorData, phone: e.target.value }
              }))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentStep: React.FC<{
bookingData: BookingData;
  setBookingData: React.Dispatch<React.SetStateAction<BookingData>>;
}> = ({ bookingData, setBookingData }) => {
  const pricePerHour = parseInt(bookingData.court?.price_per_hour || '500');
  const totalPrice = pricePerHour * bookingData.duration;
  const pricePerPerson = totalPrice / bookingData.playerCount;

  return (
    <div className="space-y-6">
      {/* Player Count */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Número de jugadores</h3>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((count) => (
            <button
              key={count}
              onClick={() => setBookingData(prev => ({ ...prev, playerCount: count }))};
              className={cn(
                'aspect-square rounded-xl font-bold text-lg transition-all',
                bookingData.playerCount === count
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200)}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Price Calculator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 rounded-2xl p-6"
      >
        <h4 className="font-semibold text-gray-900 mb-4">Resumen de precios</h4>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Precio por hora</span>
            <span className="font-medium">${pricePerHour}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Duración</span>
            <span className="font-medium">{bookingData.duration}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Jugadores</span>
            <span className="font-medium">{bookingData.playerCount}</span>
          </div>
          <div className="border-t border-blue-200 pt-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${totalPrice}</span>
            </div>
            <div className="text-sm text-gray-600 text-right">
              ${pricePerPerson.toFixed(0)} por persona
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Method */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Método de pago</h3>
        <div className="space-y-3">
          {[
            { id: 'cash', label: 'Efectivo', icon: '💵' },
            { id: 'card', label: 'Tarjeta', icon: '💳' },
            { id: 'transfer', label: 'Transferencia', icon: '🏦' },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => setBookingData(prev => ({ ...prev, paymentMethod: method.id as any }))};
              className={cn(
                'w-full p-4 rounded-xl border text-left transition-all',
                bookingData.paymentMethod === method.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{method.icon}</span>
                <span className="font-medium text-gray-900">{method.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ConfirmStep: React.FC<{
bookingData: BookingData;
}> = ({ bookingData }) => {
  const pricePerHour = parseInt(bookingData.court?.price_per_hour || '500');
  const totalPrice = pricePerHour * bookingData.duration;

  const clientName = bookingData.clientType === 'visitor'
    ? bookingData.visitorData.name
    : `${bookingData.client?.first_name} ${bookingData.client?.last_name}`;

  const clientContact = bookingData.clientType === 'visitor'
    ? bookingData.visitorData.email
    : bookingData.client?.email;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Confirma tu reserva</h3>
      
      <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">
              {bookingData.date && format(bookingData.date, 'EEEE, dd MMMM yyyy', { locale: es })}'
            </p>
            <p className="text-sm text-gray-600">
              {bookingData.startTime} - {format(
                new Date(`2024-01-01 ${bookingData.startTime}`).getTime() + bookingData.duration * 60 * 60 * 1000,
                'HH:mm)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">{bookingData.court?.name}</p>
            <p className="text-sm text-gray-600">Cancha #{bookingData.court?.number}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <User className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">{clientName}</p>
            <p className="text-sm text-gray-600">{clientContact}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">{bookingData.playerCount} jugadores</p>
            <p className="text-sm text-gray-600">${(totalPrice / bookingData.playerCount).toFixed(0)} por persona</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">Total a pagar</span>
            <span className="text-2xl font-bold text-blue-600">${totalPrice}</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2">Importante</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Llega 10 minutos antes de tu reserva</li>
          <li>• Trae raquetas y pelotas, o réntalas en recepción</li>
          <li>• Las canchas con iluminación tienen costo adicional después de las 18:00</li>
        </ul>
      </div>
    </div>
  );
};