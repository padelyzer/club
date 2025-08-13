/**
 * E2E Test Setup for BFF Light Testing
 * Global configuration and utilities for end-to-end testing
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Global test configuration
declare global {
  var testServer: any;
  var testPort: number;
  var testBaseUrl: string;
  var testJwtSecret: string;
}

// Test server configuration
const TEST_PORT = 3001;
const JWT_SECRET = 'test-jwt-secret-for-bff-testing';

// Environment setup for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:9200/api/v1';
process.env.NEXT_PUBLIC_BFF_AUTH = 'true';
process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'true';
process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'true';

// Test data structures
export interface TestUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  organization_id?: string;
  club_memberships?: TestClubMembership[];
}

export interface TestOrganization {
  id: string;
  trade_name: string;
  business_name: string;
  type: string;
  state: string;
  subscription_plan?: string;
  subscription_features?: string[];
}

export interface TestClub {
  id: string;
  name: string;
  organization_id: string;
  is_active: boolean;
  price_per_hour?: string;
}

export interface TestClubMembership {
  club: TestClub;
  role: string;
  is_active: boolean;
  permissions?: string[];
}

export interface TestCourt {
  id: string;
  name: string;
  club_id: string;
  surface_type: string;
  is_active: boolean;
  price_per_hour: number;
}

export interface TestReservation {
  id: string;
  court: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  player_name?: string;
  created_by_name?: string;
}

// Test data generators
export class TestDataFactory {
  static createUser(overrides: Partial<TestUser> = {}): TestUser {
    const id = overrides.id || crypto.randomUUID();
    return {
      id,
      email: overrides.email || `user-${id}@test.com`,
      first_name: overrides.first_name || 'Test',
      last_name: overrides.last_name || 'User',
      organization_id: overrides.organization_id || crypto.randomUUID(),
      club_memberships: overrides.club_memberships || [],
      ...overrides
    };
  }

  static createOrganization(overrides: Partial<TestOrganization> = {}): TestOrganization {
    const id = overrides.id || crypto.randomUUID();
    return {
      id,
      trade_name: overrides.trade_name || `Test Org ${id.slice(0, 8)}`,
      business_name: overrides.business_name || `Test Business ${id.slice(0, 8)}`,
      type: overrides.type || 'club',
      state: overrides.state || 'active',
      subscription_plan: overrides.subscription_plan || 'premium',
      subscription_features: overrides.subscription_features || ['analytics', 'multi_club'],
      ...overrides
    };
  }

  static createClub(overrides: Partial<TestClub> = {}): TestClub {
    const id = overrides.id || crypto.randomUUID();
    return {
      id,
      name: overrides.name || `Test Club ${id.slice(0, 8)}`,
      organization_id: overrides.organization_id || crypto.randomUUID(),
      is_active: overrides.is_active !== undefined ? overrides.is_active : true,
      price_per_hour: overrides.price_per_hour || '50.00',
      ...overrides
    };
  }

  static createClubMembership(
    club: TestClub, 
    overrides: Partial<Omit<TestClubMembership, 'club'>> = {}
  ): TestClubMembership {
    return {
      club,
      role: overrides.role || 'admin',
      is_active: overrides.is_active !== undefined ? overrides.is_active : true,
      permissions: overrides.permissions || ['read', 'write', 'admin'],
      ...overrides
    };
  }

  static createCourt(overrides: Partial<TestCourt> = {}): TestCourt {
    const id = overrides.id || crypto.randomUUID();
    return {
      id,
      name: overrides.name || `Court ${id.slice(0, 4)}`,
      club_id: overrides.club_id || crypto.randomUUID(),
      surface_type: overrides.surface_type || 'clay',
      is_active: overrides.is_active !== undefined ? overrides.is_active : true,
      price_per_hour: overrides.price_per_hour || 50,
      ...overrides
    };
  }

  static createReservation(overrides: Partial<TestReservation> = {}): TestReservation {
    const id = overrides.id || crypto.randomUUID();
    const today = new Date().toISOString().split('T')[0];
    return {
      id,
      court: overrides.court || crypto.randomUUID(),
      date: overrides.date || today,
      start_time: overrides.start_time || '10:00',
      end_time: overrides.end_time || '11:30',
      status: overrides.status || 'confirmed',
      player_name: overrides.player_name || 'Test Player',
      created_by_name: overrides.created_by_name || 'Test Creator',
      ...overrides
    };
  }
}

// JWT Token utilities for testing
export class TestAuthUtils {
  static generateToken(user: TestUser, expiresIn: string = '1h'): string {
    return jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        organization_id: user.organization_id,
        exp: Math.floor(Date.now() / 1000) + (expiresIn === '1h' ? 3600 : 60),
      },
      JWT_SECRET
    );
  }

  static generateExpiredToken(user: TestUser): string {
    return jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        organization_id: user.organization_id,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      },
      JWT_SECRET
    );
  }

  static generateInvalidToken(): string {
    return 'invalid.jwt.token';
  }
}

// Mock Django API responses
export class MockDjangoAPI {
  static mockUserResponse(user: TestUser): any {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_active: true,
      club_memberships: user.club_memberships || []
    };
  }

  static mockOrganizationResponse(org: TestOrganization): any {
    return {
      id: org.id,
      trade_name: org.trade_name,
      business_name: org.business_name,
      type: org.type,
      state: org.state,
      subscription_plan: org.subscription_plan,
      subscription_features: org.subscription_features,
      subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  static mockClubsResponse(clubs: TestClub[]): any {
    return clubs.map(club => ({
      id: club.id,
      name: club.name,
      role: 'admin',
      permissions: ['read', 'write', 'admin']
    }));
  }

  static mockAnalyticsResponse(): any {
    return {
      revenue: {
        total: 15000,
        comparison: { change_percent: 12.5 },
        daily_breakdown: [
          { date: '2024-01-01', amount: 500 },
          { date: '2024-01-02', amount: 750 }
        ]
      },
      occupancy: {
        total_reservations: 45,
        occupancy_rate: 0.75,
        comparison: { change_percent: 8.3 },
        hourly_breakdown: [
          { hour: 10, occupancy: 0.8 },
          { hour: 11, occupancy: 0.9 }
        ],
        by_court: [
          { court: 'court-1', court_name: 'Court 1', occupancy_rate: 0.85 }
        ]
      },
      customers: {
        active_customers: 120,
        comparison: { change_percent: 5.2 }
      }
    };
  }

  static mockAvailabilityResponse(): any {
    return {
      availability: [
        {
          court: 'court-1',
          date: '2024-01-01',
          slots: [
            { start_time: '09:00', end_time: '10:30', is_available: true },
            { start_time: '10:30', end_time: '12:00', is_available: false }
          ]
        }
      ]
    };
  }
}

// Performance measurement utilities
export class PerformanceTimer {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  stop(): number {
    this.endTime = performance.now();
    return this.getDuration();
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }

  static async measureAsync<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const timer = new PerformanceTimer();
    timer.start();
    const result = await fn();
    const duration = timer.stop();
    return { result, duration };
  }
}

// Test environment setup
let app: any;
let server: any;

export async function setupTestServer(): Promise<void> {
  if (!global.testServer) {
    app = next({ dev: false, quiet: true });
    const handle = app.getRequestHandler();
    
    await app.prepare();
    
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });

    await new Promise<void>((resolve) => {
      server.listen(TEST_PORT, () => {
        console.log(`🧪 Test server running on port ${TEST_PORT}`);
        resolve();
      });
    });

    global.testServer = server;
    global.testPort = TEST_PORT;
    global.testBaseUrl = `http://localhost:${TEST_PORT}`;
    global.testJwtSecret = JWT_SECRET;
  }
}

export async function teardownTestServer(): Promise<void> {
  if (global.testServer) {
    await new Promise<void>((resolve) => {
      global.testServer.close(() => {
        console.log('🧪 Test server stopped');
        resolve();
      });
    });
    global.testServer = null;
  }
}

// Global setup and teardown
beforeAll(async () => {
  await setupTestServer();
}, 30000);

afterAll(async () => {
  await teardownTestServer();
}, 10000);

// Test utilities exports
export {
  setupTestServer,
  teardownTestServer,
  PerformanceTimer,
  MockDjangoAPI,
  TestAuthUtils,
  TestDataFactory
};