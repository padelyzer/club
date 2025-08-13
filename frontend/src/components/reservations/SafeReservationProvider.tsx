/**
 * SafeReservationProvider - Robust React provider for reservations module
 * Implements defensive patterns with retry logic, circuit breakers, and comprehensive error handling
 * Based on the successful SafeClubProvider pattern
 */

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useEffect, 
  useRef,
  ReactNode
} from 'react';
import { toast } from 'sonner';

// Types
interface Reservation {
  id: string;
  club: string;
  court: string;
  user: string;
  organization: string;
  datetime_start: string;
  datetime_end: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
  reservation_type: 'single' | 'recurring' | 'tournament' | 'class' | 'maintenance' | 'blocked';
  player_count: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

interface Court {
  id: string;
  name: string;
  number: number;
  club: string;
  surface_type: string;
  has_lighting: boolean;
  price_per_hour: number;
  is_active: boolean;
  maintenance_start?: string;
  maintenance_end?: string;
}

interface AvailabilitySlot {
  court_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  price: number;
  reason?: string;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  timestamp: string;
  details?: any;
}

interface ReservationState {
  // Data
  reservations: Reservation[];
  selectedReservation: Reservation | null;
  availabilitySlots: AvailabilitySlot[];
  courts: Court[];
  
  // Loading states
  isLoadingReservations: boolean;
  isLoadingAvailability: boolean;
  isCreatingReservation: boolean;
  isCancellingReservation: boolean;
  isLoadingCourts: boolean;
  
  // Error states
  reservationError: ApiError | null;
  availabilityError: ApiError | null;
  
  // Circuit breaker states
  availabilityCircuitOpen: boolean;
  reservationCircuitOpen: boolean;
  
  // Health monitoring
  healthStatus: {
    overall_healthy: boolean;
    last_check: string;
    issues: string[];
  };
  
  // Cache management
  cacheTimestamp: number;
  availabilityCacheExpiry: number;
}

type ReservationAction =
  | { type: 'SET_LOADING_RESERVATIONS'; payload: boolean }
  | { type: 'SET_LOADING_AVAILABILITY'; payload: boolean }
  | { type: 'SET_CREATING_RESERVATION'; payload: boolean }
  | { type: 'SET_CANCELLING_RESERVATION'; payload: boolean }
  | { type: 'SET_LOADING_COURTS'; payload: boolean }
  | { type: 'SET_RESERVATIONS'; payload: Reservation[] }
  | { type: 'SET_SELECTED_RESERVATION'; payload: Reservation | null }
  | { type: 'ADD_RESERVATION'; payload: Reservation }
  | { type: 'UPDATE_RESERVATION'; payload: Reservation }
  | { type: 'DELETE_RESERVATION'; payload: string }
  | { type: 'SET_AVAILABILITY_SLOTS'; payload: AvailabilitySlot[] }
  | { type: 'SET_COURTS'; payload: Court[] }
  | { type: 'SET_RESERVATION_ERROR'; payload: ApiError | null }
  | { type: 'SET_AVAILABILITY_ERROR'; payload: ApiError | null }
  | { type: 'SET_CIRCUIT_BREAKER'; payload: { type: 'availability' | 'reservation'; open: boolean } }
  | { type: 'SET_HEALTH_STATUS'; payload: ReservationState['healthStatus'] }
  | { type: 'UPDATE_CACHE_TIMESTAMP' }
  | { type: 'CLEAR_AVAILABILITY_CACHE' }
  | { type: 'RESET_STATE' };

// Initial state
const initialState: ReservationState = {
  reservations: [],
  selectedReservation: null,
  availabilitySlots: [],
  courts: [],
  isLoadingReservations: false,
  isLoadingAvailability: false,
  isCreatingReservation: false,
  isCancellingReservation: false,
  isLoadingCourts: false,
  reservationError: null,
  availabilityError: null,
  availabilityCircuitOpen: false,
  reservationCircuitOpen: false,
  healthStatus: {
    overall_healthy: true,
    last_check: new Date().toISOString(),
    issues: []
  },
  cacheTimestamp: Date.now(),
  availabilityCacheExpiry: 0
};

// Reducer
function reservationReducer(state: ReservationState, action: ReservationAction): ReservationState {
  switch (action.type) {
    case 'SET_LOADING_RESERVATIONS':
      return { ...state, isLoadingReservations: action.payload };
      
    case 'SET_LOADING_AVAILABILITY':
      return { ...state, isLoadingAvailability: action.payload };
      
    case 'SET_CREATING_RESERVATION':
      return { ...state, isCreatingReservation: action.payload };
      
    case 'SET_CANCELLING_RESERVATION':
      return { ...state, isCancellingReservation: action.payload };
      
    case 'SET_LOADING_COURTS':
      return { ...state, isLoadingCourts: action.payload };
      
    case 'SET_RESERVATIONS':
      return { 
        ...state, 
        reservations: action.payload,
        reservationError: null,
        cacheTimestamp: Date.now()
      };
      
    case 'SET_SELECTED_RESERVATION':
      return { ...state, selectedReservation: action.payload };
      
    case 'ADD_RESERVATION':
      return {
        ...state,
        reservations: [...state.reservations, action.payload],
        cacheTimestamp: Date.now()
      };
      
    case 'UPDATE_RESERVATION':
      return {
        ...state,
        reservations: state.reservations.map(r => 
          r.id === action.payload.id ? action.payload : r
        ),
        selectedReservation: state.selectedReservation?.id === action.payload.id 
          ? action.payload 
          : state.selectedReservation,
        cacheTimestamp: Date.now()
      };
      
    case 'DELETE_RESERVATION':
      return {
        ...state,
        reservations: state.reservations.filter(r => r.id !== action.payload),
        selectedReservation: state.selectedReservation?.id === action.payload 
          ? null 
          : state.selectedReservation,
        cacheTimestamp: Date.now()
      };
      
    case 'SET_AVAILABILITY_SLOTS':
      return {
        ...state,
        availabilitySlots: action.payload,
        availabilityError: null,
        availabilityCacheExpiry: Date.now() + (5 * 60 * 1000) // 5 minutes cache
      };
      
    case 'SET_COURTS':
      return { ...state, courts: action.payload };
      
    case 'SET_RESERVATION_ERROR':
      return { ...state, reservationError: action.payload };
      
    case 'SET_AVAILABILITY_ERROR':
      return { ...state, availabilityError: action.payload };
      
    case 'SET_CIRCUIT_BREAKER':
      if (action.payload.type === 'availability') {
        return { ...state, availabilityCircuitOpen: action.payload.open };
      } else {
        return { ...state, reservationCircuitOpen: action.payload.open };
      }
      
    case 'SET_HEALTH_STATUS':
      return { ...state, healthStatus: action.payload };
      
    case 'UPDATE_CACHE_TIMESTAMP':
      return { ...state, cacheTimestamp: Date.now() };
      
    case 'CLEAR_AVAILABILITY_CACHE':
      return { 
        ...state, 
        availabilitySlots: [], 
        availabilityCacheExpiry: 0 
      };
      
    case 'RESET_STATE':
      return initialState;
      
    default:
      return state;
  }
}

// Context
interface ReservationContextValue {
  state: ReservationState;
  
  // Core actions
  loadReservations: (clubId?: string, userId?: string) => Promise<void>;
  createReservation: (reservationData: any) => Promise<Reservation>;
  updateReservation: (id: string, updateData: any) => Promise<void>;
  cancelReservation: (id: string, reason?: string) => Promise<void>;
  
  // Availability actions
  checkAvailability: (clubId: string, date: string, courtId?: string) => Promise<void>;
  clearAvailabilityCache: () => void;
  
  // Court actions
  loadCourts: (clubId: string) => Promise<void>;
  
  // Selection actions
  selectReservation: (reservation: Reservation | null) => void;
  
  // Error handling
  clearErrors: () => void;
  retry: (operation: string) => Promise<void>;
  
  // Health monitoring
  checkHealth: () => Promise<void>;
  
  // Circuit breaker status
  isCircuitOpen: (type: 'availability' | 'reservation') => boolean;
}

const ReservationContext = createContext<ReservationContextValue | undefined>(undefined);

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  availability: {
    threshold: 3,
    timeout: 15000, // 15 seconds
    retryAfter: 30000 // 30 seconds
  },
  reservation: {
    threshold: 5,
    timeout: 30000, // 30 seconds
    retryAfter: 60000 // 1 minute
  }
};

// Provider component
interface SafeReservationProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
  enableLogging?: boolean;
  retryAttempts?: number;
}

export function SafeReservationProvider({
  children,
  apiBaseUrl = '/api',
  enableLogging = process.env.NODE_ENV === 'development',
  retryAttempts = 3
}: SafeReservationProviderProps) {
  const [state, dispatch] = useReducer(reservationReducer, initialState);
  
  // Circuit breaker state
  const circuitBreakerState = useRef({
    availability: { failures: 0, lastFailure: 0, isOpen: false },
    reservation: { failures: 0, lastFailure: 0, isOpen: false }
  });
  
  // Logging utility
  const log = useCallback((message: string, level: 'info' | 'warn' | 'error' = 'info', data?: any) => {
    if (enableLogging) {
      console[level](`[SafeReservationProvider] ${message}`, data || '');
    }
  }, [enableLogging]);
  
  // Circuit breaker utilities
  const checkCircuitBreaker = useCallback((type: 'availability' | 'reservation'): boolean => {
    const breaker = circuitBreakerState.current[type];
    const config = CIRCUIT_BREAKER_CONFIG[type];
    
    if (breaker.isOpen) {
      const timeSinceLastFailure = Date.now() - breaker.lastFailure;
      if (timeSinceLastFailure > config.retryAfter) {
        // Reset circuit breaker
        breaker.isOpen = false;
        breaker.failures = 0;
        dispatch({ type: 'SET_CIRCUIT_BREAKER', payload: { type, open: false } });
        log(`Circuit breaker ${type} reset`);
        return false;
      }
      return true;
    }
    
    return false;
  }, [log]);
  
  const recordFailure = useCallback((type: 'availability' | 'reservation', error: any) => {
    const breaker = circuitBreakerState.current[type];
    const config = CIRCUIT_BREAKER_CONFIG[type];
    
    breaker.failures += 1;
    breaker.lastFailure = Date.now();
    
    if (breaker.failures >= config.threshold) {
      breaker.isOpen = true;
      dispatch({ type: 'SET_CIRCUIT_BREAKER', payload: { type, open: true } });
      log(`Circuit breaker ${type} opened after ${breaker.failures} failures`, 'warn');
      
      toast.error(`${type} service temporarily unavailable. Please try again later.`);
    }
  }, [log]);
  
  const recordSuccess = useCallback((type: 'availability' | 'reservation') => {
    const breaker = circuitBreakerState.current[type];
    breaker.failures = 0;
    
    if (breaker.isOpen) {
      breaker.isOpen = false;
      dispatch({ type: 'SET_CIRCUIT_BREAKER', payload: { type, open: false } });
      log(`Circuit breaker ${type} closed after successful operation`);
    }
  }, [log]);
  
  // API call wrapper with retry logic and circuit breaker
  const safeApiCall = useCallback(async <T>(
    operation: () => Promise<T>,
    operationType: 'availability' | 'reservation',
    operationName: string
  ): Promise<T> => {
    // Check circuit breaker
    if (checkCircuitBreaker(operationType)) {
      throw new Error(`${operationType} service temporarily unavailable`);
    }
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        log(`${operationName} - Attempt ${attempt}`);
        
        const result = await operation();
        recordSuccess(operationType);
        
        if (attempt > 1) {
          log(`${operationName} succeeded after ${attempt} attempts`);
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        log(`${operationName} failed on attempt ${attempt}:`, 'warn', error.message);
        
        // Don't retry on certain errors
        if (error.status === 400 || error.status === 403 || error.status === 404) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < retryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All attempts failed
    recordFailure(operationType, lastError);
    throw lastError;
    
  }, [retryAttempts, checkCircuitBreaker, recordSuccess, recordFailure, log]);
  
  // API utility functions
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || `HTTP ${response.status}`,
        status: response.status,
        code: errorData.code,
        timestamp: new Date().toISOString(),
        details: errorData
      };
    }
    
    return response.json();
  }, [apiBaseUrl]);
  
  // Core reservation operations
  const loadReservations = useCallback(async (clubId?: string, userId?: string) => {
    try {
      dispatch({ type: 'SET_LOADING_RESERVATIONS', payload: true });
      dispatch({ type: 'SET_RESERVATION_ERROR', payload: null });
      
      const queryParams = new URLSearchParams();
      if (clubId) queryParams.append('club_id', clubId);
      if (userId) queryParams.append('user_id', userId);
      
      const reservations = await safeApiCall(
        () => apiCall(`/reservations/?${queryParams.toString()}`),
        'reservation',
        'loadReservations'
      );
      
      dispatch({ type: 'SET_RESERVATIONS', payload: reservations.results || reservations });
      
    } catch (error: any) {
      log('Failed to load reservations:', 'error', error);
      dispatch({ type: 'SET_RESERVATION_ERROR', payload: error });
      
      // Don't show toast for circuit breaker errors (already handled)
      if (!error.message?.includes('temporarily unavailable')) {
        toast.error('Failed to load reservations');
      }
    } finally {
      dispatch({ type: 'SET_LOADING_RESERVATIONS', payload: false });
    }
  }, [safeApiCall, apiCall, log]);
  
  const createReservation = useCallback(async (reservationData: any): Promise<Reservation> => {
    try {
      dispatch({ type: 'SET_CREATING_RESERVATION', payload: true });
      dispatch({ type: 'SET_RESERVATION_ERROR', payload: null });
      
      const reservation = await safeApiCall(
        () => apiCall('/reservations/', {
          method: 'POST',
          body: JSON.stringify(reservationData),
        }),
        'reservation',
        'createReservation'
      );
      
      dispatch({ type: 'ADD_RESERVATION', payload: reservation });
      toast.success('Reservation created successfully');
      
      // Clear availability cache as it may be outdated
      dispatch({ type: 'CLEAR_AVAILABILITY_CACHE' });
      
      return reservation;
      
    } catch (error: any) {
      log('Failed to create reservation:', 'error', error);
      dispatch({ type: 'SET_RESERVATION_ERROR', payload: error });
      
      if (!error.message?.includes('temporarily unavailable')) {
        toast.error(error.message || 'Failed to create reservation');
      }
      
      throw error;
    } finally {
      dispatch({ type: 'SET_CREATING_RESERVATION', payload: false });
    }
  }, [safeApiCall, apiCall, log]);
  
  const updateReservation = useCallback(async (id: string, updateData: any) => {
    try {
      dispatch({ type: 'SET_RESERVATION_ERROR', payload: null });
      
      const reservation = await safeApiCall(
        () => apiCall(`/reservations/${id}/`, {
          method: 'PATCH',
          body: JSON.stringify(updateData),
        }),
        'reservation',
        'updateReservation'
      );
      
      dispatch({ type: 'UPDATE_RESERVATION', payload: reservation });
      toast.success('Reservation updated successfully');
      
      // Clear availability cache
      dispatch({ type: 'CLEAR_AVAILABILITY_CACHE' });
      
    } catch (error: any) {
      log('Failed to update reservation:', 'error', error);
      dispatch({ type: 'SET_RESERVATION_ERROR', payload: error });
      
      if (!error.message?.includes('temporarily unavailable')) {
        toast.error(error.message || 'Failed to update reservation');
      }
      
      throw error;
    }
  }, [safeApiCall, apiCall, log]);
  
  const cancelReservation = useCallback(async (id: string, reason?: string) => {
    try {
      dispatch({ type: 'SET_CANCELLING_RESERVATION', payload: true });
      dispatch({ type: 'SET_RESERVATION_ERROR', payload: null });
      
      const reservation = await safeApiCall(
        () => apiCall(`/reservations/${id}/cancel/`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
        'reservation',
        'cancelReservation'
      );
      
      dispatch({ type: 'UPDATE_RESERVATION', payload: reservation });
      toast.success('Reservation cancelled successfully');
      
      // Clear availability cache
      dispatch({ type: 'CLEAR_AVAILABILITY_CACHE' });
      
    } catch (error: any) {
      log('Failed to cancel reservation:', 'error', error);
      dispatch({ type: 'SET_RESERVATION_ERROR', payload: error });
      
      if (!error.message?.includes('temporarily unavailable')) {
        toast.error(error.message || 'Failed to cancel reservation');
      }
      
      throw error;
    } finally {
      dispatch({ type: 'SET_CANCELLING_RESERVATION', payload: false });
    }
  }, [safeApiCall, apiCall, log]);
  
  // Availability operations
  const checkAvailability = useCallback(async (clubId: string, date: string, courtId?: string) => {
    // Check cache first
    if (state.availabilityCacheExpiry > Date.now() && state.availabilitySlots.length > 0) {
      log('Using cached availability data');
      return;
    }
    
    try {
      dispatch({ type: 'SET_LOADING_AVAILABILITY', payload: true });
      dispatch({ type: 'SET_AVAILABILITY_ERROR', payload: null });
      
      const queryParams = new URLSearchParams();
      queryParams.append('club_id', clubId);
      queryParams.append('date', date);
      if (courtId) queryParams.append('court_id', courtId);
      
      const availability = await safeApiCall(
        () => apiCall(`/reservations/availability/?${queryParams.toString()}`),
        'availability',
        'checkAvailability'
      );
      
      dispatch({ type: 'SET_AVAILABILITY_SLOTS', payload: availability.slots || [] });
      
    } catch (error: any) {
      log('Failed to check availability:', 'error', error);
      dispatch({ type: 'SET_AVAILABILITY_ERROR', payload: error });
      
      if (!error.message?.includes('temporarily unavailable')) {
        toast.error('Failed to load availability');
      }
    } finally {
      dispatch({ type: 'SET_LOADING_AVAILABILITY', payload: false });
    }
  }, [state.availabilityCacheExpiry, state.availabilitySlots.length, safeApiCall, apiCall, log]);
  
  const clearAvailabilityCache = useCallback(() => {
    dispatch({ type: 'CLEAR_AVAILABILITY_CACHE' });
    log('Availability cache cleared');
  }, [log]);
  
  // Court operations
  const loadCourts = useCallback(async (clubId: string) => {
    try {
      dispatch({ type: 'SET_LOADING_COURTS', payload: true });
      
      const courts = await safeApiCall(
        () => apiCall(`/clubs/${clubId}/courts/`),
        'reservation',
        'loadCourts'
      );
      
      dispatch({ type: 'SET_COURTS', payload: courts.results || courts });
      
    } catch (error: any) {
      log('Failed to load courts:', 'error', error);
      toast.error('Failed to load courts');
    } finally {
      dispatch({ type: 'SET_LOADING_COURTS', payload: false });
    }
  }, [safeApiCall, apiCall, log]);
  
  // Selection actions
  const selectReservation = useCallback((reservation: Reservation | null) => {
    dispatch({ type: 'SET_SELECTED_RESERVATION', payload: reservation });
  }, []);
  
  // Error handling
  const clearErrors = useCallback(() => {
    dispatch({ type: 'SET_RESERVATION_ERROR', payload: null });
    dispatch({ type: 'SET_AVAILABILITY_ERROR', payload: null });
  }, []);
  
  const retry = useCallback(async (operation: string) => {
    clearErrors();
    
    switch (operation) {
      case 'loadReservations':
        await loadReservations();
        break;
      case 'checkAvailability':
        // Would need to store last availability check params
        break;
      default:
        log(`Unknown retry operation: ${operation}`, 'warn');
    }
  }, [clearErrors, loadReservations, log]);
  
  // Health monitoring
  const checkHealth = useCallback(async () => {
    try {
      const health = await apiCall('/reservations/health/');
      
      dispatch({
        type: 'SET_HEALTH_STATUS',
        payload: {
          overall_healthy: health.overall_healthy,
          last_check: new Date().toISOString(),
          issues: health.critical_issues || []
        }
      });
      
    } catch (error: any) {
      log('Health check failed:', 'error', error);
      
      dispatch({
        type: 'SET_HEALTH_STATUS',
        payload: {
          overall_healthy: false,
          last_check: new Date().toISOString(),
          issues: ['Health check failed']
        }
      });
    }
  }, [apiCall, log]);
  
  // Circuit breaker status check
  const isCircuitOpen = useCallback((type: 'availability' | 'reservation'): boolean => {
    return type === 'availability' ? state.availabilityCircuitOpen : state.reservationCircuitOpen;
  }, [state.availabilityCircuitOpen, state.reservationCircuitOpen]);
  
  // Periodic health check
  useEffect(() => {
    const interval = setInterval(checkHealth, 60000); // Every minute
    checkHealth(); // Initial check
    
    return () => clearInterval(interval);
  }, [checkHealth]);
  
  // Auto-refresh reservations
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state.isLoadingReservations && !state.reservationCircuitOpen) {
        loadReservations();
      }
    }, 300000); // Every 5 minutes
    
    return () => clearInterval(interval);
  }, [state.isLoadingReservations, state.reservationCircuitOpen, loadReservations]);
  
  const contextValue: ReservationContextValue = {
    state,
    loadReservations,
    createReservation,
    updateReservation,
    cancelReservation,
    checkAvailability,
    clearAvailabilityCache,
    loadCourts,
    selectReservation,
    clearErrors,
    retry,
    checkHealth,
    isCircuitOpen
  };
  
  return (
    <ReservationContext.Provider value={contextValue}>
      {children}
    </ReservationContext.Provider>
  );
}

// Hooks
export function useReservations() {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservations must be used within SafeReservationProvider');
  }
  return context;
}

export function useReservationData() {
  const { state } = useReservations();
  return {
    reservations: state.reservations,
    selectedReservation: state.selectedReservation,
    availabilitySlots: state.availabilitySlots,
    courts: state.courts,
    isLoading: state.isLoadingReservations || state.isLoadingAvailability,
    error: state.reservationError || state.availabilityError
  };
}

export function useReservationActions() {
  const {
    loadReservations,
    createReservation,
    updateReservation,
    cancelReservation,
    checkAvailability,
    loadCourts,
    selectReservation
  } = useReservations();
  
  return {
    loadReservations,
    createReservation,
    updateReservation,
    cancelReservation,
    checkAvailability,
    loadCourts,
    selectReservation
  };
}

export function useReservationHealth() {
  const { state, checkHealth, isCircuitOpen } = useReservations();
  
  return {
    healthStatus: state.healthStatus,
    isAvailabilityCircuitOpen: isCircuitOpen('availability'),
    isReservationCircuitOpen: isCircuitOpen('reservation'),
    checkHealth
  };
}