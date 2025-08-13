'use client';

import { useState } from 'react';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Users, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

interface AttendanceTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  classItem: any;
  onSuccess?: () => void;
}

export const AttendanceTracker = ({
  isOpen,
  onClose,
  classItem,
  onSuccess,
}: AttendanceTrackerProps) => {
  const { t } = useTranslation();

  // Mock participants data
  const [participants, setParticipants] = useState([
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'present' },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      status: 'absent',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      status: 'pending',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAttendanceChange = (
    participantId: string,
    status: 'present' | 'absent' | 'pending'
  ) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, status } : p))
    );
  };

  const handleSubmit = async () => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-orange-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'absent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  const presentCount = participants.filter(
    (p) => p.status === 'present'
  ).length;
  const absentCount = participants.filter((p) => p.status === 'absent').length;
  const pendingCount = participants.filter(
    (p) => p.status === 'pending'
  ).length;

  if (!isOpen || !classItem) return null;

  return (
    <Modal size="lg" onClose={onClose}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">
            {t('classes.markAttendance', 'Mark Attendance')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              'classes.attendanceDescription',
              'Track participant attendance for this class'
            )}
          </p>
        </div>

        {/* Class Info */}
        <Card className="p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{classItem.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {classItem.date} • {classItem.startTime} - {classItem.endTime}
              </span>
            </div>
          </div>
        </Card>

        {/* Attendance Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-1">
              <CheckCircle className="h-5 w-5" />
              <span className="text-2xl font-bold">{presentCount}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('attendance.present', 'Present')}
            </div>
          </Card>

          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-1">
              <XCircle className="h-5 w-5" />
              <span className="text-2xl font-bold">{absentCount}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('attendance.absent', 'Absent')}
            </div>
          </Card>

          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
              <Clock className="h-5 w-5" />
              <span className="text-2xl font-bold">{pendingCount}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {t('attendance.pending', 'Pending')}
            </div>
          </Card>
        </div>

        {/* Participants List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('classes.participants', 'Participants')}
          </h3>

          {participants.map((participant) => (
            <Card key={participant.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-medium">{participant.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {participant.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(participant.status)}>
                    {getStatusIcon(participant.status)}
                    <span className="ml-1">
                      {t(
                        `attendance.${participant.status}`,
                        participant.status
                      )}
                    </span>
                  </Badge>

                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={
                        participant.status === 'present' ? 'default' : 'outline'
                      }
                      onClick={() =>
                        handleAttendanceChange(participant.id, 'present')
                      }
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        participant.status === 'absent' ? 'default' : 'outline'
                      }
                      onClick={() =>
                        handleAttendanceChange(participant.id, 'absent')
                      }
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? t('common.saving')
              : t('attendance.saveAttendance', 'Save Attendance')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
