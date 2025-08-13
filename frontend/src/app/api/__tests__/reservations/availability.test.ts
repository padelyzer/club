import { NextRequest } from 'next/server';
import { POST } from '@/app/api/reservations/availability/route';
import {
  createMockRequest,
  djangoMocks,
  mockDjangoEndpoint,
  setupMockEndpoints,
  PerformanceTracker,
  cacheUtils,
} from '../utils/mock-helpers';

describe('Reservations Availability API Route', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cacheUtils.clearAllCaches();
    // Enable BFF feature flag by default
    process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'true';
  });

  afterEach(() => {
    cacheUtils.restoreEnv(originalEnv);
  });

  describe('Feature Flag Handling', () => {
    it('should return 501 when BFF reservations feature is disabled', async () => {
      // Disable feature flag
      process.env.NEXT_PUBLIC_BFF_RESERVATIONS = 'false';

      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data).toEqual({
        error: 'Reservations BFF not enabled',
        useDirectCall: true,
      });
    });
  });

  describe('Request Validation', () => {
    it('should return 400 when club_id is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          date: '2024-01-15',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'club_id and date are required',
      });
    });

    it('should return 400 when date is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: 'club_id and date are required',
      });
    });

    it('should accept optional parameters', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          court_ids: ['1', '2'],
          include_pricing: false,
          include_conflicts: false,
          time_range: { start: '09:00', end: '18:00' },
        },
      });

      // Mock successful auth
      mockDjangoEndpoint('/auth/profile/', djangoMocks.userProfile());

      const response = await POST(request);
      expect(response.status).not.toBe(400);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 when Bearer token is missing', async () => {
      const request = createMockRequest({
        method: 'POST',
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        error: 'Authentication required - Bearer token missing',
      });
    });

    it('should return 403 when user lacks access to club', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-2',
          date: '2024-01-15',
        },
      });

      // User has access to club-1 but not club-2
      mockDjangoEndpoint('/auth/profile/', djangoMocks.userProfile({
        club_memberships: [{
          club: { id: 'club-1', name: 'Club 1' },
          role: 'admin',
          is_active: true,
        }],
      }));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data).toEqual({
        error: 'Access denied to club',
      });
    });

    it('should validate role-based access', async () => {
      const validRoles = ['owner', 'admin', 'staff'];
      
      for (const role of validRoles) {
        jest.clearAllMocks();

        const request = createMockRequest({
          method: 'POST',
          headers: { authorization: 'Bearer valid-token' },
          body: {
            club_id: 'club-1',
            date: '2024-01-15',
          },
        });

        setupMockEndpoints([
          {
            endpoint: '/auth/profile/',
            response: djangoMocks.userProfile({
              club_memberships: [{
                club: { id: 'club-1', name: 'Club 1' },
                role,
                is_active: true,
              }],
            }),
          },
          {
            endpoint: '/clubs/club-1/courts/',
            response: djangoMocks.courts(),
          },
          {
            endpoint: '/reservations/reservations/check_availability/',
            response: djangoMocks.availability(),
            options: { method: 'POST' },
          },
          {
            endpoint: '/reservations/reservations/',
            response: djangoMocks.reservations(),
          },
          {
            endpoint: '/finance/pricing/club-1',
            response: djangoMocks.pricingRules(),
          },
          {
            endpoint: '/finance/promotions/club-1',
            response: djangoMocks.promotions(),
          },
          {
            endpoint: '/reservations/blocked-slots/',
            response: djangoMocks.blockedSlots(),
          },
        ]);

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Bulk Availability Check', () => {
    it('should check availability for multiple courts', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          court_ids: ['1', '2', '3'],
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: {
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
              {
                id: '3',
                name: 'Court 3',
                surface_type: 'clay',
                is_active: true,
                price_per_hour: '2200',
              },
            ],
          },
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: djangoMocks.reservations(),
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: djangoMocks.blockedSlots(),
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courts).toHaveLength(3);
      expect(data.courts[0].id).toBe('1');
      expect(data.courts[1].id).toBe('2');
      expect(data.courts[2].id).toBe('3');
    });

    it('should filter courts by provided court_ids', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          court_ids: ['2'], // Only court 2
        },
      });

      let capturedUrl: string = '';

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: djangoMocks.reservations(),
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: djangoMocks.blockedSlots(),
        },
      ]);

      // Custom mock to capture courts URL
      (global.fetch as jest.Mock).mockImplementationOnce(async (url) => {
        if (url.includes('/clubs/') && url.includes('/courts/')) {
          capturedUrl = url;
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [{
                id: '2',
                name: 'Court 2',
                surface_type: 'concrete',
                is_active: true,
                price_per_hour: '1800',
              }],
            }),
          };
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        };
      });

      const response = await POST(request);
      const data = await response.json();

      expect(capturedUrl).toContain('court_ids=2');
      expect(data.courts).toHaveLength(1);
      expect(data.courts[0].id).toBe('2');
    });
  });

  describe('Time Slot Generation', () => {
    it('should generate correct time slots based on club schedule', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          time_range: { start: '08:00', end: '20:00' },
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: { results: [] }, // No existing reservations
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] }, // No blocked slots
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Check time slots (90 minute slots from 08:00 to 20:00)
      const expectedSlots = [
        { start_time: '08:00', end_time: '09:30' },
        { start_time: '09:30', end_time: '11:00' },
        { start_time: '11:00', end_time: '12:30' },
        { start_time: '12:30', end_time: '14:00' },
        { start_time: '14:00', end_time: '15:30' },
        { start_time: '15:30', end_time: '17:00' },
        { start_time: '17:00', end_time: '18:30' },
        { start_time: '18:30', end_time: '20:00' },
      ];

      expect(data.courts[0].slots).toHaveLength(expectedSlots.length);
      data.courts[0].slots.forEach((slot: any, index: number) => {
        expect(slot.start_time).toBe(expectedSlots[index].start_time);
        expect(slot.end_time).toBe(expectedSlots[index].end_time);
      });
    });

    it('should respect custom time ranges', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          time_range: { start: '10:00', end: '14:00' },
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: { results: [] },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Should only have slots between 10:00 and 14:00
      const slots = data.courts[0].slots;
      expect(slots[0].start_time).toBe('10:00');
      expect(slots[slots.length - 1].end_time).toBe('14:00');
    });
  });

  describe('Pricing and Promotions', () => {
    it('should include pricing when include_pricing is true', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          include_pricing: true,
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: { results: [] },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: {
            pricing_rules: [
              { start_time: '08:00', end_time: '10:00', price: 1500 },
              { start_time: '17:00', end_time: '20:00', price: 2500 },
            ],
          },
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: {
            promotions: [
              {
                id: 'promo-1',
                name: 'Early Bird',
                discount_percent: 20,
                is_active: true,
                applies_to_time: true,
                start_time: '08:00',
                end_time: '10:00',
              },
            ],
          },
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Check early morning slot has discount
      const earlySlot = data.courts[0].slots.find((s: any) => s.start_time === '08:00');
      expect(earlySlot.price.amount).toBe(1200); // 1500 - 20%
      expect(earlySlot.promotion).toMatchObject({
        id: 'promo-1',
        name: 'Early Bird',
        discount_percent: 20,
        original_price: 1500,
      });

      // Check peak hour pricing
      const peakSlot = data.courts[0].slots.find((s: any) => s.start_time === '17:00');
      expect(peakSlot.price.amount).toBe(2500);
      expect(peakSlot.promotion).toBeUndefined();
    });

    it('should skip pricing when include_pricing is false', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          include_pricing: false,
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: { results: [] },
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Should not call pricing endpoints
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      const pricingCalls = fetchCalls.filter(call => 
        call[0].includes('/finance/pricing/') || call[0].includes('/finance/promotions/')
      );
      expect(pricingCalls).toHaveLength(0);

      // Should still have basic price from court
      const slot = data.courts[0].slots[0];
      expect(slot.price.amount).toBe(2000); // Court base price
      expect(slot.promotion).toBeUndefined();
    });

    it('should apply multiple pricing rules correctly', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          include_pricing: true,
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: {
            results: [{
              id: '1',
              name: 'Court 1',
              surface_type: 'artificial_grass',
              is_active: true,
              price_per_hour: '2000', // Base price
            }],
          },
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: { results: [] },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: {
            pricing_rules: [
              { start_time: '06:00', end_time: '09:00', price: 1000 }, // Early morning
              { start_time: '09:00', end_time: '17:00', price: 1500 }, // Regular hours
              { start_time: '17:00', end_time: '22:00', price: 2500 }, // Peak hours
            ],
          },
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: {
            promotions: [
              {
                id: 'happy-hour',
                name: 'Happy Hour',
                discount_percent: 30,
                is_active: true,
                applies_to_time: true,
                start_time: '14:00',
                end_time: '16:00',
              },
            ],
          },
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Check different pricing scenarios
      const slots = data.courts[0].slots;
      
      // Early morning (if in range)
      const earlySlot = slots.find((s: any) => s.start_time === '08:00');
      if (earlySlot) {
        expect(earlySlot.price.amount).toBe(1000);
      }

      // Happy hour slot should have discount
      const happyHourSlot = slots.find((s: any) => 
        s.start_time >= '14:00' && s.start_time < '16:00'
      );
      if (happyHourSlot) {
        expect(happyHourSlot.price.amount).toBe(1050); // 1500 - 30%
        expect(happyHourSlot.promotion.discount_percent).toBe(30);
      }

      // Peak hour
      const peakSlot = slots.find((s: any) => s.start_time === '17:00');
      if (peakSlot) {
        expect(peakSlot.price.amount).toBe(2500);
      }
    });
  });

  describe('Conflict Detection', () => {
    it('should detect conflicts with existing reservations', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          include_conflicts: true,
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: {
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
              {
                id: 'res-2',
                court: '1',
                date: '2024-01-15',
                start_time: '14:00',
                end_time: '15:30',
                status: 'pending',
                created_by_name: 'Jane Smith',
              },
            ],
          },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Find slots that should have conflicts
      const court1Slots = data.courts.find((c: any) => c.id === '1').slots;
      
      // 09:30-11:00 slot should conflict with 10:00-11:30 reservation
      const conflictingSlot1 = court1Slots.find((s: any) => 
        s.start_time === '09:30' && s.end_time === '11:00'
      );
      expect(conflictingSlot1.is_available).toBe(false);
      expect(conflictingSlot1.conflicts).toContainEqual({
        reservation_id: 'res-1',
        status: 'confirmed',
        client_name: 'John Doe',
      });

      // 14:00-15:30 slot should conflict
      const conflictingSlot2 = court1Slots.find((s: any) => 
        s.start_time === '14:00' && s.end_time === '15:30'
      );
      expect(conflictingSlot2.is_available).toBe(false);
      expect(conflictingSlot2.conflicts).toContainEqual({
        reservation_id: 'res-2',
        status: 'pending',
        client_name: 'Jane Smith',
      });

      // Non-conflicting slots should be available
      const availableSlot = court1Slots.find((s: any) => 
        s.start_time === '08:00' && s.end_time === '09:30'
      );
      expect(availableSlot.is_available).toBe(true);
      expect(availableSlot.conflicts).toHaveLength(0);
    });

    it('should skip conflict detection when include_conflicts is false', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          include_conflicts: false,
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: {
            results: [
              {
                id: 'res-1',
                court: '1',
                date: '2024-01-15',
                start_time: '10:00',
                end_time: '11:30',
                status: 'confirmed',
              },
            ],
          },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // All slots should show as available (conflicts not checked)
      const court1Slots = data.courts.find((c: any) => c.id === '1').slots;
      court1Slots.forEach((slot: any) => {
        expect(slot.conflicts).toHaveLength(0);
      });
    });

    it('should handle blocked slots correctly', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: { results: [] },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: {
            results: [
              {
                id: 'block-1',
                court: '1',
                start_datetime: '2024-01-15 12:00',
                end_datetime: '2024-01-15 14:00',
                reason: 'Court Maintenance',
              },
              {
                id: 'block-2',
                court: '2',
                start_datetime: '2024-01-15 08:00',
                end_datetime: '2024-01-15 10:00',
                reason: 'Private Event',
              },
            ],
          },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Check court 1 blocked slots
      const court1Slots = data.courts.find((c: any) => c.id === '1').slots;
      const blockedSlot1 = court1Slots.find((s: any) => 
        s.start_time === '12:30' && s.end_time === '14:00'
      );
      expect(blockedSlot1.is_available).toBe(false);
      expect(blockedSlot1.blocked_reason).toBe('Court Maintenance');

      // Check court 2 blocked slots
      const court2Slots = data.courts.find((c: any) => c.id === '2').slots;
      const blockedSlot2 = court2Slots.find((s: any) => 
        s.start_time === '08:00' && s.end_time === '09:30'
      );
      expect(blockedSlot2.is_available).toBe(false);
      expect(blockedSlot2.blocked_reason).toBe('Private Event');
    });
  });

  describe('Cache Behavior', () => {
    it('should cache availability data for 1 minute', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: djangoMocks.reservations(),
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: djangoMocks.blockedSlots(),
        },
      ]);

      // First request
      const response1 = await POST(request);
      expect(response1.headers.get('X-Cache')).toBe('MISS');
      expect(response1.headers.get('Cache-Control')).toBe('public, max-age=60');

      // Clear mocks to verify cache hit
      jest.clearAllMocks();

      // Second request (should hit cache)
      const response2 = await POST(request);
      expect(response2.headers.get('X-Cache')).toBe('HIT');
      
      // Should not call Django APIs again (except auth check)
      const fetchCalls = (global.fetch as jest.Mock).mock.calls;
      expect(fetchCalls.filter(call => !call[0].includes('/auth/profile/')).length).toBe(0);
    });

    it('should use different cache keys for different parameters', async () => {
      // Request 1: All courts
      const request1 = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      // Request 2: Specific courts
      const request2 = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
          court_ids: ['1', '2'],
        },
      });

      // Request 3: Different date
      const request3 = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-16',
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: djangoMocks.reservations(),
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: djangoMocks.blockedSlots(),
        },
      ]);

      const response1 = await POST(request1);
      expect(response1.headers.get('X-Cache')).toBe('MISS');

      const response2 = await POST(request2);
      expect(response2.headers.get('X-Cache')).toBe('MISS'); // Different cache key

      const response3 = await POST(request3);
      expect(response3.headers.get('X-Cache')).toBe('MISS'); // Different cache key

      // Original request should still be cached
      const response1Again = await POST(request1);
      expect(response1Again.headers.get('X-Cache')).toBe('HIT');
    });
  });

  describe('Summary Calculation', () => {
    it('should calculate correct summary statistics', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: {
            results: [
              { id: '1', name: 'Court 1', surface_type: 'grass', is_active: true, price_per_hour: '2000' },
              { id: '2', name: 'Court 2', surface_type: 'clay', is_active: true, price_per_hour: '1800' },
            ],
          },
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: {
            results: [
              // Court 1: 2 reservations
              { id: 'r1', court: '1', date: '2024-01-15', start_time: '09:00', end_time: '10:30', status: 'confirmed' },
              { id: 'r2', court: '1', date: '2024-01-15', start_time: '14:00', end_time: '15:30', status: 'confirmed' },
              // Court 2: 1 reservation
              { id: 'r3', court: '2', date: '2024-01-15', start_time: '11:00', end_time: '12:30', status: 'confirmed' },
            ],
          },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Calculate expected values
      const totalCourts = 2;
      const slotsPerCourt = 8; // 08:00-22:00 with 90min slots
      const totalSlots = totalCourts * slotsPerCourt;
      const occupiedSlots = 3; // 3 reservations
      const availableSlots = totalSlots - occupiedSlots;
      const occupancyRate = occupiedSlots / totalSlots;

      expect(data.summary).toMatchObject({
        total_slots: totalSlots,
        available_slots: availableSlots,
        occupancy_rate: Math.round(occupancyRate * 100) / 100,
        peak_hours: expect.any(Array),
      });
    });

    it('should identify peak hours correctly', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: {
            results: [
              // Many reservations at 17:00
              { id: 'r1', court: '1', date: '2024-01-15', start_time: '17:00', end_time: '18:30', status: 'confirmed' },
              { id: 'r2', court: '2', date: '2024-01-15', start_time: '17:00', end_time: '18:30', status: 'confirmed' },
              // Some at 18:30
              { id: 'r3', court: '1', date: '2024-01-15', start_time: '18:30', end_time: '20:00', status: 'confirmed' },
              // Few at other times
              { id: 'r4', court: '2', date: '2024-01-15', start_time: '09:00', end_time: '10:30', status: 'confirmed' },
            ],
          },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: { results: [] },
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      // Peak hours should include 17:00 (most occupied)
      expect(data.summary.peak_hours).toContain('17:00');
      expect(data.summary.peak_hours.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Performance', () => {
    it('should respond within 200ms', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      const tracker = new PerformanceTracker();

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
          options: { delay: 20 },
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
          options: { delay: 30 },
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST', delay: 30 },
        },
        {
          endpoint: '/reservations/reservations/',
          response: djangoMocks.reservations(),
          options: { delay: 30 },
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
          options: { delay: 20 },
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
          options: { delay: 20 },
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: djangoMocks.blockedSlots(),
          options: { delay: 20 },
        },
      ]);

      tracker.start();
      await POST(request);
      tracker.end();

      expect(tracker.getDuration()).toBeLessThan(200);
    });

    it('should make parallel API calls for optimal performance', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      const callTimestamps: Record<string, number> = {};

      (global.fetch as jest.Mock).mockImplementation(async (url) => {
        callTimestamps[url] = Date.now();
        
        // Simulate API latency
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (url.includes('/auth/profile/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.userProfile(),
          };
        }
        
        if (url.includes('/clubs/') && url.includes('/courts/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.courts(),
          };
        }
        
        if (url.includes('/check_availability/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.availability(),
          };
        }
        
        if (url.includes('/reservations/reservations/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.reservations(),
          };
        }
        
        if (url.includes('/finance/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ pricing_rules: [], promotions: [] }),
          };
        }
        
        if (url.includes('/blocked-slots/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ results: [] }),
          };
        }
        
        return {
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        };
      });

      await POST(request);

      // Extract timestamps for parallel calls (after auth)
      const parallelCalls = Object.entries(callTimestamps)
        .filter(([url]) => !url.includes('/auth/profile/'))
        .map(([_, timestamp]) => timestamp);

      if (parallelCalls.length > 1) {
        const minTime = Math.min(...parallelCalls);
        const maxTime = Math.max(...parallelCalls);
        
        // All parallel calls should start within 100ms of each other
        expect(maxTime - minTime).toBeLessThan(100);
      }
    });

    it('should include performance headers', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: {
            results: [
              { id: '1', name: 'Court 1', surface_type: 'grass', is_active: true },
              { id: '2', name: 'Court 2', surface_type: 'clay', is_active: true },
              { id: '3', name: 'Court 3', surface_type: 'hard', is_active: true },
            ],
          },
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: djangoMocks.reservations(),
        },
        {
          endpoint: '/finance/pricing/club-1',
          response: djangoMocks.pricingRules(),
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: djangoMocks.promotions(),
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: djangoMocks.blockedSlots(),
        },
      ]);

      const response = await POST(request);

      expect(response.headers.get('X-Courts-Count')).toBe('3');
      expect(response.headers.get('X-Total-Slots')).toBeDefined();
      expect(response.headers.get('X-Available-Slots')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should return fallback response when all Django calls fail', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      // All endpoints fail after auth
      (global.fetch as jest.Mock).mockImplementation(async (url) => {
        if (url.includes('/auth/profile/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.userProfile(),
          };
        }
        
        throw new Error('Network error');
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Fallback')).toBe('true');
      expect(response.headers.get('X-Error')).toBe('BFF Error - Fallback Response');
      
      // Should return empty but valid structure
      expect(data).toMatchObject({
        date: '2024-01-15',
        club_id: 'club-1',
        courts: [],
        summary: {
          total_slots: 0,
          available_slots: 0,
          occupancy_rate: 0,
          peak_hours: [],
        },
      });
    });

    it('should handle partial endpoint failures gracefully', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-1',
          date: '2024-01-15',
        },
      });

      setupMockEndpoints([
        {
          endpoint: '/auth/profile/',
          response: djangoMocks.userProfile(),
        },
        {
          endpoint: '/clubs/club-1/courts/',
          response: djangoMocks.courts(),
        },
        {
          endpoint: '/reservations/reservations/check_availability/',
          response: djangoMocks.availability(),
          options: { method: 'POST' },
        },
        {
          endpoint: '/reservations/reservations/',
          response: djangoMocks.reservations(),
        },
        // Pricing endpoints fail
        {
          endpoint: '/finance/pricing/club-1',
          response: { error: 'Service unavailable' },
          options: { status: 503 },
        },
        {
          endpoint: '/finance/promotions/club-1',
          response: { error: 'Service unavailable' },
          options: { status: 503 },
        },
        {
          endpoint: '/reservations/blocked-slots/',
          response: djangoMocks.blockedSlots(),
        },
      ]);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should have court data with basic pricing
      expect(data.courts.length).toBeGreaterThan(0);
      data.courts[0].slots.forEach((slot: any) => {
        expect(slot.price).toBeDefined();
        expect(slot.promotion).toBeUndefined(); // No promotions due to failure
      });
    });

    it('should handle malformed request body', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: 'not-json',
      });

      const response = await POST(request);
      
      // Should handle JSON parse error
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Multi-tenant Security', () => {
    it('should enforce club access restrictions', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-unauthorized',
          date: '2024-01-15',
        },
      });

      mockDjangoEndpoint('/auth/profile/', djangoMocks.userProfile({
        club_memberships: [
          {
            club: { id: 'club-1', name: 'Authorized Club' },
            role: 'admin',
            is_active: true,
          },
          {
            club: { id: 'club-2', name: 'Another Club' },
            role: 'viewer', // Not sufficient role
            is_active: true,
          },
        ],
      }));

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied to club');
    });

    it('should filter data by club in all API calls', async () => {
      const request = createMockRequest({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          club_id: 'club-123',
          date: '2024-01-15',
        },
      });

      const capturedUrls: string[] = [];

      (global.fetch as jest.Mock).mockImplementation(async (url) => {
        capturedUrls.push(url);
        
        if (url.includes('/auth/profile/')) {
          return {
            ok: true,
            status: 200,
            json: async () => djangoMocks.userProfile({
              club_memberships: [{
                club: { id: 'club-123', name: 'Test Club' },
                role: 'admin',
                is_active: true,
              }],
            }),
          };
        }
        
        return {
          ok: true,
          status: 200,
          json: async () => ({ results: [] }),
        };
      });

      await POST(request);

      // Verify all URLs include the correct club ID
      const clubFilteredUrls = capturedUrls.filter(url => 
        url.includes('club=') || url.includes('club-123') || url.includes('club/')
      );

      clubFilteredUrls.forEach(url => {
        expect(url).toContain('club-123');
      });
    });
  });
});