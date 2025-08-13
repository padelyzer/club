'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Star,
  DollarSign,
  UserPlus,
  AlertTriangle,
  Info,
  CheckCircle,
  CreditCard,
  Package,
} from 'lucide-react';
import {
  ClassSession,
  CreateClassEnrollmentData,
  StudentPackage,
} from '@/types/class';
import {
  useCreateClassEnrollment,
  useStudentPackages,
} from '@/lib/api/hooks/useClasses';
import { useClients } from '@/lib/api/hooks/useClients';
import { classUtils } from '@/lib/api/classes';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  student: z.string().min(1, 'Selecciona un estudiante'),
  notes: z.string().optional(),
  use_package: z.boolean().default(false),
  package_id: z.string().optional(),
  payment_method: z.enum(['cash', 'card', 'transfer', 'package']).default('cash'),
  accept_terms: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar los términos y condiciones',
  }),
  accept_cancellation_policy: z.boolean().refine(val => val === true, {
    message: 'Debes aceptar la política de cancelación',
  }),
});

type FormData = z.infer<typeof formSchema>;

interface EnrollmentFormProps {
  session: ClassSession;
  onSuccess?: () => void;
  onCancel?: () => void;
  preselectedStudentId?: string;
  className?: string;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo', icon: DollarSign },
  { value: 'card', label: 'Tarjeta', icon: CreditCard },
  { value: 'transfer', label: 'Transferencia', icon: CreditCard },
  { value: 'package', label: 'Paquete', icon: Package },
];

export function EnrollmentForm({
  session,
  onSuccess,
  onCancel,
  preselectedStudentId,
  className,
}: EnrollmentFormProps) {
  const [selectedPackage, setSelectedPackage] = useState<StudentPackage | null>(null);

  // API hooks
  const { data: studentsData } = useClients();
  const { data: packagesData } = useStudentPackages(true);
  const createEnrollment = useCreateClassEnrollment();

  const students = studentsData?.results || [];
  const packages = packagesData?.results || [];

  // Check enrollment status
  const enrollmentCheck = classUtils.canEnrollInSession(session);
  const enrollmentConfig = classUtils.getEnrollmentStatus(session);
  const availableSpots = classUtils.getAvailableSpots(session);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      student: preselectedStudentId || '',
      notes: '',
      use_package: false,
      package_id: '',
      payment_method: 'cash',
      accept_terms: false,
      accept_cancellation_policy: false,
    },
  });

  const watchUsePackage = form.watch('use_package');
  const watchPackageId = form.watch('package_id');
  const watchStudent = form.watch('student');

  // Filter packages for selected student
  const studentPackages = packages.filter(pkg => 
    pkg.student.id === watchStudent && pkg.classes_remaining > 0
  );

  // Calculate price
  const getPrice = () => {
    if (watchUsePackage && selectedPackage) {
      return 0; // Package covers the cost
    }

    // Check if student is a member and member price is available
    const selectedStudent = students.find(s => s.id === watchStudent);
    if (selectedStudent?.membership && session.schedule.member_price) {
      return session.schedule.member_price;
    }

    return session.schedule.price;
  };

  // Form submission
  const onSubmit = async (data: FormData) => {
    try {
      const enrollmentData: CreateClassEnrollmentData = {
        session: session.id,
        student: data.student,
        notes: data.notes,
      };

      await createEnrollment.mutateAsync(enrollmentData);
      onSuccess?.();
    } catch (error) {
          }
  };

  // Handle package selection
  const handlePackageSelection = (packageId: string) => {
    const pkg = studentPackages.find(p => p.id === packageId);
    setSelectedPackage(pkg || null);
    form.setValue('package_id', packageId);
    
    if (pkg) {
      form.setValue('payment_method', 'package');
    }
  };

  const isLoading = createEnrollment.isPending;
  const sessionDate = new Date(session.scheduled_datetime);
  const currentPrice = getPrice();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Inscripción a Clase
        </CardTitle>
        <CardDescription>
          Inscribir estudiante en la clase seleccionada
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Class Information */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{session.schedule.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {session.schedule.class_type.display_name} • {session.schedule.level.display_name}
                  </p>
                </div>
                <Badge
                  style={{
                    backgroundColor: session.schedule.level.color + '20',
                    color: session.schedule.level.color,
                    borderColor: session.schedule.level.color + '40',
                  }}
                >
                  {session.schedule.level.display_name}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.instructor.photo_url} />
                  <AvatarFallback>
                    {session.instructor.user.first_name[0]}
                    {session.instructor.user.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">
                    {session.instructor.user.first_name} {session.instructor.user.last_name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{session.instructor.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(sessionDate, 'EEEE, d MMMM yyyy', { locale: es })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {classUtils.formatClassTime(session.scheduled_datetime)} ({session.duration_minutes}min)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{session.court?.name || session.location || 'Por definir'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {session.enrolled_count}/{session.max_participants} inscriptos
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enrollment Status Alert */}
        {!enrollmentCheck.canEnroll && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {enrollmentCheck.reason}
            </AlertDescription>
          </Alert>
        )}

        {enrollmentConfig === 'waitlist' && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              La clase está llena. La inscripción se agregará a la lista de espera.
            </AlertDescription>
          </Alert>
        )}

        {/* Enrollment Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Student Selection */}
            <FormField
              control={form.control}
              name="student"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estudiante</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar estudiante" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {students.map((student: any) => (
                        <SelectItem key={student.id} value={student.id || ''}>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={student.avatar} />
                              <AvatarFallback>
                                {student.first_name[0]}{student.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              {student.first_name} {student.last_name}
                            </span>
                            {student.membership && (
                              <Badge variant="secondary" className="text-xs">
                                Miembro
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Package Selection */}
            {studentPackages.length > 0 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="use_package"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Usar Paquete de Clases</FormLabel>
                        <FormDescription>
                          El estudiante tiene {studentPackages.length} paquete(s) disponible(s)
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

                {watchUsePackage && (
                  <FormField
                    control={form.control}
                    name="package_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seleccionar Paquete</FormLabel>
                        <div className="space-y-2">
                          {studentPackages.map((pkg: any) => (
                            <Card
                              key={pkg.id}
                              className={cn(
                                'p-3 cursor-pointer transition-colors',
                                field.value === pkg.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'hover:bg-muted/50'
                              )}
                              onClick={() => handlePackageSelection(pkg.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{pkg.package.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {pkg.classes_remaining} clases restantes
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">
                                    Expira: {format(new Date(pkg.expires_at), 'd MMM yyyy', { locale: es })}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Payment Method */}
            {!watchUsePackage && (
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {PAYMENT_METHODS.filter(method => method.value !== 'package').map((method) => {
                        const Icon = method.icon;
                        return (
                          <Card
                            key={method.value}
                            className={cn(
                              'p-3 cursor-pointer transition-colors',
                              field.value === method.value
                                ? 'border-blue-500 bg-blue-50'
                                : 'hover:bg-muted/50'
                            )}
                            onClick={() => field.onChange(method.value)}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span className="text-sm font-medium">{method.label}</span>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Price Summary */}
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Total a Pagar</p>
                    {watchUsePackage && selectedPackage && (
                      <p className="text-sm text-muted-foreground">
                        Usando paquete: {selectedPackage.package.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
                      <DollarSign className="h-5 w-5" />
                      {currentPrice}
                    </div>
                    {watchUsePackage && selectedPackage && (
                      <p className="text-xs text-green-600">
                        Pagado con paquete
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Comentarios adicionales sobre la inscripción..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Terms and Conditions */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="accept_terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Acepto los términos y condiciones
                      </FormLabel>
                      <FormDescription>
                        He leído y acepto los términos de servicio del club
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accept_cancellation_policy"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Acepto la política de cancelación
                      </FormLabel>
                      <FormDescription>
                        Entiendo que debo cancelar con al menos {session.schedule.enrollment_closes_hours} horas de anticipación
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading || !enrollmentCheck.canEnroll}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {enrollmentConfig === 'waitlist' ? 'Unirse a Lista de Espera' : 'Confirmar Inscripción'}
                  </>
                )}
              </Button>

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