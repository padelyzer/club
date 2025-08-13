import { NextRequest } from 'next/server';
import { GET } from '@/app/api/dashboard/overview/route';
import {
  createMockRequest,
  djangoMocks,
  mockDjangoEndpoint,
  setupMockEndpoints,
  PerformanceTracker,
  cacheUtils,
} from '../utils/mock-helpers';

describe('Dashboard Overview API Route', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cacheUtils.clearAllCaches();
    // Enable BFF feature flag by default
    process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'true';
  });

  afterEach(() => {
    cacheUtils.restoreEnv(originalEnv);
  });

  describe('Feature Flag Handling', () => {
    it('should return 501 when BFF dashboard feature is disabled', async () => {
      // Disable feature flag
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'false';

      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data).toEqual({
        error: 'Dashboard BFF not enabled',
        useDirectCall: true,
      });
    });

    it('should proceed when BFF dashboard feature is enabled', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      // Mock successful auth check
      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
      ]);

      const response = await GET(request);
      expect(response.status).not.toBe(501);
    });
  });

  describe('Authentication', () => {
    it('should return 401 when Bearer token is missing', async () => {
      const request = createMockRequest();

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required - Bearer token missing',
      });
    });

    it('should return 401 when authorization header is malformed', async () => {
      const request = createMockRequest({
        headers: { authorization: 'InvalidFormat token' },
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
    });

    it('should accept valid Bearer token', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token-123' },
      });

      // Mock user profile to return club membership
      mockDjangoEndpoint('/auth/profile/', djangoMocks.userProfile());

      const response = await GET(request);
      expect(response.status).not.toBe(401);
    });
  });

  describe('Multi-tenant Club Access', () => {
    it('should return 403 when user has no active club membership', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      // Mock user with no club memberships
      mockDjangoEndpoint('/auth/profile/', djangoMocks.userProfile({
        club_memberships: [],
      }));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: 'No active club found for user',
      });
    });

    it('should validate user has appropriate role in club', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      // Mock user with viewer role (should be rejected)
      mockDjangoEndpoint('/auth/profile/', djangoMocks.userProfile({
        club_memberships: [{
          club: { id: 'club-1', name: 'Test Club' },
          role: 'viewer',
          is_active: true,
        }],
      }));

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
    });

    it('should accept users with owner, admin, or staff roles', async () => {
      const roles = ['owner', 'admin', 'staff'];

      for (const role of roles) {
        jest.clearAllMocks();
        
        const request = createMockRequest({
          headers: { authorization: 'Bearer valid-token' },
        });

        setupMockEndpoints([
          {
            endpoint: '/auth/profile/',
            response: djangoMocks.userProfile({
              club_memberships: [{
                club: { id: 'club-1', name: 'Test Club' },
                role,
                is_active: true,
              }],
            }),
          },
          {
            endpoint: '/bi/analytics/club/',
            response: djangoMocks.analytics(),
            options: { method: 'POST' },
          },
          {
            endpoint: '/clients/',
            response: djangoMocks.clients(),
          },
          {
            endpoint: '/reservations/upcoming/',
            response: djangoMocks.upcomingReservations(),
          },
        ]);

        const response = await GET(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Data Aggregation', () => {
    it('should successfully aggregate all dashboard metrics', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toMatchObject({
        monthlyRevenue: 150000,
        revenueChange: 12.5,
        todayReservations: 45,
        reservationsChange: 8.3,
        activeClients: 234,
        clientsChange: 5.2,
        occupancyRate: 0.75,
        occupancyChange: 8.3,
        revenueChart: {
          daily: expect.any(Array),
          total: 150000,
          change: 12.5,
        },
        occupancyHeatmap: {
          hourly: expect.any(Array),
          courts: expect.any(Array),
        },
        topClients: expect.any(Array),
        upcomingEvents: expect.any(Array),
      });
    });

    it('should handle partial data failures gracefully', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics(),
          options: { method: 'POST' },
        },
        // Clients endpoint fails
        {
          endpoint: '/clients/',
          response: { error: 'Internal error' },
          options: { status: 500 },
        },
        // Reservations endpoint fails
        {
          endpoint: '/reservations/upcoming/',
          response: { error: 'Internal error' },
          options: { status: 500 },
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should have analytics data but empty supplementary data
      expect(data.monthlyRevenue).toBe(150000);
      expect(data.topClients).toEqual([]);
      expect(data.upcomingEvents).toEqual([]);
    });

    it('should include proper analytics request parameters', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      let capturedBody: any;

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      // Custom mock to capture request body
      (global.fetch as jest.Mock).mockImplementationOnce(async (url, init) => {
        if (url.includes('/bi/analytics/club/')) {
          capturedBody = JSON.parse(init.body);
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.analytics(),
          };
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        };
      });

      await GET(request);

      expect(capturedBody).toEqual({
        period: 'month',
        include_revenue: true,
        include_occupancy: true,
        include_customers: true,
        compare_previous: true,
      });
    });
  });

  describe('Cache Behavior', () => {
    it('should cache responses for 5 minutes', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      // First request
      const response1 = await GET(request);
      expect(response1.headers.get('X-Cache')).toBe('MISS');
      expect(response1.headers.get('Cache-Control')).toBe('public, max-age=300');

      // Second request (should hit cache)
      const response2 = await GET(request);
      expect(response2.headers.get('X-Cache')).toBe('HIT');
      
      // Verify fetch was only called once per endpoint
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const profileCalls = fetchCalls.filter(call => call[0].includes('/auth/profile/')).length;
      expect(profileCalls).toBe(2); // Called twice because cache key includes user club
    });

    it('should use different cache keys for different users/clubs', async () => {
      // First user request
      const request1 = createMockRequest({
        headers: { authorization: 'Bearer token-user1' },
      });

      // Second user request  
      const request2 = createMockRequest({
        headers: { authorization: 'Bearer token-user2' },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile({ 
            id: '1',
            club_memberships: [{
              club: { id: 'club-1', name: 'Club 1' },
              role: 'admin',
              is_active: true,
            }],
          }),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      await GET(request1);
      
      // Change mock for second user
      (global.fetch as jest.Mock).mockClear();
      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile({ 
            id: '2',
            club_memberships: [{
              club: { id: 'club-2', name: 'Club 2' },
              role: 'admin',
              is_active: true,
            }],
          }),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics({ revenue: { total: 200000 } }),
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      const response2 = await GET(request2);
      expect(response2.headers.get('X-Cache')).toBe('MISS'); // Different cache key
    });
  });

  describe('Error Handling', () => {
    it('should return fallback data when Django completely fails', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      // All endpoints fail
      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: { error: 'Service unavailable' },
          options: { status: 503 },
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Still returns 200
      expect(response.headers.get('X-Fallback')).toBe('true');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      
      // Should return empty structure
      expect(data).toMatchObject({
        monthlyRevenue: 0,
        revenueChange: 0,
        todayReservations: 0,
        reservationsChange: 0,
        activeClients: 0,
        clientsChange: 0,
        occupancyRate: 0,
        occupancyChange: 0,
        revenueChart: {
          daily: [],
          total: 0,
          change: 0,
        },
        occupancyHeatmap: {
          hourly: [],
          courts: [],
        },
        topClients: [],
        upcomingEvents: [],
      });
    });

    it('should handle network timeouts gracefully', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      // Mock network timeout
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Fallback')).toBe('true');
    });

    it('should handle invalid Django response format', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: { invalid: 'format' }, // Invalid analytics format
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should have default values for analytics
      expect(data.monthlyRevenue).toBe(0);
      expect(data.occupancyRate).toBe(0);
      // But should have supplementary data
      expect(data.topClients.length).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should respond within 400ms', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const tracker = new PerformanceTracker();

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
          options: { delay: 50 }, // Simulate network latency
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics(),
          options: { method: 'POST', delay: 100 },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
          options: { delay: 50 },
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
          options: { delay: 50 },
        },
      ]);

      tracker.start();
      await GET(request);
      tracker.end();

      expect(tracker.getDuration()).toBeLessThan(400);
    });

    it('should make parallel requests for optimal performance', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const callTimestamps: Record<string, number> = {};

      (global.fetch as jest.Mock).mockImplementation(async (url) => {
        callTimestamps[url] = Date.now();
        
        if (url.includes('/auth/profile/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.userProfile(),
          };
        }
        
        // Simulate 100ms delay for other endpoints
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (url.includes('/bi/analytics/club/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.analytics(),
          };
        }
        if (url.includes('/clients/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.clients(),
          };
        }
        if (url.includes('/reservations/upcoming/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.upcomingReservations(),
          };
        }
        
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        };
      });

      await GET(request);

      // Verify analytics and supplementary data were called in parallel
      const analyticsTime = callTimestamps[expect.stringContaining('/bi/analytics/club/')];
      const clientsTime = callTimestamps[expect.stringContaining('/clients/')];
      const reservationsTime = callTimestamps[expect.stringContaining('/reservations/upcoming/')];

      // These should be called within a few ms of each other (parallel)
      expect(Math.abs(analyticsTime - clientsTime)).toBeLessThan(50);
      expect(Math.abs(analyticsTime - reservationsTime)).toBeLessThan(50);
    });
  });

  describe('Data Transformation', () => {
    it('should correctly transform Django analytics to frontend format', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const mockAnalytics = {
        revenue: {
          total: 250000,
          comparison: { change_percent: -5.5 },
          daily_breakdown: [
            { date: '2024-01-01', amount: 8000 },
            { date: '2024-01-02', amount: 9000 },
            { date: '2024-01-03', amount: 7500 },
          ],
        },
        occupancy: {
          total_reservations: 120,
          comparison: { change_percent: 15.0 },
          occupancy_rate: 0.82,
          hourly_breakdown: [
            { hour: 9, occupancy_rate: 0.6 },
            { hour: 10, occupancy_rate: 0.9 },
            { hour: 11, occupancy_rate: 0.95 },
          ],
          by_court: [
            { court: '1', court_name: 'Center Court', occupancy_rate: 0.85 },
            { court: '2', court_name: 'Court B', occupancy_rate: 0.79 },
          ],
        },
        customers: {
          active_customers: 567,
          comparison: { change_percent: 8.9 },
        },
      };

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: mockAnalytics,
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(data).toMatchObject({
        monthlyRevenue: 250000,
        revenueChange: -5.5,
        todayReservations: 120,
        reservationsChange: 15.0,
        activeClients: 567,
        clientsChange: 8.9,
        occupancyRate: 0.82,
        occupancyChange: 15.0,
        revenueChart: {
          daily: mockAnalytics.revenue.daily_breakdown,
          total: 250000,
          change: -5.5,
        },
        occupancyHeatmap: {
          hourly: mockAnalytics.occupancy.hourly_breakdown,
          courts: [
            { id: '1', name: 'Center Court', occupancy: 0.85 },
            { id: '2', name: 'Court B', occupancy: 0.79 },
          ],
        },
      });
    });

    it('should limit top clients to 5 and format correctly', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const manyClients = Array.from({ length: 10 }, (_, i) => ({
        id: `client-${i}`,
        first_name: `Client`,
        last_name: `${i}`,
        total_spent: (10 - i) * 1000,
        reservation_count: 10 - i,
      }));

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: { results: manyClients },
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(data.topClients).toHaveLength(5);
      expect(data.topClients[0]).toEqual({
        id: 'client-0',
        name: 'Client 0',
        totalSpent: 10000,
        reservations: 10,
      });
    });

    it('should format upcoming events correctly', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      const mockReservations = {
        results: [
          {
            id: 'res-1',
            court: { id: '1', name: 'Court A' },
            start_time: '2024-01-15T10:00:00Z',
            players: ['Player 1', 'Player 2', 'Player 3'],
          },
          {
            id: 'res-2',
            court: { id: '2', name: 'Court B' },
            start_time: '2024-01-15T14:30:00Z',
            players: ['Solo Player'],
          },
        ],
      };

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: mockReservations,
        },
      ]);

      const response = await GET(request);
      const data = await response.json();

      expect(data.upcomingEvents).toEqual([
        {
          id: 'res-1',
          type: 'reservation',
          title: 'Court Court A',
          time: '2024-01-15T10:00:00Z',
          participants: 3,
        },
        {
          id: 'res-2',
          type: 'reservation',
          title: 'Court Court B',
          time: '2024-01-15T14:30:00Z',
          participants: 1,
        },
      ]);
    });
  });

  describe('Multi-tenant Security', () => {
    it('should only fetch data for the user\'s active club', async () => {
      const request = createMockRequest({
        headers: { authorization: 'Bearer valid-token' },
      });

      let capturedUrls: string[] = [];

      (global.fetch as jest.Mock).mockImplementation(async (url) => {
        capturedUrls.push(url);
        
        if (url.includes('/auth/profile/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.userProfile({
              club_memberships: [{
                club: { id: 'club-123', name: 'Specific Club' },
                role: 'admin',
                is_active: true,
              }],
            }),
          };
        }
        
        if (url.includes('/bi/analytics/club/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.analytics(),
          };
        }
        
        if (url.includes('/clients/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.clients(),
          };
        }
        
        if (url.includes('/reservations/upcoming/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.upcomingReservations(),
          };
        }
        
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        };
      });

      await GET(request);

      // Verify all data requests include the correct club ID
      const analyticsUrl = capturedUrls.find(url => url.includes('/bi/analytics/club/'));
      const clientsUrl = capturedUrls.find(url => url.includes('/clients/'));
      const reservationsUrl = capturedUrls.find(url => url.includes('/reservations/upcoming/'));

      expect(analyticsUrl).toContain('club=club-123');
      expect(clientsUrl).toContain('club=club-123');
      expect(reservationsUrl).toContain('club=club-123');
    });

    it('should not leak data between different club contexts', async () => {
      // First request for club-1
      const request1 = createMockRequest({
        headers: { authorization: 'Bearer token-club1' },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile({
            club_memberships: [{
              club: { id: 'club-1', name: 'Club 1' },
              role: 'admin',
              is_active: true,
            }],
          }),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics({ revenue: { total: 100000 } }),
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      const response1 = await GET(request1);
      const data1 = await response1.json();
      expect(data1.monthlyRevenue).toBe(100000);

      // Clear mocks and setup for club-2
      jest.clearAllMocks();
      
      const request2 = createMockRequest({
        headers: { authorization: 'Bearer token-club2' },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile({
            club_memberships: [{
              club: { id: 'club-2', name: 'Club 2' },
              role: 'admin',
              is_active: true,
            }],
          }),
        },
        {
          endpoint: '/bi/analytics/club/',
          response: djangoMocks.analytics({ revenue: { total: 200000 } }),
          options: { method: 'POST' },
        },
        {
          endpoint: '/clients/',
          response: djangoMocks.clients(),
        },
        {
          endpoint: '/reservations/upcoming/',
          response: djangoMocks.upcomingReservations(),
        },
      ]);

      const response2 = await GET(request2);
      const data2 = await response2.json();
      expect(data2.monthlyRevenue).toBe(200000);
    });
  });
});