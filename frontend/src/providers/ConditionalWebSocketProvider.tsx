'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { WebSocketProvider } from './WebSocketProvider';
import { destroyWebSocketClient } from '@/lib/websocket/client';

const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export function ConditionalWebSocketProvider({ children }: { children: React.ReactNode }) {
  // WebSocket completely disabled - always return children without WebSocketProvider
  return <>{children}</>;
}