'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ClubUI } from '@/types/club-unified';
import { ClubSearchEngine } from './club-search-engine';
import { SearchResultsDisplay } from './search-results-display';

/**
 * Complete Club Search System
 * Integrates search engine with results display
 */

interface ClubSearchSystemProps {
  clubs: ClubUI[];
  onClubSelect?: (club: ClubUI) => void;
  userLocation?: { lat: number; lng: number };
  className?: string;
}

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

export const ClubSearchSystem: React.FC<ClubSearchSystemProps> = ({
  clubs,
  onClubSelect,
  userLocation,
  className
}) => {
  const [searchResults, setSearchResults] = useState<ClubUI[]>(clubs);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentFilters, setCurrentFilters] = useState<SearchFilters | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'relevance' | 'rating' | 'distance' | 'members' | 'name'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSearching, setIsSearching] = useState(false);

  // Handle search results from engine
  const handleSearch = useCallback((results: ClubUI[], query: string, filters: SearchFilters) => {
    setIsSearching(true);
    
    // Simulate search delay for better UX
    setTimeout(() => {
      setSearchResults(results);
      setCurrentQuery(query);
      setCurrentFilters(filters);
      setIsSearching(false);
    }, 200);
  }, []);

  // Sort results based on current sort settings
  const sortedResults = useMemo(() => {
    if (!searchResults.length) return [];
    
    const sorted = [...searchResults].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rating':
          comparison = a.stats.rating.value - b.stats.rating.value;
          break;
        case 'members':
          comparison = a.stats.members.total - b.stats.members.total;
          break;
        case 'distance':
          // Distance sorting would require user location and club coordinates
          if (userLocation && a.location.coordinates && b.location.coordinates) {
            const distanceA = calculateDistance(
              userLocation.lat, userLocation.lng,
              a.location.coordinates.lat, a.location.coordinates.lng
            );
            const distanceB = calculateDistance(
              userLocation.lat, userLocation.lng,
              b.location.coordinates.lat, b.location.coordinates.lng
            );
            comparison = distanceA - distanceB;
          } else {
            comparison = 0;
          }
          break;
        case 'relevance':
        default:
          // If we have search scores from Fuse.js, use them
          const scoreA = 'searchScore' in a ? (a as any).searchScore || 0 : 0;
          const scoreB = 'searchScore' in b ? (b as any).searchScore || 0 : 0;
          if (scoreA !== scoreB) {
            comparison = scoreA - scoreB;
          } else {
            // Fall back to rating for ties
            comparison = b.stats.rating.value - a.stats.rating.value;
          }
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return sorted;
  }, [searchResults, sortBy, sortOrder, userLocation]);

  const handleSortChange = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy as any);
    setSortOrder(newSortOrder);
  }, []);

  const handleClubSelect = useCallback((club: ClubUI) => {
    onClubSelect?.(club);
  }, [onClubSelect]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="space-y-8">
        {/* Search Engine */}
        <ClubSearchEngine
          clubs={clubs}
          onSearch={handleSearch}
          userLocation={userLocation}
        />
        
        {/* Results Display */}
        <SearchResultsDisplay
          results={sortedResults}
          query={currentQuery}
          totalClubs={clubs.length}
          viewMode={viewMode}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onViewModeChange={setViewMode}
          onSortChange={handleSortChange}
          onClubSelect={handleClubSelect}
          isLoading={isSearching}
        />
      </div>
    </motion.div>
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

export default ClubSearchSystem;