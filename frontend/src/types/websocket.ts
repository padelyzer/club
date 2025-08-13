// WebSocket Types for Real-time Communication

import {
  Reservation,
  Tournament,
  TournamentMatch,
  TournamentRegistration,
  AppNotification,
  Court,
  KPIData,
} from '@/types';
import { DashboardStats } from '@/lib/api/types';

// WebSocket connection states
export type WebSocketState =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'reconnecting'
  | 'error';

// WebSocket message types
export type WebSocketMessageType =
  | 'reservation:created'
  | 'reservation:updated'
  | 'reservation:cancelled'
  | 'tournament:updated'
  | 'tournament:match_update'
  | 'tournament:registration'
  | 'notification:new'
  | 'court:status_change'
  | 'metrics:update'
  | 'heartbeat'
  | 'auth:success'
  | 'auth:error'
  | 'connection:established'
  | 'connection:error';

// Base WebSocket message structure
export interface WebSocketMessage<T = any> {
  id: string;
  type: WebSocketMessageType;
  payload: T;
  timestamp: string;
  userId?: string;
  organizationId?: string;
}

// Specific message payloads
export interface ReservationCreatedPayload {
  reservation: Reservation;
  notifyUsers?: string[];
}

export interface ReservationUpdatedPayload {
  reservation: Reservation;
  changes: Partial<Reservation>;
  updatedBy: string;
}

export interface ReservationCancelledPayload {
  reservationId: string;
  reason?: string;
  cancelledBy: string;
  refundStatus?: 'pending' | 'processed' | 'failed';
}

export interface TournamentUpdatedPayload {
  tournament: Tournament;
  changes: Partial<Tournament>;
  updatedBy: string;
}

export interface TournamentMatchUpdatePayload {
  tournamentId: string;
  match: TournamentMatch;
  liveScore?: {
    team1Score: number;
    team2Score: number;
    currentSet?: number;
    currentGame?: number;
  };
}

export interface TournamentRegistrationPayload {
  tournamentId: string;
  registration: TournamentRegistration;
  action: 'registered' | 'withdrawn' | 'confirmed';
}

export interface NotificationPayload {
  notification: AppNotification;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  requiresAck?: boolean;
}

export interface CourtStatusChangePayload {
  court: Court;
  previousStatus: string;
  newStatus: string;
  reason?: string;
  estimatedAvailableTime?: string;
}

export interface MetricsUpdatePayload {
  type: 'kpi' | 'dashboard' | 'realtime';
  metrics: Partial<DashboardStats>;
  kpiUpdates?: KPIData[];
  period?: {
    start: string;
    end: string;
  };
}

// Heartbeat messages
export interface HeartbeatPayload {
  clientTime: string;
  serverTime?: string;
}

// Authentication messages
export interface AuthSuccessPayload {
  userId: string;
  sessionId: string;
  permissions: string[];
}

export interface AuthErrorPayload {
  error: string;
  code: 'INVALID_TOKEN' | 'TOKEN_EXPIRED' | 'INSUFFICIENT_PERMISSIONS';
}

// Connection messages
export interface ConnectionEstablishedPayload {
  sessionId: string;
  serverVersion: string;
  features: string[];
}

export interface ConnectionErrorPayload {
  error: string;
  code: string;
  retryAfter?: number;
}

// WebSocket client options
export interface WebSocketOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableHeartbeat?: boolean;
  autoReconnect?: boolean;
  debug?: boolean;
  onStateChange?: (state: WebSocketState) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: WebSocketError) => void;
}

// WebSocket error types
export interface WebSocketError {
  type: 'connection' | 'authentication' | 'message' | 'timeout';
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// WebSocket subscription types
export interface WebSocketSubscription {
  id: string;
  type: WebSocketMessageType | WebSocketMessageType[];
  handler: (message: WebSocketMessage) => void;
  filter?: (message: WebSocketMessage) => boolean;
}

// WebSocket context value
export interface WebSocketContextValue {
  state: WebSocketState;
  isConnected: boolean;
  error: WebSocketError | null;
  subscribe: (subscription: Omit<WebSocketSubscription, 'id'>) => () => void;
  send: (message: Omit<WebSocketMessage, 'id' | 'timestamp'>) => void;
  connect: () => void;
  disconnect: () => void;
  getConnectionInfo: () => {
    sessionId?: string;
    connectedAt?: string;
    reconnectAttempts: number;
    lastError?: WebSocketError;
  };
}

// Type guards
export const isReservationMessage = (
  message: WebSocketMessage
): message is WebSocketMessage<
  | ReservationCreatedPayload
  | ReservationUpdatedPayload
  | ReservationCancelledPayload
> => {
  return message.type.startsWith('reservation:');
};

export const isTournamentMessage = (
  message: WebSocketMessage
): message is WebSocketMessage<
  | TournamentUpdatedPayload
  | TournamentMatchUpdatePayload
  | TournamentRegistrationPayload
> => {
  return message.type.startsWith('tournament:');
};

export const isNotificationMessage = (
  message: WebSocketMessage
): message is WebSocketMessage<NotificationPayload> => {
  return message.type === 'notification:new';
};

export const isMetricsMessage = (
  message: WebSocketMessage
): message is WebSocketMessage<MetricsUpdatePayload> => {
  return message.type === 'metrics:update';
};

// Utility types for store integration
export interface WebSocketStoreIntegration {
  handleMessage: (message: WebSocketMessage) => void;
  messageTypes: WebSocketMessageType[];
}
