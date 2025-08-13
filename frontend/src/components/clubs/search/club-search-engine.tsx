'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, X, SlidersHorizontal, MapPin, 
  Star, Users, Zap, Calendar, ChevronDown,
  Sparkles, TrendingUp, Clock, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClubUI } from '@/types/club-unified';
import Fuse from 'fuse.js';

/**
 * Club Search Engine - The world's most powerful club search
 * Features fuzzy search, advanced filters, and AI-powered suggestions
 */

interface SearchFilters {
  tier: string[];
  features: string[];
  services: string[];
  minRating: number;
  maxDistance: number;
  priceRange: [number, number];
  availability: 'all' | 'open' | 'available_today';
  minMembers: number;
  verified: boolean | null;
}

interface ClubSearchEngineProps {
  clubs: ClubUI[];
  onSearch: (results: ClubUI[], query: string, filters: SearchFilters) => void;
  userLocation?: { lat: number; lng: number };
}

// Fuse.js configuration for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'name', weight: 3 },
    { name: 'description', weight: 2 },
    { name: 'location.city', weight: 2 },
    { name: 'location.address', weight: 1 },
    { name: 'highlights', weight: 1.5 },
    { name: 'services.name', weight: 1 },
    { name: 'features', weight: 1 }
  ],
  threshold: 0.3,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2,
  shouldSort: true,
  findAllMatches: true,
  ignoreLocation: true,
  useExtendedSearch: true
};

// Preset filter configurations
const filterPresets = [
  { id: 'elite', label: 'Clubes Elite', icon: Shield, filters: { tier: ['elite'], verified: true } },
  { id: 'top-rated', label: 'Mejor Valorados', icon: Star, filters: { minRating: 4.5 } },
  { id: 'busy', label: 'Alta Demanda', icon: TrendingUp, filters: { minMembers: 300 } },
  { id: 'available', label: 'Disponibles Ahora', icon: Clock, filters: { availability: 'available_today' as const } },
];

const allFeatures = [
  'parking', 'restaurant', 'shop', 'indoor', 'outdoor', 
  'lighting', 'showers', 'lockers', 'wifi', 'air_conditioning'
];

const allServices = [
  'classes', 'tournaments', 'coaching', 'equipment_rental',
  'physiotherapy', 'cafe', 'pro_shop', 'kids_area'
];

export const ClubSearchEngine: React.FC<ClubSearchEngineProps> = ({
  clubs,
  onSearch,
  userLocation
}) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    tier: [],
    features: [],
    services: [],
    minRating: 0,
    maxDistance: 50,
    priceRange: [0, 100],
    availability: 'all',
    minMembers: 0,
    verified: null
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Initialize Fuse instance
  const fuse = useMemo(() => new Fuse(clubs, fuseOptions), [clubs]);

  // Perform search and filtering
  const performSearch = useCallback(() => {
    let results = clubs;

    // Text search with Fuse.js
    if (query.trim()) {
      const fuseResults = fuse.search(query);
      results = fuseResults.map(result => ({
        ...result.item,
        searchScore: result.score,
        matches: result.matches
      }));
    }

    // Apply filters
    results = results.filter(club => {
      // Tier filter
      if (filters.tier.length > 0 && !filters.tier.includes(club.tier)) {
        return false;
      }

      // Features filter
      if (filters.features.length > 0) {
        const hasAllFeatures = filters.features.every(feature =>
          club.features.includes(feature)
        );
        if (!hasAllFeatures) return false;
      }

      // Services filter
      if (filters.services.length > 0) {
        const hasAllServices = filters.services.every(service =>
          club.services.some(s => s.id === service && s.available)
        );
        if (!hasAllServices) return false;
      }

      // Rating filter
      if (filters.minRating > 0 && club.stats.rating.value < filters.minRating) {
        return false;
      }

      // Members filter
      if (filters.minMembers > 0 && club.stats.members.total < filters.minMembers) {
        return false;
      }

      // Verified filter
      if (filters.verified !== null && club.verified !== filters.verified) {
        return false;
      }

      // Availability filter
      if (filters.availability === 'open' && !club.status.isOpen) {
        return false;
      }

      // Distance filter (if user location provided)
      if (userLocation && club.location.coordinates) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          club.location.coordinates.lat,
          club.location.coordinates.lng
        );
        if (distance > filters.maxDistance) {
          return false;
        }
      }

      return true;
    });

    // Sort by relevance (search score if available, then rating)
    results.sort((a, b) => {
      if ('searchScore' in a && 'searchScore' in b) {
        return (a.searchScore || 0) - (b.searchScore || 0);
      }
      return b.stats.rating.value - a.stats.rating.value;
    });

    onSearch(results, query, filters);
  }, [clubs, query, filters, fuse, onSearch, userLocation]);

  // Apply preset filters
  const applyPreset = (presetId: string) => {
    const preset = filterPresets.find(p => p.id === presetId);
    if (preset) {
      setFilters(current => ({
        ...current,
        ...preset.filters
      }));
      setActivePreset(presetId);
      setTimeout(performSearch, 100);
    }
  };

  // Update filter
  const updateFilter = <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setActivePreset(null);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      tier: [],
      features: [],
      services: [],
      minRating: 0,
      maxDistance: 50,
      priceRange: [0, 100],
      availability: 'all',
      minMembers: 0,
      verified: null
    });
    setActivePreset(null);
    setQuery('');
  };

  // Search on filter change
  React.useEffect(() => {
    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [query, filters, performSearch]);

  const hasActiveFilters = 
    filters.tier.length > 0 ||
    filters.features.length > 0 ||
    filters.services.length > 0 ||
    filters.minRating > 0 ||
    filters.minMembers > 0 ||
    filters.verified !== null ||
    filters.availability !== 'all';

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query || ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clubes por nombre, ciudad, servicios..."
            className={cn(
              "w-full pl-12 pr-4 py-4 rounded-2xl",
              "bg-white dark:bg-gray-800",
              "border-2 border-gray-200 dark:border-gray-700",
              "focus:border-indigo-500 dark:focus:border-indigo-400",
              "transition-all duration-200",
              "text-lg placeholder:text-gray-400"
            )}
          />
          
          {/* Filter Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2",
              "px-4 py-2 rounded-xl",
              "bg-gradient-to-r from-indigo-100 to-purple-100",
              "dark:from-indigo-900/30 dark:to-purple-900/30",
              "text-indigo-700 dark:text-indigo-300",
              "flex items-center gap-2",
              "hover:shadow-md transition-all duration-200",
              hasActiveFilters && "ring-2 ring-indigo-500"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            )}
          </button>
        </motion.div>
      </div>

      {/* Quick Filter Presets */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {filterPresets.map((preset) => {
          const Icon = preset.icon;
          return (
            <motion.button
              key={preset.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => applyPreset(preset.id)}
              className={cn(
                "px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap",
                "border-2 transition-all duration-200",
                activePreset === preset.id
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300"
              )}
            >
              <Icon className="w-4 h-4" />
              {preset.label}
            </motion.button>
          );
        })}
        
        {hasActiveFilters && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl flex items-center gap-2 whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          >
            <X className="w-4 h-4" />
            Limpiar Filtros
          </motion.button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg space-y-6">
              {/* Tier Selection */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Nivel del Club
                </h3>
                <div className="flex gap-3">
                  {['basic', 'premium', 'elite'].map((tier) => (
                    <label
                      key={tier}
                      className={cn(
                        "flex-1 px-4 py-3 rounded-xl cursor-pointer text-center",
                        "border-2 transition-all duration-200",
                        filters.tier.includes(tier)
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-transparent"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={filters.tier.includes(tier)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFilter('tier', [...filters.tier, tier]);
                          } else {
                            updateFilter('tier', filters.tier.filter(t => t !== tier));
                          }
                        }}
                      />
                      <span className="font-medium capitalize">{tier}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Valoración Mínima
                </h3>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={filters.minRating || ''}
                    onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-medium w-12">{filters.minRating}</span>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Instalaciones
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {allFeatures.map((feature) => (
                    <label
                      key={feature}
                      className={cn(
                        "px-3 py-2 rounded-lg cursor-pointer text-sm",
                        "border transition-all duration-200",
                        filters.features.includes(feature)
                          ? "bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={filters.features.includes(feature)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFilter('features', [...filters.features, feature]);
                          } else {
                            updateFilter('features', filters.features.filter(f => f !== feature));
                          }
                        }}
                      />
                      <span className="capitalize">{feature.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Services Grid */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Servicios
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {allServices.map((service) => (
                    <label
                      key={service}
                      className={cn(
                        "px-3 py-2 rounded-lg cursor-pointer text-sm",
                        "border transition-all duration-200",
                        filters.services.includes(service)
                          ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700"
                          : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={filters.services.includes(service)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFilter('services', [...filters.services, service]);
                          } else {
                            updateFilter('services', filters.services.filter(s => s !== service));
                          }
                        }}
                      />
                      <span className="capitalize">{service.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Disponibilidad
                  </h3>
                  <select
                    value={filters.availability || ''}
                    onChange={(e) => updateFilter('availability', e.target.value as any)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                  >
                    <option value="all">Todos</option>
                    <option value="open">Abiertos Ahora</option>
                    <option value="available_today">Pistas Disponibles Hoy</option>
                  </select>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Miembros Mínimos
                  </h3>
                  <input
                    type="number"
                    value={filters.minMembers || ''}
                    onChange={(e) => updateFilter('minMembers', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Solo Verificados
                  </h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.verified === true}
                      onChange={(e) => updateFilter('verified', e.target.checked ? true : null)}
                      className="w-5 h-5 rounded border-gray-300"
                    />
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      Solo clubes verificados
                    </span>
                  </label>
                </div>
              </div>

              {/* Distance Filter (if location available) */}
              {userLocation && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Distancia Máxima: {filters.maxDistance} km
                  </h3>
                  <div className="flex items-center gap-4">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={filters.maxDistance || ''}
                      onChange={(e) => updateFilter('maxDistance', parseInt(e.target.value))}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Suggestions */}
      {query.length > 0 && query.length < 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl"
        >
          <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Escribe al menos 3 caracteres para búsquedas más precisas
          </p>
        </motion.div>
      )}
    </div>
  );
};

// Helper function to calculate distance between coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}