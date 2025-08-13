import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  MapPin, 
  Users, 
  Star, 
  Calendar,
  Building2,
  ChevronRight,
  Wifi,
  Car,
  Coffee,
  Trophy,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import { Club, ClubViewMode } from '@/types/club';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { cn } from '@/lib/utils';
import { professionalDesignSystem } from '@/styles/professional-design-system';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';
import { useClubsUIStore } from '@/store/clubs/clubsUIStore';

interface ProfessionalClubCardProps {
  club: Club;
  viewMode: ClubViewMode;
  onView?: () => void;
  onEdit?: () => void;
  onSetActive?: () => void;
  featured?: boolean;
}

export const ProfessionalClubCard = memo<ProfessionalClubCardProps>(({ 
  club, 
  viewMode, 
  onView,
  onEdit,
  onSetActive,
  featured = false 
}) => {
  const { t } = useTranslation();
  const isActive = useActiveClubStore((state) => state.activeClub?.id === club.id);

  // Iconos para features (simplificado y elegante)
  const getFeatureIcon = (feature: string) => {
    const icons: Record<string, any> = {
      wifi: Wifi,
      parking: Car,
      cafeteria: Coffee,
      tournaments: Trophy,
      default: Building2,
    };
    const IconComponent = icons[feature.toLowerCase()] || icons.default;
    return <IconComponent className="w-3 h-3" />;
  };

  // Determinar estado visual del club
  const getClubStatus = () => {
    const now = new Date();
    const day = now.toLocaleDateString('en', { weekday: 'lowercase' });
    const time = now.toTimeString().slice(0, 5);
    
    const todaySchedule = club.schedule?.find(s => s.day === day);
    const isOpen = todaySchedule?.is_open && 
      time >= (todaySchedule.open_time || '00:00') && 
      time <= (todaySchedule.close_time || '23:59');

    return {
      isOpen,
      text: isOpen ? t('clubs.open') : t('clubs.closed'),
      color: isOpen ? 'text-green-600' : 'text-gray-500',
      bgColor: isOpen ? 'bg-green-50' : 'bg-gray-50',
      dotColor: isOpen ? 'bg-green-500' : 'bg-gray-400',
    };
  };

  const status = getClubStatus();

  if (viewMode === 'list') {
    return <ProfessionalClubCardList {...{ club, isActive, onView, onEdit, onSetActive, status }} />;
  }

  return <ProfessionalClubCardGrid {...{ club, isActive, onView, onEdit, onSetActive, status, featured }} />;
}, (prevProps, nextProps) => {
  return (
    prevProps.club.id === nextProps.club.id &&
    prevProps.club.name === nextProps.club.name &&
    prevProps.club.logo_url === nextProps.club.logo_url &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.featured === nextProps.featured
  );
});

ProfessionalClubCard.displayName = 'ProfessionalClubCard';

// Grid View - Diseño principal con glassmorphism
const ProfessionalClubCardGrid = memo<{
  club: Club;
  isActive: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onSetActive?: () => void;
  status: any;
  featured?: boolean;
}>(({ club, isActive, onView, onEdit, onSetActive, status, featured }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ 
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 30
      }}
      className="group relative h-full"
    >
      <Card 
        variant={featured ? "elevated" : "default"}
        padding="none"
        className={cn(
          "overflow-hidden cursor-pointer h-full",
          "border transition-all duration-300",
          isActive && "ring-2 ring-[#007AFF]/20 border-[#007AFF]",
          featured && "ring-2 ring-[#007AFF]/30",
          "hover:shadow-2xl hover:border-gray-300"
        )}
        onClick={onView}
      >
        {/* Header Image con Glassmorphism Overlay */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#007AFF] to-[#4299E1]">
          {club.cover_image_url ? (
            <img
              src={club.cover_image_url}
              alt={club.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-16 h-16 text-white/30" />
            </div>
          )}
          
          {/* Glassmorphism Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          
          {/* Status Badge */}
          <div className="absolute top-4 right-4">
            <div className={cn(
              "px-3 py-1.5 rounded-full backdrop-blur-md border border-white/20",
              "flex items-center gap-2 text-white text-xs font-medium",
              "bg-white/10"
            )}>
              <div className={cn("w-2 h-2 rounded-full", status.dotColor.replace('bg-', 'bg-'))} />
              {status.text}
            </div>
          </div>

          {/* Active Badge */}
          {isActive && (
            <div className="absolute top-4 left-4">
              <div className="px-3 py-1 rounded-full bg-[#007AFF] text-white text-xs font-semibold">
                {t('clubs.active')}
              </div>
            </div>
          )}

          {/* Logo Overlay */}
          <div className="absolute bottom-4 left-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden ring-4 ring-white/20 backdrop-blur-sm bg-white/10">
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 line-clamp-1">
              {club.name}
            </h3>
            
            {club.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="line-clamp-1">{club.address}</span>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 mx-auto mb-1">
                <Calendar className="w-5 h-5 text-[#007AFF]" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{club.courts?.length || 0}</p>
              <p className="text-xs text-gray-500">{t('clubs.courts')}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 mx-auto mb-1">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{club.total_members || 0}</p>
              <p className="text-xs text-gray-500">{t('clubs.members')}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-50 mx-auto mb-1">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{club.average_occupancy || 0}%</p>
              <p className="text-xs text-gray-500">{t('clubs.occupancy')}</p>
            </div>
          </div>

          {/* Features */}
          {club.features && club.features.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {club.features.slice(0, 3).map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 text-xs text-gray-600"
                >
                  {getFeatureIcon(feature)}
                  <span>{feature}</span>
                </div>
              ))}
              {club.features.length > 3 && (
                <div className="px-2.5 py-1 text-xs text-gray-500 font-medium">
                  +{club.features.length - 3} {t('common.more')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onView}
          >
            {t('clubs.viewDetails')}
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={onSetActive}
            disabled={isActive}
          >
            {isActive ? t('clubs.active') : t('clubs.setActive')}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
});

ProfessionalClubCardGrid.displayName = 'ProfessionalClubCardGrid';

// List View - Diseño horizontal minimalista
const ProfessionalClubCardList = memo<{
  club: Club;
  isActive: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onSetActive?: () => void;
  status: any;
}>(({ club, isActive, onView, onEdit, onSetActive, status }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        variant="default"
        padding="none"
        className={cn(
          "overflow-hidden cursor-pointer",
          "transition-all duration-200",
          isActive && "ring-2 ring-[#007AFF]/20 border-[#007AFF]",
          "hover:shadow-lg hover:border-gray-300"
        )}
        onClick={onView}
      >
        <div className="flex items-center p-6 gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-[#007AFF] to-[#4299E1]">
              {club.logo_url ? (
                <img src={club.logo_url} alt={club.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {club.name}
                  </h3>
                  {isActive && (
                    <span className="px-2 py-0.5 text-xs font-medium text-[#007AFF] bg-blue-50 rounded-md">
                      {t('clubs.active')}
                    </span>
                  )}
                </div>

                {club.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{club.address}</span>
                  </div>
                )}

                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{club.courts?.length || 0} {t('clubs.courts')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{club.total_members || 0} {t('clubs.members')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full", status.dotColor)} />
                    <span className={status.color}>{status.text}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onView}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  {t('clubs.view')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});

ProfessionalClubCardList.displayName = 'ProfessionalClubCardList';

export default ProfessionalClubCard;