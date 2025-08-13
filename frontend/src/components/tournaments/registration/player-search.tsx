'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Control, Controller } from 'react-hook-form';
import { Search, User, X, Check, Clock, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { PlayerSearchResult, Tournament } from '@/types/tournament';
import { Player } from '@/types';
import { cn } from '@/lib/utils';

interface PlayerSearchProps {
  control: Control<any>;
  name: string;
  label: string;
  placeholder?: string;
  tournament: Tournament;
  excludePlayerIds?: string[];
  error?: string;
  required?: boolean;
  className?: string;
  onPlayerSelect?: (player: Player) => void;
}

export const PlayerSearch: React.FC<PlayerSearchProps> = ({
  control,
  name,
  label,
  placeholder = 'Buscar jugador por nombre o email...',
  tournament,
  excludePlayerIds = [],
  error,
  required = false,
  className,
  onPlayerSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlayerSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedQuery = useDebounce(searchQuery, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Search for players
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchPlayers(debouncedQuery);
    } else {
      setSearchResults([]);
      setIsOpen(false);
    }
  }, [debouncedQuery, tournament.id]);

  const searchPlayers = async (query: string) => {
    setIsLoading(true);
    try {
      // Simulate API call to search players
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Mock data - replace with actual API call
      const mockResults: PlayerSearchResult[] = [
        {
          id: '1',
          firstName: 'Carlos',
          lastName: 'Rodriguez',
          email: 'carlos@example.com',
          level: 'intermediate',
          club: 'Club Central',
          photo: undefined,
          isAvailable: true,
          conflictingTournaments: [],
        },
        {
          id: '2',
          firstName: 'Ana',
          lastName: 'Martinez',
          email: 'ana@example.com',
          level: 'advanced',
          club: 'Padel Pro',
          photo: undefined,
          isAvailable: false,
          conflictingTournaments: [tournament],
        },
        {
          id: '3',
          firstName: 'Luis',
          lastName: 'García',
          email: 'luis@example.com',
          level: 'beginner',
          club: 'Club Central',
          photo: undefined,
          isAvailable: true,
          conflictingTournaments: [],
        },
      ].filter(
        (player) =>
          !excludePlayerIds.includes(player.id) &&
          (player.firstName.toLowerCase().includes(query.toLowerCase()) ||
            player.lastName.toLowerCase().includes(query.toLowerCase()) ||
            player.email.toLowerCase().includes(query.toLowerCase()))
      );

      setSearchResults(mockResults);
      setIsOpen(mockResults.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
            setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          const selectedPlayer = searchResults[selectedIndex];
          if (selectedPlayer.isAvailable) {
            handlePlayerSelect(selectedPlayer);
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll to selected item
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[
        selectedIndex
      ] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    const fullPlayer: Player = {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      email: player.email,
      role: 'player',
      level: player.level as any,
      position: 'both',
      matches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSearchQuery(`${player.firstName} ${player.lastName}`);
    setIsOpen(false);
    setSelectedIndex(-1);
    onPlayerSelect?.(fullPlayer);
  };

  const clearSelection = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  return (
    <Controller
      control={control}
      name={name}
      rules={{ required: required ? `${label} es requerido` : false }}
      render={({ field: { onChange, value } }) => (
        <div className={cn('relative', className)}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              ) : (
                <Search className="h-4 w-4 text-gray-400" />
              )}
            </div>

            <Input
              ref={inputRef}
              type="text"
              value={searchQuery || ''}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value === '') {
                  onChange(null);
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setIsOpen(true);
                }
              }}
              onBlur={() => {
                // Delay closing to allow clicks on results
                setTimeout(() => setIsOpen(false), 200);
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={cn(
                'pl-10',
                searchQuery && 'pr-10',
                error && 'border-red-500'
              )}
            />

            {searchQuery && (
              <button
                type="button"
                onClick={clearSelection}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {isOpen && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto"
              >
                <ul ref={listRef} className="py-1">
                  {searchResults.map((player, index) => (
                    <li key={player.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (player.isAvailable) {
                            handlePlayerSelect(player);
                            onChange({
                              id: player.id,
                              firstName: player.firstName,
                              lastName: player.lastName,
                              email: player.email,
                            });
                          }
                        }}
                        disabled={!player.isAvailable}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors',
                          'flex items-center space-x-3',
                          selectedIndex === index &&
                            'bg-blue-50 dark:bg-blue-900/20',
                          !player.isAvailable && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          {player.photo ? (
                            <img
                              src={player.photo}
                              alt={`${player.firstName} ${player.lastName}`}
                            />
                          ) : (
                            <User className="h-5 w-5" />
                          )}
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {player.firstName} {player.lastName}
                            </span>
                            {player.isAvailable ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500">
                              {player.email}
                            </span>
                            {player.level && (
                              <Badge variant="secondary" className="text-xs">
                                {player.level}
                              </Badge>
                            )}
                            {player.club && (
                              <Badge variant="outline" className="text-xs">
                                {player.club}
                              </Badge>
                            )}
                          </div>

                          {!player.isAvailable &&
                            player.conflictingTournaments && (
                              <div className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Conflicto con otro torneo
                              </div>
                            )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No Results */}
          {isOpen &&
            searchResults.length === 0 &&
            !isLoading &&
            debouncedQuery.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
              >
                <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No se encontraron jugadores</p>
                  <p className="text-xs mt-1">
                    Intenta con otro término de búsqueda
                  </p>
                </div>
              </motion.div>
            )}

          {/* Error Message */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}

          {/* Help Text */}
          {!error && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Escribe al menos 2 caracteres para buscar jugadores
            </p>
          )}
        </div>
      )}
    />
  );
};

export default PlayerSearch;
