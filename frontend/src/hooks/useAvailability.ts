import useSWR from 'swr';
import { toast } from '@/lib/toast';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { BFF_FEATURES } from '@/lib/feature-flags';

// Availability response interface (unified between BFF and legacy)
export interface AvailabilityData {
  date: string;
  club_id: string;
  courts: Array<{
    id: string;
    name: string;
    surface_type: string;
    is_active: boolean;
    slots: Array<{
      start_time: string;
      end_time: string;
      is_available: boolean;
      price: {
        amount: number;
        currency: string;
        includes_tax: boolean;
      };
      promotion?: {
        id: string;
        name: string;
        discount_percent: number;
        original_price: number;
      };
      conflicts: Array<{
        reservation_id: string;
        status: string;
        client_name: string;
      }>;
      blocked_reason?: string;
    }>;
    schedule: {
      open_time: string;
      close_time: string;
      is_open_today: boolean;
    };
  }>;
  summary: {
    total_slots: number;
    available_slots: number;
    occupancy_rate: number;
    peak_hours: string[];
  };
}

// Options for availability requests
export interface AvailabilityOptions {
  courtIds?: string[];
  includePricing?: boolean;
  includeConflicts?: boolean;
  timeRange?: { start: string; end: string };
}

// Optimized availability fetcher with BFF integration and fallback
const availabilityFetcher = async ([clubId, date, options]: [string, string, AvailabilityOptions?]): Promise<AvailabilityData> => {
  try {
    // Use BFF endpoint if enabled, otherwise fall back to service
    return await ReservationsService.getAvailabilityOptimized(clubId, date, options);
  } catch (error) {
        throw error;
  }
};

/**
 * Hook for court availability with BFF optimization
 * 
 * Automatically uses BFF endpoint when enabled, falls back to legacy service calls
 * Maintains backward compatibility with existing components
 * 
 * @param clubId - Club identifier
 * @param date - Date in YYYY-MM-DD format
 * @param options - Optional filtering and inclusion options
 */
export function useAvailability(
  clubId: string, 
  date: string, 
  options?: AvailabilityOptions
) {
  const { data, error, isLoading, mutate } = useSWR<AvailabilityData>(
    clubId && date ? [clubId, date, options] : null,
    availabilityFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // Refresh every minute for availability
      onError: (error) => {
                toast.error('Error loading court availability');
      },
    }
  );

  const refresh = async () => {
    try {
      await mutate();
      toast.success('Availability updated');
    } catch (error) {
      toast.error('Failed to refresh availability');
    }
  };

  return {
    data,
    isLoading,
    error,
    refresh,
    // Utility computed values
    availableCourts: data?.courts.filter(court => 
      court.slots.some(slot => slot.is_available)
    ) || [],
    totalAvailableSlots: data?.summary.available_slots || 0,
    occupancyRate: data?.summary.occupancy_rate || 0,
    // Feature flag info
    isBFFEnabled: BFF_FEATURES.reservations,
  };
}

/**
 * Hook for multiple dates availability (batch loading)
 * Useful for calendar views and multi-day availability checks
 */
export function useMultiDateAvailability(
  clubId: string, 
  dates: string[], 
  options?: AvailabilityOptions
) {
  // Create individual SWR queries for each date
  const queries = dates.map(date => ({
    key: clubId && date ? [clubId, date, options] : null,
    date,
  }));

  // We need to handle multiple dates differently to avoid hooks inside map
  // For now, this function only supports single date queries
  // TODO: Implement proper multi-date support using SWR's multiple fetcher pattern
  
  if (dates.length > 1) {
      }
  
  const singleDate = dates[0];
  const key = clubId && singleDate ? [clubId, singleDate, options] : null;
  
  const { data, error, isLoading: singleLoading } = useSWR<AvailabilityData>(key, availabilityFetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 60000,
  });
  
  const results = [{
    date: singleDate,
    data,
    error,
    isLoading: singleLoading
  }];

  const isLoading = results.some(result => result.isLoading);
  const hasError = results.some(result => result.error);
  const availabilityByDate = results.reduce((acc, result) => {
    if (result.data) {
      acc[result.date] = result.data;
    }
    return acc;
  }, {} as Record<string, AvailabilityData>);

  return {
    availabilityByDate,
    isLoading,
    hasError,
    // Utility methods
    getAvailabilityForDate: (date: string) => availabilityByDate[date],
    getTotalSlotsForDate: (date: string) => availabilityByDate[date]?.summary.total_slots || 0,
    getAvailableSlotsForDate: (date: string) => availabilityByDate[date]?.summary.available_slots || 0,
    isBFFEnabled: BFF_FEATURES.reservations,
  };
}

/**
 * Hook for real-time availability updates
 * Subscribes to availability changes via WebSocket when available
 */
export function useRealtimeAvailability(
  clubId: string, 
  date: string, 
  options?: AvailabilityOptions
) {
  const availability = useAvailability(clubId, date, options);

  // TODO: Implement WebSocket subscription for real-time updates
  // This would integrate with the WebSocket service to get live availability changes

  return {
    ...availability,
    // Additional real-time features would go here
    isRealtime: false, // Will be true when WebSocket is connected
  };
}

/**
 * Legacy compatibility hook - maps to old interface
 * @deprecated Use useAvailability instead
 */
export function useCourtAvailability(clubId: string, date: string, courtId?: string) {
  const options: AvailabilityOptions = courtId ? { courtIds: [courtId] } : {};
  const { data, isLoading, error } = useAvailability(clubId, date, options);

  // Transform to legacy format for backward compatibility
  const legacyData = data ? {
    availability: data.courts.map(court => ({
      court: {
        id: court.id,
        name: court.name,
        price_per_hour: court.slots[0]?.price.amount || 0,
      },
      slots: court.slots,
    })),
  } : null;

  return {
    data: legacyData,
    isLoading,
    error,
  };
}