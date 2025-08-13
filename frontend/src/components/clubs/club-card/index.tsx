'use client';

import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Club, ClubViewMode } from '@/types/club';
import { adaptClubForUI } from '@/lib/adapters/club-adapter';
import { ClubUI } from '@/types/club-unified';
import { ModernClubCard } from '../club-card-modern';
import { useActiveClubStore, selectIsActiveClub } from '@/store/clubs/activeClubStore';
import { useClubsUIStore } from '@/store/clubs/clubsUIStore';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { shallow } from 'zustand/shallow';

// Sub-components
import { ClubLogo } from './club-logo';
import { ClubStatus } from './club-status';
import { ClubInfo } from './club-info';
import { ClubStats } from './club-stats';
import { ClubActions } from './club-actions';
import { ClubFeatures } from './club-features';

interface ClubCardProps {
  club: Club;
  viewMode: ClubViewMode;
  useModernDesign?: boolean;
}

export const ClubCard = memo<ClubCardProps>(({ club, viewMode, useModernDesign = true }) => {
  const { t } = useTranslation();
  
  // Use specialized stores
  const switchClub = useActiveClubStore((state) => state.switchClub);
  const isActive = useActiveClubStore(selectIsActiveClub(club.id));
  const { openDetail, openForm } = useClubsUIStore(
    (state) => ({
      openDetail: state.openDetail,
      openForm: state.openForm
    }),
    shallow
  );
  
  // Define handlers first to follow hooks rules
  const handleSetActive = useCallback(() => switchClub(club.id), [club.id, switchClub]);
  const handleView = useCallback(() => openDetail(club), [club, openDetail]);
  const handleEdit = useCallback(() => openForm(club), [club, openForm]);
  const handleManage = useCallback(() => {
    // Navigate to club management
    window.location.href = `/clubs/${club.id}/manage`;
  }, [club.id]);

  // Use modern design if enabled
  if (useModernDesign) {
    const clubUI = adaptClubForUI(club as any);
    return <ModernClubCard club={clubUI} viewMode={viewMode} />;
  }

  if (viewMode === 'list') {
    return <ClubCardList 
      club={club} 
      isActive={isActive}
      onSetActive={handleSetActive}
      onView={handleView}
      onEdit={handleEdit}
      onManage={handleManage}
    />;
  }

  return <ClubCardGrid 
    club={club} 
    isActive={isActive}
    onSetActive={handleSetActive}
    onView={handleView}
    onEdit={handleEdit}
    onManage={handleManage}
  />;
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.club.id === nextProps.club.id &&
    prevProps.club.name === nextProps.club.name &&
    prevProps.club.logo_url === nextProps.club.logo_url &&
    prevProps.club.cover_image_url === nextProps.club.cover_image_url &&
    prevProps.club.schedule === nextProps.club.schedule &&
    prevProps.club.courts?.length === nextProps.club.courts?.length &&
    prevProps.club.total_members === nextProps.club.total_members &&
    prevProps.club.average_occupancy === nextProps.club.average_occupancy &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.useModernDesign === nextProps.useModernDesign
  );
});

ClubCard.displayName = 'ClubCard';

// List view component
const ClubCardList = memo<{
  club: Club;
  isActive: boolean;
  onSetActive: () => void;
  onView: () => void;
  onEdit: () => void;
  onManage: () => void;
}>(({ club, isActive, onSetActive, onView, onEdit, onManage }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm border transition-all',
        isActive
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-gray-200 dark:border-gray-700'
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <ClubLogo logo={club.logo_url} name={club.name} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <Typography variant="h4" className="truncate">
                  {club.name}
                </Typography>
                {isActive && (
                  <Badge variant="primary" className="shrink-0">
                    {t('clubs.active')}
                  </Badge>
                )}
              </div>

              <ClubInfo club={club} variant="compact" />

              <div className="mt-3">
                <ClubStats 
                  courts={club.courts?.length || 0}
                  members={club.total_members || 0}
                  occupancy={club.average_occupancy || 0}
                />
              </div>

              <div className="mt-3">
                <ClubStatus schedule={club.schedule} size="md" />
              </div>
            </div>
          </div>

          <ClubActions
            clubId={club.id}
            isActive={isActive}
            onView={onView}
            onEdit={onEdit}
            onSetActive={!isActive ? onSetActive : undefined}
            onManage={onManage}
          />
        </div>
      </div>
    </motion.div>
  );
});

ClubCardList.displayName = 'ClubCardList';

// Grid view component
const ClubCardGrid = memo<{
  club: Club;
  isActive: boolean;
  onSetActive: () => void;
  onView: () => void;
  onEdit: () => void;
  onManage: () => void;
}>(({ club, isActive, onSetActive, onView, onEdit, onManage }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={cn(
          'overflow-hidden cursor-pointer transition-all h-full',
          isActive && 'ring-2 ring-blue-500 border-blue-500'
        )}
        onClick={onView}
      >
        {/* Club Image/Logo Header */}
        <div className="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600">
          {club.cover_image_url ? (
            <img
              src={club.cover_image_url}
              alt={club.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ClubLogo logo={club.logo_url} name={club.name} size="xl" as any />
            </div>
          )}
          
          {isActive && (
            <Badge 
              variant="primary" 
              className="absolute top-4 right-4"
            >
              {t('clubs.active')}
            </Badge>
          )}
        </div>

        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <Typography variant="h4" className="truncate mb-1">
                {club.name}
              </Typography>
              <ClubStatus schedule={club.schedule} size="sm" />
            </div>
            
            <div onClick={(e) => e.stopPropagation()}>
              <ClubActions
                clubId={club.id}
                isActive={isActive}
                onView={onView}
                onEdit={onEdit}
                onSetActive={!isActive ? onSetActive : undefined}
                onManage={onManage}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <ClubInfo club={club} variant="compact" />
          
          <ClubStats 
            courts={club.courts?.length || 0}
            members={club.total_members || 0}
            occupancy={club.average_occupancy || 0}
            variant="grid"
          />

          {(club.features?.length > 0 || club.services?.length > 0) && (
            <ClubFeatures 
              features={club.features}
              services={club.services}
              variant="badges"
              max={3}
            />
          )}
        </CardContent>

        <CardFooter 
          className="flex justify-between gap-2" 
          onClick={(e) => e.stopPropagation()}
        >
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onView}
            className="flex-1"
          >
            {t('clubs.viewDetails')}
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={onManage}
            className="flex-1"
          >
            {t('clubs.manageSettings')}
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
});

ClubCardGrid.displayName = 'ClubCardGrid';

// Re-export sub-components for individual use
export { ClubLogo, ClubStatus, ClubInfo, ClubStats, ClubActions, ClubFeatures };