'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MapPin, Users, Star, TrendingUp, Clock, 
  Wifi, Car, Award, Calendar, ChevronRight,
  Sparkles, Shield, Zap
} from 'lucide-react';
// import { useClubStore } from '@/lib/stores/club-store';
import { cn } from '@/lib/utils';
import { ClubUI } from '@/types/club-unified';
import { clubDesignTokens as tokens } from '@/styles/club-design-tokens';

interface ModernClubCardProps {
  club: ClubUI;
  viewMode?: 'grid' | 'list';
  onQuickAction?: (action: string) => void;
  featured?: boolean;
}

export const ModernClubCard: React.FC<ModernClubCardProps> = ({ 
  club, 
  viewMode = 'grid',
  onQuickAction,
  featured = false 
}) => {
  // const { selectClub, setCurrentClub } = useClubStore();
  const router = useRouter();
  
  // Dynamic gradient based on tier
  const tierGradient = tokens.colors.tier[club.tier].gradient;
  const tierGlow = tokens.colors.tier[club.tier].glow;
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Temporalmente deshabilitado para evitar loops
    // selectClub(club.id);
    // setCurrentClub(club.id);
    router.push(`/${club.slug}`);
  };
  
  if (viewMode === 'list') {
    return <ModernClubCardList club={club} onQuickAction={onQuickAction} featured={featured} />;
  }
  
  return <ModernClubCardGrid club={club} onQuickAction={onQuickAction} featured={featured} />;
};

/**
 * Grid View - Maximum visual impact
 */
const ModernClubCardGrid: React.FC<ModernClubCardProps> = ({ club, onQuickAction, featured }) => {
  // const { selectClub, setCurrentClub } = useClubStore();
  const router = useRouter();
  const statusColor = tokens.colors.status[club.status.isOpen ? 'open' : 'closed'];
  
  // Dynamic gradient based on tier
  const tierGradient = tokens.colors.tier[club.tier]?.gradient || 'from-blue-500 to-purple-600';
  const tierGlow = tokens.colors.tier[club.tier]?.glow || 'shadow-blue-500/20';
  
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
    
    // Temporalmente deshabilitado
    // selectClub(club.id);
    // setCurrentClub(club.id);
    router.push(`/${club.slug}`);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={handleCardClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl cursor-pointer",
        tokens.effects.cardShadow,
        tokens.effects.transition,
        "hover:shadow-2xl",
        featured && cn("ring-2 ring-indigo-500", tokens.effects.glowPrimary)
      )}
    >
      {/* Cover Image with Overlay */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={club.coverImage} 
          alt={club.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              "px-3 py-1.5 rounded-full backdrop-blur-md",
              statusColor.bg,
              statusColor.border,
              "border",
              "flex items-center gap-2"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full animate-pulse", statusColor.dot)} />
            <span className={cn("text-xs font-medium", statusColor.text)}>
              {club.status.statusText}
            </span>
          </motion.div>
        </div>
        
        {/* Tier Badge */}
        {club.tier !== 'basic' && (
          <div className="absolute top-4 left-4">
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              "bg-gradient-to-r",
              tokens.colors.tier[club.tier].gradient,
              "text-white shadow-lg"
            )}>
              {club.tier}
            </div>
          </div>
        )}
        
        {/* Club Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {club.name}
              </h3>
              <div className="flex items-center gap-2 text-white/80">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{club.location.city || club.location.address}</span>
              </div>
            </div>
            
            {/* Logo */}
            <div className="w-16 h-16 rounded-xl overflow-hidden ring-4 ring-white/20 backdrop-blur-sm">
              <img src={club.logo_url} alt={`${club.name} logo`} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-6 bg-white dark:bg-gray-800">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <QuickStat
            icon={Users as any}
            value={club.stats.members.total || ''}
            label="Miembros"
            trend={club.stats.members.growth}
          />
          <QuickStat
            icon={Star as any}
            value={club.stats.rating.value || ''}
            label="Rating"
            suffix={`(${club.stats.rating.count})`}
          />
          <QuickStat
            icon={TrendingUp as any}
            value={`${club.stats.occupancy.average || ''}%`}
            label="Ocupación"
            trend={club.stats.occupancy.current - club.stats.occupancy.average}
          />
        </div>
        
        {/* Highlights */}
        {club.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {club.highlights.map((highlight, i) => (
              <span
                key={i}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
                  "bg-gradient-to-r from-indigo-50 to-purple-50",
                  "text-indigo-700 text-xs font-medium",
                  "border border-indigo-100"
                )}
              >
                <Sparkles className="w-3 h-3" />
                {highlight}
              </span>
            ))}
          </div>
        )}
        
        {/* Services Icons */}
        <div className="flex items-center gap-3 mb-6">
          {club.services.filter(s => s.highlight).map(service => (
            <div
              key={service.id}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "bg-gray-100 dark:bg-gray-700",
                service.available ? "opacity-100" : "opacity-50"
              )}
              title={service.name}
            >
              <span className="text-lg">{service.icon}</span>
            </div>
          ))}
          
          {/* More services indicator */}
          {club.services.length > 4 && (
            <div className="text-sm text-gray-500">
              +{club.services.length - 4} más
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.('book');
            }}
            className={cn(
              "px-4 py-2.5 rounded-xl font-medium text-sm",
              "bg-gradient-to-r",
              tokens.components.actionButton.primary,
              "shadow-lg shadow-indigo-500/25"
            )}
          >
            Reservar Pista
          </motion.button>
          
          <Link
            href={`/${club.slug}`}
            className={cn(
              "px-4 py-2.5 rounded-xl font-medium text-sm",
              "bg-white dark:bg-gray-800",
              "border border-gray-200 dark:border-gray-700",
              "hover:bg-gray-50 dark:hover:bg-gray-750",
              "flex items-center justify-center gap-2",
              tokens.effects.transition
            )}
          >
            Ver Club
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {/* Premium Features for Elite Clubs */}
        {club.tier === 'elite' && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-600">
                Club Elite Verificado
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Hover Effect Glow */}
      <div 
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100",
          "bg-gradient-to-r",
          tierGradient,
          "blur-3xl -z-10 scale-110",
          tokens.effects.transition
        )}
      />
    </motion.div>
  );
};

/**
 * List View - Information density with style
 */
const ModernClubCardList: React.FC<ModernClubCardProps> = ({ club, onQuickAction, featured }) => {
  // const { selectClub, setCurrentClub } = useClubStore();
  const router = useRouter();
  const statusColor = tokens.colors.status[club.status.isOpen ? 'open' : 'closed'];
  
  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Temporalmente deshabilitado
    // selectClub(club.id);
    // setCurrentClub(club.id);
    router.push(`/${club.slug}`);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      onClick={handleCardClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl cursor-pointer",
        "bg-white dark:bg-gray-800",
        tokens.effects.cardShadow,
        tokens.effects.transition,
        "hover:shadow-2xl",
        featured && "ring-2 ring-indigo-500"
      )}
    >
      <div className="flex">
        {/* Image Section */}
        <div className="relative w-64 h-48">
          <img 
            src={club.coverImage} 
            alt={club.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
          
          {/* Logo Overlay */}
          <div className="absolute bottom-4 left-4 w-16 h-16 rounded-xl overflow-hidden ring-4 ring-white/20 backdrop-blur-sm">
            <img src={club.logo_url} alt={`${club.name} logo`} className="w-full h-full object-cover" />
          </div>
        </div>
        
        {/* Content Section */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {club.name}
                </h3>
                
                {/* Tier Badge */}
                {club.tier !== 'basic' && (
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold uppercase",
                    tokens.colors.tier[club.tier].badge
                  )}>
                    {club.tier}
                  </div>
                )}
                
                {/* Verified Badge */}
                {club.verified && (
                  <Shield className="w-5 h-5 text-blue-500" />
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{club.location.city || club.location.address}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className={cn("font-medium", statusColor.text)}>
                    {club.status.statusText}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
              e.stopPropagation();
              onQuickAction?.('book');
            }}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-medium text-sm",
                  "bg-gradient-to-r",
                  tokens.components.actionButton.primary,
                  "shadow-lg shadow-indigo-500/25"
                )}
              >
                <Zap className="w-4 h-4 inline mr-2" />
                Reserva Rápida
              </motion.button>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-6 mb-4">
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {club.stats.members.total}
              </div>
              <div className="text-xs text-gray-500">Miembros</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
                {club.stats.rating.value}
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
              <div className="text-xs text-gray-500">{club.stats.rating.count} reviews</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {club.stats.occupancy.average}%
              </div>
              <div className="text-xs text-gray-500">Ocupación</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {club.courts?.length || 0}
              </div>
              <div className="text-xs text-gray-500">Pistas</div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-green-600">
                +{club.stats.members.growth}%
              </div>
              <div className="text-xs text-gray-500">Crecimiento</div>
            </div>
          </div>
          
          {/* Features and Services */}
          <div className="flex items-center gap-2">
            {club.highlights.slice(0, 3).map((highlight, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium"
              >
                {highlight}
              </span>
            ))}
            
            <div className="flex items-center gap-2 ml-auto">
              {club.services.filter(s => s.highlight).slice(0, 5).map(service => (
                <div
                  key={service.id}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                  title={service.name}
                >
                  <span className="text-sm">{service.icon}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Quick Stat Component
 */
const QuickStat: React.FC<{
  icon: any;
  value: string | number;
  label: string;
  trend?: number;
  suffix?: string;
}> = ({ icon: Icon, value, label, trend, suffix }) => {
  const trendColor = trend && trend > 0 ? 'text-green-600' : trend && trend < 0 ? 'text-red-600' : 'text-gray-600';
  
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 mb-2">
        <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">
        {value}
        {suffix && <span className="text-xs font-normal text-gray-500 ml-1">{suffix}</span>}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
      {trend !== undefined && (
        <div className={cn("text-xs font-medium mt-1", trendColor)}>
          {trend > 0 ? '+' : ''}{trend}%
        </div>
      )}
    </div>
  );
};

export default ModernClubCard;