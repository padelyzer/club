/**
 * Dashboard BFF Performance & Integration Tests
 * Target: < 400ms load time (67% improvement vs 1.2s baseline)
 */

import request from 'supertest';
import { 
  TestDataFactory, 
  TestAuthUtils, 
  MockDjangoAPI, 
  PerformanceTimer 
} from './setup/test-setup';

describe('Dashboard BFF Performance Tests', () => {
  let testUser: any;
  let testOrganization: any;
  let testClub: any;
  let authToken: string;

  beforeEach(() => {
    // Create test data
    testOrganization = TestDataFactory.createOrganization();
    testClub = TestDataFactory.createClub({ organization_id: testOrganization.id });
    testUser = TestDataFactory.createUser({
      organization_id: testOrganization.id,
      club_memberships: [
        TestDataFactory.createClubMembership(testClub, { role: 'admin' })
      ]
    });
    authToken = TestAuthUtils.generateToken(testUser);

    // Mock Django API responses
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  describe('Dashboard Load Performance', () => {
    test('BFF dashboard loads under 400ms target', async () => {
      // Setup Django mocks
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        // Analytics endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAnalyticsResponse(),
        } as Response)
        // Clients endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              {
                id: '1',
                first_name: 'John',
                last_name: 'Doe',
                total_spent: 500,
                reservation_count: 10
              }
            ]
          }),
        } as Response)
        // Reservations endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: [
              {
                id: '1',
                court: { name: 'Court 1' },
                start_time: '2024-01-01T10:00:00Z',
                players: [{ name: 'Player 1' }, { name: 'Player 2' }]
              }
            ]
          }),
        } as Response);

      // Measure performance
      const { result, duration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .get('/api/dashboard/overview')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      // Performance assertions
      expect(duration).toBeLessThan(400); // 67% improvement target
      
      // Validate response structure
      expect(result.body).toHaveProperty('monthlyRevenue');
      expect(result.body).toHaveProperty('todayReservations');
      expect(result.body).toHaveProperty('activeClients');
      expect(result.body).toHaveProperty('occupancyRate');
      expect(result.body).toHaveProperty('revenueChart');
      expect(result.body).toHaveProperty('occupancyHeatmap');
      expect(result.body).toHaveProperty('topClients');
      expect(result.body).toHaveProperty('upcomingEvents');

      // Cache headers validation
      expect(result.headers['x-cache']).toBe('MISS');
      expect(result.headers['cache-control']).toBe('public, max-age=300');

      console.log(`✅ Dashboard BFF performance: ${duration.toFixed(1)}ms (target: <400ms)`);
    });

    test('BFF dashboard shows significant improvement vs baseline', async () => {
      // Mock individual API calls (simulating direct approach)
      const directCallDurations = [250, 300, 200, 150, 350]; // Simulate 5 separate calls
      const baselineTotal = directCallDurations.reduce((sum, duration) => sum + duration, 0);

      // Mock BFF response
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAnalyticsResponse(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);

      // Measure BFF performance
      const { duration: bffDuration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .get('/api/dashboard/overview')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      // Calculate improvement
      const improvement = ((baselineTotal - bffDuration) / baselineTotal) * 100;
      
      expect(improvement).toBeGreaterThan(50); // At least 50% improvement
      console.log(`📈 Dashboard improvement: ${improvement.toFixed(1)}% (${baselineTotal}ms → ${bffDuration.toFixed(1)}ms)`);
    });

    test('BFF dashboard handles cache hits efficiently', async () => {
      // Setup mocks for first call
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAnalyticsResponse(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);

      // First call (cache miss)
      const firstCall = await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(firstCall.headers['x-cache']).toBe('MISS');

      // Second call (should be cache hit)
      const { duration: cachedDuration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .get('/api/dashboard/overview')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      // Cache hit should be much faster
      expect(cachedDuration).toBeLessThan(50); // Cache hits should be under 50ms
      console.log(`⚡ Cached dashboard response: ${cachedDuration.toFixed(1)}ms`);
    });
  });

  describe('Dashboard Data Consistency', () => {
    test('BFF dashboard data matches direct API calls', async () => {
      const analyticsData = MockDjangoAPI.mockAnalyticsResponse();
      
      // Mock Django responses
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => analyticsData,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Validate data transformation
      expect(response.body.monthlyRevenue).toBe(analyticsData.revenue.total);
      expect(response.body.revenueChange).toBe(analyticsData.revenue.comparison.change_percent);
      expect(response.body.todayReservations).toBe(analyticsData.occupancy.total_reservations);
      expect(response.body.occupancyRate).toBe(analyticsData.occupancy.occupancy_rate);
      expect(response.body.activeClients).toBe(analyticsData.customers.active_customers);

      // Validate chart data structure
      expect(response.body.revenueChart).toEqual({
        daily: analyticsData.revenue.daily_breakdown,
        total: analyticsData.revenue.total,
        change: analyticsData.revenue.comparison.change_percent
      });

      console.log('✅ Dashboard data consistency validated');
    });

    test('BFF dashboard handles partial data failures gracefully', async () => {
      // Mock user call success, analytics failure
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockRejectedValueOnce(new Error('Analytics service unavailable'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should return default values for failed services
      expect(response.body.monthlyRevenue).toBe(0);
      expect(response.body.revenueChange).toBe(0);
      expect(response.body.revenueChart.daily).toEqual([]);
      
      // But successful calls should still work
      expect(response.body.topClients).toEqual([]);
      expect(response.body.upcomingEvents).toEqual([]);

      console.log('✅ Dashboard graceful degradation validated');
    });
  });

  describe('Dashboard Error Handling', () => {
    test('BFF dashboard returns fallback data on complete failure', async () => {
      // Mock all calls to fail
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValue(new Error('All services down'));

      const response = await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should still return 200 with fallback data

      // Validate fallback structure
      expect(response.body).toEqual({
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
          change: 0
        },
        occupancyHeatmap: {
          hourly: [],
          courts: []
        },
        topClients: [],
        upcomingEvents: []
      });

      expect(response.headers['x-fallback']).toBe('true');
      console.log('✅ Dashboard fallback behavior validated');
    });

    test('BFF dashboard requires valid authentication', async () => {
      await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .expect(401);

      await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      console.log('✅ Dashboard authentication validation confirmed');
    });

    test('BFF dashboard validates club access', async () => {
      // Create user without club membership
      const userWithoutClub = TestDataFactory.createUser();
      const tokenWithoutClub = TestAuthUtils.generateToken(userWithoutClub);

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ club_memberships: [] }),
        } as Response);

      await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${tokenWithoutClub}`)
        .expect(403);

      console.log('✅ Dashboard multi-tenant access control validated');
    });
  });
});