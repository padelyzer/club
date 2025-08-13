import { act, renderHook } from '@testing-library/react';
import { useClientsStore } from '../clientsStore';
import { mockClient, mockClients, createMockClient } from '@/test-utils/mocks';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  devtools: (fn: any) => fn,
  persist: (fn: any) => fn,
  immer: (fn: any) => fn,
}));

describe('clientsStore', () => {
  // Reset store before each test
  beforeEach(() => {
    const { result } = renderHook(() => useClientsStore());
    act(() => {
      result.current.resetState();
    });
  });

  describe('Initial State', () => {
    it('has correct initial values', () => {
      const { result } = renderHook(() => useClientsStore());

      expect(result.current.clients).toEqual([]);
      expect(result.current.totalClients).toBe(0);
      expect(result.current.currentPage).toBe(1);
      expect(result.current.pageSize).toBe(20);
      expect(result.current.filters).toEqual({});
      expect(result.current.searchQuery).toBe('');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.viewMode).toBe('list');
      expect(result.current.selectedClient).toBe(null);
      expect(result.current.isFormOpen).toBe(false);
      expect(result.current.isDetailOpen).toBe(false);
      expect(result.current.editingClient).toBe(null);
    });
  });

  describe('Basic Setters', () => {
    it('sets clients and total', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.setClients(mockClients, 3);
      });

      expect(result.current.clients).toEqual(mockClients);
      expect(result.current.totalClients).toBe(3);
    });

    it('sets selected client', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.setSelectedClient(mockClient);
      });

      expect(result.current.selectedClient).toEqual(mockClient);
    });

    it('sets view mode', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.setViewMode('grid');
      });

      expect(result.current.viewMode).toBe('grid');
    });

    it('sets loading state', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);
    });

    it('sets error state', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');
    });
  });

  describe('Filter Management', () => {
    it('sets filters and resets to first page', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set to page 2 first
      act(() => {
        result.current.setCurrentPage(2);
      });

      // Apply filters
      act(() => {
        result.current.setFilters({ is_active: true });
      });

      expect(result.current.filters).toEqual({ is_active: true });
      expect(result.current.currentPage).toBe(1); // Reset to first page
    });

    it('merges filters correctly', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.setFilters({ is_active: true });
      });

      act(() => {
        result.current.setFilters({ has_membership: false });
      });

      expect(result.current.filters).toEqual({
        is_active: true,
        has_membership: false,
      });
    });

    it('sets search query and updates filters', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.setSearchQuery('John Doe');
      });

      expect(result.current.searchQuery).toBe('John Doe');
      expect(result.current.filters.search).toBe('John Doe');
      expect(result.current.currentPage).toBe(1);
    });

    it('resets filters correctly', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set some filters
      act(() => {
        result.current.setFilters({ is_active: true });
        result.current.setSearchQuery('test');
        result.current.setCurrentPage(3);
      });

      // Reset filters
      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters).toEqual({});
      expect(result.current.searchQuery).toBe('');
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('Pagination', () => {
    it('sets current page', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.setCurrentPage(3);
      });

      expect(result.current.currentPage).toBe(3);
    });

    it('sets page size and resets to first page', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set to page 2 first
      act(() => {
        result.current.setCurrentPage(2);
      });

      // Change page size
      act(() => {
        result.current.setPageSize(50);
      });

      expect(result.current.pageSize).toBe(50);
      expect(result.current.currentPage).toBe(1);
    });
  });

  describe('UI Actions', () => {
    it('opens form for new client', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.openForm();
      });

      expect(result.current.isFormOpen).toBe(true);
      expect(result.current.editingClient).toBe(null);
    });

    it('opens form for editing client', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.openForm(mockClient);
      });

      expect(result.current.isFormOpen).toBe(true);
      expect(result.current.editingClient).toEqual(mockClient);
    });

    it('closes form', () => {
      const { result } = renderHook(() => useClientsStore());

      // Open form first
      act(() => {
        result.current.openForm(mockClient);
      });

      // Close form
      act(() => {
        result.current.closeForm();
      });

      expect(result.current.isFormOpen).toBe(false);
      expect(result.current.editingClient).toBe(null);
    });

    it('opens detail view', () => {
      const { result } = renderHook(() => useClientsStore());

      act(() => {
        result.current.openDetail(mockClient);
      });

      expect(result.current.selectedClient).toEqual(mockClient);
      expect(result.current.isDetailOpen).toBe(true);
    });

    it('closes detail view', () => {
      const { result } = renderHook(() => useClientsStore());

      // Open detail first
      act(() => {
        result.current.openDetail(mockClient);
      });

      // Close detail
      act(() => {
        result.current.closeDetail();
      });

      expect(result.current.isDetailOpen).toBe(false);
      // Note: selectedClient is kept for smooth transition
      expect(result.current.selectedClient).toEqual(mockClient);
    });
  });

  describe('Data Actions', () => {
    it('adds a new client', () => {
      const { result } = renderHook(() => useClientsStore());
      const newClient = createMockClient({ id: '4', first_name: 'New' });

      // Set initial clients
      act(() => {
        result.current.setClients(mockClients, 3);
      });

      // Add new client
      act(() => {
        result.current.addClient(newClient);
      });

      expect(result.current.clients).toHaveLength(4);
      expect(result.current.clients[0]).toEqual(newClient); // Added at beginning
      expect(result.current.totalClients).toBe(4);
    });

    it('updates an existing client', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set initial clients
      act(() => {
        result.current.setClients(mockClients, 3);
      });

      // Update client
      act(() => {
        result.current.updateClient('1', { first_name: 'Updated' });
      });

      const updatedClient = result.current.clients.find((c) => c.id === '1');
      expect(updatedClient?.first_name).toBe('Updated');
    });

    it('updates selected client when updated', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set initial state
      act(() => {
        result.current.setClients(mockClients, 3);
        result.current.setSelectedClient(mockClient);
      });

      // Update the selected client
      act(() => {
        result.current.updateClient('1', { first_name: 'Updated' });
      });

      expect(result.current.selectedClient?.first_name).toBe('Updated');
    });

    it('updates editing client when updated', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set initial state
      act(() => {
        result.current.setClients(mockClients, 3);
        result.current.openForm(mockClient);
      });

      // Update the editing client
      act(() => {
        result.current.updateClient('1', { first_name: 'Updated' });
      });

      expect(result.current.editingClient?.first_name).toBe('Updated');
    });

    it('removes a client', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set initial clients
      act(() => {
        result.current.setClients(mockClients, 3);
      });

      // Remove client
      act(() => {
        result.current.removeClient('1');
      });

      expect(result.current.clients).toHaveLength(2);
      expect(result.current.clients.find((c) => c.id === '1')).toBeUndefined();
      expect(result.current.totalClients).toBe(2);
    });

    it('closes detail when removing selected client', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set initial state
      act(() => {
        result.current.setClients(mockClients, 3);
        result.current.openDetail(mockClient);
      });

      // Remove the selected client
      act(() => {
        result.current.removeClient('1');
      });

      expect(result.current.selectedClient).toBe(null);
      expect(result.current.isDetailOpen).toBe(false);
    });

    it('does not affect detail when removing different client', () => {
      const { result } = renderHook(() => useClientsStore());

      // Set initial state
      act(() => {
        result.current.setClients(mockClients, 3);
        result.current.openDetail(mockClient);
      });

      // Remove a different client
      act(() => {
        result.current.removeClient('2');
      });

      expect(result.current.selectedClient).toEqual(mockClient);
      expect(result.current.isDetailOpen).toBe(true);
    });
  });

  describe('State Reset', () => {
    it('resets entire state to initial values', () => {
      const { result } = renderHook(() => useClientsStore());

      // Modify state
      act(() => {
        result.current.setClients(mockClients, 3);
        result.current.setViewMode('grid');
        result.current.setFilters({ is_active: true });
        result.current.setSearchQuery('test');
        result.current.openForm(mockClient);
      });

      // Reset state
      act(() => {
        result.current.resetState();
      });

      expect(result.current.clients).toEqual([]);
      expect(result.current.totalClients).toBe(0);
      expect(result.current.viewMode).toBe('list');
      expect(result.current.filters).toEqual({});
      expect(result.current.searchQuery).toBe('');
      expect(result.current.isFormOpen).toBe(false);
      expect(result.current.editingClient).toBe(null);
    });
  });
});
