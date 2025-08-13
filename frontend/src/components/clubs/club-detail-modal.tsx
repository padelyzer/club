'use client';

import { Club } from '@/types/club';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Users, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ClubDetailModalProps {
  club: Club | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (club: Club) => void;
}

export function ClubDetailModal({ club, isOpen, onClose, onEdit }: ClubDetailModalProps) {
  const { t } = useTranslation();

  if (!club) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{club.name}</span>
            <Badge variant={club.is_active ? 'default' : 'secondary'}>
              {club.is_active ? t('common.active') : t('common.inactive')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Club Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{club.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{club.city}, {club.country}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{club.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{club.email}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{t('clubs.totalCourts')}: {club.courts}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{t('common.createdAt')}: {new Date(club.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Logo */}
          {club.logo_url && (
            <div className="flex justify-center">
              <img
                src={club.logo_url}
                alt={club.name}
                className="h-32 w-32 rounded-lg object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onEdit && (
              <Button onClick={() => onEdit(club)}>
                {t('common.edit')}
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}