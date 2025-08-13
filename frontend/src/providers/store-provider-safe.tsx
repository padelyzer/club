'use client';

import { ReactNode } from 'react';

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  // Simple pass-through provider to avoid issues
  return <>{children}</>;
}