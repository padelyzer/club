'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  X,
  Send,
  Calendar,
  Clock,
  MapPin,
  User,
  MessageCircle,
  AlertCircle,
  Check,
  Target,
  Users,
  Heart,
  Trophy,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,  
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format, addDays, isAfter, isSameDay } from 'date-fns';
import { PartnerMatch } from '@/types/client';

interface PartnerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (request: PartnerRequestData) => Promise<void>;
  player: PartnerMatch;
  currentUser?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    level_name?: string;
    rating: number;
  };
}

export interface PartnerRequestData {
  message: string;
  proposed_date?: string;
  proposed_time?: string;
  match_type: 'casual' | 'tournament' | 'league';
  court_preference?: string;
  duration_preference?: number;
}

const requestSchema = z.object({
  message: z.string().min(10, 'Message must be at least 10 characters').max(500, 'Message too long'),
  proposed_date: z.string().optional(),
  proposed_time: z.string().optional(),
  match_type: z.enum(['casual', 'tournament', 'league']),
  court_preference: z.string().optional(),
  duration_preference: z.number().optional(),
});

const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

const MATCH_TYPES = [
  { 
    value: 'casual', 
    label: 'Casual Match', 
    description: 'Friendly game for fun and practice',
    icon: Users 
  },
  { 
    value: 'tournament', 
    label: 'Tournament Prep', 
    description: 'Competitive practice for tournaments',
    icon: Target 
  },
  { 
    value: 'league', 
    label: 'League Match', 
    description: 'Official league or ranking match',
    icon: Trophy 
  },
] as const;

const DURATION_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' },
];

const MESSAGE_TEMPLATES = [
  {
    key: 'friendly',
    label: 'Friendly Match',
    template: "Hi {name}! I'd love to play a friendly match with you. Your playing style looks like a great match for mine. Let me know if you're interested!"
  },
  {
    key: 'competitive',
    label: 'Competitive Practice',
    template: "Hello {name}! I'm looking for competitive practice partners and think we'd make a good match. Would you be interested in some challenging games?"
  },
  {
    key: 'tournament',
    label: 'Tournament Partner',
    template: "Hi {name}! I'm preparing for upcoming tournaments and would love to practice with someone at your level. Are you interested in some tournament prep sessions?"
  },
  {
    key: 'regular',
    label: 'Regular Partner',
    template: "Hello {name}! I'm looking for a regular playing partner and think we'd be compatible. Would you be interested in playing regularly?"
  },
];

export function PartnerRequestModal({
  isOpen,
  onClose,
  onSend,
  player,
  currentUser,
}: PartnerRequestModalProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<PartnerRequestData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      message: '',
      match_type: 'casual',
      duration_preference: 90,
    },
  });

  const watchMessage = watch('message');
  const watchMatchType = watch('match_type');

  const handleTemplateSelect = (templateKey: string) => {
    const template = MESSAGE_TEMPLATES.find(t => t.key === templateKey);
    if (template) {
      const message = template.template.replace('{name}', player.user.full_name);
      setValue('message', message);
      setSelectedTemplate(templateKey);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setValue('proposed_date', format(date, 'yyyy-MM-dd'));
      setShowCalendar(false);
    }
  };

  const onSubmit = async (data: PartnerRequestData) => {
    setIsSubmitting(true);
    try {
      await onSend(data);
      reset();
      setSelectedDate(undefined);
      setSelectedTemplate('');
      onClose();
    } catch (error) {
          } finally {
      setIsSubmitting(false);
    }
  };

  const isDateAvailable = (date: Date) => {
    // Check if date is in player's available times
    const dayName = format(date, 'EEEE').toLowerCase();
    return player.availability.next_available.some(slot => 
      slot.toLowerCase().includes(dayName)
    );
  };

  const getAvailableTimesForDate = (date: Date) => {
    if (!date) return [];
    
    const dayName = format(date, 'EEEE').toLowerCase();
    const availableSlots = player.availability.next_available.filter(slot =>
      slot.toLowerCase().includes(dayName)
    );
    
    return availableSlots.length > 0 ? TIME_SLOTS : [];
  };

  const selectedMatchType = MATCH_TYPES.find(type => type.value === watchMatchType);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('clients.sendPartnerRequest')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('clients.invitePlayerToMatch')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Player Info Card */}
            <Card className="p-4 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={player.user.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white font-semibold text-lg">
                    {player.user.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {player.user.full_name}
                    </h3>
                    {player.user.age && (
                      <span className="text-sm text-gray-500">({player.user.age})</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">
                      {player.level.name}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {player.rating} rating
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {player.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{player.location.club_name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{player.stats.matches_played} matches</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>{Math.round(player.stats.win_rate * 100)}% win rate</span>
                    </div>
                  </div>
                </div>

                {player.compatibility_score && (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    {Math.round(player.compatibility_score * 100)}% match
                  </Badge>
                )}
              </div>
            </Card>

            {/* Match Type Selection */}
            <div>
              <Label className="mb-3 block text-sm font-medium">
                {t('clients.matchType')}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {MATCH_TYPES.map((type) => {
                  const Icon = type.icon;
                  const isSelected = watchMatchType === type.value;
                  
                  return (
                    <div
                      key={type.value}
                      className={cn(
                        'cursor-pointer rounded-lg border-2 p-4 text-center transition-all',
                        isSelected
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      )}
                      onClick={() => setValue('match_type', type.value)}
                    >
                      <Icon className="h-6 w-6 mx-auto mb-2" />
                      <h4 className="font-medium mb-1">{type.label}</h4>
                      <p className="text-xs text-gray-500">{type.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Message Templates */}
            <div>
              <Label className="mb-3 block text-sm font-medium">
                {t('clients.messageTemplates')}
              </Label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {MESSAGE_TEMPLATES.map((template) => (
                  <Button
                    key={template.key}
                    type="button"
                    variant={selectedTemplate === template.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTemplateSelect(template.key)}
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Message */}
            <div>
              <Label htmlFor="message" className="mb-2 block">
                {t('clients.personalMessage')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="message"
                {...register('message')}
                placeholder={t('clients.messagePlaceholder')}
                rows={4}
                maxLength={500}
                className={errors.message ? 'border-danger-500' : ''}
              />
              <div className="flex justify-between mt-1">
                {errors.message && (
                  <p className="text-xs text-danger-600">
                    {errors.message.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 ml-auto">
                  {watchMessage?.length || 0}/500
                </p>
              </div>
            </div>

            {/* Date and Time Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  {t('clients.proposedDate')} ({t('common.optional')})
                </Label>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !selectedDate && 'text-muted-foreground'
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : t('clients.selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => 
                        !isAfter(date, new Date()) || !isDateAvailable(date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="mb-2 block text-sm font-medium">
                  {t('clients.proposedTime')} ({t('common.optional')})
                </Label>
                <Select
                  value={watch('proposed_time') || ''}
                  onValueChange={(value) => setValue('proposed_time', value)}
                  disabled={!selectedDate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('clients.selectTime')} />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableTimesForDate(selectedDate!).map((time) => (
                      <SelectItem key={time} value={time || ''}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Additional Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-2 block text-sm font-medium">
                  {t('clients.duration')} ({t('common.optional')})
                </Label>
                <Select
                  value={watch('duration_preference')?.toString() || ''}
                  onValueChange={(value) => setValue('duration_preference', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('clients.selectDuration')} />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString() || ''}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="court_preference" className="mb-2 block text-sm font-medium">
                  {t('clients.courtPreference')} ({t('common.optional')})
                </Label>
                <Input
                  id="court_preference"
                  {...register('court_preference')}
                  placeholder={t('clients.courtPreferencePlaceholder')}
                />
              </div>
            </div>

            {/* Availability Info */}
            {player.availability.next_available.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{player.user.full_name} is typically available:</strong>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {player.availability.next_available.slice(0, 5).map((slot, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {slot}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Compatibility Preview */}
            {currentUser && (
              <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  {t('clients.matchPreview')}
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200">
                      {currentUser.full_name}
                    </div>
                    <div className="text-blue-600 dark:text-blue-300">
                      {currentUser.level_name} • {currentUser.rating} rating
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-blue-800 dark:text-blue-200">
                      {player.user.full_name}
                    </div>
                    <div className="text-blue-600 dark:text-blue-300">
                      {player.level.name} • {player.rating} rating
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-xs text-blue-600 dark:text-blue-300">
                  {Math.abs(currentUser.rating - player.rating) <= 0.5 
                    ? t('clients.perfectSkillMatch')
                    : t('clients.goodSkillMatch')
                  }
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isValid}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('common.sending')}
              </div>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t('clients.sendRequest')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}