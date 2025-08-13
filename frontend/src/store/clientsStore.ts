import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  ApiClient,
  ApiClientFilters,
  ClientViewMode,
  ClientsPageState,
} from '@/types/client';
import {
  ImportModalState,
  ExportModalState,
  OperationProgress,
  ImportResult,
  ExportResult,
  BatchOperationStatus,
} from '@/types/import-export';

interface ClientsStore extends ClientsPageState {
  // State
  clients: ApiClient[];
  totalClients: number;
  currentPage: number;
  pageSize: number;
  filters: ApiClientFilters;
  searchQuery: string;
  loading: boolean;
  error: string | null;

  // Import/Export State
  importModal: ImportModalState;
  exportModal: ExportModalState;
  activeOperations: BatchOperationStatus[];
  lastImportResult: ImportResult | null;
  lastExportResult: ExportResult | null;

  // Actions
  setClients: (clients: ApiClient[], total: number) => void;
  setSelectedClient: (client: ApiClient | null) => void;
  setViewMode: (mode: ClientViewMode) => void;
  setFilters: (filters: Partial<ApiClientFilters>) => void;
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // UI Actions
  openForm: (client?: ApiClient) => void;
  closeForm: () => void;
  openDetail: (client: ApiClient) => void;
  closeDetail: () => void;

  // Data Actions
  addClient: (client: ApiClient) => void;
  updateClient: (id: string, client: Partial<ApiClient>) => void;
  removeClient: (id: string) => void;
  bulkAddClients: (clients: ApiClient[]) => void;
  bulkUpdateClients: (
    updates: Array<{ id: string; client: Partial<ApiClient> }>
  ) => void;
  bulkRemoveClients: (ids: string[]) => void;

  // Import/Export Modal Actions
  openImportModal: () => void;
  closeImportModal: () => void;
  updateImportModal: (updates: Partial<ImportModalState>) => void;
  openExportModal: () => void;
  closeExportModal: () => void;
  updateExportModal: (updates: Partial<ExportModalState>) => void;

  // Import/Export Operations
  addOperation: (operation: BatchOperationStatus) => void;
  updateOperation: (
    operationId: string,
    updates: Partial<BatchOperationStatus>
  ) => void;
  removeOperation: (operationId: string) => void;
  clearCompletedOperations: () => void;
  setLastImportResult: (result: ImportResult | null) => void;
  setLastExportResult: (result: ExportResult | null) => void;

  // Utility Actions
  resetFilters: () => void;
  resetState: () => void;
  resetImportExportState: () => void;
}

const initialState: Omit<ClientsStore, keyof ReturnType<typeof createActions>> =
  {
    // Data
    clients: [],
    totalClients: 0,
    currentPage: 1,
    pageSize: 20,
    filters: {},
    searchQuery: '',
    loading: false,
    error: null,

    // UI
    viewMode: 'list',
    selectedClient: null,
    isFormOpen: false,
    isDetailOpen: false,
    editingClient: null,

    // Import/Export State
    importModal: {
      isOpen: false,
      currentStep: 'upload',
      config: {
        has_header: true,
        delimiter: ',',
        encoding: 'UTF-8',
        field_mappings: [],
        duplicate_strategy: 'ask',
        validate_email: true,
        validate_phone: true,
        skip_invalid_rows: false,
        chunk_size: 100,
      },
      duplicates: [],
    },
    exportModal: {
      isOpen: false,
      currentStep: 'configure',
      config: {
        format: 'csv',
        include_headers: true,
        selected_fields: ['first_name', 'last_name', 'email', 'phone'],
        include_stats: false,
      },
      templates: [],
    },
    activeOperations: [],
    lastImportResult: null,
    lastExportResult: null,
  };

const createActions = (set: any, get: any) => ({
  // Basic setters
  setClients: (clients: ApiClient[], total: number) =>
    set((state: ClientsStore) => {
      state.clients = clients;
      state.totalClients = total;
    }),

  setSelectedClient: (client: ApiClient | null) =>
    set((state: ClientsStore) => {
      state.selectedClient = client;
    }),

  setViewMode: (mode: ClientViewMode) =>
    set((state: ClientsStore) => {
      state.viewMode = mode;
    }),

  setFilters: (filters: Partial<ApiClientFilters>) =>
    set((state: ClientsStore) => {
      state.filters = { ...state.filters, ...filters };
      state.currentPage = 1; // Reset to first page when filters change
    }),

  setSearchQuery: (query: string) =>
    set((state: ClientsStore) => {
      state.searchQuery = query;
      state.filters.search = query;
      state.currentPage = 1;
    }),

  setCurrentPage: (page: number) =>
    set((state: ClientsStore) => {
      state.currentPage = page;
    }),

  setPageSize: (size: number) =>
    set((state: ClientsStore) => {
      state.pageSize = size;
      state.currentPage = 1;
    }),

  setLoading: (loading: boolean) =>
    set((state: ClientsStore) => {
      state.loading = loading;
    }),

  setError: (error: string | null) =>
    set((state: ClientsStore) => {
      state.error = error;
    }),

  // UI Actions
  openForm: (client?: ApiClient) =>
    set((state: ClientsStore) => {
      state.isFormOpen = true;
      state.editingClient = client || null;
    }),

  closeForm: () =>
    set((state: ClientsStore) => {
      state.isFormOpen = false;
      state.editingClient = null;
    }),

  openDetail: (client: ApiClient) =>
    set((state: ClientsStore) => {
      state.selectedClient = client;
      state.isDetailOpen = true;
    }),

  closeDetail: () =>
    set((state: ClientsStore) => {
      state.isDetailOpen = false;
      // Keep selectedClient for a smooth transition
    }),

  // Data Actions
  addClient: (client: ApiClient) =>
    set((state: ClientsStore) => {
      state.clients.unshift(client);
      state.totalClients += 1;
    }),

  updateClient: (id: string, updates: Partial<ApiClient>) =>
    set((state: ClientsStore) => {
      const index = state.clients.findIndex((c) => c.id === id);
      if (index !== -1) {
        state.clients[index] = { ...state.clients[index], ...updates };
      }
      if (state.selectedClient?.id === id) {
        state.selectedClient = { ...state.selectedClient, ...updates };
      }
      if (state.editingClient?.id === id) {
        state.editingClient = { ...state.editingClient, ...updates };
      }
    }),

  removeClient: (id: string) =>
    set((state: ClientsStore) => {
      state.clients = state.clients.filter((c) => c.id !== id);
      state.totalClients -= 1;
      if (state.selectedClient?.id === id) {
        state.selectedClient = null;
        state.isDetailOpen = false;
      }
    }),

  // Bulk Data Actions
  bulkAddClients: (clients: ApiClient[]) =>
    set((state: ClientsStore) => {
      state.clients = [...clients, ...state.clients];
      state.totalClients += clients.length;
    }),

  bulkUpdateClients: (
    updates: Array<{ id: string; client: Partial<ApiClient> }>
  ) =>
    set((state: ClientsStore) => {
      updates.forEach(({ id, client }) => {
        const index = state.clients.findIndex((c) => c.id === id);
        if (index !== -1) {
          state.clients[index] = { ...state.clients[index], ...client };
        }
        if (state.selectedClient?.id === id) {
          state.selectedClient = { ...state.selectedClient, ...client };
        }
        if (state.editingClient?.id === id) {
          state.editingClient = { ...state.editingClient, ...client };
        }
      });
    }),

  bulkRemoveClients: (ids: string[]) =>
    set((state: ClientsStore) => {
      state.clients = state.clients.filter((c) => !ids.includes(c.id));
      state.totalClients -= ids.length;
      if (state.selectedClient && ids.includes(state.selectedClient.id)) {
        state.selectedClient = null;
        state.isDetailOpen = false;
      }
    }),

  // Import/Export Modal Actions
  openImportModal: () =>
    set((state: ClientsStore) => {
      state.importModal.isOpen = true;
      state.importModal.currentStep = 'upload';
    }),

  closeImportModal: () =>
    set((state: ClientsStore) => {
      state.importModal.isOpen = false;
      state.importModal.currentStep = 'upload';
      state.importModal.config = {
        has_header: true,
        delimiter: ',',
        encoding: 'UTF-8',
        field_mappings: [],
        duplicate_strategy: 'ask',
        validate_email: true,
        validate_phone: true,
        skip_invalid_rows: false,
        chunk_size: 100,
      };
      state.importModal.duplicates = [];
      state.importModal.previewData = undefined;
      state.importModal.progress = undefined;
      state.importModal.result = undefined;
    }),

  updateImportModal: (updates: Partial<ImportModalState>) =>
    set((state: ClientsStore) => {
      Object.assign(state.importModal, updates);
    }),

  openExportModal: () =>
    set((state: ClientsStore) => {
      state.exportModal.isOpen = true;
      state.exportModal.currentStep = 'configure';
      state.exportModal.config.filters = state.filters;
    }),

  closeExportModal: () =>
    set((state: ClientsStore) => {
      state.exportModal.isOpen = false;
      state.exportModal.currentStep = 'configure';
      state.exportModal.config = {
        format: 'csv',
        include_headers: true,
        selected_fields: ['first_name', 'last_name', 'email', 'phone'],
        include_stats: false,
      };
      state.exportModal.selectedTemplate = undefined;
      state.exportModal.progress = undefined;
      state.exportModal.result = undefined;
    }),

  updateExportModal: (updates: Partial<ExportModalState>) =>
    set((state: ClientsStore) => {
      Object.assign(state.exportModal, updates);
    }),

  // Import/Export Operations
  addOperation: (operation: BatchOperationStatus) =>
    set((state: ClientsStore) => {
      state.activeOperations.push(operation);
    }),

  updateOperation: (
    operationId: string,
    updates: Partial<BatchOperationStatus>
  ) =>
    set((state: ClientsStore) => {
      const index = state.activeOperations.findIndex(
        (op) => op.operation_id === operationId
      );
      if (index !== -1) {
        Object.assign(state.activeOperations[index], updates);
      }
    }),

  removeOperation: (operationId: string) =>
    set((state: ClientsStore) => {
      state.activeOperations = state.activeOperations.filter(
        (op) => op.operation_id !== operationId
      );
    }),

  clearCompletedOperations: () =>
    set((state: ClientsStore) => {
      state.activeOperations = state.activeOperations.filter(
        (op) =>
          op.status !== 'completed' &&
          op.status !== 'error' &&
          op.status !== 'cancelled'
      );
    }),

  setLastImportResult: (result: ImportResult | null) =>
    set((state: ClientsStore) => {
      state.lastImportResult = result;
    }),

  setLastExportResult: (result: ExportResult | null) =>
    set((state: ClientsStore) => {
      state.lastExportResult = result;
    }),

  // Utility Actions
  resetFilters: () =>
    set((state: ClientsStore) => {
      state.filters = {};
      state.searchQuery = '';
      state.currentPage = 1;
    }),

  resetState: () => set(() => initialState),

  resetImportExportState: () =>
    set((state: ClientsStore) => {
      state.importModal = {
        isOpen: false,
        currentStep: 'upload',
        config: {
          has_header: true,
          delimiter: ',',
          encoding: 'UTF-8',
          field_mappings: [],
          duplicate_strategy: 'ask',
          validate_email: true,
          validate_phone: true,
          skip_invalid_rows: false,
          chunk_size: 100,
        },
        duplicates: [],
      };
      state.exportModal = {
        isOpen: false,
        currentStep: 'configure',
        config: {
          format: 'csv',
          include_headers: true,
          selected_fields: ['first_name', 'last_name', 'email', 'phone'],
          include_stats: false,
        },
        templates: [],
      };
      state.activeOperations = [];
      state.lastImportResult = null;
      state.lastExportResult = null;
    }),
});

export const useClientsStore = create<ClientsStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        ...createActions(set, get),
      })),
      {
        name: 'clients-store',
        partialize: (state) => ({
          viewMode: state.viewMode,
          pageSize: state.pageSize,
        }),
      }
    ),
    {
      name: 'ClientsStore',
    }
  )
);
