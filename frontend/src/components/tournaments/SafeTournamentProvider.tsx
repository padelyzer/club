'use client'

/**
 * SafeTournamentProvider - Tournament safety and integrity provider for frontend
 * 
 * Based on SafeReservationProvider pattern but adapted for tournament operations.
 * Provides real-time bracket updates, optimistic UI for registrations, 
 * and cache management for offline tournament viewing.
 * 
 * CRITICAL: Ensures tournament UI state consistency and prevents bracket corruption
 * during concurrent user interactions.
 */

import React, { createContext, useContext, useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useSWR, mutate } from 'swr'
import { useWebSocket } from '@/hooks/useWebSocket'

// Tournament types
interface Tournament {
  id: string
  name: string
  description: string
  format: 'elimination' | 'double_elimination' | 'round_robin' | 'swiss'
  status: 'draft' | 'published' | 'registration_open' | 'registration_closed' | 'in_progress' | 'completed' | 'cancelled'
  start_date: string
  end_date: string
  registration_start: string
  registration_end: string
  max_teams: number
  min_teams: number
  current_teams_count: number
  registration_fee: number
  organizer: {
    id: string
    name: string
    email: string
  }
  category: {
    id: string
    name: string
    category_type: string
  }
  is_registration_open: boolean
  is_full: boolean
  can_start: boolean
  brackets?: TournamentBracket[]
  matches?: Match[]
  registrations?: TournamentRegistration[]
  prizes?: Prize[]
}

interface TournamentRegistration {
  id: string
  tournament: string
  team_name: string
  player1: {
    id: string
    user: {
      first_name: string
      last_name: string
    }
  }
  player2: {
    id: string
    user: {
      first_name: string
      last_name: string
    }
  }
  status: 'pending' | 'confirmed' | 'waitlist' | 'rejected' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'refunded'
  contact_email: string
  contact_phone: string
  created_at: string
}

interface TournamentBracket {
  id: string
  tournament: string
  round_number: number
  position: number
  team1?: TournamentRegistration
  team2?: TournamentRegistration
  advances_to?: string
  match?: string
  is_losers_bracket: boolean
}

interface Match {
  id: string
  tournament: string
  round_number: number
  match_number: number
  team1: TournamentRegistration
  team2: TournamentRegistration
  scheduled_date: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'walkover' | 'cancelled' | 'postponed'
  team1_score: number[]
  team2_score: number[]
  winner?: TournamentRegistration
  actual_start_time?: string
  actual_end_time?: string
  duration_minutes?: number
}

interface Prize {
  id: string
  tournament: string
  position: number
  name: string
  description: string
  prize_type: 'cash' | 'trophy' | 'medal' | 'merchandise' | 'points' | 'other'
  cash_value?: number
  points_value?: number
  awarded_to?: TournamentRegistration
  awarded_at?: string
}

interface TournamentOperationResult {
  success: boolean
  operation_id?: string
  tournament_id?: string
  result?: any
  errors?: string[]
  warnings?: string[]
}

interface CircuitBreakerStatus {
  name: string
  state: 'closed' | 'open' | 'half_open'
  failure_count: number
  healthy: boolean
}

interface TournamentHealthStatus {
  overall_healthy: boolean
  circuit_breakers: {
    inscription: CircuitBreakerStatus
    bracket_generation: CircuitBreakerStatus
    result_processing: CircuitBreakerStatus
  }
  last_check: string
}

interface SafeTournamentContextType {
  // Tournament data
  tournaments: Tournament[]
  activeTournament: Tournament | null
  isLoading: boolean
  error: string | null
  
  // Tournament operations
  registerTeam: (tournamentId: string, registrationData: any) => Promise<TournamentOperationResult>
  startTournament: (tournamentId: string) => Promise<TournamentOperationResult>
  recordMatchResult: (matchId: string, resultData: any) => Promise<TournamentOperationResult>
  generateBracket: (tournamentId: string) => Promise<TournamentOperationResult>
  cancelTournament: (tournamentId: string, reason: string) => Promise<TournamentOperationResult>
  
  // Tournament queries
  getTournament: (tournamentId: string) => Promise<Tournament | null>
  getTournamentBrackets: (tournamentId: string) => Promise<TournamentBracket[]>
  getTournamentMatches: (tournamentId: string) => Promise<Match[]>
  getTournamentRegistrations: (tournamentId: string) => Promise<TournamentRegistration[]>
  
  // Real-time updates
  subscribeToTournament: (tournamentId: string) => void
  unsubscribeFromTournament: (tournamentId: string) => void
  
  // Cache management
  refreshTournament: (tournamentId: string) => Promise<void>
  clearTournamentCache: (tournamentId: string) => void
  
  // Health monitoring
  healthStatus: TournamentHealthStatus | null
  checkSystemHealth: () => Promise<void>
  
  // Optimistic updates
  optimisticRegistration: (tournamentId: string, registrationData: any) => void
  optimisticMatchResult: (matchId: string, resultData: any) => void
  
  // Error handling
  retryOperation: (operationType: string, params: any) => Promise<TournamentOperationResult>
  clearErrors: () => void
}

const SafeTournamentContext = createContext<SafeTournamentContextType | undefined>(undefined)

// Custom hook to use tournament context
export const useSafeTournament = () => {
  const context = useContext(SafeTournamentContext)
  if (context === undefined) {
    throw new Error('useSafeTournament must be used within a SafeTournamentProvider')
  }
  return context
}

// API endpoints
const API_BASE = '/api'
const TOURNAMENT_ENDPOINTS = {
  list: `${API_BASE}/tournaments/`,
  detail: (id: string) => `${API_BASE}/tournaments/${id}/`,
  register: (id: string) => `${API_BASE}/tournaments/${id}/register/`,
  start: (id: string) => `${API_BASE}/tournaments/${id}/start/`,
  brackets: (id: string) => `${API_BASE}/tournaments/${id}/brackets/`,
  matches: (id: string) => `${API_BASE}/tournaments/${id}/matches/`,
  registrations: (id: string) => `${API_BASE}/tournaments/${id}/registrations/`,
  recordResult: (matchId: string) => `${API_BASE}/matches/${matchId}/result/`,
  health: `${API_BASE}/tournaments/health/`,
  circuitBreakers: `${API_BASE}/tournaments/circuit-breakers/`,
} as const

interface SafeTournamentProviderProps {
  children: React.ReactNode
  enableRealTime?: boolean
  cacheTimeout?: number
  retryAttempts?: number
}

export const SafeTournamentProvider: React.FC<SafeTournamentProviderProps> = ({
  children,
  enableRealTime = true,
  cacheTimeout = 300000, // 5 minutes
  retryAttempts = 3
}) => {
  // State management
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<TournamentHealthStatus | null>(null)
  const [subscribedTournaments, setSubscribedTournaments] = useState<Set<string>>(new Set())
  
  // Operation tracking
  const operationQueue = useRef<Map<string, any>>(new Map())
  const optimisticUpdates = useRef<Map<string, any>>(new Map())
  
  // SWR for data fetching
  const { data: tournaments, error: tournamentsError, isLoading } = useSWR(
    TOURNAMENT_ENDPOINTS.list,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: cacheTimeout
    }
  )
  
  // WebSocket for real-time updates
  const { 
    isConnected: wsConnected, 
    subscribe: wsSubscribe, 
    unsubscribe: wsUnsubscribe,
    send: wsSend
  } = useWebSocket(
    enableRealTime ? '/ws/tournaments/' : null,
    {
      onMessage: handleWebSocketMessage,
      onError: handleWebSocketError,
      reconnectAttempts: 5,
      reconnectInterval: 3000
    }
  )
  
  // WebSocket message handlers
  function handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data)
      
      switch (data.type) {
        case 'tournament_updated':
          handleTournamentUpdate(data.tournament)
          break
          
        case 'bracket_updated':
          handleBracketUpdate(data.tournament_id, data.brackets)
          break
          
        case 'match_result':
          handleMatchResult(data.match_id, data.result)
          break
          
        case 'registration_update':
          handleRegistrationUpdate(data.tournament_id, data.registration)
          break
          
        case 'tournament_status_change':
          handleTournamentStatusChange(data.tournament_id, data.status)
          break
          
        case 'system_health_update':
          setHealthStatus(data.health_status)
          break
          
        default:
          console.log('Unknown WebSocket message type:', data.type)
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }
  
  function handleWebSocketError(error: Event) {
    console.error('Tournament WebSocket error:', error)
    toast.error('Real-time connection lost. Data may be outdated.')
  }
  
  // Real-time update handlers
  const handleTournamentUpdate = useCallback((tournament: Tournament) => {
    // Update SWR cache
    mutate(TOURNAMENT_ENDPOINTS.detail(tournament.id), tournament, false)
    
    // Update active tournament if it's the one being updated
    if (activeTournament?.id === tournament.id) {
      setActiveTournament(tournament)
    }
    
    // Clear any optimistic updates for this tournament
    optimisticUpdates.current.delete(tournament.id)
    
    toast.success(`Tournament "${tournament.name}" updated`)
  }, [activeTournament])
  
  const handleBracketUpdate = useCallback((tournamentId: string, brackets: TournamentBracket[]) => {
    // Update bracket cache
    mutate(TOURNAMENT_ENDPOINTS.brackets(tournamentId), brackets, false)
    
    toast.info('Tournament bracket updated')
  }, [])
  
  const handleMatchResult = useCallback((matchId: string, result: any) => {
    // Update match caches
    subscribedTournaments.forEach(tournamentId => {
      mutate(TOURNAMENT_ENDPOINTS.matches(tournamentId))
    })
    
    toast.success('Match result recorded')
  }, [subscribedTournaments])
  
  const handleRegistrationUpdate = useCallback((tournamentId: string, registration: TournamentRegistration) => {
    // Update registration cache
    mutate(TOURNAMENT_ENDPOINTS.registrations(tournamentId))
    
    // Update tournament cache to reflect new team count
    mutate(TOURNAMENT_ENDPOINTS.detail(tournamentId))
    
    toast.info(`Registration ${registration.status}: ${registration.team_name}`)
  }, [])
  
  const handleTournamentStatusChange = useCallback((tournamentId: string, status: string) => {
    // Update tournament cache
    mutate(TOURNAMENT_ENDPOINTS.detail(tournamentId))
    
    toast.info(`Tournament status changed to: ${status}`)
  }, [])
  
  // Tournament operations with safety and circuit breaker protection
  const registerTeam = useCallback(async (
    tournamentId: string, 
    registrationData: any
  ): Promise<TournamentOperationResult> => {
    const operationId = `register_${tournamentId}_${Date.now()}`
    
    try {
      setError(null)
      
      // Apply optimistic update
      optimisticRegistration(tournamentId, registrationData)
      
      // Execute operation with retry logic
      const response = await executeWithRetry(async () => {
        const res = await fetch(TOURNAMENT_ENDPOINTS.register(tournamentId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Operation-ID': operationId,
          },
          body: JSON.stringify(registrationData)
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.detail || `HTTP ${res.status}`)
        }
        
        return res.json()
      }, 'tournament_registration')
      
      // Clear optimistic update on success
      optimisticUpdates.current.delete(`registration_${tournamentId}`)
      
      // Refresh relevant caches
      await Promise.all([
        mutate(TOURNAMENT_ENDPOINTS.detail(tournamentId)),
        mutate(TOURNAMENT_ENDPOINTS.registrations(tournamentId))
      ])
      
      toast.success(`Team "${registrationData.team_name}" registered successfully!`)
      
      return {
        success: true,
        operation_id: operationId,
        tournament_id: tournamentId,
        result: response
      }
      
    } catch (error: any) {
      // Revert optimistic update
      optimisticUpdates.current.delete(`registration_${tournamentId}`)
      mutate(TOURNAMENT_ENDPOINTS.registrations(tournamentId))
      
      const errorMessage = error.message || 'Failed to register team'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return {
        success: false,
        errors: [errorMessage]
      }
    }
  }, [])
  
  const startTournament = useCallback(async (tournamentId: string): Promise<TournamentOperationResult> => {
    const operationId = `start_${tournamentId}_${Date.now()}`
    
    try {
      setError(null)
      
      // Execute tournament start with safety checks
      const response = await executeWithRetry(async () => {
        const res = await fetch(TOURNAMENT_ENDPOINTS.start(tournamentId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Operation-ID': operationId,
          }
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.detail || `HTTP ${res.status}`)
        }
        
        return res.json()
      }, 'tournament_start')
      
      // Refresh tournament data
      await Promise.all([
        mutate(TOURNAMENT_ENDPOINTS.detail(tournamentId)),
        mutate(TOURNAMENT_ENDPOINTS.brackets(tournamentId)),
        mutate(TOURNAMENT_ENDPOINTS.matches(tournamentId))
      ])
      
      toast.success('Tournament started successfully!')
      
      return {
        success: true,
        operation_id: operationId,
        tournament_id: tournamentId,
        result: response
      }
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to start tournament'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return {
        success: false,
        errors: [errorMessage]
      }
    }
  }, [])
  
  const recordMatchResult = useCallback(async (
    matchId: string, 
    resultData: any
  ): Promise<TournamentOperationResult> => {
    const operationId = `result_${matchId}_${Date.now()}`
    
    try {
      setError(null)
      
      // Apply optimistic update
      optimisticMatchResult(matchId, resultData)
      
      // Execute result recording
      const response = await executeWithRetry(async () => {
        const res = await fetch(TOURNAMENT_ENDPOINTS.recordResult(matchId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Operation-ID': operationId,
          },
          body: JSON.stringify(resultData)
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.detail || `HTTP ${res.status}`)
        }
        
        return res.json()
      }, 'match_result')
      
      // Clear optimistic update
      optimisticUpdates.current.delete(`match_${matchId}`)
      
      // Refresh match and bracket data
      subscribedTournaments.forEach(tournamentId => {
        mutate(TOURNAMENT_ENDPOINTS.matches(tournamentId))
        mutate(TOURNAMENT_ENDPOINTS.brackets(tournamentId))
      })
      
      toast.success('Match result recorded successfully!')
      
      return {
        success: true,
        operation_id: operationId,
        result: response
      }
      
    } catch (error: any) {
      // Revert optimistic update
      optimisticUpdates.current.delete(`match_${matchId}`)
      subscribedTournaments.forEach(tournamentId => {
        mutate(TOURNAMENT_ENDPOINTS.matches(tournamentId))
      })
      
      const errorMessage = error.message || 'Failed to record match result'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return {
        success: false,
        errors: [errorMessage]
      }
    }
  }, [subscribedTournaments])
  
  const generateBracket = useCallback(async (tournamentId: string): Promise<TournamentOperationResult> => {
    const operationId = `bracket_${tournamentId}_${Date.now()}`
    
    try {
      setError(null)
      
      const response = await executeWithRetry(async () => {
        const res = await fetch(TOURNAMENT_ENDPOINTS.brackets(tournamentId), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Operation-ID': operationId,
          }
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.detail || `HTTP ${res.status}`)
        }
        
        return res.json()
      }, 'bracket_generation')
      
      // Refresh bracket data
      await mutate(TOURNAMENT_ENDPOINTS.brackets(tournamentId))
      
      toast.success('Tournament bracket generated!')
      
      return {
        success: true,
        operation_id: operationId,
        tournament_id: tournamentId,
        result: response
      }
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to generate bracket'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return {
        success: false,
        errors: [errorMessage]
      }
    }
  }, [])
  
  const cancelTournament = useCallback(async (
    tournamentId: string, 
    reason: string
  ): Promise<TournamentOperationResult> => {
    const operationId = `cancel_${tournamentId}_${Date.now()}`
    
    try {
      setError(null)
      
      const response = await executeWithRetry(async () => {
        const res = await fetch(TOURNAMENT_ENDPOINTS.detail(tournamentId), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Operation-ID': operationId,
          },
          body: JSON.stringify({ 
            status: 'cancelled',
            cancellation_reason: reason 
          })
        })
        
        if (!res.ok) {
          const errorData = await res.json()
          throw new Error(errorData.detail || `HTTP ${res.status}`)
        }
        
        return res.json()
      }, 'tournament_cancellation')
      
      // Refresh tournament data
      await mutate(TOURNAMENT_ENDPOINTS.detail(tournamentId))
      
      toast.success('Tournament cancelled')
      
      return {
        success: true,
        operation_id: operationId,
        tournament_id: tournamentId,
        result: response
      }
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to cancel tournament'
      setError(errorMessage)
      toast.error(errorMessage)
      
      return {
        success: false,
        errors: [errorMessage]
      }
    }
  }, [])
  
  // Tournament data queries
  const getTournament = useCallback(async (tournamentId: string): Promise<Tournament | null> => {
    try {
      const { data } = await useSWR(TOURNAMENT_ENDPOINTS.detail(tournamentId))
      return data || null
    } catch (error) {
      console.error('Error fetching tournament:', error)
      return null
    }
  }, [])
  
  const getTournamentBrackets = useCallback(async (tournamentId: string): Promise<TournamentBracket[]> => {
    try {
      const { data } = await useSWR(TOURNAMENT_ENDPOINTS.brackets(tournamentId))
      return data || []
    } catch (error) {
      console.error('Error fetching tournament brackets:', error)
      return []
    }
  }, [])
  
  const getTournamentMatches = useCallback(async (tournamentId: string): Promise<Match[]> => {
    try {
      const { data } = await useSWR(TOURNAMENT_ENDPOINTS.matches(tournamentId))
      return data || []
    } catch (error) {
      console.error('Error fetching tournament matches:', error)
      return []
    }
  }, [])
  
  const getTournamentRegistrations = useCallback(async (tournamentId: string): Promise<TournamentRegistration[]> => {
    try {
      const { data } = await useSWR(TOURNAMENT_ENDPOINTS.registrations(tournamentId))
      return data || []
    } catch (error) {
      console.error('Error fetching tournament registrations:', error)
      return []
    }
  }, [])
  
  // Real-time subscription management
  const subscribeToTournament = useCallback((tournamentId: string) => {
    if (enableRealTime && wsConnected) {
      wsSubscribe(`tournament_${tournamentId}`)
      setSubscribedTournaments(prev => new Set(prev).add(tournamentId))
    }
  }, [enableRealTime, wsConnected, wsSubscribe])
  
  const unsubscribeFromTournament = useCallback((tournamentId: string) => {
    if (enableRealTime && wsConnected) {
      wsUnsubscribe(`tournament_${tournamentId}`)
      setSubscribedTournaments(prev => {
        const newSet = new Set(prev)
        newSet.delete(tournamentId)
        return newSet
      })
    }
  }, [enableRealTime, wsConnected, wsUnsubscribe])
  
  // Cache management
  const refreshTournament = useCallback(async (tournamentId: string) => {
    await Promise.all([
      mutate(TOURNAMENT_ENDPOINTS.detail(tournamentId)),
      mutate(TOURNAMENT_ENDPOINTS.brackets(tournamentId)),
      mutate(TOURNAMENT_ENDPOINTS.matches(tournamentId)),
      mutate(TOURNAMENT_ENDPOINTS.registrations(tournamentId))
    ])
  }, [])
  
  const clearTournamentCache = useCallback((tournamentId: string) => {
    mutate(TOURNAMENT_ENDPOINTS.detail(tournamentId), undefined, false)
    mutate(TOURNAMENT_ENDPOINTS.brackets(tournamentId), undefined, false)
    mutate(TOURNAMENT_ENDPOINTS.matches(tournamentId), undefined, false)
    mutate(TOURNAMENT_ENDPOINTS.registrations(tournamentId), undefined, false)
  }, [])
  
  // Health monitoring
  const checkSystemHealth = useCallback(async () => {
    try {
      const response = await fetch(TOURNAMENT_ENDPOINTS.health)
      if (response.ok) {
        const healthData = await response.json()
        setHealthStatus(healthData)
      }
    } catch (error) {
      console.error('Error checking system health:', error)
    }
  }, [])
  
  // Optimistic updates
  const optimisticRegistration = useCallback((tournamentId: string, registrationData: any) => {
    const optimisticReg = {
      id: `optimistic_${Date.now()}`,
      tournament: tournamentId,
      team_name: registrationData.team_name,
      status: 'pending',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      ...registrationData
    }
    
    optimisticUpdates.current.set(`registration_${tournamentId}`, optimisticReg)
    
    // Update registration cache with optimistic data
    mutate(TOURNAMENT_ENDPOINTS.registrations(tournamentId), (current: TournamentRegistration[]) => {
      return current ? [...current, optimisticReg] : [optimisticReg]
    }, false)
  }, [])
  
  const optimisticMatchResult = useCallback((matchId: string, resultData: any) => {
    const optimisticResult = {
      match_id: matchId,
      ...resultData,
      timestamp: new Date().toISOString()
    }
    
    optimisticUpdates.current.set(`match_${matchId}`, optimisticResult)
    
    // Update match cache with optimistic result
    subscribedTournaments.forEach(tournamentId => {
      mutate(TOURNAMENT_ENDPOINTS.matches(tournamentId), (current: Match[]) => {
        if (!current) return current
        
        return current.map(match => {
          if (match.id === matchId) {
            return {
              ...match,
              team1_score: resultData.team1_score,
              team2_score: resultData.team2_score,
              status: 'completed',
              winner: resultData.winner_team_id === match.team1.id ? match.team1 : match.team2
            }
          }
          return match
        })
      }, false)
    })
  }, [subscribedTournaments])
  
  // Retry mechanism with exponential backoff
  const executeWithRetry = useCallback(async (
    operation: () => Promise<any>,
    operationType: string,
    currentAttempt: number = 1
  ): Promise<any> => {
    try {
      return await operation()
    } catch (error: any) {
      if (currentAttempt >= retryAttempts) {
        throw error
      }
      
      // Check if error is retryable
      const isRetryable = error.name !== 'ValidationError' && 
                         error.status !== 400 && 
                         error.status !== 403 && 
                         error.status !== 404
      
      if (!isRetryable) {
        throw error
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, currentAttempt - 1), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
      
      return executeWithRetry(operation, operationType, currentAttempt + 1)
    }
  }, [retryAttempts])
  
  const retryOperation = useCallback(async (operationType: string, params: any): Promise<TournamentOperationResult> => {
    switch (operationType) {
      case 'register_team':
        return registerTeam(params.tournamentId, params.registrationData)
      case 'start_tournament':
        return startTournament(params.tournamentId)
      case 'record_match_result':
        return recordMatchResult(params.matchId, params.resultData)
      case 'generate_bracket':
        return generateBracket(params.tournamentId)
      case 'cancel_tournament':
        return cancelTournament(params.tournamentId, params.reason)
      default:
        return { success: false, errors: ['Unknown operation type'] }
    }
  }, [registerTeam, startTournament, recordMatchResult, generateBracket, cancelTournament])
  
  const clearErrors = useCallback(() => {
    setError(null)
  }, [])
  
  // Health monitoring effect
  useEffect(() => {
    checkSystemHealth()
    const healthInterval = setInterval(checkSystemHealth, 60000) // Check every minute
    
    return () => clearInterval(healthInterval)
  }, [checkSystemHealth])
  
  // Context value
  const contextValue = useMemo<SafeTournamentContextType>(() => ({
    // Tournament data
    tournaments: tournaments || [],
    activeTournament,
    isLoading,
    error: error || (tournamentsError ? String(tournamentsError) : null),
    
    // Tournament operations
    registerTeam,
    startTournament,
    recordMatchResult,
    generateBracket,
    cancelTournament,
    
    // Tournament queries
    getTournament,
    getTournamentBrackets,
    getTournamentMatches,
    getTournamentRegistrations,
    
    // Real-time updates
    subscribeToTournament,
    unsubscribeFromTournament,
    
    // Cache management
    refreshTournament,
    clearTournamentCache,
    
    // Health monitoring
    healthStatus,
    checkSystemHealth,
    
    // Optimistic updates
    optimisticRegistration,
    optimisticMatchResult,
    
    // Error handling
    retryOperation,
    clearErrors,
  }), [
    tournaments,
    activeTournament,
    isLoading,
    error,
    tournamentsError,
    registerTeam,
    startTournament,
    recordMatchResult,
    generateBracket,
    cancelTournament,
    getTournament,
    getTournamentBrackets,
    getTournamentMatches,
    getTournamentRegistrations,
    subscribeToTournament,
    unsubscribeFromTournament,
    refreshTournament,
    clearTournamentCache,
    healthStatus,
    checkSystemHealth,
    optimisticRegistration,
    optimisticMatchResult,
    retryOperation,
    clearErrors,
  ])
  
  return (
    <SafeTournamentContext.Provider value={contextValue}>
      {children}
    </SafeTournamentContext.Provider>
  )
}