'use client';

import { useState } from 'react';
import { useUIStore } from '@/store/ui';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
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
import { AppleModal } from '@/components/ui/apple-modal';
import {
  AppleModalHeader,
  AppleModalFormLayout,
  AppleModalFormSection,
  AppleModalFooter,
} from '@/components/ui/modal-layouts';

interface NewReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewReservationModal = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}: NewReservationModalProps & { isOpen?: boolean; onClose?: () => void }) => {
  // Connect to UI store for global modal management
  const { activeModal, closeModal } = useUIStore();
  
  // Use prop values if provided, otherwise use store
  const isOpen = propIsOpen !== undefined ? propIsOpen : activeModal === 'new-reservation';
  const onClose = propOnClose || closeModal;
  const [formData, setFormData] = useState({
    court: '',
    date: '',
    startTime: '',
    duration: '90',
    clientName: '',
    playerCount: '4',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle reservation creation
        onClose();
  };

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      presentationStyle="card"
    >
      <AppleModalHeader
        title="Nueva Reserva"
        description="Crea una nueva reserva de pista para tus clientes"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <AppleModalFormLayout>
          <AppleModalFormSection
            title="Detalles de la Reserva"
            description="Selecciona la pista, fecha y hora para la reserva"
          >
            {/* Court Selection */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                Pista
              </Label>
              <Select
                value={formData.court || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, court: value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar pista" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="court-1">Pista 1 - Central</SelectItem>
                  <SelectItem value="court-2">Pista 2 - Cristal</SelectItem>
                  <SelectItem value="court-3">Pista 3 - Indoor</SelectItem>
                  <SelectItem value="court-4">Pista 4 - Outdoor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4" />
                Fecha
              </Label>
              <Input
                type="date"
                value={formData.date || ''}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="h-11"
                required
              />
            </div>

            {/* Time and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" />
                  Hora de inicio
                </Label>
                <Select
                  value={formData.startTime || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, startTime: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 14 }, (_, i) => i + 8).map(
                      (hour) => (
                        <SelectItem key={hour} value={`${hour || ''}:00`}>
                          {hour}:00
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-3">Duración</Label>
                <Select
                  value={formData.duration || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, duration: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hora</SelectItem>
                    <SelectItem value="90">1.5 horas</SelectItem>
                    <SelectItem value="120">2 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </AppleModalFormSection>

          <AppleModalFormSection
            title="Información del Cliente"
            description="Datos del cliente y jugadores para la reserva"
          >
            {/* Client Name */}
            <div>
              <Label className="mb-3">Nombre del cliente</Label>
              <Input
                type="text"
                value={formData.clientName || ''}
                onChange={(e) =>
                  setFormData({ ...formData, clientName: e.target.value })
                }
                placeholder="Ej: Juan García"
                className="h-11"
                required
              />
            </div>

            {/* Player Count */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4" />
                Número de jugadores
              </Label>
              <Select
                value={formData.playerCount || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, playerCount: value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 jugadores</SelectItem>
                  <SelectItem value="3">3 jugadores</SelectItem>
                  <SelectItem value="4">4 jugadores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </AppleModalFormSection>

          <AppleModalFooter
            primaryAction={{
              label: "Crear Reserva",
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
