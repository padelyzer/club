'use client';

import { useState } from 'react';
import { Trophy, Calendar, Users, MapPin, DollarSign } from 'lucide-react';
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
import { AppleModal } from '@/components/ui/apple-modal';
import {
  AppleModalHeader,
  AppleModalFormLayout,
  AppleModalFormSection,
  AppleModalFooter,
} from '@/components/ui/modal-layouts';

interface NewTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTournamentModal = ({
  isOpen,
  onClose,
}: NewTournamentModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    format: 'round-robin',
    category: 'open',
    maxTeams: '16',
    entryFee: '',
    location: '',
    description: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle tournament creation
        onClose();
  };

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      presentationStyle="card"
    >
      <AppleModalHeader
        title="Crear Torneo"
        description="Configura un nuevo torneo con todos los detalles necesarios para una experiencia competitiva"
        onClose={onClose}
      />

      <form onSubmit={handleSubmit}>
        <AppleModalFormLayout>
          <AppleModalFormSection
            title="Información Básica"
            description="Datos principales del torneo"
          >
            {/* Tournament Name */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4" />
                Nombre del torneo
              </Label>
              <Input
                type="text"
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Torneo de Verano 2024"
                className="h-11"
                required
              />
            </div>

            {/* Location */}
            <div>
              <Label className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                Ubicación
              </Label>
              <Input
                type="text"
                value={formData.location || ''}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Club de Padel Central"
                className="h-11"
                required
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4" />
                  Fecha de inicio
                </Label>
                <Input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="h-11"
                  required
                />
              </div>
              <div>
                <Label className="mb-3">Fecha de fin</Label>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="h-11"
                  required
                />
              </div>
            </div>
          </AppleModalFormSection>

          <AppleModalFormSection
            title="Configuración del Torneo"
            description="Formato, categoría y participantes"
          >
            {/* Format and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-3">Formato</Label>
                <Select
                  value={formData.format || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, format: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round-robin">Round Robin</SelectItem>
                    <SelectItem value="knockout">
                      Eliminación directa
                    </SelectItem>
                    <SelectItem value="swiss">Sistema Suizo</SelectItem>
                    <SelectItem value="mixed">
                      Mixto (Grupos + Eliminación)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-3">Categoría</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="men">Masculino</SelectItem>
                    <SelectItem value="women">Femenino</SelectItem>
                    <SelectItem value="mixed">Mixto</SelectItem>
                    <SelectItem value="senior">Senior (+45)</SelectItem>
                    <SelectItem value="junior">Junior (-18)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Teams and Entry Fee */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4" />
                  Máximo de equipos
                </Label>
                <Select
                  value={formData.maxTeams || ''}
                  onValueChange={(value) =>
                    setFormData({ ...formData, maxTeams: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 equipos</SelectItem>
                    <SelectItem value="16">16 equipos</SelectItem>
                    <SelectItem value="24">24 equipos</SelectItem>
                    <SelectItem value="32">32 equipos</SelectItem>
                    <SelectItem value="48">48 equipos</SelectItem>
                    <SelectItem value="64">64 equipos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" />
                  Cuota de inscripción (€)
                </Label>
                <Input
                  type="number"
                  value={formData.entryFee || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, entryFee: e.target.value })
                  }
                  placeholder="50"
                  className="h-11"
                  min="0"
                  step="5"
                />
              </div>
            </div>
          </AppleModalFormSection>

          <AppleModalFormSection
            title="Descripción y Detalles"
            description="Información adicional sobre el torneo"
          >
            {/* Description */}
            <div>
              <Label className="mb-3">Descripción del torneo</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del torneo, reglas especiales, premios, horarios, requisitos de participación..."
                rows={5}
                className="resize-none"
              />
            </div>
          </AppleModalFormSection>

          <AppleModalFooter
            primaryAction={{
              label: "Crear Torneo",
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