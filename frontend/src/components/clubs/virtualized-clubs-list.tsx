'use client';

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTranslation } from 'react-i18next';
import { ClubCard } from './club-card';
import { Club, ClubViewMode } from '@/types/club';
import { useClubsDataStore } from '@/store/clubs/clubsDataStore';
import { useClubsUIStore } from '@/store/clubs/clubsUIStore';
import { shallow } from 'zustand/shallow';
import { ClubCardSkeleton } from './skeletons';

// Row heights for different view modes
const ITEM_HEIGHT = {
  grid: 320, // Height for grid items including gap
  list: 180, // Height for list items including gap
  map: 0,
};

const ITEMS_PER_ROW = {
  grid: {
    sm: 1,
    md: 2,
    lg: 3,
    xl: 4,
  },
  list: 1,
  map: 0,
};

interface VirtualizedClubsListProps {
  clubs: Club[];
  isLoading?: boolean;
}

// Memoized row component
const Row = memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    clubs: Club[];
    viewMode: ClubViewMode;
    itemsPerRow: number;
  };
}>(({ index, style, data }) => {
  const { clubs, viewMode, itemsPerRow } = data;
  const startIndex = index * itemsPerRow;
  const items = clubs.slice(startIndex, startIndex + itemsPerRow);

  if (viewMode === 'list') {
    return (
      <div style={style} className="px-4">
        {items[0] && <ClubCard club={items[0]} viewMode={viewMode} />}
      </div>
    );
  }

  // Grid view
  return (
    <div style={style} className="px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((club) => (
          <ClubCard key={club.id} club={club} viewMode={viewMode} />
        ))}
        {/* Fill empty cells to maintain grid layout */}
        {Array.from({ length: itemsPerRow - items.length }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
      </div>
    </div>
  );
});

Row.displayName = 'VirtualizedRow';

export const VirtualizedClubsList: React.FC<VirtualizedClubsListProps> = memo(({ 
  clubs, 
  isLoading = false 
}) => {
  const { t } = useTranslation();
  const listRef = useRef<List>(null);
  const viewMode = useClubsUIStore((state) => state.viewMode);
  
  // Calculate items per row based on screen size
  const getItemsPerRow = useCallback(() => {
    if (viewMode === 'list') return 1;
    
    const width = window.innerWidth;
    if (width >= 1280) return ITEMS_PER_ROW.grid.xl; // xl
    if (width >= 1024) return ITEMS_PER_ROW.grid.lg; // lg
    if (width >= 768) return ITEMS_PER_ROW.grid.md; // md
    return ITEMS_PER_ROW.grid.sm; // sm
  }, [viewMode]);

  const [itemsPerRow, setItemsPerRow] = React.useState(getItemsPerRow());

  // Update items per row on resize
  useEffect(() => {
    const handleResize = () => {
      const newItemsPerRow = getItemsPerRow();
      if (newItemsPerRow !== itemsPerRow) {
        setItemsPerRow(newItemsPerRow);
        listRef.current?.resetAfterIndex(0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getItemsPerRow, itemsPerRow]);

  // Calculate row count
  const rowCount = Math.ceil(clubs.length / itemsPerRow);

  // Get item size
  const getItemSize = useCallback((index: number) => {
    return ITEM_HEIGHT[viewMode];
  }, [viewMode]);

  // Reset on view mode change
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [viewMode]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ClubCardSkeleton key={i} viewMode={viewMode} />
        ))}
      </div>
    );
  }

  if (clubs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('clubs.noClubsFound')}
      </div>
    );
  }

  if (viewMode === 'map') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-4 h-96">
          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {t('clubs.mapViewComingSoon')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            itemCount={rowCount}
            itemSize={getItemSize}
            width={width}
            itemData={{
              clubs,
              viewMode,
              itemsPerRow,
            }}
            overscanCount={2}
            className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

VirtualizedClubsList.displayName = 'VirtualizedClubsList';

// Hook to determine if virtualization should be used
export const useVirtualization = (itemCount: number, threshold = 50) => {
  return itemCount > threshold;
};