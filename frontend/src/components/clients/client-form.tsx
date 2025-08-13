import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Save, User, Mail, Phone, Calendar, CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ApiClient, ClientFormData } from '@/types/client';
import { useClientMutations, useCheckEmail } from '@/lib/api/hooks/useClients';
import { Modal } from '@/components/layout/Modal';
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
import { format } from 'date-fns';

interface ClientFormProps {
  client?: ApiClient | null;
  onClose: () => void;
  onSuccess: () => void;
}

const clientSchema = z.object({
  first_name: z.string().min(2, 'Name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(8, 'Phone must be at least 8 characters'),
  document_type: z.enum(['dni', 'passport', 'other']).optional(),
  document_number: z.string().optional(),
  birth_date: z.string().optional(),
});

export function ClientForm({ client, onClose, onSuccess }: ClientFormProps) {
  const { t } = useTranslation();
  const { createClient, updateClient } = useClientMutations();
  const { checkEmail } = useCheckEmail();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(true);

  const isEditing = !!client;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      first_name: client?.first_name || '',
      last_name: client?.last_name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      document_type: client?.document_type,
      document_number: client?.document_number || '',
      birth_date: client?.birth_date || '',
    },
  });

  const watchEmail = watch('email');

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

  const onSubmit = async (data: ClientFormData) => {
    if (!emailAvailable && !isEditing) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateClient(client.id, data);
      } else {
        await createClient(data);
      }
      onSuccess();
    } catch (error) {
          } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? t('clients.editClient') : t('clients.newClient')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
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

            {/* Additional Information */}
            <div>
              <h3 className="mb-4 flex items-center text-sm font-medium text-gray-900 dark:text-white">
                <Calendar className="mr-2 h-4 w-4" />
                {t('clients.additionalInfo')}
              </h3>
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
        </div>
      </form>
    </Modal>
  );
}
