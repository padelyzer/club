'use client';

import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { 
  TournamentMatch, 
  Tournament,
  TournamentSchedule as TournamentScheduleType 
} from '@/types/tournament';
import { Court } from '@/types/court';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Users,
  Edit,
  Save,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { tournamentsService } from '@/lib/api/services/tournaments.service';
import { CourtsService } from '@/lib/api/services/courts.service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TournamentScheduleProps {
  tournament: Tournament;
  matches: TournamentMatch[];
  onMatchUpdate?: (match: TournamentMatch) => void;
  editable?: boolean;
}

interface TimeSlot {
  time: string;
  courts: {
    [courtId: string]: TournamentMatch | null;
  };
}

interface DaySchedule {
  date: Date;
  slots: TimeSlot[];
}

export function TournamentSchedule({
  tournament,
  matches,
  onMatchUpdate,
  editable = false,
}: TournamentScheduleProps) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Time slots for the tournament (8 AM to 10 PM, every 90 minutes for padel matches)
  const timeSlots = [
    '08:00', '09:30', '11:00', '12:30', 
    '14:00', '15:30', '17:00', '18:30', 
    '20:00', '21:30'
  ];

  useEffect(() => {
    loadCourts();
  }, [tournament.club.id]);

  const loadCourts = async () => {
    try {
      const response = await CourtsService.getCourts({ 
        club: parseInt(tournament.club.id),
        is_active: true 
      });
      setCourts(response.results || []);
    } catch (error) {
          }
  };

  // Group matches by date and time
  const getScheduleData = (): DaySchedule[] => {
    const weekStart = startOfWeek(currentWeek);
    const days: DaySchedule[] = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const daySlots: TimeSlot[] = timeSlots.map(time => ({
        time,
        courts: courts.reduce((acc, court) => {
          const match = matches.find(m => 
            m.scheduledDate && 
            isSameDay(new Date(m.scheduledDate), date) &&
            m.startTime === time &&
            m.courtAssigned === court.id
          );
          acc[court.id] = match || null;
          return acc;
        }, {} as { [courtId: string]: TournamentMatch | null })
      }));

      days.push({ date, slots: daySlots });
    }

    return days;
  };

  const handleCourtAssignment = async (matchId: string) => {
    if (!selectedCourt || !selectedDate || !selectedTime) {
      toast.error('Please select court, date, and time');
      return;
    }

    setIsLoading(true);
    try {
      const updatedMatch = await tournamentsService.assignCourt(
        tournament.id,
        matchId,
        {
          courtId: selectedCourt,
          scheduledDate: selectedDate,
          startTime: selectedTime,
        }
      );

      if (onMatchUpdate) {
        onMatchUpdate(updatedMatch);
      }

      toast.success('Court assigned successfully');
      setEditingMatch(null);
      resetSelection();
    } catch (error) {
      toast.error('Failed to assign court');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSelection = () => {
    setSelectedCourt('');
    setSelectedDate('');
    setSelectedTime('');
  };

  const scheduleData = getScheduleData();

  const getMatchParticipants = (match: TournamentMatch) => {
    const p1 = match.participant1?.player 
      ? `${match.participant1.player.firstName} ${match.participant1.player.lastName}`
      : match.participant1?.team?.name || 'TBD';
    const p2 = match.participant2?.player
      ? `${match.participant2.player.firstName} ${match.participant2.player.lastName}`
      : match.participant2?.team?.name || 'TBD';
    return `${p1} vs ${p2}`;
  };

  const getMatchStatus = (match: TournamentMatch) => {
    switch (match.status) {
      case 'pending':
        return { label: 'Pending', color: 'bg-gray-100 text-gray-800' };
      case 'scheduled':
        return { label: 'Scheduled', color: 'bg-blue-100 text-blue-800' };
      case 'in_progress':
        return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' };
      case 'completed':
        return { label: 'Completed', color: 'bg-green-100 text-green-800' };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tournament Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(addDays(currentWeek, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(new Date())}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(addDays(currentWeek, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {courts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No courts available for scheduling
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b font-medium text-sm w-20">Time</th>
                  {scheduleData.map((day) => (
                    <th 
                      key={day.date.toISOString()} 
                      className="text-center p-2 border-b font-medium text-sm min-w-[150px]"
                    >
                      <div>{format(day.date, 'EEE')}</div>
                      <div className="text-xs text-gray-500">{format(day.date, 'MMM d')}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((timeSlot) => (
                  <React.Fragment key={timeSlot}>
                    <tr>
                      <td className="p-2 border-b text-sm font-medium" rowSpan={courts.length + 1}>
                        {timeSlot}
                      </td>
                    </tr>
                    {courts.map((court) => (
                      <tr key={court.id}>
                        {scheduleData.map((day) => {
                          const slot = day.slots.find(s => s.time === timeSlot);
                          const match = slot?.courts[court.id];
                          
                          return (
                            <td 
                              key={`${day.date.toISOString()}-${court.id}`}
                              className="p-1 border-b border-r"
                            >
                              {match ? (
                                <div
                                  className={cn(
                                    "p-2 rounded text-xs cursor-pointer transition-all",
                                    match.status === 'completed' ? 'bg-green-50' :
                                    match.status === 'in_progress' ? 'bg-yellow-50' :
                                    'bg-blue-50 hover:bg-blue-100'
                                  )}
                                  onClick={() => editable && setEditingMatch(match.id)}
                                >
                                  <div className="font-medium mb-1">
                                    {court.name}
                                  </div>
                                  <div className="text-gray-600 truncate">
                                    {getMatchParticipants(match)}
                                  </div>
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-xs mt-1", getMatchStatus(match).color)}
                                  >
                                    {getMatchStatus(match).label}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="p-2 text-center text-gray-400 text-xs">
                                  {court.name}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Unscheduled Matches */}
        {editable && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-3">Unscheduled Matches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {matches
                .filter(m => !m.courtAssigned || !m.scheduledDate)
                .map((match) => (
                  <div
                    key={match.id}
                    className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          Round {match.round} - Match {match.bracketPosition}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {getMatchParticipants(match)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMatch(match.id);
                          setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Court Assignment Modal */}
        {editingMatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Assign Court & Time</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="court">Court</Label>
                  <Select value={selectedCourt || ''} onValueChange={setSelectedCourt}>
                    <SelectTrigger id="court">
                      <SelectValue placeholder="Select court" />
                    </SelectTrigger>
                    <SelectContent>
                      {courts.map((court) => (
                        <SelectItem key={court.id} value={court.id || ''}>
                          {court.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="date">Date</Label>
                  <input
                    id="date"
                    type="date"
                    value={selectedDate || ''}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <Label htmlFor="time">Time</Label>
                  <Select value={selectedTime || ''} onValueChange={setSelectedTime}>
                    <SelectTrigger id="time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time || ''}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingMatch(null);
                    resetSelection();
                  }}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCourtAssignment(editingMatch)}
                  disabled={!selectedCourt || !selectedDate || !selectedTime || isLoading}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}