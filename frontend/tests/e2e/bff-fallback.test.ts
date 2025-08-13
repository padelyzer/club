/**
 * BFF Feature Flag Fallback & Rollback Tests
 * Validates graceful fallback when BFF features are disabled
 */

import request from 'supertest';
import { 
  TestDataFactory, 
  TestAuthUtils, 
  MockDjangoAPI, 
  PerformanceTimer 
} from './setup/test-setup';

describe('BFF Feature Flag Fallback Scenarios', () => {
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

    // Clear mocks
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  describe('Dashboard BFF Fallback', () => {
    test('Dashboard BFF disabled returns appropriate error', async () => {
      // Temporarily disable BFF feature
      const originalDashboard = process.env.NEXT_PUBLIC_BFF_DASHBOARD;
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'false';

      try {
        const response = await request(global.testBaseUrl)
          .get('/api/dashboard/overview')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(501);

        expect(response.body).toEqual({
          error: 'Dashboard BFF not enabled',
          useDirectCall: true
        });

        console.log('✅ Dashboard BFF disabled response validated');
      } finally {
        // Restore original value
        process.env.NEXT_PUBLIC_BFF_DASHBOARD = originalDashboard;
      }
    });

    test('Dashboard BFF re-enabled works normally', async () => {
      // Ensure BFF is enabled
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'true';

      // Setup mocks
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

      const response = await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('monthlyRevenue');
      expect(response.body).toHaveProperty('revenueChart');

      console.log('✅ Dashboard BFF re-enabled functionality validated');
    });

    test('Dashboard BFF partial failure still returns data', async () => {
      // Ensure BFF is enabled
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'true';

      // Mock partial failure scenario
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockRejectedValueOnce(new Error('Analytics service temporarily down'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [{ id: '1', first_name: 'John', last_name: 'Doe' }] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Should have fallback values for failed service
      expect(response.body.monthlyRevenue).toBe(0);
      expect(response.body.revenueChange).toBe(0);
      
      // But successful services should work
      expect(response.body.topClients).toHaveLength(1);

      console.log('✅ Dashboard BFF partial failure handling validated');
    });
  });

  describe('Auth Context BFF Fallback', () => {
    test('Auth BFF disabled returns service unavailable', async () => {
      // Temporarily disable auth BFF
      const originalAuth = process.env.NEXT_PUBLIC_BFF_AUTH;
      process.env.NEXT_PUBLIC_BFF_AUTH = 'false';

      try {
        const response = await request(global.testBaseUrl)
          .get('/api/auth/context')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(503);

        expect(response.body).toEqual({
          error: 'BFF auth context is not enabled'
        });

        console.log('✅ Auth BFF disabled response validated');
      } finally {
        // Restore original value
        process.env.NEXT_PUBLIC_BFF_AUTH = originalAuth;
      }
    });

    test('Auth BFF re-enabled works normally', async () => {
      // Ensure auth BFF is enabled
      process.env.NEXT_PUBLIC_BFF_AUTH = 'true';

      // Setup mocks
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(testOrganization),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([testClub]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ global_permissions: [], club_permissions: {} }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('organization');
      expect(response.body).toHaveProperty('clubs');

      console.log('✅ Auth BFF re-enabled functionality validated');
    });

    test('Auth BFF handles individual service failures', async () => {
      // Ensure auth BFF is enabled
      process.env.NEXT_PUBLIC_BFF_AUTH = 'true';

      // Mock user success, organization failure
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockRejectedValueOnce(new Error('Organization service down'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ global_permissions: [], club_permissions: {} }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // User data should be present
      expect(response.body.user.email).toBe(testUser.email);
      
      // Organization should be null due to failure
      expect(response.body.organization).toBeNull();
      
      // Other services should work
      expect(response.body.clubs).toEqual([]);

      console.log('✅ Auth BFF service failure handling validated');
    });
  });

  describe('Reservations BFF Fallback', () => {
    test('Reservations BFF disabled returns appropriate error', async () => {
      // Temporarily disable reservations BFF
      const originalReservations = process.env.NEXT_PUBLIC_BFF_RESERVATIONS;
      process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'false';

      try {
        const response = await request(global.testBaseUrl)
          .post('/api/reservations/availability')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            club_id: testClub.id,
            date: new Date().toISOString().split('T')[0]
          })
          .expect(501);

        expect(response.body).toEqual({
          error: 'Reservations BFF not enabled',
          useDirectCall: true
        });

        console.log('✅ Reservations BFF disabled response validated');
      } finally {
        // Restore original value
        process.env.NEXT_PUBLIC_BFF_RESERVATIONS = originalReservations;
      }
    });

    test('Reservations BFF re-enabled works normally', async () => {
      // Ensure reservations BFF is enabled
      process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'true';

      const today = new Date().toISOString().split('T')[0];

      // Setup mocks
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAvailabilityResponse(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pricing_rules: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ promotions: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          club_id: testClub.id,
          date: today
        })
        .expect(200);

      expect(response.body).toHaveProperty('date', today);
      expect(response.body).toHaveProperty('courts');
      expect(response.body).toHaveProperty('summary');

      console.log('✅ Reservations BFF re-enabled functionality validated');
    });

    test('Reservations BFF complete failure returns fallback', async () => {
      // Ensure reservations BFF is enabled
      process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'true';

      const today = new Date().toISOString().split('T')[0];

      // Mock complete failure
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValue(new Error('All services down'));

      const response = await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          club_id: testClub.id,
          date: today
        })
        .expect(200); // Still returns 200 with fallback

      expect(response.body).toEqual({
        date: today,
        club_id: testClub.id,
        courts: [],
        summary: {
          total_slots: 0,
          available_slots: 0,
          occupancy_rate: 0,
          peak_hours: []
        }
      });

      expect(response.headers['x-fallback']).toBe('true');

      console.log('✅ Reservations BFF complete failure fallback validated');
    });
  });

  describe('Gradual Rollout Scenarios', () => {
    test('Mixed feature flag states work independently', async () => {
      // Set mixed feature flags
      process.env.NEXT_PUBLIC_BFF_AUTH = 'true';
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'false';
      process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'true';

      // Test auth BFF works
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(testOrganization),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([testClub]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ global_permissions: [], club_permissions: {} }),
        } as Response);

      const authResponse = await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(authResponse.body).toHaveProperty('user');

      // Test dashboard BFF is disabled
      const dashboardResponse = await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(501);

      expect(dashboardResponse.body.error).toBe('Dashboard BFF not enabled');

      // Test reservations BFF works
      const today = new Date().toISOString().split('T')[0];
      
      // Setup new mocks for reservations
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAvailabilityResponse(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pricing_rules: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ promotions: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);

      const reservationsResponse = await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ club_id: testClub.id, date: today })
        .expect(200);

      expect(reservationsResponse.body).toHaveProperty('courts');

      console.log('✅ Mixed feature flag states validated');
    });

    test('Instant rollback scenario - all features disabled', async () => {
      // Simulate emergency rollback
      process.env.NEXT_PUBLIC_BFF_AUTH = 'false';
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'false';
      process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'false';

      // All BFF endpoints should be disabled
      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(501);

      await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          club_id: testClub.id,
          date: new Date().toISOString().split('T')[0]
        })
        .expect(501);

      console.log('✅ Emergency rollback scenario validated');
    });

    test('Progressive rollout scenario - gradual enablement', async () => {
      // Start with all disabled
      process.env.NEXT_PUBLIC_BFF_AUTH = 'false';
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'false';
      process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'false';

      // Verify all disabled
      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(503);

      // Enable auth first
      process.env.NEXT_PUBLIC_BFF_AUTH = 'true';

      // Mock auth success
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(testOrganization),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([testClub]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ global_permissions: [], club_permissions: {} }),
        } as Response);

      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Dashboard still disabled
      await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(501);

      // Enable dashboard
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'true';

      // Mock dashboard success
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

      await request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      console.log('✅ Progressive rollout scenario validated');
    });
  });

  describe('Performance During Feature Flag Changes', () => {
    test('Feature flag checks add minimal overhead', async () => {
      // Enable all features
      process.env.NEXT_PUBLIC_BFF_AUTH = 'true';
      process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'true';
      process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'true';

      // Mock responses
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(testOrganization),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([testClub]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ global_permissions: [], club_permissions: {} }),
        } as Response);

      // Measure with feature flags enabled
      const { duration: enabledDuration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .get('/api/auth/context')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      });

      // Disable feature and measure
      process.env.NEXT_PUBLIC_BFF_AUTH = 'false';

      const { duration: disabledDuration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .get('/api/auth/context')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(503);
      });

      // Feature flag check should be very fast when disabled
      expect(disabledDuration).toBeLessThan(5); // Should be under 5ms
      
      console.log(`✅ Feature flag overhead: enabled=${enabledDuration.toFixed(1)}ms, disabled=${disabledDuration.toFixed(1)}ms`);
    });
  });
});