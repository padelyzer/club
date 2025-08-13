import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Reservation, Court, OptimisticUpdate, LoadingState } from '@/types';
import {
  WebSocketMessage,
  WebSocketStoreIntegration,
  ReservationCreatedPayload,
  ReservationUpdatedPayload,
  ReservationCancelledPayload,
  isReservationMessage,
} from '@/types/websocket';

interface ReservationFilters {
  dateRange: {
    start: string;
    end: string;
  };
  courts: string[];
  status: Reservation['status'][];
  players: string[];
}

interface ReservationStore extends LoadingState, WebSocketStoreIntegration {
  // Data
  reservations: Reservation[];
  courts: Court[];
  selectedReservation: Reservation | null;
  selectedDate: Date;

  // Filters and views
  filters: ReservationFilters;
  viewMode: 'timeline' | 'calendar' | 'list';
  timelineRange: { start: string; end: string };

  // Optimistic updates
  optimisticUpdates: OptimisticUpdate<Reservation>[];

  // Availability checking
  availabilityCache: Record<string, boolean>;
  availabilityLoading: Record<string, boolean>;

  // Real-time state
  lastWebSocketUpdate: string | null;
  pendingUpdates: Set<string>;

  // Actions
  setReservations: (reservations: Reservation[]) => void;
  addReservation: (reservation: Reservation) => void;
  updateReservation: (id: string, updates: Partial<Reservation>) => void;
  removeReservation: (id: string) => void;

  // Optimistic updates
  addOptimisticUpdate: (update: OptimisticUpdate<Reservation>) => void;
  updateOptimisticUpdate: (
    id: string,
    status: OptimisticUpdate<Reservation>['status']
  ) => void;
  removeOptimisticUpdate: (id: string) => void;
  revertOptimisticUpdate: (id: string) => void;

  // Courts
  setCourts: (courts: Court[]) => void;

  // Selection
  setSelectedReservation: (reservation: Reservation | null) => void;
  setSelectedDate: (date: Date) => void;

  // Filters
  setFilters: (filters: Partial<ReservationFilters>) => void;
  resetFilters: () => void;

  // View mode
  setViewMode: (mode: ReservationStore['viewMode']) => void;
  setTimelineRange: (range: { start: string; end: string }) => void;

  // Availability
  checkAvailability: (
    courtId: string,
    date: string,
    startTime: string,
    endTime: string
  ) => Promise<boolean>;
  setAvailability: (key: string, available: boolean) => void;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // WebSocket integration
  handleWebSocketMessage: (message: WebSocketMessage) => void;
  setPendingUpdate: (reservationId: string, isPending: boolean) => void;

  // Computed getters
  getFilteredReservations: () => Reservation[];
  getReservationsByDate: (date: string) => Reservation[];
  getReservationsByCourt: (courtId: string) => Reservation[];
  getUpcomingReservations: () => Reservation[];
}

const defaultFilters: ReservationFilters = {
  dateRange: {
    start: new Date().toISOString().split('T')[0]!,
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]!,
  },
  courts: [],
  status: ['confirmed', 'pending'],
  players: [],
};

export const useReservationStore = create<ReservationStore>()(
  immer((set, get) => ({
    // Initial state
    reservations: [],
    courts: [],
    selectedReservation: null,
    selectedDate: new Date(),
    filters: defaultFilters,
    viewMode: 'timeline',
    timelineRange: {
      start: new Date().toISOString().split('T')[0]!,
      end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]!,
    },
    optimisticUpdates: [],
    availabilityCache: {},
    availabilityLoading: {},
    isLoading: false,
    error: null,
    lastWebSocketUpdate: null,
    pendingUpdates: new Set(),

    // WebSocket integration
    messageTypes: [
      'reservation:created',
      'reservation:updated',
      'reservation:cancelled',
    ],

    handleMessage: (message: WebSocketMessage) => {
      if (!isReservationMessage(message)) return;

      set((state) => {
        state.lastWebSocketUpdate = new Date().toISOString();
      });

      switch (message.type) {
        case 'reservation:created':
          const createPayload = message.payload as ReservationCreatedPayload;
          set((state) => {
            // Check if reservation already exists (from optimistic update)
            const exists = state.reservations.some(
              (r) => r.id === createPayload.reservation.id
            );
            if (!exists) {
              state.reservations.push(createPayload.reservation);
              // Sort by date and time
              state.reservations.sort(
                (a, b) =>
                  new Date(`${a.date} ${a.startTime}`).getTime() -
                  new Date(`${b.date} ${b.startTime}`).getTime()
              );
            }
            // Remove from pending updates
            state.pendingUpdates.delete(createPayload.reservation.id);
            // Clear any optimistic update for this reservation
            state.optimisticUpdates = state.optimisticUpdates.filter(
              (u) => u.data.id !== createPayload.reservation.id
            );
          });
          break;

        case 'reservation:updated':
          const updatePayload = message.payload as ReservationUpdatedPayload;
          set((state) => {
            const index = state.reservations.findIndex(
              (r) => r.id === updatePayload.reservation.id
            );
            if (index !== -1) {
              state.reservations[index] = updatePayload.reservation;
            }
            // Update selected reservation if it&apos;s the same
            if (
              state.selectedReservation?.id === updatePayload.reservation.id
            ) {
              state.selectedReservation = updatePayload.reservation;
            }
            // Remove from pending updates
            state.pendingUpdates.delete(updatePayload.reservation.id);
            // Clear any optimistic update for this reservation
            state.optimisticUpdates = state.optimisticUpdates.filter(
              (u) => u.data.id !== updatePayload.reservation.id
            );
          });
          break;

        case 'reservation:cancelled':
          const cancelPayload = message.payload as ReservationCancelledPayload;
          set((state) => {
            const index = state.reservations.findIndex(
              (r) => r.id === cancelPayload.reservationId
            );
            if (index !== -1 && state.reservations[index]) {
              state.reservations[index].status = 'cancelled';
              if (cancelPayload.refundStatus) {
                state.reservations[index].paymentStatus =
                  cancelPayload.refundStatus === 'processed'
                    ? 'refunded'
                    : 'pending';
              }
            }
            // Clear selected reservation if it&apos;s the cancelled one
            if (state.selectedReservation?.id === cancelPayload.reservationId) {
              state.selectedReservation = null;
            }
            // Remove from pending updates
            state.pendingUpdates.delete(cancelPayload.reservationId);
            // Clear availability cache for the cancelled reservation
            const reservation = state.reservations.find(
              (r) => r.id === cancelPayload.reservationId
            );
            if (reservation) {
              const key = `${reservation.court.id}-${reservation.date}-${reservation.startTime}-${reservation.endTime}`;
              delete state.availabilityCache[key];
            }
          });
          break;
      }
    },

    handleWebSocketMessage: (message: WebSocketMessage) => {
      get().handleMessage(message);
    },

    setPendingUpdate: (reservationId: string, isPending: boolean) =>
      set((state) => {
        if (isPending) {
          state.pendingUpdates.add(reservationId);
        } else {
          state.pendingUpdates.delete(reservationId);
        }
      }),

    // Actions
    setReservations: (reservations) =>
      set((state) => {
        state.reservations = reservations;
      }),

    addReservation: (reservation) =>
      set((state) => {
        state.reservations.push(reservation);
        // Sort by date and time
        state.reservations.sort(
          (a, b) =>
            new Date(`${a.date} ${a.startTime}`).getTime() -
            new Date(`${b.date} ${b.startTime}`).getTime()
        );
      }),

    updateReservation: (id, updates) =>
      set((state) => {
        const index = state.reservations.findIndex((r) => r.id === id);
        if (index !== -1 && state.reservations[index]) {
          Object.assign(state.reservations[index], updates);
        }
      }),

    removeReservation: (id) =>
      set((state) => {
        state.reservations = state.reservations.filter((r) => r.id !== id);
      }),

    // Optimistic updates
    addOptimisticUpdate: (update) =>
      set((state) => {
        state.optimisticUpdates.push(update);

        // Apply the optimistic update immediately
        switch (update.type) {
          case 'create':
            state.reservations.push(update.data);
            break;
          case 'update':
            const updateIndex = state.reservations.findIndex(
              (r) => r.id === update.data.id
            );
            if (updateIndex !== -1 && state.reservations[updateIndex]) {
              update.originalData = state.reservations[updateIndex];
              state.reservations[updateIndex] = update.data;
            }
            break;
          case 'delete':
            const deleteIndex = state.reservations.findIndex(
              (r) => r.id === update.data.id
            );
            if (deleteIndex !== -1 && state.reservations[deleteIndex]) {
              update.originalData = state.reservations[deleteIndex];
              state.reservations.splice(deleteIndex, 1);
            }
            break;
        }
      }),

    updateOptimisticUpdate: (id, status) =>
      set((state) => {
        const update = state.optimisticUpdates.find((u) => u.id === id);
        if (update) {
          update.status = status;

          // If failed, revert the change
          if (status === 'error' && update.originalData) {
            const index = state.reservations.findIndex(
              (r) => r.id === update.data.id
            );
            if (update.type === 'update' && index !== -1) {
              state.reservations[index] = update.originalData;
            } else if (update.type === 'delete') {
              state.reservations.push(update.originalData);
            } else if (update.type === 'create') {
              state.reservations = state.reservations.filter(
                (r) => r.id !== update.data.id
              );
            }
          }
        }
      }),

    removeOptimisticUpdate: (id) =>
      set((state) => {
        state.optimisticUpdates = state.optimisticUpdates.filter(
          (u) => u.id !== id
        );
      }),

    revertOptimisticUpdate: (id) =>
      set((state) => {
        const update = state.optimisticUpdates.find((u) => u.id === id);
        if (update && update.originalData) {
          const index = state.reservations.findIndex(
            (r) => r.id === update.data.id
          );
          if (update.type === 'update' && index !== -1) {
            state.reservations[index] = update.originalData;
          } else if (update.type === 'delete') {
            state.reservations.push(update.originalData);
          } else if (update.type === 'create') {
            state.reservations = state.reservations.filter(
              (r) => r.id !== update.data.id
            );
          }
        }
        state.optimisticUpdates = state.optimisticUpdates.filter(
          (u) => u.id !== id
        );
      }),

    // Courts
    setCourts: (courts) =>
      set((state) => {
        state.courts = courts;
      }),

    // Selection
    setSelectedReservation: (reservation) =>
      set((state) => {
        state.selectedReservation = reservation;
      }),

    setSelectedDate: (date) =>
      set((state) => {
        state.selectedDate = date;
      }),

    // Filters
    setFilters: (filters) =>
      set((state) => {
        Object.assign(state.filters, filters);
      }),

    resetFilters: () =>
      set((state) => {
        state.filters = defaultFilters;
      }),

    // View mode
    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),

    setTimelineRange: (range) =>
      set((state) => {
        state.timelineRange = range;
      }),

    // Availability
    checkAvailability: async (
      courtId,
      date,
      startTime,
      endTime
    ): Promise<boolean> => {
      const key = `${courtId}-${date}-${startTime}-${endTime}`;
      const { availabilityCache, availabilityLoading } = get();

      // Return cached result if available
      if (key in availabilityCache) {
        return availabilityCache[key] ?? false;
      }

      // Return early if already loading
      if (availabilityLoading[key]) {
        return false;
      }

      set((state) => {
        state.availabilityLoading[key] = true;
      });

      try {
        // Simulate API call - replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Simple availability check based on existing reservations
        const { reservations } = get();
        const isAvailable = !reservations.some(
          (reservation) =>
            reservation.court.id === courtId &&
            reservation.date === date &&
            reservation.status !== 'cancelled' &&
            ((startTime >= reservation.startTime &&
              startTime < reservation.endTime) ||
              (endTime > reservation.startTime &&
                endTime <= reservation.endTime) ||
              (startTime <= reservation.startTime &&
                endTime >= reservation.endTime))
        );

        set((state) => {
          state.availabilityCache[key] = isAvailable;
          delete state.availabilityLoading[key];
        });

        return isAvailable;
      } catch (error) {
        set((state) => {
          state.availabilityCache[key] = false;
          delete state.availabilityLoading[key];
        });
        return false;
      }
    },

    setAvailability: (key, available) =>
      set((state) => {
        state.availabilityCache[key] = available;
      }),

    // Loading and error states
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    // Computed getters
    getFilteredReservations: () => {
      const { reservations, filters } = get();

      return reservations.filter((reservation) => {
        // Date range filter
        const reservationDate = new Date(reservation.date);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);

        if (reservationDate < startDate || reservationDate > endDate) {
          return false;
        }

        // Court filter
        if (
          filters.courts.length > 0 &&
          !filters.courts.includes(reservation.court.id)
        ) {
          return false;
        }

        // Status filter
        if (
          filters.status.length > 0 &&
          !filters.status.includes(reservation.status)
        ) {
          return false;
        }

        // Player filter
        if (filters.players.length > 0) {
          const reservationPlayerIds = reservation.players.map((p) => p.id);
          const hasFilteredPlayer = filters.players.some((playerId) =>
            reservationPlayerIds.includes(playerId)
          );
          if (!hasFilteredPlayer) {
            return false;
          }
        }

        return true;
      });
    },

    getReservationsByDate: (date) => {
      const { reservations } = get();
      return reservations.filter((reservation) => reservation.date === date);
    },

    getReservationsByCourt: (courtId) => {
      const { reservations } = get();
      return reservations.filter(
        (reservation) => reservation.court.id === courtId
      );
    },

    getUpcomingReservations: () => {
      const { reservations } = get();
      const now = new Date();
      return reservations.filter((reservation) => {
        const reservationDateTime = new Date(
          `${reservation.date} ${reservation.startTime}`
        );
        return reservationDateTime > now && reservation.status !== 'cancelled';
      });
    },
  }))
);
