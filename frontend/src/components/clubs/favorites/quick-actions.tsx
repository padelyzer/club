'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Plus, BookmarkPlus, Share2, 
  Check, X, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClubUI } from '@/types/club-unified';
import { 
  useFavoritesStore, 
  useCustomLists, 
  CustomList 
} from '@/lib/stores/favorites-store';

/**
 * Quick Favorites Actions
 * Floating action buttons for quick favorite/list management
 */

interface QuickFavoritesActionsProps {
  club: ClubUI;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

export const QuickFavoritesActions: React.FC<QuickFavoritesActionsProps> = ({
  club,
  className,
  size = 'md',
  showLabels = false
}) => {
  const customLists = useCustomLists();
  const {
    isFavorite,
    toggleFavorite,
    addClubToList,
    removeClubFromList,
    isClubInList,
    getClubLists
  } = useFavoritesStore();

  const [showListsMenu, setShowListsMenu] = useState(false);
  const [recentAction, setRecentAction] = useState<string | null>(null);

  const clubLists = getClubLists(club.id);
  const isInFavorites = isFavorite(club.id);

  const sizes = {
    sm: { button: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-xs' },
    md: { button: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-sm' },
    lg: { button: 'w-12 h-12', icon: 'w-6 h-6', text: 'text-base' }
  };

  const handleFavoriteToggle = () => {
    toggleFavorite(club.id);
    setRecentAction(isInFavorites ? 'removed_favorite' : 'added_favorite');
    setTimeout(() => setRecentAction(null), 2000);
  };

  const handleListToggle = (list: CustomList) => {
    const isInList = isClubInList(list.id, club.id);
    
    if (isInList) {
      removeClubFromList(list.id, club.id);
      setRecentAction(`removed_from_${list.id}`);
    } else {
      addClubToList(list.id, club.id);
      setRecentAction(`added_to_${list.id}`);
    }
    
    setTimeout(() => setRecentAction(null), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: club.name,
          text: `Echa un vistazo a ${club.name} en ${club.location.city}`,
          url: window.location.href
        });
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setRecentAction('shared');
        setTimeout(() => setRecentAction(null), 2000);
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(window.location.href);
      setRecentAction('shared');
      setTimeout(() => setRecentAction(null), 2000);
    }
  };

  return (
    <div className={cn("relative flex items-center gap-2", className)}>
      {/* Favorite Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleFavoriteToggle}
        className={cn(
          "rounded-xl flex items-center justify-center transition-all duration-200",
          sizes[size].button,
          isInFavorites
            ? "bg-pink-500 text-white shadow-lg shadow-pink-500/25"
            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-pink-500 dark:hover:text-pink-400 shadow-lg"
        )}
      >
        <Heart className={cn(sizes[size].icon, isInFavorites && "fill-current")} />
      </motion.button>

      {/* Add to List Button */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowListsMenu(!showListsMenu)}
          className={cn(
            "rounded-xl flex items-center justify-center transition-all duration-200",
            "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 shadow-lg",
            sizes[size].button,
            clubLists.length > 0 && "ring-2 ring-indigo-500 ring-opacity-50"
          )}
        >
          <Plus className={sizes[size].icon} />
        </motion.button>

        {/* Lists Dropdown */}
        <AnimatePresence>
          {showListsMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowListsMenu(false)}
              />
              
              {/* Menu */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full mt-2 right-0 z-50 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-3">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Añadir a lista
                  </div>
                  
                  {customLists.length === 0 ? (
                    <div className="text-center py-4">
                      <BookmarkPlus className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        No tienes listas aún
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {customLists.map(list => {
                        const isInList = isClubInList(list.id, club.id);
                        
                        return (
                          <motion.button
                            key={list.id}
                            whileHover={{ x: 2 }}
                            onClick={() => handleListToggle(list)}
                            className={cn(
                              "w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all duration-200",
                              isInList
                                ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700"
                            )}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm"
                              style={{ backgroundColor: list.color }}
                            >
                              {list.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {list.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {list.clubIds.length} {list.clubIds.length === 1 ? 'club' : 'clubes'}
                              </div>
                            </div>
                            {isInList && (
                              <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Share Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleShare}
        className={cn(
          "rounded-xl flex items-center justify-center transition-all duration-200",
          "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 shadow-lg",
          sizes[size].button
        )}
      >
        <Share2 className={sizes[size].icon} />
      </motion.button>

      {/* Success Messages */}
      <AnimatePresence>
        {recentAction && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="absolute -top-12 right-0 bg-green-500 text-white px-3 py-2 rounded-xl text-sm font-medium shadow-lg whitespace-nowrap"
          >
            {recentAction === 'added_favorite' && '❤️ Añadido a favoritos'}
            {recentAction === 'removed_favorite' && '💔 Eliminado de favoritos'}
            {recentAction === 'shared' && '🔗 Enlace copiado'}
            {recentAction.startsWith('added_to_') && '✅ Añadido a la lista'}
            {recentAction.startsWith('removed_from_') && '❌ Eliminado de la lista'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Compact Favorites Button
 * Simple heart button for minimal interfaces
 */
interface CompactFavoriteButtonProps {
  club: ClubUI;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CompactFavoriteButton: React.FC<CompactFavoriteButtonProps> = ({
  club,
  size = 'md',
  className
}) => {
  const { isFavorite, toggleFavorite } = useFavoritesStore();
  const [isAnimating, setIsAnimating] = useState(false);

  const sizes = {
    sm: { button: 'w-8 h-8', icon: 'w-4 h-4' },
    md: { button: 'w-10 h-10', icon: 'w-5 h-5' },
    lg: { button: 'w-12 h-12', icon: 'w-6 h-6' }
  };

  const isInFavorites = isFavorite(club.id);

  const handleToggle = () => {
    toggleFavorite(club.id);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleToggle}
      className={cn(
        "rounded-full flex items-center justify-center transition-all duration-200",
        sizes[size].button,
        isInFavorites
          ? "bg-pink-500 text-white shadow-lg shadow-pink-500/25"
          : "bg-white/90 backdrop-blur-sm text-gray-600 hover:text-pink-500 shadow-lg",
        className
      )}
    >
      <motion.div
        animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.3 }}
      >
        <Heart className={cn(sizes[size].icon, isInFavorites && "fill-current")} />
      </motion.div>
    </motion.button>
  );
};

/**
 * Lists Badge
 * Shows how many lists a club is in
 */
interface ListsBadgeProps {
  club: ClubUI;
  onClick?: () => void;
  className?: string;
}

export const ListsBadge: React.FC<ListsBadgeProps> = ({
  club,
  onClick,
  className
}) => {
  const { getClubLists } = useFavoritesStore();
  const clubLists = getClubLists(club.id);

  if (clubLists.length === 0) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium",
        className
      )}
    >
      <BookmarkPlus className="w-3 h-3" />
      {clubLists.length} {clubLists.length === 1 ? 'lista' : 'listas'}
    </motion.button>
  );
};