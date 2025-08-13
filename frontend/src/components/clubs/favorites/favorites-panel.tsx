'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Plus, Search, MoreVertical, Edit3, Trash2, 
  Eye, Share2, Lock, Unlock, Tag, Calendar,
  Star, Users, MapPin, Filter, Grid3X3, List,
  Sparkles, FolderPlus, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClubUI } from '@/types/club-unified';
import { 
  useFavoritesStore, 
  useCustomLists, 
  useFavoriteClubIds,
  useActiveListId,
  CustomList,
  listColors,
  listIcons
} from '@/lib/stores/favorites-store';

/**
 * Favorites Panel Component
 * Manages favorites and custom lists with advanced UI
 */

interface FavoritesPanelProps {
  clubs: ClubUI[];
  onClubSelect?: (club: ClubUI) => void;
  onClose?: () => void;
  className?: string;
}

export const FavoritesPanel: React.FC<FavoritesPanelProps> = ({
  clubs,
  onClubSelect,
  onClose,
  className
}) => {
  const favoriteClubIds = useFavoriteClubIds();
  const customLists = useCustomLists();
  const activeListId = useActiveListId();
  const {
    getFavoriteClubs,
    getListClubs,
    setActiveList,
    deleteList,
    toggleFavorite,
    setCreatingList
  } = useFavoritesStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingList, setEditingList] = useState<CustomList | null>(null);

  // Get current clubs to display
  const currentClubs = useMemo(() => {
    let clubs_to_show: ClubUI[] = [];
    
    if (activeListId === 'favorites') {
      clubs_to_show = getFavoriteClubs(clubs);
    } else if (activeListId) {
      clubs_to_show = getListClubs(activeListId, clubs);
    } else {
      clubs_to_show = getFavoriteClubs(clubs);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      clubs_to_show = clubs_to_show.filter(club =>
        club.name.toLowerCase().includes(query) ||
        club.location.city.toLowerCase().includes(query) ||
        club.highlights.some(h => h.toLowerCase().includes(query))
      );
    }

    return clubs_to_show;
  }, [clubs, activeListId, searchQuery, getFavoriteClubs, getListClubs]);

  const handleCreateList = () => {
    setShowCreateModal(true);
    setCreatingList(true);
  };

  const handleEditList = (list: CustomList) => {
    setEditingList(list);
    setShowCreateModal(true);
  };

  const handleDeleteList = (listId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta lista?')) {
      deleteList(listId);
    }
  };

  const currentList = activeListId && activeListId !== 'favorites' 
    ? customLists.find(l => l.id === activeListId)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className={cn(
        "fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50",
        "border-l border-gray-200 dark:border-gray-700 flex flex-col",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {currentList ? currentList.name : 'Mis Favoritos'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentClubs.length} {currentClubs.length === 1 ? 'club' : 'clubes'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentList && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEditList(currentList)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteList(currentList.id)}
                className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Lists Tabs */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveList('favorites')}
            className={cn(
              "px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200",
              activeListId === 'favorites' || !activeListId
                ? "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300"
                : "hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
          >
            <Heart className="w-4 h-4 inline mr-2" />
            Favoritos
          </button>
          
          {customLists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveList(list.id)}
              className={cn(
                "px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2",
                activeListId === list.id
                  ? "text-white shadow-lg"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
              style={activeListId === list.id ? { backgroundColor: list.color } : {}}
            >
              <span>{list.icon}</span>
              {list.name}
            </button>
          ))}
          
          <button
            onClick={handleCreateList}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="px-6 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en esta lista..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Vista
          </span>
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-1.5 rounded-md transition-all duration-200",
                viewMode === 'grid'
                  ? "bg-white dark:bg-gray-700 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "p-1.5 rounded-md transition-all duration-200",
                viewMode === 'list'
                  ? "bg-white dark:bg-gray-700 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Clubs List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {currentClubs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? 'Sin resultados' : 'Sin clubes guardados'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {searchQuery 
                ? 'Intenta con otros términos de búsqueda'
                : 'Añade clubes a tus favoritos para verlos aquí'
              }
            </p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid'
              ? "grid grid-cols-1 gap-4"
              : "space-y-3"
          )}>
            {currentClubs.map((club, index) => (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                {viewMode === 'grid' ? (
                  <FavoriteClubCardGrid club={club} onSelect={() => onClubSelect?.(club)} />
                ) : (
                  <FavoriteClubCardList club={club} onSelect={() => onClubSelect?.(club)} />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit List Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateListModal
            list={editingList}
            onClose={() => {
              setShowCreateModal(false);
              setEditingList(null);
              setCreatingList(false);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Grid Card Component
const FavoriteClubCardGrid: React.FC<{ club: ClubUI; onSelect: () => void }> = ({ club, onSelect }) => {
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onClick={onSelect}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
            {club.name}
          </h3>
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-xs mt-1">
            <MapPin className="w-3 h-3" />
            {club.location.city}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(club.id);
          }}
          className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Heart className={cn("w-4 h-4", isFavorite(club.id) && "fill-current")} />
        </button>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500" />
          <span>{club.stats.rating.value}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-gray-400" />
          <span>{club.stats.members.total}</span>
        </div>
      </div>
    </div>
  );
};

// List Card Component
const FavoriteClubCardList: React.FC<{ club: ClubUI; onSelect: () => void }> = ({ club, onSelect }) => {
  const { toggleFavorite, isFavorite } = useFavoritesStore();

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onClick={onSelect}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm",
          club.tier === 'elite' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' :
          club.tier === 'premium' ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
          'bg-gradient-to-br from-gray-500 to-gray-600'
        )}>
          {club.name.charAt(0)}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">
            {club.name}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-xs">
              <MapPin className="w-3 h-3" />
              {club.location.city}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                {club.stats.rating.value}
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-gray-400" />
                {club.stats.members.total}
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(club.id);
          }}
          className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <Heart className={cn("w-4 h-4", isFavorite(club.id) && "fill-current")} />
        </button>
      </div>
    </div>
  );
};

// Create List Modal Component
const CreateListModal: React.FC<{
  list?: CustomList | null;
  onClose: () => void;
}> = ({ list, onClose }) => {
  const { createList, updateList } = useFavoritesStore();
  const [name, setName] = useState(list?.name || '');
  const [description, setDescription] = useState(list?.description || '');
  const [selectedColor, setSelectedColor] = useState(list?.color || listColors[0]);
  const [selectedIcon, setSelectedIcon] = useState(list?.icon || listIcons[0]);
  const [isPublic, setIsPublic] = useState(list?.isPublic || false);
  const [tags, setTags] = useState(list?.tags.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    const listData = {
      name: name.trim(),
      description: description.trim(),
      color: selectedColor,
      icon: selectedIcon,
      isPublic,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      clubIds: list?.clubIds || []
    };

    if (list) {
      updateList(list.id, listData);
    } else {
      createList(listData);
    }

    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            {list ? 'Editar Lista' : 'Crear Nueva Lista'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={name || ''}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Mi lista de clubes..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descripción (opcional)
              </label>
              <textarea
                value={description || ''}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Describe tu lista..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {listColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 transition-all duration-200",
                      selectedColor === color
                        ? "border-gray-900 dark:border-white scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icono
              </label>
              <div className="grid grid-cols-8 gap-2">
                {listIcons.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setSelectedIcon(icon)}
                    className={cn(
                      "w-8 h-8 rounded-lg border-2 flex items-center justify-center text-lg transition-all duration-200",
                      selectedIcon === icon
                        ? "border-gray-900 dark:border-white bg-gray-100 dark:bg-gray-700 scale-110"
                        : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
              >
                {list ? 'Guardar' : 'Crear Lista'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};