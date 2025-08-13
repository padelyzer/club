'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  CalendarIcon,
  Clock,
  Users,
  DollarSign,
  Settings,
  Info,
  Plus,
  X,
} from 'lucide-react';
import {
  ClassSchedule,
  CreateClassScheduleData,
  UpdateClassScheduleData,
} from '@/types/class';
import {
  useClassTypes,
  useClassLevels,
  useInstructors,
  useCreateClassSchedule,
  useUpdateClassSchedule,
  useGenerateClassSessions,
} from '@/lib/api/hooks/useClasses';
import { useCourts } from '@/lib/api/hooks/useCourts';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  class_type: z.string().min(1, 'El tipo de clase es requerido'),
  level: z.string().min(1, 'El nivel es requerido'),
  instructor: z.string().min(1, 'El instructor es requerido'),
  court: z.string().optional(),
  location: z.string().optional(),
  start_date: z.date({ required_error: 'La fecha de inicio es requerida' }),
  end_date: z.date().optional(),
  start_time: z.string().min(1, 'La hora de inicio es requerida'),
  duration_minutes: z.number().min(30, 'La duración mínima es 30 minutos').max(240, 'La duración máxima es 4 horas'),
  recurrence: z.enum(['once', 'daily', 'weekly', 'biweekly', 'monthly']),
  recurrence_days: z.array(z.number()).optional(),
  min_participants: z.number().min(1, 'Mínimo 1 participante'),
  max_participants: z.number().min(1, 'Mínimo 1 participante'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  member_price: z.number().min(0, 'El precio de miembro no puede ser negativo').optional(),
  allow_drop_in: z.boolean(),
  drop_in_price: z.number().min(0, 'El precio drop-in no puede ser negativo').optional(),
  allow_waitlist: z.boolean(),
  waitlist_size: z.number().min(0, 'El tamaño de lista de espera no puede ser negativo'),
  enrollment_opens_days: z.number().min(0, 'Los días de apertura no pueden ser negativos'),
  enrollment_closes_hours: z.number().min(0, 'Las horas de cierre no pueden ser negativas'),
});

type FormData = z.infer<typeof formSchema>;

interface ClassScheduleFormProps {
  schedule?: ClassSchedule;
  onSuccess?: (schedule: ClassSchedule) => void;
  onCancel?: () => void;
  className?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Lunes' },
  { value: 1, label: 'Martes' },
  { value: 2, label: 'Miércoles' },
  { value: 3, label: 'Jueves' },
  { value: 4, label: 'Viernes' },
  { value: 5, label: 'Sábado' },
  { value: 6, label: 'Domingo' },
];

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Una vez' },
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
];

export function ClassScheduleForm({
  schedule,
  onSuccess,
  onCancel,
  className,
}: ClassScheduleFormProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // API hooks
  const { data: classTypes } = useClassTypes({ active_only: true });
  const { data: classLevels } = useClassLevels(true);
  const { data: instructorsData } = useInstructors({ active_only: true });
  const { data: courtsData } = useCourts();
  const createSchedule = useCreateClassSchedule();
  const updateSchedule = useUpdateClassSchedule();
  const generateSessions = useGenerateClassSessions();

  const instructors = instructorsData?.results || [];
  const courts = courtsData?.results || [];

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      class_type: '',
      level: '',
      instructor: '',
      court: '',
      location: '',
      start_date: new Date(),
      end_date: undefined,
      start_time: '09:00',
      duration_minutes: 60,
      recurrence: 'weekly',
      recurrence_days: [],
      min_participants: 1,
      max_participants: 4,
      price: 0,
      member_price: undefined,
      allow_drop_in: false,
      drop_in_price: undefined,
      allow_waitlist: true,
      waitlist_size: 5,
      enrollment_opens_days: 30,
      enrollment_closes_hours: 2,
    },
  });

  // Load schedule data if editing
  useEffect(() => {
    if (schedule) {
      form.reset({
        name: schedule.name,
        description: schedule.description || '',
        class_type: schedule.class_type.id,
        level: schedule.level.id,
        instructor: schedule.instructor.id,
        court: schedule.court?.id || '',
        location: schedule.location || '',
        start_date: new Date(schedule.start_date),
        end_date: schedule.end_date ? new Date(schedule.end_date) : undefined,
        start_time: schedule.start_time,
        duration_minutes: schedule.duration_minutes,
        recurrence: schedule.recurrence,
        recurrence_days: schedule.recurrence_days,
        min_participants: schedule.min_participants,
        max_participants: schedule.max_participants,
        price: schedule.price,
        member_price: schedule.member_price || undefined,
        allow_drop_in: schedule.allow_drop_in,
        drop_in_price: schedule.drop_in_price || undefined,
        allow_waitlist: schedule.allow_waitlist,
        waitlist_size: schedule.waitlist_size,
        enrollment_opens_days: schedule.enrollment_opens_days,
        enrollment_closes_hours: schedule.enrollment_closes_hours,
      });
      setSelectedDays(schedule.recurrence_days || []);
    }
  }, [schedule, form]);

  // Handle day selection
  const handleDayToggle = (day: number) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter(d => d !== day)
      : [...selectedDays, day].sort();
    
    setSelectedDays(newDays);
    form.setValue('recurrence_days', newDays);
  };

  // Form submission
  const onSubmit = async (data: FormData) => {
    try {
      const formData: CreateClassScheduleData | UpdateClassScheduleData = {
        ...data,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: data.end_date ? format(data.end_date, 'yyyy-MM-dd') : undefined,
        recurrence_days: selectedDays,
      };

      let result: ClassSchedule;
      
      if (schedule) {
        result = await updateSchedule.mutateAsync({
          id: schedule.id,
          data: formData as UpdateClassScheduleData,
        });
      } else {
        result = await createSchedule.mutateAsync(formData as CreateClassScheduleData);
      }

      onSuccess?.(result);
    } catch (error) {
          }
  };

  // Generate sessions
  const handleGenerateSessions = async () => {
    if (!schedule) return;

    try {
      const endDate = form.getValues('end_date');
      await generateSessions.mutateAsync({
        id: schedule.id,
        untilDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      });
    } catch (error) {
          }
  };

  const isLoading = createSchedule.isPending || updateSchedule.isPending;
  const isGenerating = generateSessions.isPending;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          {schedule ? 'Editar Cronograma de Clase' : 'Nuevo Cronograma de Clase'}
        </CardTitle>
        <CardDescription>
          {schedule 
            ? 'Modifica los detalles del cronograma de clase'
            : 'Crea un nuevo cronograma para generar clases automáticamente'
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nombre de la Clase</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Padel Intermedio - Técnica" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción de la clase..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Clase</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id || ''}>
                            {type.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nivel</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar nivel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classLevels?.map((level) => (
                          <SelectItem key={level.id} value={level.id || ''}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: level.color }}
                              />
                              {level.display_name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar instructor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {instructors.map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id || ''}>
                            <div className="flex items-center gap-2">
                              {instructor.photo_url && (
                                <img
                                  src={instructor.photo_url}
                                  alt={`${instructor.user.first_name} ${instructor.user.last_name}`}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              )}
                              <span>
                                {instructor.user.first_name} {instructor.user.last_name}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                ⭐ {instructor.rating.toFixed(1)}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="court"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancha (Opcional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cancha" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sin cancha específica</SelectItem>
                        {courts.map((court: any) => (
                          <SelectItem key={court.id} value={court.id || ''}>
                            {court.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Schedule Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Programación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Inicio</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy', { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              locale={es}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora de Inicio</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración (minutos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="30"
                            max="240"
                            step="15"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="recurrence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurrencia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RECURRENCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value || ''}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {(form.watch('recurrence') === 'weekly' || form.watch('recurrence') === 'biweekly') && (
                  <div>
                    <FormLabel>Días de la Semana</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <Badge
                          key={day.value}
                          variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => handleDayToggle(day.value)}
                        >
                          {day.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Fin (Opcional)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy', { locale: es })
                              ) : (
                                <span>Sin fecha de fin</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < form.getValues('start_date')}
                            locale={es}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Deja vacío para clases sin fecha de fin
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Capacity and Pricing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Capacidad y Precios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="min_participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participantes Mínimos</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="max_participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participantes Máximos</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Regular</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="member_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio para Miembros (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
              <CardHeader
                className="pb-3 cursor-pointer"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              >
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Configuración Avanzada
                  <Button variant="ghost" size="sm" className="ml-auto">
                    {isAdvancedOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </CardTitle>
              </CardHeader>
              
              {isAdvancedOpen && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="allow_drop_in"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Permitir Drop-in</FormLabel>
                            <FormDescription>
                              Permite inscripciones de última hora
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('allow_drop_in') && (
                      <FormField
                        control={form.control}
                        name="drop_in_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Precio Drop-in</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="allow_waitlist"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Permitir Lista de Espera</FormLabel>
                            <FormDescription>
                              Permite inscripciones cuando la clase está llena
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {form.watch('allow_waitlist') && (
                      <FormField
                        control={form.control}
                        name="waitlist_size"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tamaño de Lista de Espera</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="enrollment_opens_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apertura de Inscripciones (días antes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Días antes de la clase que se abren las inscripciones
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="enrollment_closes_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cierre de Inscripciones (horas antes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Horas antes de la clase que se cierran las inscripciones
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    {schedule ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  <>
                    {schedule ? 'Actualizar Cronograma' : 'Crear Cronograma'}
                  </>
                )}
              </Button>

              {schedule && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateSessions}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Generar Sesiones
                    </>
                  )}
                </Button>
              )}

              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}