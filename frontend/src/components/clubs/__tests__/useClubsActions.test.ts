import { renderHook, act } from '@testing-library/react';
import { useClubsActions } from '@/hooks/useClubsActions';
import { useCreateClub, useUpdateClub, useDeleteClub } from '@/lib/api/hooks/useClubs';
import { toast } from '@/lib/toast';
import { useClubsDataStore } from '@/store/clubs/clubsDataStore';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';

// Mock dependencies
jest.mock('@/lib/api/hooks/useClubs');
jest.mock('@/lib/toast');
jest.mock('@/store/clubs/clubsDataStore');
jest.mock('@/store/clubs/activeClubStore');

// Mock window.confirm
global.confirm = jest.fn();

describe('useClubsActions', () => {
  const mockCreateMutate = jest.fn();
  const mockUpdateMutate = jest.fn();
  const mockDeleteMutate = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useCreateClub as jest.Mock).mockReturnValue({
      mutateAsync: mockCreateMutate,
    });
    
    (useUpdateClub as jest.Mock).mockReturnValue({
      mutateAsync: mockUpdateMutate,
    });
    
    (useDeleteClub as jest.Mock).mockReturnValue({
      mutateAsync: mockDeleteMutate,
    });

    (toast.loading as jest.Mock).mockReturnValue('toast-id');
    (global.confirm as jest.Mock).mockReturnValue(true);
    
    // Mock store states
    (useClubsDataStore.getState as jest.Mock).mockReturnValue({
      totalClubs: 1,
      clubs: [],
      removeClub: jest.fn(),
    });
    
    (useActiveClubStore.getState as jest.Mock).mockReturnValue({
      activeClubId: null,
      setActiveClub: jest.fn(),
      clearActiveClub: jest.fn(),
    });
  });

  describe('createClub', () => {
    it('successfully creates a club', async () => {
      const newClub = { id: '1', name: 'New Club' };
      mockCreateMutate.mockResolvedValue(newClub);

      const { result } = renderHook(() => 
        useClubsActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        const response = await result.current.createClub({ name: 'New Club' } as any);
        expect(response).toEqual(newClub);
      });

      expect(mockCreateMutate).toHaveBeenCalledWith({ name: 'New Club' });
      expect(toast.loading).toHaveBeenCalledWith('Creando club...');
      expect(toast.success).toHaveBeenCalledWith(
        'Club creado exitosamente',
        { id: 'toast-id' }
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('handles creation error', async () => {
      const error = { 
        response: { data: { detail: 'Creation failed' } } 
      };
      mockCreateMutate.mockRejectedValue(error);

      const { result } = renderHook(() => 
        useClubsActions({ onError: mockOnError })
      );

      await act(async () => {
        await expect(
          result.current.createClub({ name: 'New Club' } as any)
        ).rejects.toThrow();
      });

      expect(toast.error).toHaveBeenCalledWith(
        'Creation failed',
        { id: 'toast-id' }
      );
      expect(mockOnError).toHaveBeenCalledWith(error);
    });

    it('sets first club as active', async () => {
      const newClub = { id: '1', name: 'First Club' };
      mockCreateMutate.mockResolvedValue(newClub);
      
      const mockSetActiveClub = jest.fn();
      (useActiveClubStore.getState as jest.Mock).mockReturnValue({
        activeClubId: null,
        setActiveClub: mockSetActiveClub,
        clearActiveClub: jest.fn(),
      });

      const { result } = renderHook(() => useClubsActions());

      await act(async () => {
        await result.current.createClub({ name: 'First Club' } as any);
      });

      expect(mockSetActiveClub).toHaveBeenCalledWith(newClub);
      expect(toast.info).toHaveBeenCalledWith(
        'First Club establecido como club activo'
      );
    });
  });

  describe('updateClub', () => {
    it('successfully updates a club', async () => {
      const updatedClub = { id: '1', name: 'Updated Club' };
      mockUpdateMutate.mockResolvedValue(updatedClub);

      const { result } = renderHook(() => 
        useClubsActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        const response = await result.current.updateClub('1', { name: 'Updated Club' });
        expect(response).toEqual(updatedClub);
      });

      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: '1',
        data: { name: 'Updated Club' },
      });
      expect(toast.success).toHaveBeenCalledWith(
        'Club actualizado exitosamente',
        { id: 'toast-id' }
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('updates active club if it is the one being updated', async () => {
      const updatedClub = { id: '1', name: 'Updated Club' };
      mockUpdateMutate.mockResolvedValue(updatedClub);
      
      const mockSetActiveClub = jest.fn();
      (useActiveClubStore.getState as jest.Mock).mockReturnValue({
        activeClubId: '1',
        setActiveClub: mockSetActiveClub,
        clearActiveClub: jest.fn(),
      });

      const { result } = renderHook(() => useClubsActions());

      await act(async () => {
        await result.current.updateClub('1', { name: 'Updated Club' });
      });

      expect(mockSetActiveClub).toHaveBeenCalledWith(updatedClub);
    });
  });

  describe('deleteClub', () => {
    it('successfully deletes a club after confirmation', async () => {
      mockDeleteMutate.mockResolvedValue(undefined);

      const { result } = renderHook(() => 
        useClubsActions({ onSuccess: mockOnSuccess })
      );

      await act(async () => {
        await result.current.deleteClub('1', 'Test Club');
      });

      expect(global.confirm).toHaveBeenCalledWith(
        '¿Estás seguro de eliminar el club "Test Club"? Esta acción no se puede deshacer.'
      );
      expect(mockDeleteMutate).toHaveBeenCalledWith('1');
      expect(toast.success).toHaveBeenCalledWith(
        'Club eliminado exitosamente',
        { id: 'toast-id' }
      );
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('does not delete when user cancels confirmation', async () => {
      (global.confirm as jest.Mock).mockReturnValue(false);

      const { result } = renderHook(() => useClubsActions());

      await act(async () => {
        await result.current.deleteClub('1', 'Test Club');
      });

      expect(mockDeleteMutate).not.toHaveBeenCalled();
    });

    it('clears active club if deleted club was active', async () => {
      mockDeleteMutate.mockResolvedValue(undefined);
      
      const mockClearActiveClub = jest.fn();
      const mockSetActiveClub = jest.fn();
      const mockRemoveClub = jest.fn();
      
      (useActiveClubStore.getState as jest.Mock).mockReturnValue({
        activeClubId: '1',
        setActiveClub: mockSetActiveClub,
        clearActiveClub: mockClearActiveClub,
      });
      
      (useClubsDataStore.getState as jest.Mock).mockReturnValue({
        clubs: [{ id: '2', name: 'Another Club' }],
        removeClub: mockRemoveClub,
      });

      const { result } = renderHook(() => useClubsActions());

      await act(async () => {
        await result.current.deleteClub('1', 'Test Club');
      });

      expect(mockClearActiveClub).toHaveBeenCalled();
      expect(mockSetActiveClub).toHaveBeenCalledWith({ id: '2', name: 'Another Club' });
      expect(mockRemoveClub).toHaveBeenCalledWith('1');
    });
  });

  describe('processing states', () => {
    it('tracks processing state during operations', async () => {
      mockCreateMutate.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ id: '1' }), 100))
      );

      const { result } = renderHook(() => useClubsActions());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.processingAction).toBe(null);

      const promise = act(async () => {
        await result.current.createClub({ name: 'Test' } as any);
      });

      expect(result.current.isProcessing).toBe(true);
      expect(result.current.processingAction).toBe('create');
      expect(result.current.isCreating).toBe(true);

      await promise;

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.processingAction).toBe(null);
    });
  });
});