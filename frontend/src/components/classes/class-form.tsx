'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useClassesStore } from '@/store/classesStore';
import { useActiveClub } from '@/store/clubs';
import { useClasses } from '@/lib/api/hooks/useClasses';
import {
  Class,
  ClassLevel,
  ClassCategory,
  ClassType,
  CreateClassData,
  UpdateClassData,
  Instructor,
  RecurringPattern,
} from '@/types/class';
import {
  Users,
  Calendar,
  Clock,
  DollarSign,
  MapPin,
  User,
  Info,
  RefreshCw,
  Target,
  AlertCircle,
  BookOpen,
  Settings,
} from 'lucide-react';

const classFormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z
    .string()
    .min(10, 'La descripción debe tener al menos 10 caracteres'),
  instructorId: z.string().min(1, 'Debes seleccionar un instructor'),
  clubId: z.string().min(1, 'Debes seleccionar un club'),
  courtId: z.string().optional(),
  level: z.enum([
    'beginner',
    'intermediate',
    'advanced',
    'professional',
    'mixed',
  ]),
  category: z.enum(['group', 'private', 'semi-private', 'intensive', 'clinic']),
  type: z.enum([
    'technique',
    'tactics',
    'physical',
    'match_play',
    'fundamentals',
  ]),
  maxParticipants: z
    .number()
    .min(1, 'Debe haber al menos 1 participante')
    .max(50),
  duration: z.number().min(30, 'La duración mínima es 30 minutos').max(480),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  currency: z.string().default('EUR'),
  date: z.string(),
  startTime: z.string(),
  equipment: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurringPattern: z
    .object({
      frequency: z.enum(['daily', 'weekly', 'monthly']),
      interval: z.number().min(1),
      daysOfWeek: z.array(z.number()).optional(),
      endDate: z.string().optional(),
      occurrences: z.number().optional(),
    })
    .optional(),
  status: z
    .enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'postponed'])
    .optional(),
});

type ClassFormData = z.infer<typeof classFormSchema>;

interface ClassFormProps {
  open: boolean;
  onClose: () => void;
  classData?: Class;
  mode?: 'create' | 'edit';
}

export function ClassForm({
  open,
  onClose,
  classData,
  mode = 'create',
}: ClassFormProps) {
  const { t } = useTranslation();
  const { createClass, updateClass } = useClasses();
  const { instructors, fetchInstructors } = useClassesStore();
  const clubs = useActiveClub(); // This component likely only needs the active club
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchInstructor, setSearchInstructor] = useState('');
  const [showEquipment, setShowEquipment] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [showGoals, setShowGoals] = useState(false);

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: classData?.name || '',
      description: classData?.description || '',
      instructorId: classData?.instructor.id || '',
      clubId: classData?.club.id || '',
      courtId: classData?.court?.id || '',
      level: classData?.level || 'beginner',
      category: classData?.category || 'group',
      type: classData?.type || 'technique',
      maxParticipants: classData?.maxParticipants || 8,
      duration: classData?.duration || 60,
      price: classData?.price || 0,
      currency: classData?.currency || 'EUR',
      date: classData?.date || format(new Date(), 'yyyy-MM-dd'),
      startTime: classData?.startTime || '09:00',
      equipment: classData?.equipment || [],
      requirements: classData?.requirements || [],
      goals: classData?.goals || [],
      notes: classData?.notes || '',
      isRecurring: classData?.isRecurring || false,
      recurringPattern: classData?.recurringPattern,
      status: classData?.status || 'scheduled',
    },
  });

  useEffect(() => {
    if (open && instructors.length === 0) {
      fetchInstructors();
    }
  }, [open, instructors.length, fetchInstructors]);

  const handleSubmit = async (data: ClassFormData) => {
    try {
      setIsSubmitting(true);

      // Calculate end time based on start time and duration
      const [hours, minutes] = data.startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      const endDate = new Date(startDate.getTime() + data.duration * 60000);
      const endTime = format(endDate, 'HH:mm');

      if (mode === 'create') {
        const createData: CreateClassData = {
          ...data,
          endTime,
          equipment: data.equipment?.filter((e) => e.trim() !== ''),
          requirements: data.requirements?.filter((r) => r.trim() !== ''),
          goals: data.goals?.filter((g) => g.trim() !== ''),
        };
        await createClass.mutateAsync(createData);
      } else if (classData) {
        const updateData: UpdateClassData = {
          id: classData.id,
          ...data,
          endTime,
          equipment: data.equipment?.filter((e) => e.trim() !== ''),
          requirements: data.requirements?.filter((r) => r.trim() !== ''),
          goals: data.goals?.filter((g) => g.trim() !== ''),
        };
        await updateClass.mutateAsync(updateData);
      }
      onClose();
      form.reset();
    } catch (error) {
          } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInstructors = instructors.filter((instructor) =>
    `${instructor.firstName} ${instructor.lastName}`
      .toLowerCase()
      .includes(searchInstructor.toLowerCase())
  );

  const addListItem = (
    field: 'equipment' | 'requirements' | 'goals',
    value: string
  ) => {
    const currentValues = form.getValues(field) || [];
    if (value.trim() && !currentValues.includes(value)) {
      form.setValue(field, [...currentValues, value]);
    }
  };

  const removeListItem = (
    field: 'equipment' | 'requirements' | 'goals',
    index: number
  ) => {
    const currentValues = form.getValues(field) || [];
    form.setValue(
      field,
      currentValues.filter((_, i) => i !== index)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('classes.form.createTitle')
              : t('classes.form.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('classes.form.createDescription')
              : t('classes.form.editDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4" />
              {t('classes.form.sections.basicInfo')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">{t('classes.form.fields.name')}</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder={t('classes.form.placeholders.name')}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="level">
                    {t('classes.form.fields.level')}
                  </Label>
                  <Select
                    value={form.watch('level') || ''}
                    onValueChange={(value) =>
                      form.setValue('level', value as ClassLevel)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">
                        {t('classes.levels.beginner')}
                      </SelectItem>
                      <SelectItem value="intermediate">
                        {t('classes.levels.intermediate')}
                      </SelectItem>
                      <SelectItem value="advanced">
                        {t('classes.levels.advanced')}
                      </SelectItem>
                      <SelectItem value="professional">
                        {t('classes.levels.professional')}
                      </SelectItem>
                      <SelectItem value="mixed">
                        {t('classes.levels.mixed')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">
                    {t('classes.form.fields.category')}
                  </Label>
                  <Select
                    value={form.watch('category') || ''}
                    onValueChange={(value) =>
                      form.setValue('category', value as ClassCategory)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="group">
                        {t('classes.categories.group')}
                      </SelectItem>
                      <SelectItem value="private">
                        {t('classes.categories.private')}
                      </SelectItem>
                      <SelectItem value="semi-private">
                        {t('classes.categories.semi-private')}
                      </SelectItem>
                      <SelectItem value="intensive">
                        {t('classes.categories.intensive')}
                      </SelectItem>
                      <SelectItem value="clinic">
                        {t('classes.categories.clinic')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type">{t('classes.form.fields.type')}</Label>
                  <Select
                    value={form.watch('type') || ''}
                    onValueChange={(value) =>
                      form.setValue('type', value as ClassType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technique">
                        {t('classes.types.technique')}
                      </SelectItem>
                      <SelectItem value="tactics">
                        {t('classes.types.tactics')}
                      </SelectItem>
                      <SelectItem value="physical">
                        {t('classes.types.physical')}
                      </SelectItem>
                      <SelectItem value="match_play">
                        {t('classes.types.match_play')}
                      </SelectItem>
                      <SelectItem value="fundamentals">
                        {t('classes.types.fundamentals')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="description">
                {t('classes.form.fields.description')}
              </Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder={t('classes.form.placeholders.description')}
                rows={3}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxParticipants">
                  {t('classes.form.fields.maxParticipants')}
                </Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  {...form.register('maxParticipants', { valueAsNumber: true })}
                  placeholder="8"
                />
                {form.formState.errors.maxParticipants && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.maxParticipants.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="duration">
                  {t('classes.form.fields.duration')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="duration"
                    type="number"
                    {...form.register('duration', { valueAsNumber: true })}
                    placeholder="60"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('common.minutes')}
                  </span>
                </div>
                {form.formState.errors.duration && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.duration.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Instructor & Location Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              {t('classes.form.sections.instructorLocation')}
            </div>

            <div>
              <Label htmlFor="instructor">
                {t('classes.form.fields.instructor')}
              </Label>
              <div className="space-y-2">
                <Input
                  placeholder={t('classes.form.placeholders.searchInstructor')}
                  value={searchInstructor || ''}
                  onChange={(e) => setSearchInstructor(e.target.value)}
                />
                <Select
                  value={form.watch('instructorId') || ''}
                  onValueChange={(value) =>
                    form.setValue('instructorId', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        'classes.form.placeholders.selectInstructor'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredInstructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id || ''}>
                        <div className="flex items-center gap-2">
                          <span>
                            {instructor.firstName} {instructor.lastName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {instructor.rating.toFixed(1)} ⭐
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.formState.errors.instructorId && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.instructorId.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="club">{t('classes.form.fields.club')}</Label>
                <Select
                  value={form.watch('clubId') || ''}
                  onValueChange={(value) => form.setValue('clubId', value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('classes.form.placeholders.selectClub')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id || ''}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.clubId && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.clubId.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="court">
                  {t('classes.form.fields.court')} ({t('common.optional')})
                </Label>
                <Select
                  value={form.watch('courtId') || ''}
                  onValueChange={(value) => form.setValue('courtId', value)}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t('classes.form.placeholders.selectCourt')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin cancha específica</SelectItem>
                    {/* Courts would be loaded based on selected club */}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Schedule Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              {t('classes.form.sections.schedule')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">{t('classes.form.fields.date')}</Label>
                <Input id="date" type="date" {...form.register('date')} />
                {form.formState.errors.date && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="startTime">
                  {t('classes.form.fields.startTime')}
                </Label>
                <Input
                  id="startTime"
                  type="time"
                  {...form.register('startTime')}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.startTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRecurring"
                {...form.register('isRecurring')}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isRecurring" className="cursor-pointer">
                {t('classes.form.fields.isRecurring')}
              </Label>
            </div>

            {form.watch('isRecurring') && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <RefreshCw className="h-4 w-4" />
                  {t('classes.form.sections.recurringPattern')}
                </div>
                {/* Recurring pattern fields would go here */}
              </div>
            )}
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              {t('classes.form.sections.pricing')}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">{t('classes.form.fields.price')}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...form.register('price', { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {form.formState.errors.price && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.price.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="currency">
                  {t('classes.form.fields.currency')}
                </Label>
                <Select
                  value={form.watch('currency') || ''}
                  onValueChange={(value) => form.setValue('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="MXN">MXN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Additional Options Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4" />
              {t('classes.form.sections.additionalOptions')}
            </div>

            {/* Equipment */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>
                  {t('classes.form.fields.equipment')} ({t('common.optional')})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEquipment(!showEquipment)}
                >
                  {showEquipment ? t('common.hide') : t('common.show')}
                </Button>
              </div>
              {showEquipment && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('classes.form.placeholders.addEquipment')}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addListItem('equipment', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch('equipment')?.map((item, index) => (
                      <Badge key={index} variant="secondary">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeListItem('equipment', index)}
                          className="ml-2 text-xs hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Requirements */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>
                  {t('classes.form.fields.requirements')} (
                  {t('common.optional')})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRequirements(!showRequirements)}
                >
                  {showRequirements ? t('common.hide') : t('common.show')}
                </Button>
              </div>
              {showRequirements && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t(
                        'classes.form.placeholders.addRequirement'
                      )}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addListItem('requirements', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch('requirements')?.map((item, index) => (
                      <Badge key={index} variant="secondary">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeListItem('requirements', index)}
                          className="ml-2 text-xs hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Goals */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>
                  {t('classes.form.fields.goals')} ({t('common.optional')})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGoals(!showGoals)}
                >
                  {showGoals ? t('common.hide') : t('common.show')}
                </Button>
              </div>
              {showGoals && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('classes.form.placeholders.addGoal')}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addListItem('goals', e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch('goals')?.map((item, index) => (
                      <Badge key={index} variant="secondary">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeListItem('goals', index)}
                          className="ml-2 text-xs hover:text-red-500"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">
                {t('classes.form.fields.notes')} ({t('common.optional')})
              </Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder={t('classes.form.placeholders.notes')}
                rows={2}
              />
            </div>

            {/* Status (only for edit mode) */}
            {mode === 'edit' && (
              <div>
                <Label htmlFor="status">
                  {t('classes.form.fields.status')}
                </Label>
                <Select
                  value={form.watch('status') || ''}
                  onValueChange={(value) =>
                    form.setValue('status', value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">
                      {t('classes.status.scheduled')}
                    </SelectItem>
                    <SelectItem value="in_progress">
                      {t('classes.status.in_progress')}
                    </SelectItem>
                    <SelectItem value="completed">
                      {t('classes.status.completed')}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {t('classes.status.cancelled')}
                    </SelectItem>
                    <SelectItem value="postponed">
                      {t('classes.status.postponed')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  {t('common.saving')}
                </>
              ) : mode === 'create' ? (
                t('common.create')
              ) : (
                t('common.save')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
