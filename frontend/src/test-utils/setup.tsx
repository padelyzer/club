import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, RenderOptions } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { AuthProvider } from '@/components/providers/auth-provider';
import { vi } from 'vitest';

// Create test wrapper with all necessary providers
export function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        staleTime: 0,
        cacheTime: 0
      },
      mutations: {
        retry: false
      }
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SWRConfig value={{ 
        dedupingInterval: 0,
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateOnReconnect: false
       || ''}}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </SWRConfig>
    </QueryClientProvider>
  );
}

// Custom render function
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, {
    wrapper: createTestWrapper(),
    ...options
  });
}

// Mock BFF responses
export const mockBFFResponses = {
  dashboard: {
    monthlyRevenue: 15420,
    todayReservations: 23,
    weeklyGrowth: 12.5,
    occupancyRate: 78,
    activeMembers: 156,
    pendingPayments: 8,
    upcomingClasses: 5,
    maintenanceTasks: 3,
    recentActivity: [
      { id: 1, type: 'reservation', message: 'Court 1 booked', time: '5 min ago' },
      { id: 2, type: 'payment', message: 'Payment received', time: '10 min ago' }
    ],
    courtUtilization: {
      labels: ['Court 1', 'Court 2', 'Court 3'],
      data: [85, 72, 91]
    },
    revenueChart: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [2100, 2300, 2150, 2400, 2600, 3200, 2670]
    }
  },
  authContext: {
    user: {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin'
    },
    organizations: [
      { id: 'org1', name: 'Test Organization', role: 'admin' }
    ],
    currentOrganization: { 
      id: 'org1', 
      name: 'Test Organization',
      subscription: { plan: 'pro', status: 'active' }
    },
    clubs: [
      { id: 'club1', name: 'Main Club', role: 'admin' },
      { id: 'club2', name: 'Second Club', role: 'manager' }
    ],
    currentClub: { 
      id: 'club1', 
      name: 'Main Club',
      settings: {
        timeZone: 'UTC',
        currency: 'USD',
        language: 'en'
      }
    },
    permissions: [
      'clubs:read',
      'clubs:write',
      'reservations:read',
      'reservations:write',
      'analytics:read'
    ]
  },
  availability: {
    dates: ['2024-01-15', '2024-01-16'],
    courts: [
      {
        id: 'court1',
        name: 'Court 1',
        type: 'indoor',
        availableSlots: [
          { 
            start: '09:00', 
            end: '10:00', 
            price: 30,
            isAvailable: true,
            duration: 60
          },
          { 
            start: '10:00', 
            end: '11:00', 
            price: 35,
            isAvailable: true,
            duration: 60
          },
          { 
            start: '11:00', 
            end: '12:00', 
            price: 35,
            isAvailable: false,
            duration: 60
          }
        ]
      },
      {
        id: 'court2',
        name: 'Court 2',
        type: 'outdoor',
        availableSlots: [
          { 
            start: '09:00', 
            end: '10:00', 
            price: 25,
            isAvailable: true,
            duration: 60
          }
        ]
      }
    ],
    summary: {
      totalAvailable: 3,
      totalSlots: 4,
      averagePrice: 31.25
    }
  }
};

// Mock fetch implementation
export const createMockFetch = (responses: Record<string, any>) => {
  return vi.fn((url: string) => {
    const response = Object.entries(responses).find(([key]) => 
      url.includes(key)
    )?.[1];

    if (response) {
      return Promise.resolve({
        ok: true,
        json: async () => response,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json'
        })
      });
    }

    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    });
  });
};

// Performance testing utilities
export const measurePerformance = async (
  fn: () => Promise<any>,
  maxDuration: number
): Promise<{ duration: number; result: any }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  return { duration, result };
};

// Mock WebSocket for real-time testing
export class MockWebSocket {
  url: string;
  readyState: number = 1; // OPEN
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }
}

// Mock localStorage
export const mockLocalStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] || null)
  };
};

// Setup global mocks
export const setupGlobalMocks = () => {
  // Mock fetch
  global.fetch = createMockFetch({
    '/api/dashboard/overview': mockBFFResponses.dashboard,
    '/api/auth/context': mockBFFResponses.authContext,
    '/api/availability': mockBFFResponses.availability
  });

  // Mock localStorage
  const localStorageMock = mockLocalStorage();
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  // Mock WebSocket
  global.WebSocket = MockWebSocket as any;

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};