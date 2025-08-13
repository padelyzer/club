/**
 * Safe League Provider with Real-Time Updates
 * 
 * Provides comprehensive league data management with:
 * - Real-time standings updates with optimistic UI
 * - Auto-retry for failed operations
 * - Periodic polling to maintain data consistency  
 * - Circuit breaker protection for API calls
 * - Complete error recovery and fallback handling
 * 
 * CRITICAL: This provider ensures league data integrity in the frontend.
 * All operations include retry logic and graceful degradation.
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback, 
  useEffect, 
  useRef, 
  useMemo 
} from 'react';
import { toast } from 'sonner';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/lib/api/hooks/useAuth';

// Types
interface LeagueTeam {
  id: string;
  team_name: string;
  player1: {
    id: string;
    name: string;
  };
  player2: {
    id: string;
    name: string;
  };
  status: 'active' | 'inactive' | 'withdrawn';
}

interface LeagueStanding {
  id: string;
  team: LeagueTeam;
  position: number;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  points: number;
  sets_won: number;
  sets_lost: number;
  sets_difference: number;
  games_won: number;
  games_lost: number;
  games_difference: number;
  form: string[];
  last_updated: string;
}

interface LeagueMatch {
  id: string;
  matchday: number;
  home_team: LeagueTeam;
  away_team: LeagueTeam;
  scheduled_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  home_score: number[];
  away_score: number[];
  winner?: LeagueTeam;
}

interface LeagueSeason {
  id: string;
  name: string;
  season_number: number;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'active' | 'in_progress' | 'completed';
  current_matchday: number;
  total_matchdays: number;
  teams: LeagueTeam[];
  standings: LeagueStanding[];
  matches: LeagueMatch[];
}

interface League {
  id: string;
  name: string;
  description: string;
  format: 'round_robin' | 'round_robin_double' | 'group_stage';
  division: string;
  status: string;
  current_season?: LeagueSeason;
  seasons: LeagueSeason[];
}

interface LeagueState {
  leagues: League[];
  currentLeague: League | null;
  currentSeason: LeagueSeason | null;
  standings: LeagueStanding[];
  matches: LeagueMatch[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdate: string | null;
  optimisticUpdates: Record<string, any>;
  retryCount: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
}

type LeagueAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_LEAGUES'; payload: League[] }
  | { type: 'SET_CURRENT_LEAGUE'; payload: League | null }
  | { type: 'SET_CURRENT_SEASON'; payload: LeagueSeason | null }
  | { type: 'UPDATE_STANDINGS'; payload: LeagueStanding[] }
  | { type: 'UPDATE_MATCHES'; payload: LeagueMatch[] }
  | { type: 'ADD_OPTIMISTIC_UPDATE'; payload: { id: string; data: any } }
  | { type: 'REMOVE_OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_LAST_UPDATE'; payload: string }
  | { type: 'INCREMENT_RETRY_COUNT' }
  | { type: 'RESET_RETRY_COUNT' }
  | { type: 'SET_HEALTH_STATUS'; payload: 'healthy' | 'warning' | 'critical' };

// Initial state
const initialState: LeagueState = {
  leagues: [],
  currentLeague: null,
  currentSeason: null,
  standings: [],
  matches: [],
  loading: false,
  error: null,
  isConnected: false,
  lastUpdate: null,
  optimisticUpdates: {},
  retryCount: 0,
  healthStatus: 'healthy'
};

// Reducer
function leagueReducer(state: LeagueState, action: LeagueAction): LeagueState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    
    case 'SET_LEAGUES':
      return { ...state, leagues: action.payload, error: null };
    
    case 'SET_CURRENT_LEAGUE':
      return { 
        ...state, 
        currentLeague: action.payload,
        currentSeason: action.payload?.current_season || null,
        standings: action.payload?.current_season?.standings || [],
        matches: action.payload?.current_season?.matches || []
      };
    
    case 'SET_CURRENT_SEASON':
      return { 
        ...state, 
        currentSeason: action.payload,
        standings: action.payload?.standings || [],
        matches: action.payload?.matches || []
      };
    
    case 'UPDATE_STANDINGS':
      return { 
        ...state, 
        standings: action.payload,
        lastUpdate: new Date().toISOString()
      };
    
    case 'UPDATE_MATCHES':
      return { 
        ...state, 
        matches: action.payload,
        lastUpdate: new Date().toISOString()
      };
    
    case 'ADD_OPTIMISTIC_UPDATE':
      return {
        ...state,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          [action.payload.id]: action.payload.data
        }
      };
    
    case 'REMOVE_OPTIMISTIC_UPDATE':
      const { [action.payload]: removed, ...remainingUpdates } = state.optimisticUpdates;
      return {
        ...state,
        optimisticUpdates: remainingUpdates
      };
    
    case 'SET_CONNECTION_STATUS':
      return { 
        ...state, 
        isConnected: action.payload,
        healthStatus: action.payload ? state.healthStatus : 'warning'
      };
    
    case 'SET_LAST_UPDATE':
      return { ...state, lastUpdate: action.payload };
    
    case 'INCREMENT_RETRY_COUNT':
      return { ...state, retryCount: state.retryCount + 1 };
    
    case 'RESET_RETRY_COUNT':
      return { ...state, retryCount: 0 };
    
    case 'SET_HEALTH_STATUS':
      return { ...state, healthStatus: action.payload };
    
    default:
      return state;
  }
}

// Context
interface LeagueContextType {
  state: LeagueState;
  // League operations
  loadLeagues: () => Promise<void>;
  selectLeague: (leagueId: string) => Promise<void>;
  selectSeason: (seasonId: string) => Promise<void>;
  
  // Standings operations
  updateStandings: (matchResult: any) => Promise<void>;
  refreshStandings: () => Promise<void>;
  
  // Match operations
  updateMatchResult: (matchId: string, result: any) => Promise<void>;
  scheduleMatch: (matchData: any) => Promise<void>;
  
  // Real-time operations
  subscribeToLeague: (leagueId: string) => void;
  unsubscribeFromLeague: (leagueId: string) => void;
  
  // Utility functions
  getTeamStanding: (teamId: string) => LeagueStanding | null;
  getUpcomingMatches: (limit?: number) => LeagueMatch[];
  getRecentMatches: (limit?: number) => LeagueMatch[];
  
  // Health and status
  checkHealth: () => Promise<void>;
  retry: () => Promise<void>;
}

const LeagueContext = createContext<LeagueContextType | null>(null);

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second
const POLLING_INTERVAL = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

// Circuit breaker for API calls
class APICircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private failureThreshold = 5,
    private timeout = 60000 // 1 minute
  ) {}
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'half-open';
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
  
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Provider component
export function SafeLeagueProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(leagueReducer, initialState);
  const { user } = useAuth();
  const circuitBreaker = useRef(new APICircuitBreaker());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  
  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    subscribe, 
    unsubscribe, 
    sendMessage 
  } = useWebSocket(`ws://localhost:8000/ws/leagues/`, {
    onMessage: handleWebSocketMessage,
    onConnect: () => dispatch({ type: 'SET_CONNECTION_STATUS', payload: true }),
    onDisconnect: () => dispatch({ type: 'SET_CONNECTION_STATUS', payload: false }),
    reconnectInterval: 5000
  });
  
  // API call wrapper with circuit breaker and retry
  const apiCall = useCallback(async <T,>(
    fn: () => Promise<T>,
    retryAttempts = MAX_RETRY_ATTEMPTS
  ): Promise<T> => {
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        return await circuitBreaker.current.call(fn);
      } catch (error) {
        if (attempt === retryAttempts) {
          dispatch({ type: 'INCREMENT_RETRY_COUNT' });
          throw error;
        }
        
        // Exponential backoff
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retry attempts reached');
  }, []);
  
  // WebSocket message handler
  function handleWebSocketMessage(message: any) {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'standings_update':
          dispatch({ type: 'UPDATE_STANDINGS', payload: data.standings });
          toast.success('Standings updated in real-time');
          break;
        
        case 'match_result':
          dispatch({ type: 'UPDATE_MATCHES', payload: data.matches });
          // Remove optimistic update if it exists
          if (data.match_id) {
            dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: data.match_id });
          }
          break;
        
        case 'season_transition':
          // Reload current league data
          if (state.currentLeague) {
            selectLeague(state.currentLeague.id);
          }
          toast.info(`Season transition: ${data.message}`);
          break;
        
        case 'health_status':
          dispatch({ type: 'SET_HEALTH_STATUS', payload: data.status });
          if (data.status === 'critical') {
            toast.error('League system experiencing issues');
          }
          break;
        
        default:
          console.log('Unknown WebSocket message:', data);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }
  
  // Load leagues
  const loadLeagues = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await apiCall(async () => {
        const res = await fetch(`${API_BASE_URL}/api/leagues/`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      });
      
      dispatch({ type: 'SET_LEAGUES', payload: response.results || response });
      dispatch({ type: 'RESET_RETRY_COUNT' });
      dispatch({ type: 'SET_ERROR', payload: null });
      
    } catch (error) {
      console.error('Error loading leagues:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load leagues' });
      toast.error('Failed to load leagues');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, apiCall]);
  
  // Select league
  const selectLeague = useCallback(async (leagueId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await apiCall(async () => {
        const res = await fetch(`${API_BASE_URL}/api/leagues/${leagueId}/`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      });
      
      dispatch({ type: 'SET_CURRENT_LEAGUE', payload: response });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      // Subscribe to real-time updates for this league
      subscribeToLeague(leagueId);
      
    } catch (error) {
      console.error('Error selecting league:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load league details' });
      toast.error('Failed to load league details');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, apiCall]);
  
  // Select season
  const selectSeason = useCallback(async (seasonId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await apiCall(async () => {
        const res = await fetch(`${API_BASE_URL}/api/leagues/seasons/${seasonId}/`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      });
      
      dispatch({ type: 'SET_CURRENT_SEASON', payload: response });
      dispatch({ type: 'SET_ERROR', payload: null });
      
    } catch (error) {
      console.error('Error selecting season:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load season details' });
      toast.error('Failed to load season details');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user, apiCall]);
  
  // Update standings with optimistic UI
  const updateStandings = useCallback(async (matchResult: any) => {
    if (!state.currentSeason) return;
    
    // Add optimistic update
    const optimisticId = `match_${matchResult.match_id}`;
    dispatch({ 
      type: 'ADD_OPTIMISTIC_UPDATE', 
      payload: { id: optimisticId, data: matchResult } 
    });
    
    try {
      const response = await apiCall(async () => {
        const res = await fetch(
          `${API_BASE_URL}/api/leagues/seasons/${state.currentSeason!.id}/update-standings/`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user?.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(matchResult)
          }
        );
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      });
      
      // Update standings with server response
      dispatch({ type: 'UPDATE_STANDINGS', payload: response.standings });
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: optimisticId });
      
      toast.success('Standings updated successfully');
      
    } catch (error) {
      console.error('Error updating standings:', error);
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: optimisticId });
      toast.error('Failed to update standings');
      throw error;
    }
  }, [state.currentSeason, user, apiCall]);
  
  // Refresh standings
  const refreshStandings = useCallback(async () => {
    if (!state.currentSeason) return;
    
    try {
      const response = await apiCall(async () => {
        const res = await fetch(
          `${API_BASE_URL}/api/leagues/seasons/${state.currentSeason!.id}/standings/`,
          {
            headers: {
              'Authorization': `Bearer ${user?.token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      });
      
      dispatch({ type: 'UPDATE_STANDINGS', payload: response.results || response });
      
    } catch (error) {
      console.error('Error refreshing standings:', error);
      toast.error('Failed to refresh standings');
    }
  }, [state.currentSeason, user, apiCall]);
  
  // Update match result
  const updateMatchResult = useCallback(async (matchId: string, result: any) => {
    // Add optimistic update
    dispatch({ 
      type: 'ADD_OPTIMISTIC_UPDATE', 
      payload: { id: matchId, data: result } 
    });
    
    try {
      const response = await apiCall(async () => {
        const res = await fetch(`${API_BASE_URL}/api/leagues/matches/${matchId}/result/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(result)
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      });
      
      // Update matches and standings
      dispatch({ type: 'UPDATE_MATCHES', payload: response.matches });
      if (response.standings) {
        dispatch({ type: 'UPDATE_STANDINGS', payload: response.standings });
      }
      
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: matchId });
      toast.success('Match result updated successfully');
      
    } catch (error) {
      console.error('Error updating match result:', error);
      dispatch({ type: 'REMOVE_OPTIMISTIC_UPDATE', payload: matchId });
      toast.error('Failed to update match result');
      throw error;
    }
  }, [user, apiCall]);
  
  // Schedule match
  const scheduleMatch = useCallback(async (matchData: any) => {
    try {
      const response = await apiCall(async () => {
        const res = await fetch(`${API_BASE_URL}/api/leagues/matches/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(matchData)
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        return res.json();
      });
      
      // Update matches list
      dispatch({ 
        type: 'UPDATE_MATCHES', 
        payload: [...state.matches, response] 
      });
      
      toast.success('Match scheduled successfully');
      
    } catch (error) {
      console.error('Error scheduling match:', error);
      toast.error('Failed to schedule match');
      throw error;
    }
  }, [user, apiCall, state.matches]);
  
  // Subscribe to league updates
  const subscribeToLeague = useCallback((leagueId: string) => {
    if (isConnected && !subscriptionsRef.current.has(leagueId)) {
      sendMessage({
        type: 'subscribe',
        league_id: leagueId
      });
      subscriptionsRef.current.add(leagueId);
    }
  }, [isConnected, sendMessage]);
  
  // Unsubscribe from league updates
  const unsubscribeFromLeague = useCallback((leagueId: string) => {
    if (isConnected && subscriptionsRef.current.has(leagueId)) {
      sendMessage({
        type: 'unsubscribe',
        league_id: leagueId
      });
      subscriptionsRef.current.delete(leagueId);
    }
  }, [isConnected, sendMessage]);
  
  // Utility functions
  const getTeamStanding = useCallback((teamId: string): LeagueStanding | null => {
    return state.standings.find(standing => standing.team.id === teamId) || null;
  }, [state.standings]);
  
  const getUpcomingMatches = useCallback((limit = 5): LeagueMatch[] => {
    const now = new Date();
    return state.matches
      .filter(match => 
        new Date(match.scheduled_date) > now && 
        match.status === 'scheduled'
      )
      .sort((a, b) => 
        new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      )
      .slice(0, limit);
  }, [state.matches]);
  
  const getRecentMatches = useCallback((limit = 5): LeagueMatch[] => {
    return state.matches
      .filter(match => match.status === 'completed')
      .sort((a, b) => 
        new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
      )
      .slice(0, limit);
  }, [state.matches]);
  
  // Health check
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/leagues/health/`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
      const healthData = await response.json();
      dispatch({ type: 'SET_HEALTH_STATUS', payload: healthData.overall_status });
      
      if (healthData.overall_status === 'critical') {
        toast.error('League system health is critical');
      } else if (healthData.overall_status === 'warning') {
        toast.warning('League system has some issues');
      }
      
    } catch (error) {
      console.error('Health check failed:', error);
      dispatch({ type: 'SET_HEALTH_STATUS', payload: 'critical' });
    }
  }, [user]);
  
  // Retry failed operations
  const retry = useCallback(async () => {
    dispatch({ type: 'RESET_RETRY_COUNT' });
    dispatch({ type: 'SET_ERROR', payload: null });
    
    // Retry current operations
    if (state.currentLeague) {
      await selectLeague(state.currentLeague.id);
    } else {
      await loadLeagues();
    }
  }, [state.currentLeague, selectLeague, loadLeagues]);
  
  // Setup periodic polling and health checks
  useEffect(() => {
    // Start polling for updates
    pollingInterval.current = setInterval(() => {
      if (state.currentSeason && !isConnected) {
        // Only poll if WebSocket is not connected
        refreshStandings();
      }
    }, POLLING_INTERVAL);
    
    // Start health checks
    healthCheckInterval.current = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);
    
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      if (healthCheckInterval.current) {
        clearInterval(healthCheckInterval.current);
      }
    };
  }, [state.currentSeason, isConnected, refreshStandings, checkHealth]);
  
  // Update connection status
  useEffect(() => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: isConnected });
  }, [isConnected]);
  
  // Context value
  const contextValue = useMemo<LeagueContextType>(() => ({
    state,
    loadLeagues,
    selectLeague,
    selectSeason,
    updateStandings,
    refreshStandings,
    updateMatchResult,
    scheduleMatch,
    subscribeToLeague,
    unsubscribeFromLeague,
    getTeamStanding,
    getUpcomingMatches,
    getRecentMatches,
    checkHealth,
    retry
  }), [
    state,
    loadLeagues,
    selectLeague,
    selectSeason,
    updateStandings,
    refreshStandings,
    updateMatchResult,
    scheduleMatch,
    subscribeToLeague,
    unsubscribeFromLeague,
    getTeamStanding,
    getUpcomingMatches,
    getRecentMatches,
    checkHealth,
    retry
  ]);
  
  return (
    <LeagueContext.Provider value={contextValue}>
      {children}
    </LeagueContext.Provider>
  );
}

// Hook to use league context
export function useLeagues() {
  const context = useContext(LeagueContext);
  if (!context) {
    throw new Error('useLeagues must be used within a SafeLeagueProvider');
  }
  return context;
}

// Hook for specific league operations
export function useLeagueOperations() {
  const {
    updateStandings,
    updateMatchResult,
    scheduleMatch,
    state: { optimisticUpdates, retryCount, healthStatus }
  } = useLeagues();
  
  return {
    updateStandings,
    updateMatchResult,
    scheduleMatch,
    optimisticUpdates,
    retryCount,
    healthStatus,
    hasOptimisticUpdates: Object.keys(optimisticUpdates).length > 0,
    isHealthy: healthStatus === 'healthy'
  };
}

// Hook for league statistics
export function useLeagueStats() {
  const { state } = useLeagues();
  
  return useMemo(() => {
    if (!state.currentSeason) {
      return null;
    }
    
    const totalTeams = state.standings.length;
    const totalMatches = state.matches.length;
    const completedMatches = state.matches.filter(m => m.status === 'completed').length;
    const upcomingMatches = state.matches.filter(m => m.status === 'scheduled').length;
    
    const averagePointsPerTeam = totalTeams > 0 
      ? state.standings.reduce((sum, s) => sum + s.points, 0) / totalTeams 
      : 0;
    
    return {
      totalTeams,
      totalMatches,
      completedMatches,
      upcomingMatches,
      averagePointsPerTeam,
      currentMatchday: state.currentSeason.current_matchday,
      totalMatchdays: state.currentSeason.total_matchdays,
      seasonProgress: (state.currentSeason.current_matchday / state.currentSeason.total_matchdays) * 100
    };
  }, [state.currentSeason, state.standings, state.matches]);
}