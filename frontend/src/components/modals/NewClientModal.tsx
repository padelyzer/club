'use client';

import { useState } from 'react';
import { User, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppleModal } from '@/components/ui/apple-modal';
import {
  AppleModalHeader,
  AppleModalFormLayout,
  AppleModalFormSection,
  AppleModalFooter,
} from '@/components/ui/modal-layouts';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewClientModal = ({ isOpen, onClose }: NewClientModalProps) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    address: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle client creation
        onClose();
  };

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      size="xl" as any
      presentationStyle="card"
    >
      <AppleModalHeader
        title="Agregar Cliente"
        description="Crea un nuevo perfil de cliente con toda la información necesaria"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <AppleModalFormLayout>
          <AppleModalFormSection
            title="Información Personal"
            description="Datos básicos del cliente"
          >
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4" />
                  Nombre
                </Label>
                <Input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  placeholder="Juan"
                  className="h-11"
                  required
                />
              </div>
              <div>
                <Label className="mb-3">Apellido</Label>
                <Input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  placeholder="García"
                  className="h-11"
                  required
                />
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4" />
                Fecha de nacimiento
              </Label>
              <Input
                type="date"
                value={formData.birthDate || ''}
                onChange={(e) =>
                  setFormData({ ...formData, birthDate: e.target.value })
                }
                className="h-11"
              />
            </div>
          </AppleModalFormSection>

          <AppleModalFormSection
            title="Información de Contacto"
            description="Datos de contacto del cliente"
          >
            {/* Email */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Mail className="w-4 h-4" />
                Email
              </Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="juan@ejemplo.com"
                className="h-11"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Phone className="w-4 h-4" />
                Teléfono
              </Label>
              <Input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="+34 600 123 456"
                className="h-11"
                required
              />
            </div>

            {/* Address */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                Dirección
              </Label>
              <Input
                type="text"
                value={formData.address || ''}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Calle Principal 123"
                className="h-11"
              />
            </div>
          </AppleModalFormSection>

          <AppleModalFormSection
            title="Información Adicional"
            description="Notas y comentarios sobre el cliente"
          >
            {/* Notes */}
            <div>
              <Label className="mb-3">Notas</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Notas adicionales sobre el cliente..."
                rows={4}
                className="resize-none"
              />
            </div>
          </AppleModalFormSection>

          <AppleModalFooter
            primaryAction={{
              label: "Agregar Cliente",
              onClick: () => handleSubmit(new Event('submit') as any),
            }}
            secondaryAction={{
              label: "Cancelar",
              onClick: onClose,
            }}
          />
        </AppleModalFormLayout>
      </form>
    </AppleModal>
  );
};