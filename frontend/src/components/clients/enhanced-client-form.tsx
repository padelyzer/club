'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard,
  Target,
  MapPin,
  Clock,
  Users,
  Shield,
  Globe,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ApiClient, 
  ClientFormData, 
  PartnerMatchingFormData, 
  PartnerPreferencesFormData,
  AvailabilitySchedule,
  SKILL_LEVELS,
  PLAY_STYLES,
  PLAYING_STRENGTHS
} from '@/types/client';
import { useClientMutations, useCheckEmail } from '@/lib/api/hooks/useClients';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { SkillLevelSelector } from './skill-level-selector';
import { AvailabilityCalendar } from './availability-calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnhancedClientFormProps {
  client?: ApiClient | null;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'basic' | 'partner-matching';
}

// Enhanced schema for partner matching
const enhancedClientSchema = z.object({
  // Basic client info
  first_name: z.string().min(2, 'Name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone must be at least 8 characters'),
  document_type: z.enum(['dni', 'passport', 'other']).optional(),
  document_number: z.string().optional(),
  birth_date: z.string().optional(),
  
  // Partner matching fields
  rating: z.number().min(1.0).max(7.0).optional(),
  dominant_hand: z.enum(['right', 'left', 'ambidextrous']).optional(),
  preferred_position: z.enum(['right', 'left', 'both']).optional(),
  play_style: z.array(z.string()).optional(),
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  city: z.string().optional(),
  bio: z.string().max(500).optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  whatsapp: z.string().optional(),
  is_public: z.boolean().optional(),
  show_in_rankings: z.boolean().optional(),
  allow_partner_requests: z.boolean().optional(),
});

type EnhancedClientFormData = z.infer<typeof enhancedClientSchema>;

const FORM_STEPS = [
  { key: 'basic', label: 'Basic Info', icon: User },
  { key: 'playing', label: 'Playing Profile', icon: Target },
  { key: 'location', label: 'Location & Social', icon: MapPin },
  { key: 'availability', label: 'Availability', icon: Clock },
  { key: 'preferences', label: 'Preferences', icon: Users },
  { key: 'privacy', label: 'Privacy', icon: Shield },
] as const;

export function EnhancedClientForm({ 
  client, 
  onClose, 
  onSuccess, 
  mode = 'partner-matching' 
}: EnhancedClientFormProps) {
  const { t } = useTranslation();
  const { createClient, updateClient } = useClientMutations();
  const { checkEmail } = useCheckEmail();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedPlayStyles, setSelectedPlayStyles] = useState<string[]>([]);
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [selectedWeaknesses, setSelectedWeaknesses] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySchedule>({
    weekdays: {},
    weekends: {}
  });

  const isEditing = !!client;
  const isBasicMode = mode === 'basic';
  const steps = isBasicMode ? FORM_STEPS.slice(0, 1) : FORM_STEPS;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<EnhancedClientFormData>({
    resolver: zodResolver(enhancedClientSchema),
    mode: 'onChange',
    defaultValues: {
      first_name: client?.first_name || '',
      last_name: client?.last_name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      document_type: client?.document_type,
      document_number: client?.document_number || '',
      birth_date: client?.birth_date || '',
      rating: 3.0,
      dominant_hand: 'right',
      preferred_position: 'both',
      play_style: [],
      strengths: [],
      weaknesses: [],
      is_public: true,
      show_in_rankings: true,
      allow_partner_requests: true,
    },
  });

  const watchEmail = watch('email');
  const watchRating = watch('rating');

  // Check email availability
  useEffect(() => {
    if (!isEditing && watchEmail && watchEmail !== client?.email) {
      const checkAvailability = async () => {
        const available = await checkEmail(watchEmail);
        setEmailAvailable(available);
      };
      checkAvailability();
    }
  }, [watchEmail, isEditing, client?.email, checkEmail]);

  const validateCurrentStep = async () => {
    const stepFields = getStepFields(currentStep);
    const isStepValid = await trigger(stepFields);
    
    if (isStepValid && !completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    
    return isStepValid;
  };

  const getStepFields = (step: number): (keyof EnhancedClientFormData)[] => {
    switch (step) {
      case 0: return ['first_name', 'last_name', 'email', 'phone'];
      case 1: return ['rating', 'dominant_hand', 'preferred_position'];
      case 2: return ['city'];
      case 3: return []; // Availability is handled separately
      case 4: return []; // Preferences are handled separately
      case 5: return []; // Privacy settings
      default: return [];
    }
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const toggleArrayValue = (
    array: string[], 
    setArray: (arr: string[]) => void, 
    value: string
  ) => {
    if (array.includes(value)) {
      setArray(array.filter(item => item !== value));
    } else {
      setArray([...array, value]);
    }
  };

  const onSubmit = async (data: EnhancedClientFormData) => {
    if (!emailAvailable && !isEditing) {
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = {
        ...data,
        play_style: selectedPlayStyles,
        strengths: selectedStrengths,
        weaknesses: selectedWeaknesses,
      };

      if (isEditing) {
        await updateClient(client.id, formData);
      } else {
        await createClient(formData);
      }
      onSuccess();
    } catch (error) {
          } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    switch (step.key) {
      case 'basic':
        return (
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="mb-4 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                <User className="mr-2 h-4 w-4" />
                {t('clients.personalInfo')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">{t('clients.firstName')}</Label>
                  <Input
                    id="first_name"
                    {...register('first_name')}
                    placeholder={t('clients.firstNamePlaceholder')}
                    className={errors.first_name ? 'border-danger-500' : ''}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-xs text-danger-600">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="last_name">{t('clients.lastName')}</Label>
                  <Input
                    id="last_name"
                    {...register('last_name')}
                    placeholder={t('clients.lastNamePlaceholder')}
                    className={errors.last_name ? 'border-danger-500' : ''}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-xs text-danger-600">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="mb-4 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                <Mail className="mr-2 h-4 w-4" />
                {t('clients.contactInfo')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">{t('clients.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder={t('clients.emailPlaceholder')}
                    className={
                      errors.email || !emailAvailable ? 'border-danger-500' : ''
                    }
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-danger-600">
                      {errors.email.message}
                    </p>
                  )}
                  {!emailAvailable && !isEditing && (
                    <p className="mt-1 text-xs text-danger-600">
                      {t('clients.emailNotAvailable')}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone">{t('clients.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder={t('clients.phonePlaceholder')}
                    className={errors.phone ? 'border-danger-500' : ''}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-danger-600">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Document Information */}
            <div>
              <h3 className="mb-4 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                <CreditCard className="mr-2 h-4 w-4" />
                {t('clients.documentInfo')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="document_type">
                    {t('clients.documentType')}
                  </Label>
                  <Select
                    value={watch('document_type') || ''}
                    onValueChange={(value) =>
                      setValue('document_type', value as any)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t('clients.selectDocumentType')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dni">{t('clients.dni')}</SelectItem>
                      <SelectItem value="passport">
                        {t('clients.passport')}
                      </SelectItem>
                      <SelectItem value="other">
                        {t('clients.other')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="document_number">
                    {t('clients.documentNumber')}
                  </Label>
                  <Input
                    id="document_number"
                    {...register('document_number')}
                    placeholder={t('clients.documentNumberPlaceholder')}
                  />
                </div>
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <h3 className="mb-4 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                <Calendar className="mr-2 h-4 w-4" />
                {t('clients.additionalInfo')}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="birth_date">{t('clients.birthDate')}</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    {...register('birth_date')}
                    max={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'playing':
        return (
          <div className="space-y-6">
            {/* Skill Level */}
            <div>
              <SkillLevelSelector
                value={watchRating || 3.0}
                onChange={(value) => setValue('rating', value)}
                showDescription
                showRecommendation
              />
            </div>

            {/* Playing Characteristics */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label>{t('clients.dominantHand')}</Label>
                <Select
                  value={watch('dominant_hand') || ''}
                  onValueChange={(value) =>
                    setValue('dominant_hand', value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">{t('clients.rightHanded')}</SelectItem>
                    <SelectItem value="left">{t('clients.leftHanded')}</SelectItem>
                    <SelectItem value="ambidextrous">{t('clients.ambidextrous')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('clients.preferredPosition')}</Label>
                <Select
                  value={watch('preferred_position') || ''}
                  onValueChange={(value) =>
                    setValue('preferred_position', value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">{t('clients.rightSide')}</SelectItem>
                    <SelectItem value="left">{t('clients.leftSide')}</SelectItem>
                    <SelectItem value="both">{t('clients.bothSides')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Physical Stats */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="height">{t('clients.height')} (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  {...register('height', { valueAsNumber: true })}
                  placeholder="175"
                />
              </div>
              <div>
                <Label htmlFor="weight">{t('clients.weight')} (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  {...register('weight', { valueAsNumber: true })}
                  placeholder="70"
                />
              </div>
            </div>

            {/* Play Styles */}
            <div>
              <Label className="mb-3 block">{t('clients.playStyles')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PLAY_STYLES.map((style) => (
                  <div
                    key={style}
                    className={cn(
                      'cursor-pointer rounded-lg border-2 p-3 text-center text-sm transition-all',
                      selectedPlayStyles.includes(style)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    )}
                    onClick={() => toggleArrayValue(selectedPlayStyles, setSelectedPlayStyles, style)}
                  >
                    {t(`clients.playStyle.${style}`)}
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths */}
            <div>
              <Label className="mb-3 block">{t('clients.strengths')}</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PLAYING_STRENGTHS.map((strength) => (
                  <div
                    key={strength}
                    className={cn(
                      'cursor-pointer rounded-lg border-2 p-2 text-center text-xs transition-all',
                      selectedStrengths.includes(strength)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    )}
                    onClick={() => toggleArrayValue(selectedStrengths, setSelectedStrengths, strength)}
                  >
                    {t(`clients.strength.${strength}`)}
                  </div>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">{t('clients.bio')}</Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder={t('clients.bioPlaceholder')}
                rows={3}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-gray-500">
                {watch('bio')?.length || 0}/500
              </p>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            {/* Location */}
            <div>
              <Label htmlFor="city">{t('clients.city')}</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder={t('clients.cityPlaceholder')}
              />
            </div>

            {/* Social Media */}
            <div>
              <h3 className="mb-4 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                <Globe className="mr-2 h-4 w-4" />
                {t('clients.socialMedia')}
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    {...register('instagram')}
                    placeholder="@username"
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    {...register('facebook')}
                    placeholder="facebook.com/username"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    {...register('whatsapp')}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'availability':
        return (
          <div className="space-y-6">
            <AvailabilityCalendar
              value={availability || ''}
              onChange={setAvailability}
              showTimeSlots
            />
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('clients.publicProfile')}</Label>
                  <p className="text-sm text-gray-500">
                    {t('clients.publicProfileDescription')}
                  </p>
                </div>
                <Switch
                  checked={watch('is_public')}
                  onCheckedChange={(checked) => setValue('is_public', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('clients.showInRankings')}</Label>
                  <p className="text-sm text-gray-500">
                    {t('clients.showInRankingsDescription')}
                  </p>
                </div>
                <Switch
                  checked={watch('show_in_rankings')}
                  onCheckedChange={(checked) => setValue('show_in_rankings', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('clients.allowPartnerRequests')}</Label>
                  <p className="text-sm text-gray-500">
                    {t('clients.allowPartnerRequestsDescription')}
                  </p>
                </div>
                <Switch
                  checked={watch('allow_partner_requests')}
                  onCheckedChange={(checked) => setValue('allow_partner_requests', checked)}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="xl" as any>
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? t('clients.editClient') : t('clients.newClient')}
            </h2>
            {!isBasicMode && (
              <p className="text-sm text-gray-500 mt-1">
                {t('clients.step')} {currentStep + 1} {t('common.of')} {steps.length}: {t(`clients.${steps[currentStep].key}Info`)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        {!isBasicMode && (
          <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = completedSteps.includes(index);
                const isCurrent = index === currentStep;
                
                return (
                  <div
                    key={step.key}
                    className={cn(
                      'flex flex-col items-center',
                      isCurrent && 'text-primary-600',
                      isCompleted && 'text-green-600'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full border-2 mb-1',
                        isCurrent && 'border-primary-600 bg-primary-50',
                        isCompleted && 'border-green-600 bg-green-50',
                        !isCurrent && !isCompleted && 'border-gray-300 bg-gray-50'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-xs font-medium">
                      {t(`clients.${step.key}`)}
                    </span>
                  </div>
                );
              })}
            </div>
            <Progress 
              value={((currentStep + 1) / steps.length) * 100 || ''}
              className="h-1"
            />
          </div>
        )}

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex gap-2">
            {!isBasicMode && currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={isSubmitting}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t('common.previous')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            
            {!isBasicMode && currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={isSubmitting}
              >
                {t('common.next')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting || (!emailAvailable && !isEditing)}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('common.saving')}
                  </div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? t('common.update') : t('common.create')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}