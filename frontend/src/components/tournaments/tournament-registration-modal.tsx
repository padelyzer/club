'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CheckCircle,
  CreditCard,
  FileText,
  AlertCircle,
  Clock,
  Trophy,
  Shield,
  Heart,
  DollarSign,
} from 'lucide-react';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/ui';
import { useTournamentStore } from '@/store/tournamentsStore';
import { useAuthStore } from '@/store/auth';
import { useClientsStore } from '@/store/clientsStore';
import {
  Tournament,
  RegistrationFormData,
  RegistrationType,
  RegistrationStep,
  EligibilityCheck,
  TournamentAvailability,
  RegistrationResult,
  PaymentMethod,
} from '@/types/tournament';
import { Player } from '@/types';
import { toast } from '@/lib/toast';

// Validation schema
const registrationSchema = z.object({
  registrationType: z.enum(['individual', 'pair', 'team', 'waitlist']),
  primaryPlayer: z.object({
    id: z.string().min(1, 'Player ID requerido'),
    firstName: z.string().min(1, 'Nombre requerido'),
    lastName: z.string().min(1, 'Apellido requerido'),
    email: z.string().email('Email inválido'),
  }),
  secondaryPlayer: z
    .object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
    })
    .optional(),
  selectedCategory: z.string().optional(),
  paymentMethod: z.enum([
    'credit_card',
    'debit_card',
    'bank_transfer',
    'cash',
    'membership',
    'later',
  ]),
  notes: z.string().optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1, 'Nombre de contacto requerido'),
      phone: z.string().min(1, 'Teléfono requerido'),
      relationship: z.string().min(1, 'Relación requerida'),
    })
    .optional(),
  agreesToTerms: z
    .boolean()
    .refine((val) => val === true, 'Debe aceptar los términos'),
  wantsNotifications: z.boolean(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

interface TournamentRegistrationModalProps {
  tournament?: Tournament;
}

export const TournamentRegistrationModal: React.FC<
  TournamentRegistrationModalProps
> = ({ tournament: propTournament }) => {
  const { activeModal, closeModal } = useUIStore();
  const { selectedTournament } = useTournamentStore();
  const { user } = useAuthStore();
  const { clients } = useClientsStore();

  // Current tournament (from props or store)
  const tournament = propTournament || selectedTournament;

  // Component state
  const [currentStep, setCurrentStep] =
    useState<RegistrationStep>('verification');
  const [eligibilityCheck, setEligibilityCheck] =
    useState<EligibilityCheck | null>(null);
  const [availability, setAvailability] =
    useState<TournamentAvailability | null>(null);
  const [registrationResult, setRegistrationResult] =
    useState<RegistrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState(0);

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      registrationType: 'individual',
      paymentMethod: 'credit_card',
      agreesToTerms: false,
      wantsNotifications: true,
      primaryPlayer: user
        ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
          }
        : undefined,
    },
  });

  // Watched values
  const registrationType = watch('registrationType');
  const primaryPlayer = watch('primaryPlayer');
  const selectedCategory = watch('selectedCategory');
  const paymentMethod = watch('paymentMethod');

  // Steps configuration
  const steps: Array<{
    id: RegistrationStep;
    number: number;
    label: string;
    icon: React.ComponentType<any>;
    description: string;
  }> = [
    {
      id: 'verification',
      number: 1,
      label: 'Verificación',
      icon: Shield,
      description: 'Verificar elegibilidad y disponibilidad',
    },
    {
      id: 'information',
      number: 2,
      label: 'Información',
      icon: Users,
      description: 'Datos del jugador/pareja/equipo',
    },
    {
      id: 'category',
      number: 3,
      label: 'Categoría',
      icon: Trophy,
      description: 'Selección de categoría',
    },
    {
      id: 'payment',
      number: 4,
      label: 'Pago',
      icon: CreditCard,
      description: 'Método de pago e inscripción',
    },
    {
      id: 'confirmation',
      number: 5,
      label: 'Confirmación',
      icon: CheckCircle,
      description: 'Resumen y confirmación final',
    },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);
  const currentStepConfig = steps[currentStepIndex];

  // Effects
  useEffect(() => {
    if (activeModal === 'tournament-registration' && tournament) {
      checkEligibilityAndAvailability();
    }
  }, [activeModal, tournament]);

  useEffect(() => {
    // Calculate estimated fee when registration type or category changes
    if (tournament && registrationType && selectedCategory) {
      calculateEstimatedFee();
    }
  }, [tournament, registrationType, selectedCategory, paymentMethod]);

  // Modal visibility check
  if (activeModal !== 'tournament-registration' || !tournament) {
    return null;
  }

  // Eligibility and availability check
  const checkEligibilityAndAvailability = async () => {
    if (!tournament || !user) return;

    setIsLoading(true);
    try {
      // Simulate API calls for eligibility and availability
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock eligibility check
      const eligibility: EligibilityCheck = {
        status: 'eligible',
        reasons: [],
        suggestedCategory: 'intermediate',
      };

      // Mock availability check
      const avail: TournamentAvailability = {
        isOpen: tournament.status === 'registration_open',
        spotsAvailable:
          tournament.maxParticipants - tournament.currentParticipants,
        totalSpots: tournament.maxParticipants,
        waitlistLength: 0,
        registrationDeadline: tournament.registrationEndDate,
        canJoinWaitlist: true,
      };

      setEligibilityCheck(eligibility);
      setAvailability(avail);

      // Auto-advance if everything looks good
      if (
        eligibility.status === 'eligible' &&
        avail.isOpen &&
        avail.spotsAvailable > 0
      ) {
        setCurrentStep('information');
      }
    } catch (error) {
      toast.error('Error al verificar elegibilidad');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate estimated fee
  const calculateEstimatedFee = () => {
    if (!tournament) return;

    const baseFee = tournament.entryFee;
    let discounts = 0;

    // Apply discounts based on membership, early bird, etc.
    if (paymentMethod === 'membership') {
      discounts += baseFee * 0.2; // 20% membership discount
    }

    const finalFee = Math.max(0, baseFee - discounts);
    setEstimatedFee(finalFee);
  };

  // Navigation handlers
  const handleNext = () => {
    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex < steps.length) {
      setCurrentStep(steps[nextStepIndex].id);
    }
  };

  const handlePrevious = () => {
    const prevStepIndex = currentStepIndex - 1;
    if (prevStepIndex >= 0) {
      setCurrentStep(steps[prevStepIndex].id);
    }
  };

  // Form submission
  const onSubmit = async (data: RegistrationForm & { paymentIntentId?: string }) => {
    if (!tournament || !user) return;

    setIsLoading(true);
    try {
      const { tournamentsService } = await import('@/lib/api/services/tournaments.service');
      
      // Prepare registration data
      const registrationData = {
        playerId: user.id,
        partnerId: data.secondaryPlayer?.id,
        notes: data.notes,
        paymentMethod: data.paymentMethod,
        paymentIntentId: data.paymentIntentId,
        category: data.selectedCategory,
      };

      // Register for tournament via API
      const registration = await tournamentsService.registerForTournament(
        tournament.id,
        registrationData
      );

      const result: RegistrationResult = {
        success: true,
        registrationId: registration.id,
        status: 'confirmed',
        message: 'Registration successful! You have been registered for the tournament.',
        nextSteps: [
          'Check your email for confirmation',
          data.paymentMethod === 'bank_transfer' ? 'Complete bank transfer with reference number' : null,
          data.paymentMethod === 'cash' ? 'Pay at the club within 48 hours' : null,
          data.paymentMethod === 'later' ? 'Complete payment before the deadline' : null,
          'Add tournament to your calendar',
          'Prepare for the event',
        ].filter(Boolean),
        confirmationEmail: true,
      };

      setRegistrationResult(result);
      setCurrentStep('confirmation');
      toast.success('Registration completed successfully!');
    } catch (error) {
            toast.error('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Close modal handler
  const handleClose = () => {
    reset();
    setCurrentStep('verification');
    setEligibilityCheck(null);
    setAvailability(null);
    setRegistrationResult(null);
    setEstimatedFee(0);
    closeModal();
  };

  return (
    <Modal size="xl" as any onClose={handleClose}>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Registro al Torneo
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {tournament.name} - {tournament.club.name}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {new Date(tournament.startDate).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              {tournament.category}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              {tournament.format}
            </span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <motion.div
                animate={{
                  backgroundColor:
                    currentStepIndex >= index ? '#007AFF' : '#F2F2F7',
                  color: currentStepIndex >= index ? '#FFFFFF' : '#666666',
                  scale: currentStepIndex === index ? 1.1 : 1,
                }}
                className="relative w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all"
              >
                <step.icon className="w-5 h-5" />
                {currentStepIndex === index && (
                  <motion.div
                    className="absolute inset-0 bg-blue-500 rounded-full"
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ opacity: 0.3 }}
                  />
                )}
              </motion.div>

              {index < steps.length - 1 && (
                <motion.div
                  animate={{
                    backgroundColor:
                      currentStepIndex > index ? '#007AFF' : '#E5E5E5',
                  }}
                  className="flex-1 h-0.5 mx-2"
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-xs text-gray-500 -mt-2">
          {steps.map((step) => (
            <div key={step.id} className="text-center flex-1">
              <div className="font-medium">{step.label}</div>
              <div className="hidden sm:block">{step.description}</div>
            </div>
          ))}
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Verification */}
            {currentStep === 'verification' && (
              <VerificationStep
                key="verification"
                tournament={tournament}
                eligibilityCheck={eligibilityCheck}
                availability={availability}
                isLoading={isLoading}
                onNext={handleNext}
                onRetry={checkEligibilityAndAvailability}
              />
            )}

            {/* Step 2: Information */}
            {currentStep === 'information' && (
              <InformationStep
                key="information"
                control={control}
                errors={errors}
                registrationType={registrationType}
                setValue={setValue}
                watch={watch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}

            {/* Step 3: Category */}
            {currentStep === 'category' && (
              <CategoryStep
                key="category"
                tournament={tournament}
                control={control}
                errors={errors}
                primaryPlayer={primaryPlayer}
                selectedCategory={selectedCategory}
                setValue={setValue}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}

            {/* Step 4: Payment */}
            {currentStep === 'payment' && (
              <PaymentStep
                key="payment"
                tournament={tournament}
                control={control}
                errors={errors}
                paymentMethod={paymentMethod}
                estimatedFee={estimatedFee}
                setValue={setValue}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSubmit={handleSubmit(onSubmit)}
                isLoading={isLoading}
              />
            )}

            {/* Step 5: Confirmation */}
            {currentStep === 'confirmation' && (
              <ConfirmationStep
                key="confirmation"
                tournament={tournament}
                registrationResult={registrationResult}
                formData={watch()}
                onClose={handleClose}
                onNewRegistration={() => {
                  reset();
                  setCurrentStep('verification');
                  setRegistrationResult(null);
                }}
              />
            )}
          </AnimatePresence>
        </form>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">
                Por favor corrige los siguientes errores:
              </span>
            </div>
            <ul className="mt-2 ml-7 text-sm text-red-700 dark:text-red-300">
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>• {error.message}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>
    </Modal>
  );
};

// Step Components (to be implemented separately)
const VerificationStep = ({
  tournament,
  eligibilityCheck,
  availability,
  isLoading,
  onNext,
  onRetry,
}: any) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    <div className="text-center">
      <h3 className="text-lg font-semibold">Verificando Elegibilidad</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Comprobando si puedes participar en este torneo
      </p>
    </div>

    {isLoading ? (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    ) : (
      <div className="space-y-4">
        {eligibilityCheck && availability && (
          <>
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  ¡Eres elegible para participar!
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="font-medium">Cupos Disponibles</div>
                <div className="text-lg font-bold text-blue-600">
                  {availability.spotsAvailable} / {availability.totalSpots}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="font-medium">Fecha Límite</div>
                <div className="text-lg font-bold">
                  {new Date(
                    availability.registrationDeadline
                  ).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={onNext}>Continuar Registro</Button>
            </div>
          </>
        )}
      </div>
    )}
  </motion.div>
);

// Placeholder components for other steps
const InformationStep = ({ onNext, onPrevious }: any) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    <div className="text-center">
      <h3 className="text-lg font-semibold">Información del Participante</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Completa los datos requeridos para el registro
      </p>
    </div>
    <div className="flex justify-between">
      <Button variant="ghost" onClick={onPrevious}>
        Anterior
      </Button>
      <Button onClick={onNext}>Siguiente</Button>
    </div>
  </motion.div>
);

const CategoryStep = ({ onNext, onPrevious }: any) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6"
  >
    <div className="text-center">
      <h3 className="text-lg font-semibold">Selección de Categoría</h3>
      <p className="text-gray-600 dark:text-gray-400">
        Elige la categoría más apropiada para tu nivel
      </p>
    </div>
    <div className="flex justify-between">
      <Button variant="ghost" onClick={onPrevious}>
        Anterior
      </Button>
      <Button onClick={onNext}>Siguiente</Button>
    </div>
  </motion.div>
);

const PaymentStep = ({ 
  tournament, 
  control, 
  errors, 
  paymentMethod, 
  estimatedFee, 
  setValue, 
  onNext, 
  onPrevious, 
  onSubmit, 
  isLoading 
}: any) => {
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);

  const handlePaymentMethodSelect = (method: string) => {
    setValue('paymentMethod', method);
    if (method === 'credit_card' || method === 'debit_card') {
      setShowStripeForm(true);
    } else {
      setShowStripeForm(false);
    }
  };

  const handleStripeSuccess = (intent: any) => {
    setPaymentIntent(intent);
    // Auto-submit the form with payment confirmation
    onSubmit({ paymentIntentId: intent.id });
  };

  const handleStripeError = (error: any) => {
    toast.error('Payment failed: ' + error.message);
  };

  if (showStripeForm && (paymentMethod === 'credit_card' || paymentMethod === 'debit_card')) {
    const { StripePaymentForm } = require('@/components/payments/stripe-payment-form');
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Complete Payment</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Tournament registration fee: ${estimatedFee.toFixed(2)} {tournament.currency}
          </p>
        </div>
        
        <StripePaymentForm
          amount={estimatedFee}
          currency={tournament.currency}
          description={`Registration for ${tournament.name}`}
          onSuccess={handleStripeSuccess}
          onError={handleStripeError}
          onCancel={() => setShowStripeForm(false)}
        />
        
        <div className="flex justify-between mt-4">
          <Button variant="ghost" onClick={() => setShowStripeForm(false)}>
            Back to Payment Methods
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold">Payment Method</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select how you want to pay the registration fee
        </p>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium mb-2">Payment Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Tournament Entry Fee</span>
            <span className="font-medium">
              ${tournament.entryFee.toFixed(2)} {tournament.currency}
            </span>
          </div>
          {paymentMethod === 'membership' && (
            <div className="flex justify-between text-green-600">
              <span>Member Discount (20%)</span>
              <span>-${(tournament.entryFee * 0.2).toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-medium">
            <span>Total Due</span>
            <span className="text-lg">
              ${estimatedFee.toFixed(2)} {tournament.currency}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Method Options */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Select Payment Method</label>
        <div className="grid grid-cols-1 gap-3">
          {/* Credit Card */}
          <button
            type="button"
            onClick={() => handlePaymentMethodSelect('credit_card')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              paymentMethod === 'credit_card'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5" />
              <div>
                <div className="font-medium">Credit Card</div>
                <div className="text-sm text-gray-500">Pay securely with credit card</div>
              </div>
            </div>
          </button>

          {/* Bank Transfer */}
          <button
            type="button"
            onClick={() => handlePaymentMethodSelect('bank_transfer')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              paymentMethod === 'bank_transfer'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5" />
              <div>
                <div className="font-medium">Bank Transfer</div>
                <div className="text-sm text-gray-500">Pay via bank transfer (24-48h confirmation)</div>
              </div>
            </div>
          </button>

          {/* Cash */}
          <button
            type="button"
            onClick={() => handlePaymentMethodSelect('cash')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              paymentMethod === 'cash'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5" />
              <div>
                <div className="font-medium">Cash at Club</div>
                <div className="text-sm text-gray-500">Pay in person at the club</div>
              </div>
            </div>
          </button>

          {/* Membership */}
          <button
            type="button"
            onClick={() => handlePaymentMethodSelect('membership')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              paymentMethod === 'membership'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <Heart className="w-5 h-5" />
              <div>
                <div className="font-medium">Club Membership</div>
                <div className="text-sm text-gray-500">Use your membership benefits (20% discount)</div>
              </div>
            </div>
          </button>

          {/* Pay Later */}
          <button
            type="button"
            onClick={() => handlePaymentMethodSelect('later')}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              paymentMethod === 'later'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5" />
              <div>
                <div className="font-medium">Pay Later</div>
                <div className="text-sm text-gray-500">Reserve spot and pay before the deadline</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Credit card payments are processed immediately</p>
        <p>• Bank transfers must include reference number in the description</p>
        <p>• Cash payments must be completed 48h before tournament start</p>
        <p>• "Pay Later" reservations expire 7 days before the tournament</p>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onPrevious}>
          Previous
        </Button>
        <Button 
          onClick={onSubmit} 
          disabled={isLoading || !paymentMethod}
        >
          {isLoading ? 'Processing...' : 
           paymentMethod === 'credit_card' || paymentMethod === 'debit_card' ? 
           'Continue to Payment' : 'Complete Registration'}
        </Button>
      </div>
    </motion.div>
  );
};

const ConfirmationStep = ({
  registrationResult,
  onClose,
  onNewRegistration,
}: any) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="space-y-6 text-center"
  >
    <div className="text-green-600 dark:text-green-400">
      <CheckCircle className="w-16 h-16 mx-auto mb-4" />
      <h3 className="text-xl font-bold">¡Registro Completado!</h3>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        {registrationResult?.message}
      </p>
    </div>

    {registrationResult?.nextSteps && (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
        <h4 className="font-medium mb-2">Próximos pasos:</h4>
        <ul className="space-y-1 text-sm">
          {registrationResult.nextSteps.map((step: string, index: number) => (
            <li key={index} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              {step}
            </li>
          ))}
        </ul>
      </div>
    )}

    <div className="flex gap-3 justify-center">
      <Button variant="ghost" onClick={onNewRegistration}>
        Nuevo Registro
      </Button>
      <Button onClick={onClose}>Cerrar</Button>
    </div>
  </motion.div>
);

export default TournamentRegistrationModal;
