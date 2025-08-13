import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Club, ClubFormData } from '@/types/club';
import { useClubsDataStore } from '@/store/clubs/clubsDataStore';
import { v4 as uuidv4 } from 'uuid';

interface OptimisticUpdate<T> {
  type: 'create' | 'update' | 'delete';
  id: string;
  data?: T;
  rollback: () => void;
}

export const useOptimisticClubs = () => {
  const queryClient = useQueryClient();
  const { addClub, updateClub, removeClub } = useClubsDataStore();

  // Create club optimistically
  const createOptimistic = useCallback((data: ClubFormData): OptimisticUpdate<Club> => {
    const tempId = `temp-${uuidv4()}`;
    const optimisticClub: Club = {
      id: tempId,
      ...data,
      slug: data.name.toLowerCase().replace(/\s+/g, '-'),
      courts: [],
      features: data.features || [],
      services: data.services || [],
      schedule: data.schedule || [],
      total_members: 0,
      average_occupancy: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      lat: data.lat || 0,
      lng: data.lng || 0,
    } as Club;

    // Add to local store immediately
    addClub(optimisticClub);

    // Update query cache
    queryClient.setQueryData(['clubs'], (old: any) => {
      if (!old) return { results: [optimisticClub], count: 1 };
      return {
        ...old,
        results: [optimisticClub, ...old.results],
        count: old.count + 1,
      };
    });

    // Rollback function
    const rollback = () => {
      removeClub(tempId);
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    };

    return {
      type: 'create',
      id: tempId,
      data: optimisticClub,
      rollback,
    };
  }, [addClub, removeClub, queryClient]);

  // Update club optimistically
  const updateOptimistic = useCallback((
    id: string, 
    updates: Partial<ClubFormData>
  ): OptimisticUpdate<Partial<Club>> => {
    // Get current club data
    const currentData = queryClient.getQueryData<Club>(['club', id]);
    
    // Apply updates immediately
    updateClub(id, updates);

    // Update individual club query
    queryClient.setQueryData(['club', id], (old: Club | undefined) => {
      if (!old) return old;
      return { ...old, ...updates, updated_at: new Date().toISOString() };
    });

    // Update clubs list query
    queryClient.setQueryData(['clubs'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        results: old.results.map((club: Club) =>
          club.id === id 
            ? { ...club, ...updates, updated_at: new Date().toISOString() }
            : club
        ),
      };
    });

    // Rollback function
    const rollback = () => {
      if (currentData) {
        updateClub(id, currentData);
        queryClient.setQueryData(['club', id], currentData);
      }
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    };

    return {
      type: 'update',
      id,
      data: updates,
      rollback,
    };
  }, [updateClub, queryClient]);

  // Delete club optimistically
  const deleteOptimistic = useCallback((id: string): OptimisticUpdate<void> => {
    // Get current data for rollback
    const clubsData = queryClient.getQueryData<any>(['clubs']);
    const clubToDelete = clubsData?.results?.find((c: Club) => c.id === id);

    // Remove immediately
    removeClub(id);

    // Update query cache
    queryClient.setQueryData(['clubs'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        results: old.results.filter((club: Club) => club.id !== id),
        count: Math.max(0, old.count - 1),
      };
    });

    // Remove individual club query
    queryClient.removeQueries({ queryKey: ['club', id] });

    // Rollback function
    const rollback = () => {
      if (clubToDelete) {
        addClub(clubToDelete);
      }
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    };

    return {
      type: 'delete',
      id,
      rollback,
    };
  }, [removeClub, addClub, queryClient]);

  // Apply optimistic update and handle response
  const applyOptimisticUpdate = useCallback(async <T>(
    optimisticUpdate: OptimisticUpdate<T>,
    asyncOperation: () => Promise<T>
  ): Promise<T> => {
    try {
      const result = await asyncOperation();
      
      // Replace temporary ID with real ID for create operations
      if (optimisticUpdate.type === 'create' && result) {
        const realClub = result as unknown as Club;
        removeClub(optimisticUpdate.id);
        addClub(realClub);
        
        // Update cache with real data
        queryClient.setQueryData(['clubs'], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            results: old.results.map((club: Club) =>
              club.id === optimisticUpdate.id ? realClub : club
            ),
          };
        });
      }
      
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      
      return result;
    } catch (error) {
      // Rollback on error
      optimisticUpdate.rollback();
      throw error;
    }
  }, [removeClub, addClub, queryClient]);

  return {
    createOptimistic,
    updateOptimistic,
    deleteOptimistic,
    applyOptimisticUpdate,
  };
};