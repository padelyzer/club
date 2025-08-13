'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClubs } from '@/lib/api/hooks/useClubs';

interface LeagueFiltersProps {
  filters: {
    status: string;
    sport: string;
    clubId?: number;
  };
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
}

export function LeagueFilters({
  filters,
  onFiltersChange,
  onClose,
}: LeagueFiltersProps) {
  const { data: clubsData } = useClubs();

  const handleStatusChange = (value: string) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handleSportChange = (value: string) => {
    onFiltersChange({ ...filters, sport: value });
  };

  const handleClubChange = (value: string) => {
    onFiltersChange({
      ...filters,
      clubId: value === 'all' ? undefined : parseInt(value),
    });
  };

  const handleReset = () => {
    onFiltersChange({
      status: 'all',
      sport: 'all',
      clubId: undefined,
    });
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.sport !== 'all' ||
    filters.clubId !== undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">Filters</CardTitle>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2 lg:px-3"
            >
              Reset
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={filters.status || ''} onValueChange={handleStatusChange}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="registration_open">
                Registration Open
              </SelectItem>
              <SelectItem value="registration_closed">
                Registration Closed
              </SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sport">Sport</Label>
          <Select value={filters.sport || ''} onValueChange={handleSportChange}>
            <SelectTrigger id="sport">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="padel">Padel</SelectItem>
              <SelectItem value="tennis">Tennis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="club">Club</Label>
          <Select
            value={filters.clubId?.toString() || 'all'}
            onValueChange={handleClubChange}
          >
            <SelectTrigger id="club">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clubs</SelectItem>
              {clubsData?.results.map((club: any) => (
                <SelectItem key={club.id} value={club.id.toString() || ''}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
