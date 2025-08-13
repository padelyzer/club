import { useState } from 'react';
import { useCreateClub, useUpdateClub, useDeleteClub } from '@/lib/api/hooks/useClubs';
import { toast } from '@/lib/toast';
import { ClubFormData } from '@/types/club';
import { useClubsDataStore } from '@/store/clubs/clubsDataStore';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';
import { useOptimisticClubs } from './useOptimisticClubs';

interface UseClubsActionsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useClubsActions = (options?: UseClubsActionsOptions) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<'create' | 'update' | 'delete' | null>(null);
  
  const createMutation = useCreateClub();
  const updateMutation = useUpdateClub();
  const deleteMutation = useDeleteClub();
  
  const { removeClub } = useClubsDataStore();
  const { activeClubId, clearActiveClub } = useActiveClubStore();
  const { createOptimistic, updateOptimistic, deleteOptimistic, applyOptimisticUpdate } = useOptimisticClubs();

  const handleCreate = async (data: ClubFormData) => {
    setIsProcessing(true);
    setProcessingAction('create');
    
    // Apply optimistic update immediately
    const optimisticUpdate = createOptimistic(data);
    const toastId = toast.loading('Creando club...');
    
    try {
      const result = await applyOptimisticUpdate(
        optimisticUpdate,
        () => createMutation.mutateAsync(data)
      );
      
      toast.success('Club creado exitosamente', { id: toastId });
      
      // If this is the first club, set it as active
      const { totalClubs } = useClubsDataStore.getState();
      if (totalClubs === 1) {
        useActiveClubStore.getState().setActiveClub(result);
        toast.info(`${result.name} establecido como club activo`);
      }
      
      options?.onSuccess?.();
      return result;
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Error al crear el club';
      toast.error(message, { id: toastId });
      options?.onError?.(error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleUpdate = async (id: string, data: Partial<ClubFormData>) => {
    setIsProcessing(true);
    setProcessingAction('update');
    
    // Apply optimistic update immediately
    const optimisticUpdate = updateOptimistic(id, data);
    const toastId = toast.loading('Actualizando club...');
    
    try {
      const result = await applyOptimisticUpdate(
        optimisticUpdate,
        () => updateMutation.mutateAsync({ id, data })
      );
      
      toast.success('Club actualizado exitosamente', { id: toastId });
      
      // If updating the active club, update it in the store
      if (activeClubId === id) {
        useActiveClubStore.getState().setActiveClub(result);
      }
      
      options?.onSuccess?.();
      return result;
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Error al actualizar el club';
      toast.error(message, { id: toastId });
      options?.onError?.(error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleDelete = async (id: string, clubName?: string) => {
    const confirmMessage = clubName 
      ? `¿Estás seguro de eliminar el club "${clubName}"? Esta acción no se puede deshacer.`
      : '¿Estás seguro de eliminar este club? Esta acción no se puede deshacer.';
      
    if (!confirm(confirmMessage)) {
      return;
    }
    
    setIsProcessing(true);
    setProcessingAction('delete');
    
    // Apply optimistic delete immediately
    const optimisticUpdate = deleteOptimistic(id);
    const toastId = toast.loading('Eliminando club...');
    
    try {
      await applyOptimisticUpdate(
        optimisticUpdate,
        () => deleteMutation.mutateAsync(id)
      );
      
      toast.success('Club eliminado exitosamente', { id: toastId });
      
      // If deleting the active club, clear it
      if (activeClubId === id) {
        clearActiveClub();
        
        // Try to set the first available club as active
        const { clubs } = useClubsDataStore.getState();
        const remainingClubs = clubs.filter(c => c.id !== id);
        if (remainingClubs.length > 0) {
          useActiveClubStore.getState().setActiveClub(remainingClubs[0]);
          toast.info(`${remainingClubs[0].name} establecido como club activo`);
        }
      }
      
      // Note: removeClub is already handled by optimistic update
      
      options?.onSuccess?.();
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Error al eliminar el club';
      toast.error(message, { id: toastId });
      options?.onError?.(error);
      throw error;
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  return {
    createClub: handleCreate,
    updateClub: handleUpdate,
    deleteClub: handleDelete,
    isProcessing,
    processingAction,
    isCreating: processingAction === 'create',
    isUpdating: processingAction === 'update',
    isDeleting: processingAction === 'delete',
  };
};