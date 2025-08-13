'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useUIStore } from '@/store/ui';
import { useClubs } from '@/lib/api/hooks/useClubs';
import { useCreateLeague, useUpdateLeague } from '@/lib/api/hooks/useLeagues';
import { League, LeagueFormData } from '@/types/league';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const leagueSchema = z
  .object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    description: z.string().optional(),
    club_id: z.number().min(1, 'Please select a club'),
    sport: z.enum(['padel', 'tennis']),
    type: z.enum([
      'round_robin',
      'single_elimination',
      'double_elimination',
      'groups',
    ]),
    start_date: z.date(),
    end_date: z.date(),
    registration_deadline: z.date(),
    max_participants: z.number().min(2, 'At least 2 participants required'),
    entry_fee: z.number().min(0).optional(),
    currency: z.string().optional(),
    rules: z.string().optional(),
    prizes: z.string().optional(),
    // Match settings
    match_duration: z.number().min(30).max(180),
    sets_per_match: z.number().min(1).max(5),
    games_per_set: z.number().min(4).max(9),
    tie_break: z.boolean(),
    golden_point: z.boolean(),
    // Team settings
    allow_substitutions: z.boolean(),
    min_players_per_team: z.number().min(1).max(4),
    max_players_per_team: z.number().min(1).max(6),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: 'End date must be after start date',
    path: ['end_date'],
  })
  .refine((data) => data.registration_deadline < data.start_date, {
    message: 'Registration deadline must be before start date',
    path: ['registration_deadline'],
  })
  .refine((data) => data.max_players_per_team >= data.min_players_per_team, {
    message: 'Max players must be greater than or equal to min players',
    path: ['max_players_per_team'],
  });

type LeagueFormValues = z.infer<typeof leagueSchema>;

interface LeagueFormProps {
  league?: League;
}

export function LeagueForm({ league }: LeagueFormProps) {
  const router = useRouter();
  const { activeModal, closeModal } = useUIStore();
  const { data: clubsData } = useClubs();
  const createLeague = useCreateLeague();
  const updateLeague = useUpdateLeague(league?.id || 0);

  const isOpen = activeModal === 'league-form';
  const isEditing = !!league;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueSchema),
    defaultValues: {
      name: league?.name || '',
      description: league?.description || '',
      club_id: league?.club_id || 0,
      sport: league?.sport || 'padel',
      type: league?.type || 'round_robin',
      start_date: league ? new Date(league.start_date) : new Date(),
      end_date: league ? new Date(league.end_date) : new Date(),
      registration_deadline: league
        ? new Date(league.registration_deadline)
        : new Date(),
      max_participants: league?.max_participants || 16,
      entry_fee: league?.entry_fee || 0,
      currency: league?.currency || 'EUR',
      rules: league?.rules || '',
      prizes: league?.prizes || '',
      match_duration: 90,
      sets_per_match: 3,
      games_per_set: 6,
      tie_break: true,
      golden_point: true,
      allow_substitutions: true,
      min_players_per_team: 2,
      max_players_per_team: 4,
    },
  });

  const watchedValues = watch();

  const onSubmit = async (data: LeagueFormValues) => {
    try {
      const formData: LeagueFormData = {
        name: data.name,
        description: data.description,
        club_id: data.club_id,
        sport: data.sport,
        type: data.type,
        start_date: format(data.start_date, 'yyyy-MM-dd'),
        end_date: format(data.end_date, 'yyyy-MM-dd'),
        registration_deadline: format(data.registration_deadline, 'yyyy-MM-dd'),
        max_participants: data.max_participants,
        entry_fee: data.entry_fee,
        currency: data.currency,
        rules: data.rules,
        prizes: data.prizes,
        scoring_system: {
          win_points: 3,
          draw_points: 1,
          loss_points: 0,
          walkover_points: 3,
        },
        match_settings: {
          duration: data.match_duration,
          sets_per_match: data.sets_per_match,
          games_per_set: data.games_per_set,
          tie_break: data.tie_break,
          golden_point: data.golden_point,
        },
        team_settings: {
          allow_substitutions: data.allow_substitutions,
          min_players: data.min_players_per_team,
          max_players: data.max_players_per_team,
        },
      };

      if (isEditing) {
        await updateLeague.mutateAsync(formData);
      } else {
        const newLeague = await createLeague.mutateAsync(formData);
        router.push(`/leagues/${newLeague.id}`);
      }

      closeModal();
      reset();
    } catch (error) {
          }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => closeModal()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit League' : 'Create New League'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the league information below'
              : 'Fill in the details to create a new competitive league'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">League Name*</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Summer Padel League 2024"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="club_id">Club*</Label>
                <Select
                  value={watchedValues.club_id?.toString() || ''}
                  onValueChange={(value) =>
                    setValue('club_id', parseInt(value))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a club" />
                  </SelectTrigger>
                  <SelectContent>
                    {clubsData?.results.map((club: any) => (
                      <SelectItem key={club.id} value={club.id.toString() || ''}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.club_id && (
                  <p className="text-sm text-destructive">
                    {errors.club_id.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the league format, rules, and prizes..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sport">Sport*</Label>
                <Select
                  value={watchedValues.sport || ''}
                  onValueChange={(value: any) => setValue('sport', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padel">Padel</SelectItem>
                    <SelectItem value="tennis">Tennis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tournament Type*</Label>
                <Select
                  value={watchedValues.type || ''}
                  onValueChange={(value: any) => setValue('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="single_elimination">
                      Single Elimination
                    </SelectItem>
                    <SelectItem value="double_elimination">
                      Double Elimination
                    </SelectItem>
                    <SelectItem value="groups">Groups + Knockout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Schedule</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Registration Deadline*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !watchedValues.registration_deadline &&
                          'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedValues.registration_deadline ? (
                        format(watchedValues.registration_deadline, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedValues.registration_deadline}
                      onSelect={(date) =>
                        date && setValue('registration_deadline', date)
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.registration_deadline && (
                  <p className="text-sm text-destructive">
                    {errors.registration_deadline.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Start Date*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !watchedValues.start_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedValues.start_date ? (
                        format(watchedValues.start_date, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedValues.start_date}
                      onSelect={(date) => date && setValue('start_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.start_date && (
                  <p className="text-sm text-destructive">
                    {errors.start_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Date*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !watchedValues.end_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchedValues.end_date ? (
                        format(watchedValues.end_date, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={watchedValues.end_date}
                      onSelect={(date) => date && setValue('end_date', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.end_date && (
                  <p className="text-sm text-destructive">
                    {errors.end_date.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Registration & Fees */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Registration & Fees</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_participants">Max Participants*</Label>
                <Input
                  id="max_participants"
                  type="number"
                  {...register('max_participants', { valueAsNumber: true })}
                  min={2}
                />
                {errors.max_participants && (
                  <p className="text-sm text-destructive">
                    {errors.max_participants.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="entry_fee">Entry Fee</Label>
                <Input
                  id="entry_fee"
                  type="number"
                  step="0.01"
                  {...register('entry_fee', { valueAsNumber: true })}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={watchedValues.currency || ''}
                  onValueChange={(value) => setValue('currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Match Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Match Settings</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="match_duration">Match Duration (min)*</Label>
                <Input
                  id="match_duration"
                  type="number"
                  {...register('match_duration', { valueAsNumber: true })}
                  min={30}
                  max={180}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sets_per_match">Sets per Match*</Label>
                <Input
                  id="sets_per_match"
                  type="number"
                  {...register('sets_per_match', { valueAsNumber: true })}
                  min={1}
                  max={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="games_per_set">Games per Set*</Label>
                <Input
                  id="games_per_set"
                  type="number"
                  {...register('games_per_set', { valueAsNumber: true })}
                  min={4}
                  max={9}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="tie_break" className="cursor-pointer">
                  Tie Break
                </Label>
                <Switch
                  id="tie_break"
                  checked={watchedValues.tie_break}
                  onCheckedChange={(checked) => setValue('tie_break', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="golden_point" className="cursor-pointer">
                  Golden Point
                </Label>
                <Switch
                  id="golden_point"
                  checked={watchedValues.golden_point}
                  onCheckedChange={(checked) =>
                    setValue('golden_point', checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Team Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Team Settings</h3>

            <div className="flex items-center justify-between mb-4">
              <Label htmlFor="allow_substitutions" className="cursor-pointer">
                Allow Substitutions
              </Label>
              <Switch
                id="allow_substitutions"
                checked={watchedValues.allow_substitutions}
                onCheckedChange={(checked) =>
                  setValue('allow_substitutions', checked)
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_players_per_team">
                  Min Players per Team*
                </Label>
                <Input
                  id="min_players_per_team"
                  type="number"
                  {...register('min_players_per_team', { valueAsNumber: true })}
                  min={1}
                  max={4}
                />
                {errors.min_players_per_team && (
                  <p className="text-sm text-destructive">
                    {errors.min_players_per_team.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_players_per_team">
                  Max Players per Team*
                </Label>
                <Input
                  id="max_players_per_team"
                  type="number"
                  {...register('max_players_per_team', { valueAsNumber: true })}
                  min={1}
                  max={6}
                />
                {errors.max_players_per_team && (
                  <p className="text-sm text-destructive">
                    {errors.max_players_per_team.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rules & Prizes */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Additional Information</h3>

            <div className="space-y-2">
              <Label htmlFor="rules">Rules & Regulations</Label>
              <Textarea
                id="rules"
                {...register('rules')}
                placeholder="Enter specific rules for this league..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prizes">Prizes & Awards</Label>
              <Textarea
                id="prizes"
                {...register('prizes')}
                placeholder="Describe the prizes for winners..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => closeModal()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Update League'
              ) : (
                'Create League'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
