import { NextRequest } from 'next/server';
import { RequestInit } from 'next/dist/server/web/spec-extension/request';

/**
 * Mock fetch responses from Django backend
 */
export const mockFetch = jest.fn();
global.fetch = mockFetch as any;

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  url?: string;
} = {}): NextRequest {
  const {
    method = 'GET',
    headers = {},
    body,
    url = 'http://localhost:3000/api/test'
  } = options;

  const init: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  return new NextRequest(url, init);
}

/**
 * Mock Django API responses
 */
export const djangoMocks = {
  // User profile mock
  userProfile: (overrides = {}) => ({
    id: '1',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    is_active: true,
    club_memberships: [
      {
        club: { id: 'club-1', name: 'Padel Club 1' },
        role: 'admin',
        is_active: true,
      },
    ],
    ...overrides,
  }),

  // Organization mock
  organization: (overrides = {}) => ({
    id: 'org-1',
    trade_name: 'Test Organization',
    business_name: 'Test Organization LLC',
    type: 'sports_complex',
    state: 'active',
    subscription_plan: 'premium',
    subscription_features: ['analytics', 'multi-club', 'api-access'],
    subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }),

  // Analytics data mock
  analytics: (overrides = {}) => ({
    revenue: {
      total: 150000,
      comparison: { change_percent: 12.5 },
      daily_breakdown: [
        { date: '2024-01-01', amount: 5000 },
        { date: '2024-01-02', amount: 5500 },
      ],
    },
    occupancy: {
      total_reservations: 45,
      comparison: { change_percent: 8.3 },
      occupancy_rate: 0.75,
      hourly_breakdown: [
        { hour: 9, occupancy_rate: 0.5 },
        { hour: 10, occupancy_rate: 0.8 },
      ],
      by_court: [
        { court: '1', court_name: 'Court 1', occupancy_rate: 0.8 },
        { court: '2', court_name: 'Court 2', occupancy_rate: 0.7 },
      ],
    },
    customers: {
      active_customers: 234,
      comparison: { change_percent: 5.2 },
    },
    ...overrides,
  }),

  // Courts mock
  courts: (overrides = {}) => ({
    results: [
      {
        id: '1',
        name: 'Court 1',
        surface_type: 'artificial_grass',
        is_active: true,
        price_per_hour: '2000',
      },
      {
        id: '2',
        name: 'Court 2',
        surface_type: 'concrete',
        is_active: true,
        price_per_hour: '1800',
      },
    ],
    ...overrides,
  }),

  // Reservations mock
  reservations: (overrides = {}) => ({
    results: [
      {
        id: 'res-1',
        court: '1',
        date: '2024-01-15',
        start_time: '10:00',
        end_time: '11:30',
        status: 'confirmed',
        player_name: 'John Doe',
      },
    ],
    ...overrides,
  }),

  // Clients mock
  clients: (overrides = {}) => ({
    results: [
      {
        id: 'client-1',
        first_name: 'John',
        last_name: 'Doe',
        total_spent: 25000,
        reservation_count: 15,
      },
      {
        id: 'client-2',
        first_name: 'Jane',
        last_name: 'Smith',
        total_spent: 18000,
        reservation_count: 12,
      },
    ],
    ...overrides,
  }),

  // User clubs mock
  userClubs: (overrides = {}) => [
    {
      id: 'club-1',
      name: 'Padel Club 1',
      role: 'admin',
      permissions: ['manage_reservations', 'view_analytics', 'manage_clients'],
    },
    {
      id: 'club-2',
      name: 'Padel Club 2',
      role: 'staff',
      permissions: ['view_reservations', 'manage_clients'],
    },
    ...(Array.isArray(overrides) ? overrides : [overrides]),
  ],

  // Permissions mock
  permissions: (overrides = {}) => ({
    global_permissions: ['view_analytics', 'manage_organizations'],
    club_permissions: {
      'club-1': ['manage_reservations', 'view_analytics', 'manage_clients'],
      'club-2': ['view_reservations', 'manage_clients'],
    },
    ...overrides,
  }),

  // Pricing rules mock
  pricingRules: (overrides = {}) => ({
    pricing_rules: [
      {
        start_time: '08:00',
        end_time: '10:00',
        price: 1500,
      },
      {
        start_time: '17:00',
        end_time: '20:00',
        price: 2500,
      },
    ],
    ...overrides,
  }),

  // Promotions mock
  promotions: (overrides = {}) => ({
    promotions: [
      {
        id: 'promo-1',
        name: 'Early Bird Discount',
        discount_percent: 20,
        is_active: true,
        applies_to_time: true,
        start_time: '08:00',
        end_time: '10:00',
      },
    ],
    ...overrides,
  }),

  // Blocked slots mock
  blockedSlots: (overrides = {}) => ({
    results: [
      {
        id: 'block-1',
        court: '1',
        start_datetime: '2024-01-15 12:00',
        end_datetime: '2024-01-15 14:00',
        reason: 'Maintenance',
      },
    ],
    ...overrides,
  }),

  // Availability check mock
  availability: (overrides = {}) => ({
    availability: [
      {
        time: '09:00',
        available: true,
      },
      {
        time: '10:30',
        available: false,
      },
    ],
    ...overrides,
  }),

  // Upcoming reservations mock
  upcomingReservations: (overrides = {}) => ({
    results: [
      {
        id: 'res-upcoming-1',
        court: { id: '1', name: 'Court 1' },
        start_time: '2024-01-15T14:00:00Z',
        players: ['John Doe', 'Jane Smith'],
      },
      {
        id: 'res-upcoming-2',
        court: { id: '2', name: 'Court 2' },
        start_time: '2024-01-15T16:00:00Z',
        players: ['Bob Johnson'],
      },
    ],
    ...overrides,
  }),
};

/**
 * Setup mock fetch for a specific endpoint
 */
export function mockDjangoEndpoint(
  endpoint: string,
  response: any,
  options: {
    status?: number;
    delay?: number;
    method?: string;
  } = {}
) {
  const { status = 200, delay = 0, method } = options;

  mockFetch.mockImplementationOnce(async (url: string, init?: RequestInit) => {
    // Check if URL matches endpoint
    if (url.includes(endpoint)) {
      // Check method if specified
      if (method && init?.method !== method) {
        return Promise.resolve({
          ok: false,
          status: 405,
          statusText: 'Method Not Allowed',
          json: async () => ({ error: 'Method not allowed' }),
        });
      }

      // Simulate network delay
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        statusText: status === 200 ? 'OK' : 'Error',
        json: async () => response,
      });
    }

    // Default 404 for unmatched URLs
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'Not found' }),
    });
  });
}

/**
 * Setup multiple mock endpoints at once
 */
export function setupMockEndpoints(mocks: Array<{
  endpoint: string;
  response: any;
  options?: {
    status?: number;
    delay?: number;
    method?: string;
  };
}>) {
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    for (const mock of mocks) {
      if (url.includes(mock.endpoint)) {
        // Check method if specified
        if (mock.options?.method && init?.method !== mock.options.method) {
          continue;
        }

        const status = mock.options?.status || 200;
        
        // Simulate network delay
        if (mock.options?.delay) {
          await new Promise(resolve => setTimeout(resolve, mock.options.delay));
        }

        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          statusText: status === 200 ? 'OK' : 'Error',
          json: async () => mock.response,
        });
      }
    }

    // Default 404 for unmatched URLs
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ error: 'Not found' }),
    });
  });
}

/**
 * Performance tracking helper
 */
export class PerformanceTracker {
  private startTime: number = 0;
  private endTime: number = 0;

  start() {
    this.startTime = Date.now();
  }

  end() {
    this.endTime = Date.now();
  }

  getDuration() {
    return this.endTime - this.startTime;
  }

  assertUnder(maxMs: number) {
    const duration = this.getDuration();
    if (duration > maxMs) {
      throw new Error(`Performance assertion failed: ${duration}ms > ${maxMs}ms`);
    }
  }
}

/**
 * Cache testing utilities
 */
export const cacheUtils = {
  // Clear all module caches
  clearAllCaches() {
    jest.resetModules();
  },

  // Mock environment variables
  mockEnv(vars: Record<string, string>) {
    Object.entries(vars).forEach(([key, value]) => {
      process.env[key] = value;
    });
  },

  // Restore environment variables
  restoreEnv(originalEnv: NodeJS.ProcessEnv) {
    // Clear all env vars
    Object.keys(process.env).forEach(key => {
      delete process.env[key];
    });
    // Restore original
    Object.assign(process.env, originalEnv);
  },
};