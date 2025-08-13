'use client';

import { useState } from 'react';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, FileText } from 'lucide-react';

interface InstructorFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingInstructor?: any;
  onSuccess?: () => void;
}

export const InstructorForm = ({
  isOpen,
  onClose,
  editingInstructor,
  onSuccess,
}: InstructorFormProps) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: editingInstructor?.firstName || '',
    lastName: editingInstructor?.lastName || '',
    email: editingInstructor?.email || '',
    phone: editingInstructor?.phone || '',
    specialties: editingInstructor?.specialties?.join(', ') || '',
    bio: editingInstructor?.bio || '',
    isActive: editingInstructor?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
            onSuccess?.();
      onClose();
    } catch (error) {
          } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <Modal size="lg" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            {editingInstructor
              ? t('instructors.editInstructor')
              : t('instructors.addInstructor')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              'instructors.formDescription',
              'Fill in the instructor information'
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">
              <User className="h-4 w-4 inline mr-2" />
              {t('instructors.firstName', 'First Name')}
            </Label>
            <Input
              id="firstName"
              value={formData.firstName || ''}
              onChange={(e) => handleChange('firstName', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">
              <User className="h-4 w-4 inline mr-2" />
              {t('instructors.lastName', 'Last Name')}
            </Label>
            <Input
              id="lastName"
              value={formData.lastName || ''}
              onChange={(e) => handleChange('lastName', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">
              <Mail className="h-4 w-4 inline mr-2" />
              {t('instructors.email', 'Email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="h-4 w-4 inline mr-2" />
              {t('instructors.phone', 'Phone')}
            </Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialties">
            {t('instructors.specialties', 'Specialties')}
          </Label>
          <Input
            id="specialties"
            value={formData.specialties || ''}
            onChange={(e) => handleChange('specialties', e.target.value)}
            placeholder={t(
              'instructors.specialtiesPlaceholder',
              'Padel, Tennis, Fitness...'
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">
            <FileText className="h-4 w-4 inline mr-2" />
            {t('instructors.bio', 'Biography')}
          </Label>
          <Textarea
            id="bio"
            value={formData.bio || ''}
            onChange={(e) => handleChange('bio', e.target.value)}
            rows={3}
            placeholder={t(
              'instructors.bioPlaceholder',
              'Brief description of experience and qualifications...'
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => handleChange('isActive', e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="isActive">
            {t('instructors.isActive', 'Active Instructor')}
          </Label>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t('common.saving')
              : editingInstructor
                ? t('common.saveChanges')
                : t('instructors.addInstructor')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
