'use client';

import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Calendar, Clock, Users, MapPin, DollarSign } from 'lucide-react';

interface ClassDetailProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: any;
  onBookClass: () => void;
  onEditClass: () => void;
  onMarkAttendance: () => void;
}

export const ClassDetail = ({
  isOpen,
  onClose,
  classItem,
  onBookClass,
  onEditClass,
  onMarkAttendance,
}: ClassDetailProps) => {
  const { t } = useTranslation();

  if (!isOpen || !classItem) return null;

  return (
    <Modal size="lg" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{classItem.name}</h2>
          <Badge variant="secondary">{classItem.status}</Badge>
        </div>

        <Card className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{classItem.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {classItem.startTime} - {classItem.endTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>
                {classItem.currentParticipants}/{classItem.maxParticipants}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{classItem.court?.name}</span>
            </div>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onMarkAttendance}>
            {t('classes.markAttendance', 'Mark Attendance')}
          </Button>
          <Button variant="outline" onClick={onEditClass}>
            {t('common.edit', 'Edit')}
          </Button>
          <Button onClick={onBookClass}>
            {t('classes.bookClass', 'Book Class')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
