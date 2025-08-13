'use client';

import React, { useState } from 'react';
import { Tournament } from '@/types/tournament';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Play, 
  Pause, 
  X, 
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import { tournamentsService } from '@/lib/api/services/tournaments.service';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TournamentAdminPanelProps {
  tournament: Tournament;
  onTournamentUpdate: (tournament: Tournament) => void;
}

export function TournamentAdminPanel({
  tournament,
  onTournamentUpdate,
}: TournamentAdminPanelProps) {
  const [isGeneratingBracket, setIsGeneratingBracket] = useState(false);
  const [isAdvancingRound, setIsAdvancingRound] = useState(false);
  const [seedingMethod, setSeedingMethod] = useState<'random' | 'ranking' | 'manual'>('random');

  const canGenerateBracket = 
    tournament.status === 'registration_closed' && 
    tournament.currentParticipants >= 2;

  const canStartTournament = 
    tournament.status === 'registration_closed' || 
    tournament.status === 'upcoming';

  const canAdvanceRound = tournament.status === 'in_progress';

  const handleGenerateBracket = async () => {
    setIsGeneratingBracket(true);
    try {
      const bracket = await tournamentsService.generateBracket(tournament.id, {
        seedingMethod,
        format: tournament.format === 'elimination' ? 'single_elimination' : 'double_elimination',
      });
      
      toast.success('Bracket generated successfully!');
      onTournamentUpdate({ ...tournament, status: 'upcoming' });
    } catch (error) {
      toast.error('Failed to generate bracket');
          } finally {
      setIsGeneratingBracket(false);
    }
  };

  const handleStartTournament = async () => {
    try {
      const updated = await tournamentsService.updateTournament(tournament.id, {
        status: 'in_progress',
      });
      toast.success('Tournament started!');
      onTournamentUpdate(updated);
    } catch (error) {
      toast.error('Failed to start tournament');
    }
  };

  const handlePauseTournament = async () => {
    try {
      const updated = await tournamentsService.updateTournament(tournament.id, {
        status: 'registration_closed',
      });
      toast.success('Tournament paused');
      onTournamentUpdate(updated);
    } catch (error) {
      toast.error('Failed to pause tournament');
    }
  };

  const handleAdvanceRound = async () => {
    setIsAdvancingRound(true);
    try {
      await tournamentsService.advanceRound(tournament.id);
      toast.success('Advanced to next round!');
      // Refresh tournament data
      const updated = await tournamentsService.getTournament(tournament.id);
      onTournamentUpdate(updated);
    } catch (error) {
      toast.error('Failed to advance round');
    } finally {
      setIsAdvancingRound(false);
    }
  };

  const handleFinalizeTournament = async () => {
    if (!confirm('Are you sure you want to finalize this tournament? This action cannot be undone.')) {
      return;
    }

    try {
      const finalized = await tournamentsService.finalizeTournament(tournament.id);
      toast.success('Tournament finalized!');
      onTournamentUpdate(finalized);
    } catch (error) {
      toast.error('Failed to finalize tournament');
    }
  };

  const handleExportData = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const blob = await tournamentsService.exportTournament(tournament.id, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tournament.name.replace(/\s+/g, '_')}_${format}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Tournament data exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export tournament data');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Tournament Administration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tournament Status */}
        <div>
          <h3 className="text-sm font-medium mb-3">Tournament Status</h3>
          <div className="flex items-center gap-4">
            <Badge 
              variant={tournament.status === 'in_progress' ? 'default' : 'secondary'}
              className="text-sm"
            >
              {tournament.status.replace('_', ' ').toUpperCase()}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              {tournament.currentParticipants}/{tournament.maxParticipants} participants
            </div>
          </div>
        </div>

        <Separator />

        {/* Bracket Generation */}
        {canGenerateBracket && (
          <>
            <div>
              <h3 className="text-sm font-medium mb-3">Bracket Generation</h3>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Generate the tournament bracket once all participants are confirmed.
                  This will close registration and prepare the tournament for play.
                </AlertDescription>
              </Alert>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="seeding">Seeding Method</Label>
                  <Select value={seedingMethod || ''} onValueChange={(value: any) => setSeedingMethod(value)}>
                    <SelectTrigger id="seeding" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random Seeding</SelectItem>
                      <SelectItem value="ranking">By Player Ranking</SelectItem>
                      <SelectItem value="manual">Manual Seeding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGenerateBracket}
                  disabled={isGeneratingBracket}
                  className="w-full"
                >
                  {isGeneratingBracket ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating Bracket...
                    </>
                  ) : (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Generate Bracket
                    </>
                  )}
                </Button>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Tournament Controls */}
        <div>
          <h3 className="text-sm font-medium mb-3">Tournament Controls</h3>
          <div className="grid grid-cols-2 gap-3">
            {canStartTournament && (
              <Button
                onClick={handleStartTournament}
                variant="default"
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Tournament
              </Button>
            )}
            
            {tournament.status === 'in_progress' && (
              <>
                <Button
                  onClick={handlePauseTournament}
                  variant="outline"
                  className="w-full"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Tournament
                </Button>
                
                <Button
                  onClick={handleAdvanceRound}
                  disabled={isAdvancingRound}
                  variant="secondary"
                  className="w-full"
                >
                  {isAdvancingRound ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Advancing...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Advance Round
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={handleFinalizeTournament}
                  variant="destructive"
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalize Tournament
                </Button>
              </>
            )}
            
            {tournament.status === 'cancelled' && (
              <div className="col-span-2 text-center text-sm text-gray-500">
                This tournament has been cancelled.
              </div>
            )}
            
            {tournament.status === 'completed' && (
              <div className="col-span-2 text-center text-sm text-green-600 font-medium">
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Tournament Completed
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Data Export */}
        <div>
          <h3 className="text-sm font-medium mb-3">Export Data</h3>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => handleExportData('pdf')}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button
              onClick={() => handleExportData('excel')}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Excel
            </Button>
            <Button
              onClick={() => handleExportData('csv')}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}