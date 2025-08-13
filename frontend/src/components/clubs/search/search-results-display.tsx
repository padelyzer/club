'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, MapPin, Star, TrendingUp, Filter, 
  Grid3X3, List, SortAsc, SortDesc, Eye,
  Sparkles, Clock, Users, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClubUI } from '@/types/club-unified';

/**
 * Search Results Display Component
 * Advanced results visualization with sorting, filtering, and animations
 */

interface SearchResultsDisplayProps {
  results: ClubUI[];
  query: string;
  totalClubs: number;
  viewMode: 'grid' | 'list';
  sortBy: 'relevance' | 'rating' | 'distance' | 'members' | 'name';
  sortOrder: 'asc' | 'desc';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onSortChange: (sortBy: string, order: 'asc' | 'desc') => void;
  onClubSelect: (club: ClubUI) => void;
  isLoading?: boolean;
}

const sortOptions = [
  { value: 'relevance', label: 'Relevancia', icon: Sparkles },
  { value: 'rating', label: 'Valoración', icon: Star },
  { value: 'members', label: 'Miembros', icon: Users },
  { value: 'distance', label: 'Distancia', icon: MapPin },
  { value: 'name', label: 'Nombre', icon: Filter }
];

export const SearchResultsDisplay: React.FC<SearchResultsDisplayProps> = ({
  results,
  query,
  totalClubs,
  viewMode,
  sortBy,
  sortOrder,
  onViewModeChange,
  onSortChange,
  onClubSelect,
  isLoading = false
}) => {
  
  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      // Toggle order if same sort field
      onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New sort field, default to desc for most fields
      const defaultOrder = newSortBy === 'name' ? 'asc' : 'desc';
      onSortChange(newSortBy, defaultOrder);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton viewMode={viewMode} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {results.length} {results.length === 1 ? 'Club' : 'Clubes'}
          </div>
          {query && (
            <div className="text-gray-600 dark:text-gray-400">
              para "<span className="font-semibold">{query}</span>
            </div>
          )}
          {results.length !== totalClubs && (
            <div className="text-sm text-gray-500">
              de {totalClubs} totales
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={`${sortBy || ''}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                onSortChange(field, order as 'asc' | 'desc');
              }}
              className={cn(
                "pl-4 pr-10 py-2 rounded-xl",
                "bg-white dark:bg-gray-800",
                "border border-gray-200 dark:border-gray-700",
                "text-sm font-medium",
                "focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
                "appearance-none cursor-pointer"
              )}
            >
              {sortOptions.map(option => (
                <React.Fragment key={option.value}>
                  <option value={`${option.value || ''}-desc`}>
                    {option.label} {option.value !== 'name' ? '↓' : '↑'}
                  </option>
                  <option value={`${option.value || ''}-asc`}>
                    {option.label} {option.value !== 'name' ? '↑' : '↓'}
                  </option>
                </React.Fragment>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {sortOrder === 'asc' ? (
                <SortAsc className="w-4 h-4 text-gray-400" />
              ) : (
                <SortDesc className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                viewMode === 'grid'
                  ? "bg-white dark:bg-gray-700 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('list')}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                viewMode === 'list'
                  ? "bg-white dark:bg-gray-700 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* No Results */}
      {results.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No encontramos clubes
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            {query ? (
              <>Intenta con otros términos de búsqueda o ajusta los filtros para encontrar más clubes.</>
            ) : (
              <>Ajusta los filtros para encontrar clubes que coincidan con tus preferencias.</>
            )}
          </p>
        </motion.div>
      )}

      {/* Results Grid/List */}
      {results.length > 0 && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${viewMode}-${sortBy}-${sortOrder}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            )}
          >
            {results.map((club, index) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                {viewMode === 'grid' ? (
                  <ClubCardGrid club={club} onSelect={() => onClubSelect(club)} />
                ) : (
                  <ClubCardList club={club} onSelect={() => onClubSelect(club)} />
                )}
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

// Grid View Card Component
const ClubCardGrid: React.FC<{ club: ClubUI; onSelect: () => void }> = ({ club, onSelect }) => {
  const tierColors = {
    elite: 'from-indigo-600 to-purple-600',
    premium: 'from-purple-600 to-pink-600',
    basic: 'from-gray-600 to-gray-700'
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onSelect}
      className="group cursor-pointer relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-lg hover:shadow-2xl transition-all duration-300"
    >
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${tierColors[club.tier]}`} />
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <div className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${club.status.isOpen ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-xs font-medium">{club.status.statusText}</span>
          </div>
        </div>
        
        {/* Tier Badge */}
        <div className="absolute top-4 left-4">
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase text-white bg-gradient-to-r ${tierColors[club.tier]}`}>
            {club.tier}
          </div>
        </div>
        
        {/* Club Info */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{club.name}</h3>
          <div className="flex items-center gap-2 text-white/90">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{club.location.city}</span>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <Users className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
            <div className="text-sm font-bold">{club.stats.members.total}</div>
            <div className="text-xs text-gray-500">Miembros</div>
          </div>
          <div className="text-center">
            <Star className="w-4 h-4 mx-auto mb-1 text-yellow-500" />
            <div className="text-sm font-bold">{club.stats.rating.value}</div>
            <div className="text-xs text-gray-500">Rating</div>
          </div>
          <div className="text-center">
            <Clock className="w-4 h-4 mx-auto mb-1 text-green-600" />
            <div className="text-sm font-bold">{club.stats.occupancy.average}%</div>
            <div className="text-xs text-gray-500">Ocupación</div>
          </div>
        </div>
        
        {/* Highlights */}
        <div className="flex flex-wrap gap-1 mb-4">
          {club.highlights.slice(0, 2).map((highlight, i) => (
            <span key={i} className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
              {highlight}
            </span>
          ))}
          {club.highlights.length > 2 && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
              +{club.highlights.length - 2}
            </span>
          )}
        </div>
        
        {/* Action Button */}
        <button className="w-full py-2 rounded-xl font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2">
          <Eye className="w-4 h-4" />
          Ver Detalles
        </button>
      </div>
    </motion.div>
  );
};

// List View Card Component  
const ClubCardList: React.FC<{ club: ClubUI; onSelect: () => void }> = ({ club, onSelect }) => {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={onSelect}
      className="group cursor-pointer bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
    >
      <div className="flex">
        {/* Image */}
        <div className="w-48 h-32 relative overflow-hidden flex-shrink-0">
          <div className={`absolute inset-0 bg-gradient-to-br ${
            club.tier === 'elite' ? 'from-indigo-600 to-purple-600' :
            club.tier === 'premium' ? 'from-purple-600 to-pink-600' :
            'from-gray-600 to-gray-700'
          }`} />
          
          {/* Status */}
          <div className="absolute top-2 right-2">
            <div className="px-2 py-1 rounded-full bg-white/90 backdrop-blur-md flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${club.status.isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs font-medium">{club.status.isOpen ? 'Abierto' : 'Cerrado'}</span>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                  {club.name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${
                  club.tier === 'elite' ? 'bg-indigo-100 text-indigo-700' :
                  club.tier === 'premium' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {club.tier}
                </span>
              </div>
              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{club.location.city}</span>
              </div>
            </div>
            
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium text-sm hover:shadow-lg transition-all duration-200 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Ver
            </button>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4 mb-3">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                {club.stats.rating.value}
              </div>
              <div className="text-xs text-gray-500">{club.stats.rating.count} reviews</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {club.stats.members.total}
              </div>
              <div className="text-xs text-gray-500">Miembros</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {club.stats.occupancy.average}%
              </div>
              <div className="text-xs text-gray-500">Ocupación</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                +{club.stats.members.growth}%
              </div>
              <div className="text-xs text-gray-500">Crecimiento</div>
            </div>
          </div>
          
          {/* Features */}
          <div className="flex items-center gap-2">
            {club.highlights.slice(0, 3).map((highlight, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-medium">
                {highlight}
              </span>
            ))}
            {club.highlights.length > 3 && (
              <span className="text-xs text-gray-500">+{club.highlights.length - 3} más</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Loading Skeleton Component
const LoadingSkeleton: React.FC<{ viewMode: 'grid' | 'list' }> = ({ viewMode }) => {
  const skeletonCount = viewMode === 'grid' ? 6 : 3;
  
  return (
    <div className={cn(
      viewMode === 'grid'
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        : "space-y-4"
    )}>
      {Array.from({ length: skeletonCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden",
            viewMode === 'list' && "flex"
          )}
        >
          {viewMode === 'grid' ? (
            <>
              <div className="h-48 bg-gray-200 dark:bg-gray-700" />
              <div className="p-6 space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-48 h-32 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
              <div className="flex-1 p-6 space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
};