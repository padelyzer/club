'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TournamentForm } from './tournament-form';
import { Tournament } from '@/types/tournament';
import { TournamentTemplateData } from '@/lib/validations/tournament-form';

// Mock templates for demonstration
const mockTemplates: TournamentTemplateData[] = [
  {
    name: 'Quick Weekend Tournament',
    description: 'Fast-paced elimination tournament perfect for weekends',
    format: 'elimination',
    category: 'open',
    maxParticipants: 16,
    minParticipants: 8,
    entryFee: 20,
    prizeMoney: 200,
    pointsSystem: 'standard',
    rules: 'Standard padel rules apply. Matches are best of 3 sets.',
    isDefault: true,
  },
  {
    name: 'Professional Championship',
    description: 'High-level competition with substantial prizes',
    format: 'groups',
    category: 'professional',
    maxParticipants: 32,
    minParticipants: 16,
    entryFee: 100,
    prizeMoney: 5000,
    pointsSystem: 'advantage',
    rules:
      'Professional tournament rules. Certified referees required for all matches.',
    isDefault: true,
  },
  {
    name: 'Beginners League',
    description: 'Learning-focused tournament for new players',
    format: 'round-robin',
    category: 'beginner',
    maxParticipants: 12,
    minParticipants: 6,
    entryFee: 15,
    prizeMoney: 150,
    pointsSystem: 'no-advantage',
    rules: 'Beginner-friendly rules. Coaching allowed between sets.',
    isDefault: true,
  },
];

/**
 * Example component showing how to use the TournamentForm
 * This would typically be integrated into the main tournaments page
 */
export const TournamentFormExample: React.FC = () => {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(
    null
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<TournamentTemplateData | null>(null);
  const [mode, setMode] = useState<'create' | 'edit' | 'clone'>('create');

  const handleCreateTournament = () => {
    setEditingTournament(null);
    setSelectedTemplate(null);
    setMode('create');
    setIsFormOpen(true);
  };

  const handleCreateFromTemplate = (template: TournamentTemplateData) => {
    setEditingTournament(null);
    setSelectedTemplate(template);
    setMode('create');
    setIsFormOpen(true);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setSelectedTemplate(null);
    setMode('edit');
    setIsFormOpen(true);
  };

  const handleCloneTournament = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setSelectedTemplate(null);
    setMode('clone');
    setIsFormOpen(true);
  };

  const handleFormSuccess = (tournament: Tournament) => {
    setIsFormOpen(false);
    setEditingTournament(null);
    setSelectedTemplate(null);

    // Here you would typically refresh the tournaments list
    // or navigate to the tournament detail page
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTournament(null);
    setSelectedTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('tournaments.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('tournaments.subtitle')}
          </p>
        </div>

        <div className="flex space-x-3">
          <Button
            onClick={handleCreateTournament}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('tournaments.createTournament')}
          </Button>
        </div>
      </div>

      {/* Quick action templates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {mockTemplates.map((template, index) => (
          <div
            key={index}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              {template.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {template.description}
            </p>
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">
                    {t('tournaments.form.participants')}:
                  </span>
                  <span className="font-medium">
                    {template.minParticipants}-{template.maxParticipants}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">
                    {t('tournaments.form.entryFee')}:
                  </span>
                  <span className="font-medium">€{template.entryFee}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateFromTemplate(template)}
              >
                {t('tournaments.useTemplate')}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Mock tournament list for demo */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          {t('tournaments.existing')}
        </h2>
        <div className="space-y-3">
          {[
            {
              id: '1',
              name: 'Spring Championship 2024',
              status: 'upcoming',
              participants: '8/16',
              startDate: '2024-03-15',
            },
            {
              id: '2',
              name: 'Winter League Finals',
              status: 'registration_open',
              participants: '12/24',
              startDate: '2024-02-28',
            },
          ].map((tournament) => (
            <div
              key={tournament.id}
              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {tournament.name}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{tournament.participants} participants</span>
                  <span>{tournament.startDate}</span>
                  <span className="capitalize">
                    {tournament.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTournament(tournament as any)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {t('common.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCloneTournament(tournament as any)}
                >
                  {t('tournaments.clone')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tournament Form Modal */}
      <TournamentForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        tournament={editingTournament}
        onSuccess={handleFormSuccess}
        defaultTemplate={selectedTemplate || undefined}
        mode={mode}
      />
    </div>
  );
};

export default TournamentFormExample;
