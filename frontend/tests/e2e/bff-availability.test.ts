/**
 * Reservations Availability BFF Integration Tests
 * Target: < 200ms load time (67% improvement) + Data parity with individual calls
 */

import request from 'supertest';
import { 
  TestDataFactory, 
  TestAuthUtils, 
  MockDjangoAPI, 
  PerformanceTimer 
} from './setup/test-setup';

describe('Reservations Availability BFF Integration Tests', () => {
  let testUser: any;
  let testOrganization: any;
  let testClub: any;
  let testCourts: any[];
  let testReservations: any[];
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

    // Create test courts
    testCourts = [
      TestDataFactory.createCourt({ 
        club_id: testClub.id, 
        name: 'Court 1',
        surface_type: 'clay',
        price_per_hour: 50
      }),
      TestDataFactory.createCourt({ 
        club_id: testClub.id, 
        name: 'Court 2',
        surface_type: 'hard',
        price_per_hour: 60
      })
    ];

    // Create test reservations
    const today = new Date().toISOString().split('T')[0];
    testReservations = [
      TestDataFactory.createReservation({
        court: testCourts[0].id,
        date: today,
        start_time: '10:00',
        end_time: '11:30',
        status: 'confirmed'
      }),
      TestDataFactory.createReservation({
        court: testCourts[1].id,
        date: today,
        start_time: '14:00',
        end_time: '15:30',
        status: 'pending'
      })
    ];

    authToken = TestAuthUtils.generateToken(testUser);

    // Clear mocks
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  describe('Availability BFF Performance', () => {
    test('BFF availability loads under 200ms target', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Setup Django mock responses
      (global.fetch as jest.MockedFunction<typeof fetch>)
        // validateClubAccess call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        // Courts endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: testCourts.map(court => ({
              id: court.id,
              name: court.name,
              surface_type: court.surface_type,
              is_active: court.is_active,
              price_per_hour: court.price_per_hour.toString()
            }))
          }),
        } as Response)
        // Availability endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAvailabilityResponse(),
        } as Response)
        // Reservations endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: testReservations }),
        } as Response)
        // Pricing rules endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pricing_rules: [] }),
        } as Response)
        // Promotions endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ promotions: [] }),
        } as Response)
        // Blocked slots endpoint
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: [] }),
        } as Response);

      // Measure performance
      const { result, duration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .post('/api/reservations/availability')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            club_id: testClub.id,
            date: today,
            include_pricing: true,
            include_conflicts: true
          })
          .expect(200);
      });

      // Performance assertion
      expect(duration).toBeLessThan(200); // 67% improvement target

      // Validate response structure
      expect(result.body).toHaveProperty('date', today);
      expect(result.body).toHaveProperty('club_id', testClub.id);
      expect(result.body).toHaveProperty('courts');
      expect(result.body).toHaveProperty('summary');
      
      expect(result.body.courts).toBeInstanceOf(Array);
      expect(result.body.summary).toHaveProperty('total_slots');
      expect(result.body.summary).toHaveProperty('available_slots');
      expect(result.body.summary).toHaveProperty('occupancy_rate');
      expect(result.body.summary).toHaveProperty('peak_hours');

      // Cache headers validation
      expect(result.headers['x-cache']).toBe('MISS');
      expect(result.headers['cache-control']).toBe('public, max-age=60');

      console.log(`✅ Availability BFF performance: ${duration.toFixed(1)}ms (target: <200ms)`);
    });

    test('BFF availability significantly improves vs 4 individual calls', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Simulate baseline: 4 individual API calls with typical response times
      const baselineDurations = [150, 120, 180, 100]; // Courts, availability, reservations, pricing
      const baselineTotal = baselineDurations.reduce((sum, duration) => sum + duration, 0);

      // Setup BFF mocks
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: testCourts }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAvailabilityResponse(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: testReservations }),
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

      // Measure BFF performance
      const { duration: bffDuration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .post('/api/reservations/availability')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            club_id: testClub.id,
            date: today,
            include_pricing: true,
            include_conflicts: true
          })
          .expect(200);
      });

      // Calculate improvement
      const improvement = ((baselineTotal - bffDuration) / baselineTotal) * 100;
      
      expect(improvement).toBeGreaterThan(50); // At least 50% improvement
      console.log(`📈 Availability improvement: ${improvement.toFixed(1)}% (${baselineTotal}ms → ${bffDuration.toFixed(1)}ms)`);
    });

    test('BFF availability cache improves repeated calls', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Setup mocks for first call
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: testCourts }),
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

      // First call (cache miss)
      const firstCall = await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ club_id: testClub.id, date: today })
        .expect(200);

      expect(firstCall.headers['x-cache']).toBe('MISS');

      // Second call (cache hit)
      const { duration: cachedDuration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .post('/api/reservations/availability')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ club_id: testClub.id, date: today })
          .expect(200);
      });

      // Cache hits should be much faster (1 minute cache)
      expect(cachedDuration).toBeLessThan(30); // Cache hits should be under 30ms
      console.log(`⚡ Cached availability response: ${cachedDuration.toFixed(1)}ms`);
    });
  });

  describe('Availability Data Completeness', () => {
    test('BFF matches individual API call data structure', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Setup comprehensive mock responses
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: testCourts.map(court => ({
              id: court.id,
              name: court.name,
              surface_type: court.surface_type,
              is_active: court.is_active,
              price_per_hour: court.price_per_hour.toString()
            }))
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAvailabilityResponse(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: testReservations }),
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
          date: today,
          include_pricing: true,
          include_conflicts: true
        })
        .expect(200);

      // Validate top-level structure
      expect(response.body.date).toBe(today);
      expect(response.body.club_id).toBe(testClub.id);
      expect(response.body.courts).toHaveLength(testCourts.length);

      // Validate court structure
      const court = response.body.courts[0];
      expect(court).toHaveProperty('id');
      expect(court).toHaveProperty('name');
      expect(court).toHaveProperty('surface_type');
      expect(court).toHaveProperty('is_active');
      expect(court).toHaveProperty('slots');
      expect(court).toHaveProperty('schedule');

      // Validate slot structure
      expect(court.slots).toBeInstanceOf(Array);
      if (court.slots.length > 0) {
        const slot = court.slots[0];
        expect(slot).toHaveProperty('start_time');
        expect(slot).toHaveProperty('end_time');
        expect(slot).toHaveProperty('is_available');
        expect(slot).toHaveProperty('price');
        expect(slot).toHaveProperty('conflicts');
        
        // Validate price structure
        expect(slot.price).toHaveProperty('amount');
        expect(slot.price).toHaveProperty('currency');
        expect(slot.price).toHaveProperty('includes_tax');
      }

      // Validate summary structure
      expect(response.body.summary).toEqual({
        total_slots: expect.any(Number),
        available_slots: expect.any(Number),
        occupancy_rate: expect.any(Number),
        peak_hours: expect.any(Array)
      });

      console.log('✅ Availability data structure validation passed');
    });

    test('BFF correctly detects conflicts with existing reservations', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Setup mocks with reservation conflicts
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: testCourts.map(court => ({
              id: court.id,
              name: court.name,
              surface_type: court.surface_type,
              is_active: court.is_active,
              price_per_hour: court.price_per_hour.toString()
            }))
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockAvailabilityResponse(),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ results: testReservations }),
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
          date: today,
          include_conflicts: true
        })
        .expect(200);

      // Find slots that should have conflicts
      let foundConflicts = false;
      response.body.courts.forEach((court: any) => {
        court.slots.forEach((slot: any) => {
          // Check for conflicts during 10:00-11:30 (testReservations[0])
          if (slot.start_time >= '10:00' && slot.start_time < '11:30') {
            if (court.id === testCourts[0].id) {
              expect(slot.is_available).toBe(false);
              expect(slot.conflicts).toBeInstanceOf(Array);
              foundConflicts = true;
            }
          }
        });
      });

      expect(foundConflicts).toBe(true);
      console.log('✅ Conflict detection validation passed');
    });

    test('BFF applies pricing rules and promotions correctly', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Mock pricing rules and promotions
      const pricingRules = [
        {
          start_time: '18:00',
          end_time: '22:00',
          price: 75 // Peak hour pricing
        }
      ];

      const promotions = [
        {
          id: 'happy-hour',
          name: 'Happy Hour Discount',
          discount_percent: 20,
          is_active: true,
          applies_to_time: true,
          start_time: '14:00',
          end_time: '16:00'
        }
      ];

      // Setup mocks
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            results: testCourts.map(court => ({
              id: court.id,
              name: court.name,
              surface_type: court.surface_type,
              is_active: court.is_active,
              price_per_hour: court.price_per_hour.toString()
            }))
          }),
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
          json: async () => ({ pricing_rules: pricingRules }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ promotions }),
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
          date: today,
          include_pricing: true
        })
        .expect(200);

      // Validate pricing modifications
      let foundPeakPricing = false;
      let foundPromotion = false;

      response.body.courts.forEach((court: any) => {
        court.slots.forEach((slot: any) => {
          // Check peak hour pricing (18:00-22:00)
          if (slot.start_time >= '18:00' && slot.start_time < '22:00') {
            expect(slot.price.amount).toBeGreaterThan(testCourts[0].price_per_hour);
            foundPeakPricing = true;
          }
          
          // Check promotion pricing (14:00-16:00)
          if (slot.start_time >= '14:00' && slot.start_time < '16:00') {
            expect(slot.promotion).toBeDefined();
            expect(slot.promotion.discount_percent).toBe(20);
            expect(slot.promotion.original_price).toBeGreaterThan(slot.price.amount);
            foundPromotion = true;
          }
        });
      });

      expect(foundPeakPricing).toBe(true);
      expect(foundPromotion).toBe(true);
      console.log('✅ Pricing rules and promotions validation passed');
    });
  });

  describe('Availability Security & Access Control', () => {
    test('BFF validates multi-tenant club access', async () => {
      // Create user without access to the club
      const unauthorizedUser = TestDataFactory.createUser({
        club_memberships: [] // No club memberships
      });
      const unauthorizedToken = TestAuthUtils.generateToken(unauthorizedUser);

      // Mock user profile without club access
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ club_memberships: [] }),
        } as Response);

      await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${unauthorizedToken}`)
        .send({
          club_id: testClub.id,
          date: new Date().toISOString().split('T')[0]
        })
        .expect(403);

      console.log('✅ Club access validation passed');
    });

    test('BFF requires authentication', async () => {
      await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .send({
          club_id: testClub.id,
          date: new Date().toISOString().split('T')[0]
        })
        .expect(401);

      console.log('✅ Authentication requirement validated');
    });

    test('BFF validates required parameters', async () => {
      // Missing club_id
      await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: new Date().toISOString().split('T')[0]
        })
        .expect(400);

      // Missing date
      await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          club_id: testClub.id
        })
        .expect(400);

      console.log('✅ Parameter validation passed');
    });
  });

  describe('Availability Error Handling', () => {
    test('BFF handles individual service failures gracefully', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Mock validation success, but individual services fail
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(testUser),
        } as Response)
        .mockRejectedValueOnce(new Error('Courts service down'))
        .mockRejectedValueOnce(new Error('Availability service down'))
        .mockRejectedValueOnce(new Error('Reservations service down'))
        .mockRejectedValueOnce(new Error('Pricing service down'))
        .mockRejectedValueOnce(new Error('Promotions service down'))
        .mockRejectedValueOnce(new Error('Blocked slots service down'));

      const response = await request(global.testBaseUrl)
        .post('/api/reservations/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          club_id: testClub.id,
          date: today
        })
        .expect(200); // Should still return 200 with fallback data

      // Validate fallback structure
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
      console.log('✅ Service failure graceful degradation validated');
    });
  });
});