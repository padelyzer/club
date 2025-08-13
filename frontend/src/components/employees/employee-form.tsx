'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  useCreateEmployee,
  useUpdateEmployee,
} from '@/lib/api/hooks/useEmployees';
import { Employee, EmployeeFormData } from '@/types/employee';
import {
  Loader2,
  Save,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Shield,
  Calendar,
} from 'lucide-react';

const employeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  role: z.enum(['instructor', 'receptionist', 'maintenance', 'manager']),
  employee_code: z.string().optional(),
  hire_date: z.string().min(1, 'Hire date is required'),
  birth_date: z.string().optional(),
  document_type: z.enum(['dni', 'passport', 'other']).optional(),
  document_number: z.string().optional(),
  address: z.string().optional(),
  emergency_contact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string(),
    })
    .optional(),
  skills: z.array(z.string()).optional(),
  salary: z.number().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  clubId: string;
  employee?: Employee | null;
  onClose: () => void;
}

export function EmployeeForm({ clubId, employee, onClose }: EmployeeFormProps) {
  const { t } = useTranslation();
  const isEditing = !!employee;

  const createEmployee = useCreateEmployee(clubId);
  const updateEmployee = useUpdateEmployee(clubId, employee?.id || '');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      role: 'instructor',
      hire_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone,
        role: employee.role,
        employee_code: employee.employee_code,
        hire_date: employee.hire_date,
        birth_date: employee.birth_date,
        document_type: employee.document_type,
        document_number: employee.document_number,
        address: employee.address,
        emergency_contact: employee.emergency_contact,
        skills: employee.skills,
        salary: employee.salary,
      });
    }
  }, [employee, reset]);

  const onSubmit = async (data: EmployeeFormValues) => {
    try {
      if (isEditing) {
        await updateEmployee.mutateAsync(data);
      } else {
        await createEmployee.mutateAsync(data);
      }
      onClose();
    } catch (error) {
      // Error handling is done by the mutation hooks
    }
  };

  const watchedRole = watch('role');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">{t('employees.tabs.basic')}</TabsTrigger>
          <TabsTrigger value="personal">
            {t('employees.tabs.personal')}
          </TabsTrigger>
          <TabsTrigger value="emergency">
            {t('employees.tabs.emergency')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">{t('employees.firstName')} *</Label>
              <Input
                id="first_name"
                {...register('first_name')}
                placeholder={t('employees.firstNamePlaceholder')}
              />
              {errors.first_name && (
                <p className="text-sm text-destructive mt-1">
                  {errors.first_name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="last_name">{t('employees.lastName')} *</Label>
              <Input
                id="last_name"
                {...register('last_name')}
                placeholder={t('employees.lastNamePlaceholder')}
              />
              {errors.last_name && (
                <p className="text-sm text-destructive mt-1">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">{t('employees.email')} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="employee@example.com"
                  className="pl-10"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">{t('employees.phone')} *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+52 555 123 4567"
                  className="pl-10"
                />
              </div>
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">{t('employees.role')} *</Label>
              <Select
                value={watchedRole || ''}
                onValueChange={(value) => setValue('role', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('employees.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instructor">
                    {t('employees.roles.instructor')}
                  </SelectItem>
                  <SelectItem value="receptionist">
                    {t('employees.roles.receptionist')}
                  </SelectItem>
                  <SelectItem value="maintenance">
                    {t('employees.roles.maintenance')}
                  </SelectItem>
                  <SelectItem value="manager">
                    {t('employees.roles.manager')}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-destructive mt-1">
                  {errors.role.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="employee_code">
                {t('employees.employeeCode')}
              </Label>
              <Input
                id="employee_code"
                {...register('employee_code')}
                placeholder="EMP-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hire_date">{t('employees.hireDate')} *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="hire_date"
                  type="date"
                  {...register('hire_date')}
                  className="pl-10"
                />
              </div>
              {errors.hire_date && (
                <p className="text-sm text-destructive mt-1">
                  {errors.hire_date.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="salary">{t('employees.salary')}</Label>
              <Input
                id="salary"
                type="number"
                {...register('salary', { valueAsNumber: true })}
                placeholder="0.00"
              />
            </div>
          </div>

          {watchedRole === 'instructor' && (
            <div>
              <Label>{t('employees.skills')}</Label>
              <Textarea
                {...register('skills')}
                placeholder={t('employees.skillsPlaceholder')}
                rows={3}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t('employees.skillsHelp')}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birth_date">{t('employees.birthDate')}</Label>
              <Input id="birth_date" type="date" {...register('birth_date')} />
            </div>

            <div>
              <Label htmlFor="document_type">
                {t('employees.documentType')}
              </Label>
              <Select
                value={watch('document_type') || ''}
                onValueChange={(value) =>
                  setValue('document_type', value as any)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('employees.selectDocumentType')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dni">
                    {t('employees.documentTypes.dni')}
                  </SelectItem>
                  <SelectItem value="passport">
                    {t('employees.documentTypes.passport')}
                  </SelectItem>
                  <SelectItem value="other">
                    {t('employees.documentTypes.other')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="document_number">
              {t('employees.documentNumber')}
            </Label>
            <Input
              id="document_number"
              {...register('document_number')}
              placeholder={t('employees.documentNumberPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="address">{t('employees.address')}</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Textarea
                id="address"
                {...register('address')}
                placeholder={t('employees.addressPlaceholder')}
                className="pl-10"
                rows={3}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-destructive" />
                <h3 className="font-medium">
                  {t('employees.emergencyContact')}
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="emergency_name">
                    {t('employees.emergency.name')}
                  </Label>
                  <Input
                    id="emergency_name"
                    {...register('emergency_contact.name')}
                    placeholder={t('employees.emergency.namePlaceholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="emergency_phone">
                    {t('employees.emergency.phone')}
                  </Label>
                  <Input
                    id="emergency_phone"
                    {...register('emergency_contact.phone')}
                    placeholder="+52 555 123 4567"
                  />
                </div>

                <div>
                  <Label htmlFor="emergency_relationship">
                    {t('employees.emergency.relationship')}
                  </Label>
                  <Input
                    id="emergency_relationship"
                    {...register('emergency_contact.relationship')}
                    placeholder={t(
                      'employees.emergency.relationshipPlaceholder'
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>
          <X className="w-4 h-4 mr-2" />
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEditing ? t('common.update') : t('common.create')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
