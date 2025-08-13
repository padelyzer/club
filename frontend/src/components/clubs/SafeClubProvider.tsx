/**
 * SafeClubProvider - Robust React provider for clubs module with retry logic and validation
 * Implements defensive patterns to prevent crashes and provide fallback mechanisms
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
interface Club {
  id: string;
  name: string;
  slug: string;
  description?: string;
  email: string;
  phone: string;
  website?: string;
  address: any;
  latitude?: number;
  longitude?: number;
  opening_time: string;
  closing_time: string;
  days_open: number[];
  features: string[];
  settings: any;
  logo_url?: string;
  cover_image_url?: string;
  primary_color: string;
  total_courts: number;
  total_members: number;
  is_active: boolean;
  organization: string;
  created_at: string;
  updated_at: string;
}

interface Court {
  id: string;
  name: string;
  number: number;
  surface_type: string;
  has_lighting: boolean;
  has_heating: boolean;
  has_roof: boolean;
  is_maintenance: boolean;
  maintenance_notes?: string;
  price_per_hour: number;
  images: any[];
  is_active: boolean;
  club: string;
  organization: string;
}

interface ApiError {
  message: string;
  code?: string;
  status?: number;
  timestamp: string;
}

interface ClubState {
  // Data
  clubs: Club[];
  selectedClub: Club | null;
  courts: Court[];
  
  // Loading states
  isLoadingClubs: boolean;
  isLoadingClub: boolean;
  isLoadingCourts: boolean;
  
  // Error states
  error: ApiError | null;
  lastError: ApiError | null;
  
  // Retry logic
  retryCount: number;
  maxRetries: number;
  
  // Circuit breaker state
  isCircuitOpen: boolean;
  lastFailureTime: number | null;
  
  // Health status
  healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  
  // Cache
  cacheTimestamp: number | null;
  cacheTimeout: number;
}

type ClubAction = 
  | { type: 'LOAD_CLUBS_START' }
  | { type: 'LOAD_CLUBS_SUCCESS'; payload: Club[] }
  | { type: 'LOAD_CLUBS_ERROR'; payload: ApiError }
  | { type: 'LOAD_CLUB_START' }
  | { type: 'LOAD_CLUB_SUCCESS'; payload: Club }
  | { type: 'LOAD_CLUB_ERROR'; payload: ApiError }
  | { type: 'LOAD_COURTS_START' }
  | { type: 'LOAD_COURTS_SUCCESS'; payload: Court[] }
  | { type: 'LOAD_COURTS_ERROR'; payload: ApiError }
  | { type: 'SELECT_CLUB'; payload: Club | null }
  | { type: 'SET_ERROR'; payload: ApiError | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INCREMENT_RETRY' }
  | { type: 'RESET_RETRY' }
  | { type: 'OPEN_CIRCUIT' }
  | { type: 'CLOSE_CIRCUIT' }
  | { type: 'SET_HEALTH_STATUS'; payload: 'healthy' | 'degraded' | 'unhealthy' | 'unknown' }
  | { type: 'UPDATE_CACHE_TIMESTAMP' };

interface ClubContextType {
  state: ClubState;
  
  // Actions
  loadClubs: (force?: boolean) => Promise<void>;
  loadClub: (clubId: string, force?: boolean) => Promise<void>;
  loadCourts: (clubId: string, force?: boolean) => Promise<void>;
  selectClub: (club: Club | null) => void;
  clearError: () => void;
  retry: () => Promise<void>;
  resetCircuitBreaker: () => void;
  
  // Utilities
  isDataStale: () => boolean;
  getHealthStatus: () => string;
  canAttemptRequest: () => boolean;
}

// Default state
const initialState: ClubState = {
  clubs: [],
  selectedClub: null,
  courts: [],
  isLoadingClubs: false,
  isLoadingClub: false,
  isLoadingCourts: false,
  error: null,
  lastError: null,
  retryCount: 0,
  maxRetries: 3,
  isCircuitOpen: false,
  lastFailureTime: null,
  healthStatus: 'unknown',
  cacheTimestamp: null,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

// Reducer
function clubReducer(state: ClubState, action: ClubAction): ClubState {
  switch (action.type) {
    case 'LOAD_CLUBS_START':
      return {
        ...state,
        isLoadingClubs: true,
        error: null,
      };
      
    case 'LOAD_CLUBS_SUCCESS':
      return {
        ...state,
        isLoadingClubs: false,
        clubs: action.payload,
        error: null,
        retryCount: 0,
        isCircuitOpen: false,
        cacheTimestamp: Date.now(),
        healthStatus: 'healthy',
      };
      
    case 'LOAD_CLUBS_ERROR':
      return {
        ...state,
        isLoadingClubs: false,
        error: action.payload,
        lastError: action.payload,
        lastFailureTime: Date.now(),
        healthStatus: 'unhealthy',
      };
      
    case 'LOAD_CLUB_START':
      return {
        ...state,
        isLoadingClub: true,
        error: null,
      };
      
    case 'LOAD_CLUB_SUCCESS':
      return {
        ...state,
        isLoadingClub: false,
        selectedClub: action.payload,
        error: null,
        retryCount: 0,
        isCircuitOpen: false,
        cacheTimestamp: Date.now(),
      };
      
    case 'LOAD_CLUB_ERROR':
      return {
        ...state,
        isLoadingClub: false,
        error: action.payload,
        lastError: action.payload,
        lastFailureTime: Date.now(),
      };
      
    case 'LOAD_COURTS_START':
      return {
        ...state,
        isLoadingCourts: true,
        error: null,
      };
      
    case 'LOAD_COURTS_SUCCESS':
      return {
        ...state,
        isLoadingCourts: false,
        courts: action.payload,
        error: null,
        retryCount: 0,
        isCircuitOpen: false,
        cacheTimestamp: Date.now(),
      };
      
    case 'LOAD_COURTS_ERROR':
      return {
        ...state,
        isLoadingCourts: false,
        error: action.payload,
        lastError: action.payload,
        lastFailureTime: Date.now(),
      };
      
    case 'SELECT_CLUB':
      return {
        ...state,
        selectedClub: action.payload,
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        lastError: action.payload,
      };
      
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
      
    case 'INCREMENT_RETRY':
      return {
        ...state,
        retryCount: state.retryCount + 1,
      };
      
    case 'RESET_RETRY':
      return {
        ...state,
        retryCount: 0,
      };
      
    case 'OPEN_CIRCUIT':
      return {
        ...state,
        isCircuitOpen: true,
        lastFailureTime: Date.now(),
        healthStatus: 'degraded',
      };
      
    case 'CLOSE_CIRCUIT':
      return {
        ...state,
        isCircuitOpen: false,
        lastFailureTime: null,
        healthStatus: 'healthy',
      };
      
    case 'SET_HEALTH_STATUS':
      return {
        ...state,
        healthStatus: action.payload,
      };
      
    case 'UPDATE_CACHE_TIMESTAMP':
      return {
        ...state,
        cacheTimestamp: Date.now(),
      };
      
    default:
      return state;
  }
}

// Create context
const ClubContext = createContext<ClubContextType | null>(null);

// Configuration
const CONFIG = {
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  CIRCUIT_BREAKER_TIMEOUT: 60000, // 1 minute
  REQUEST_TIMEOUT: 10000, // 10 seconds
  RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 5000, // 5 seconds
};

// Helper functions
const createApiError = (message: string, status?: number, code?: string): ApiError => ({
  message,
  code,
  status,
  timestamp: new Date().toISOString(),
});

const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const exponentialBackoff = (attempt: number): number => 
  Math.min(CONFIG.RETRY_DELAY * Math.pow(2, attempt), CONFIG.MAX_RETRY_DELAY);

// API functions with defensive patterns
class SafeApiClient {
  private abortController: AbortController | null = null;
  
  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    // Create new abort controller for each request
    this.abortController = new AbortController();
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };
    
    // Get auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      signal: this.abortController.signal,
    };
    
    // Add timeout
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, CONFIG.REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${url}`, requestOptions);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw createApiError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData.code
        );
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw createApiError('Request timed out', 408, 'TIMEOUT');
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw createApiError('Network error - please check your connection', 0, 'NETWORK_ERROR');
      }
      
      if (error.message && error.status) {
        throw error; // Re-throw API errors
      }
      
      throw createApiError(`Unexpected error: ${error.message}`, 500, 'UNKNOWN_ERROR');
    }
  }
  
  async getClubs(): Promise<Club[]> {
    const data = await this.makeRequest<{ results: Club[] }>('/api/clubs/');
    return data.results || [];
  }
  
  async getClub(clubId: string): Promise<Club> {
    return await this.makeRequest<Club>(`/api/clubs/${clubId}/`);
  }
  
  async getCourts(clubId: string): Promise<Court[]> {
    const data = await this.makeRequest<{ results: Court[] }>(`/api/clubs/${clubId}/courts/`);
    return data.results || [];
  }
  
  cancelCurrentRequests(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// Provider component
interface SafeClubProviderProps {
  children: ReactNode;
  enableLogging?: boolean;
}

export function SafeClubProvider({ children, enableLogging = false }: SafeClubProviderProps) {
  const [state, dispatch] = useReducer(clubReducer, initialState);
  const apiClient = useRef(new SafeApiClient());
  const lastActionRef = useRef<() => Promise<void> | null>(null);
  
  // Logging utility
  const log = useCallback((level: 'info' | 'warn' | 'error', message: string, data?: any) => {
    if (enableLogging) {
      console[level](`[SafeClubProvider] ${message}`, data || '');
    }
  }, [enableLogging]);
  
  // Circuit breaker logic
  const canAttemptRequest = useCallback((): boolean => {
    if (!state.isCircuitOpen) return true;
    
    const timeSinceFailure = Date.now() - (state.lastFailureTime || 0);
    return timeSinceFailure > CONFIG.CIRCUIT_BREAKER_TIMEOUT;
  }, [state.isCircuitOpen, state.lastFailureTime]);
  
  // Generic retry wrapper
  const withRetryAndCircuitBreaker = useCallback(async <T,>(
    operation: () => Promise<T>,
    actionName: string
  ): Promise<T> => {
    // Check circuit breaker
    if (!canAttemptRequest()) {
      const error = createApiError(
        'Service temporarily unavailable - please try again later',
        503,
        'CIRCUIT_OPEN'
      );
      throw error;
    }
    
    let lastError: ApiError;
    
    for (let attempt = 0; attempt <= state.maxRetries; attempt++) {
      try {
        log('info', `${actionName} attempt ${attempt + 1}`);
        
        const result = await operation();
        
        // Success - close circuit breaker if it was open
        if (state.isCircuitOpen) {
          dispatch({ type: 'CLOSE_CIRCUIT' });
          log('info', 'Circuit breaker closed after successful request');
        }
        
        return result;
        
      } catch (error) {
        lastError = error as ApiError;
        log('warn', `${actionName} failed on attempt ${attempt + 1}:`, lastError);
        
        // Don't retry on certain errors
        if (error.code === 'CIRCUIT_OPEN' || error.status === 404 || error.status === 403) {
          throw error;
        }
        
        // If this was the last attempt, open circuit breaker
        if (attempt === state.maxRetries) {
          dispatch({ type: 'OPEN_CIRCUIT' });
          log('error', `Circuit breaker opened after ${state.maxRetries + 1} failures`);
          throw lastError;
        }
        
        // Wait before retry
        const delayMs = exponentialBackoff(attempt);
        log('info', `Retrying in ${delayMs}ms...`);
        await delay(delayMs);
      }
    }
    
    throw lastError!;
  }, [state.maxRetries, state.isCircuitOpen, canAttemptRequest, log]);
  
  // Check if data is stale
  const isDataStale = useCallback((): boolean => {
    if (!state.cacheTimestamp) return true;
    return Date.now() - state.cacheTimestamp > state.cacheTimeout;
  }, [state.cacheTimestamp, state.cacheTimeout]);
  
  // Load clubs
  const loadClubs = useCallback(async (force = false): Promise<void> => {
    if (!force && state.clubs.length > 0 && !isDataStale()) {
      log('info', 'Using cached clubs data');
      return;
    }
    
    if (state.isLoadingClubs) {
      log('info', 'Clubs already loading');
      return;
    }
    
    dispatch({ type: 'LOAD_CLUBS_START' });
    
    try {
      const clubs = await withRetryAndCircuitBreaker(
        () => apiClient.current.getClubs(),
        'loadClubs'
      );
      
      dispatch({ type: 'LOAD_CLUBS_SUCCESS', payload: clubs });
      log('info', `Loaded ${clubs.length} clubs successfully`);
      
    } catch (error) {
      const apiError = error as ApiError;
      dispatch({ type: 'LOAD_CLUBS_ERROR', payload: apiError });
      
      // Show user-friendly toast
      toast.error('Failed to load clubs', {
        description: apiError.code === 'CIRCUIT_OPEN' 
          ? 'Service temporarily unavailable' 
          : 'Please try again later',
      });
      
      log('error', 'Failed to load clubs:', apiError);
    }
  }, [state.clubs.length, state.isLoadingClubs, isDataStale, withRetryAndCircuitBreaker, log]);
  
  // Load specific club
  const loadClub = useCallback(async (clubId: string, force = false): Promise<void> => {
    if (!clubId) {
      log('warn', 'loadClub called without clubId');
      return;
    }
    
    if (!force && state.selectedClub?.id === clubId && !isDataStale()) {
      log('info', 'Using cached club data');
      return;
    }
    
    if (state.isLoadingClub) {
      log('info', 'Club already loading');
      return;
    }
    
    dispatch({ type: 'LOAD_CLUB_START' });
    
    try {
      const club = await withRetryAndCircuitBreaker(
        () => apiClient.current.getClub(clubId),
        'loadClub'
      );
      
      dispatch({ type: 'LOAD_CLUB_SUCCESS', payload: club });
      log('info', `Loaded club ${club.name} successfully`);
      
    } catch (error) {
      const apiError = error as ApiError;
      dispatch({ type: 'LOAD_CLUB_ERROR', payload: apiError });
      
      toast.error('Failed to load club details', {
        description: apiError.status === 404 
          ? 'Club not found' 
          : 'Please try again later',
      });
      
      log('error', 'Failed to load club:', apiError);
    }
  }, [state.selectedClub?.id, state.isLoadingClub, isDataStale, withRetryAndCircuitBreaker, log]);
  
  // Load courts for a club
  const loadCourts = useCallback(async (clubId: string, force = false): Promise<void> => {
    if (!clubId) {
      log('warn', 'loadCourts called without clubId');
      return;
    }
    
    if (!force && state.courts.length > 0 && state.selectedClub?.id === clubId && !isDataStale()) {
      log('info', 'Using cached courts data');
      return;
    }
    
    if (state.isLoadingCourts) {
      log('info', 'Courts already loading');
      return;
    }
    
    dispatch({ type: 'LOAD_COURTS_START' });
    
    try {
      const courts = await withRetryAndCircuitBreaker(
        () => apiClient.current.getCourts(clubId),
        'loadCourts'
      );
      
      dispatch({ type: 'LOAD_COURTS_SUCCESS', payload: courts });
      log('info', `Loaded ${courts.length} courts successfully`);
      
    } catch (error) {
      const apiError = error as ApiError;
      dispatch({ type: 'LOAD_COURTS_ERROR', payload: apiError });
      
      toast.error('Failed to load courts', {
        description: 'Please try again later',
      });
      
      log('error', 'Failed to load courts:', apiError);
    }
  }, [state.courts.length, state.selectedClub?.id, state.isLoadingCourts, isDataStale, withRetryAndCircuitBreaker, log]);
  
  // Select club
  const selectClub = useCallback((club: Club | null): void => {
    dispatch({ type: 'SELECT_CLUB', payload: club });
    log('info', `Selected club: ${club?.name || 'none'}`);
    
    // Clear courts when selecting different club
    if (club?.id !== state.selectedClub?.id) {
      dispatch({ type: 'LOAD_COURTS_SUCCESS', payload: [] });
    }
  }, [state.selectedClub?.id, log]);
  
  // Clear error
  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
    log('info', 'Error cleared');
  }, [log]);
  
  // Retry last action
  const retry = useCallback(async (): Promise<void> => {
    if (lastActionRef.current) {
      log('info', 'Retrying last action');
      await lastActionRef.current();
    } else {
      log('warn', 'No last action to retry');
    }
  }, [log]);
  
  // Reset circuit breaker
  const resetCircuitBreaker = useCallback((): void => {
    dispatch({ type: 'CLOSE_CIRCUIT' });
    dispatch({ type: 'RESET_RETRY' });
    log('info', 'Circuit breaker manually reset');
  }, [log]);
  
  // Get health status
  const getHealthStatus = useCallback((): string => {
    if (state.isCircuitOpen) return 'Circuit breaker open';
    if (state.error) return `Error: ${state.error.message}`;
    if (state.healthStatus === 'healthy') return 'All systems operational';
    return `Status: ${state.healthStatus}`;
  }, [state.isCircuitOpen, state.error, state.healthStatus]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      apiClient.current.cancelCurrentRequests();
    };
  }, []);
  
  // Health monitoring
  useEffect(() => {
    const checkHealth = () => {
      if (state.isCircuitOpen) {
        dispatch({ type: 'SET_HEALTH_STATUS', payload: 'degraded' });
      } else if (state.error) {
        dispatch({ type: 'SET_HEALTH_STATUS', payload: 'unhealthy' });
      } else if (state.clubs.length > 0 || state.selectedClub) {
        dispatch({ type: 'SET_HEALTH_STATUS', payload: 'healthy' });
      }
    };
    
    checkHealth();
  }, [state.isCircuitOpen, state.error, state.clubs.length, state.selectedClub]);
  
  const contextValue: ClubContextType = {
    state,
    loadClubs,
    loadClub,
    loadCourts,
    selectClub,
    clearError,
    retry,
    resetCircuitBreaker,
    isDataStale,
    getHealthStatus,
    canAttemptRequest,
  };
  
  return (
    <ClubContext.Provider value={contextValue}>
      {children}
    </ClubContext.Provider>
  );
}

// Hook to use the club context
export function useClubs(): ClubContextType {
  const context = useContext(ClubContext);
  
  if (!context) {
    throw new Error('useClubs must be used within a SafeClubProvider');
  }
  
  return context;
}

// Additional hooks for specific use cases
export function useClubData() {
  const { state } = useClubs();
  return {
    clubs: state.clubs,
    selectedClub: state.selectedClub,
    courts: state.courts,
    isLoading: state.isLoadingClubs || state.isLoadingClub || state.isLoadingCourts,
    error: state.error,
  };
}

export function useClubActions() {
  const { loadClubs, loadClub, loadCourts, selectClub, clearError, retry, resetCircuitBreaker } = useClubs();
  return {
    loadClubs,
    loadClub,
    loadCourts,
    selectClub,
    clearError,
    retry,
    resetCircuitBreaker,
  };
}

export function useClubHealth() {
  const { state, getHealthStatus, canAttemptRequest } = useClubs();
  return {
    healthStatus: state.healthStatus,
    isCircuitOpen: state.isCircuitOpen,
    canAttemptRequest: canAttemptRequest(),
    statusMessage: getHealthStatus(),
    retryCount: state.retryCount,
    maxRetries: state.maxRetries,
  };
}