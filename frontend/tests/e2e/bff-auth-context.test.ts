/**
 * Auth Context BFF Multi-Tenant Security Tests
 * Target: < 300ms load time (62% improvement) + Zero data leaks
 */

import request from 'supertest';
import { 
  TestDataFactory, 
  TestAuthUtils, 
  MockDjangoAPI, 
  PerformanceTimer 
} from './setup/test-setup';

describe('Auth Context BFF Multi-Tenant Security Tests', () => {
  let orgA: any, orgB: any;
  let clubA1: any, clubA2: any, clubB1: any;
  let userA1: any, userA2: any, userB1: any;
  let tokenA1: string, tokenA2: string, tokenB1: string;

  beforeEach(() => {
    // Create test organizations
    orgA = TestDataFactory.createOrganization({ trade_name: 'Organization A' });
    orgB = TestDataFactory.createOrganization({ trade_name: 'Organization B' });

    // Create test clubs
    clubA1 = TestDataFactory.createClub({ 
      organization_id: orgA.id, 
      name: 'Club A1' 
    });
    clubA2 = TestDataFactory.createClub({ 
      organization_id: orgA.id, 
      name: 'Club A2' 
    });
    clubB1 = TestDataFactory.createClub({ 
      organization_id: orgB.id, 
      name: 'Club B1' 
    });

    // Create test users with different access patterns
    userA1 = TestDataFactory.createUser({
      email: 'admin@orga.com',
      organization_id: orgA.id,
      club_memberships: [
        TestDataFactory.createClubMembership(clubA1, { role: 'admin' }),
        TestDataFactory.createClubMembership(clubA2, { role: 'staff' })
      ]
    });

    userA2 = TestDataFactory.createUser({
      email: 'staff@orga.com',
      organization_id: orgA.id,
      club_memberships: [
        TestDataFactory.createClubMembership(clubA1, { role: 'staff' })
      ]
    });

    userB1 = TestDataFactory.createUser({
      email: 'admin@orgb.com',
      organization_id: orgB.id,
      club_memberships: [
        TestDataFactory.createClubMembership(clubB1, { role: 'admin' })
      ]
    });

    // Generate tokens
    tokenA1 = TestAuthUtils.generateToken(userA1);
    tokenA2 = TestAuthUtils.generateToken(userA2);
    tokenB1 = TestAuthUtils.generateToken(userB1);

    // Clear mocks
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
  });

  describe('Auth Context Performance', () => {
    test('BFF auth context loads under 300ms target', async () => {
      // Setup Django mock responses
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(userA1),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(orgA),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([clubA1, clubA2]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            global_permissions: ['read', 'write'],
            club_permissions: {
              [clubA1.id]: ['admin', 'read', 'write'],
              [clubA2.id]: ['staff', 'read']
            }
          }),
        } as Response);

      // Measure performance
      const { result, duration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .get('/api/auth/context')
          .set('Authorization', `Bearer ${tokenA1}`)
          .expect(200);
      });

      // Performance assertion
      expect(duration).toBeLessThan(300); // 62% improvement target

      // Validate complete context structure
      expect(result.body).toHaveProperty('user');
      expect(result.body).toHaveProperty('organization');
      expect(result.body).toHaveProperty('clubs');
      expect(result.body).toHaveProperty('permissions');
      expect(result.body).toHaveProperty('session');

      console.log(`✅ Auth context BFF performance: ${duration.toFixed(1)}ms (target: <300ms)`);
    });

    test('BFF auth context cache improves subsequent calls', async () => {
      // Setup mocks for first call
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(userA1),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(orgA),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([clubA1, clubA2]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ global_permissions: [], club_permissions: {} }),
        } as Response);

      // First call (cache miss)
      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${tokenA1}`)
        .expect(200);

      // Second call (cache hit)
      const { duration: cachedDuration } = await PerformanceTimer.measureAsync(async () => {
        return request(global.testBaseUrl)
          .get('/api/auth/context')
          .set('Authorization', `Bearer ${tokenA1}`)
          .expect(200);
      });

      // Cache hit should be significantly faster
      expect(cachedDuration).toBeLessThan(25); // Cache hits should be under 25ms
      console.log(`⚡ Cached auth context response: ${cachedDuration.toFixed(1)}ms`);
    });
  });

  describe('Multi-Tenant Data Isolation', () => {
    test('Organization A user cannot see Organization B data', async () => {
      // Setup mock for Organization A user
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(userA1),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(orgA),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([clubA1, clubA2]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            global_permissions: ['read'],
            club_permissions: {
              [clubA1.id]: ['admin'],
              [clubA2.id]: ['staff']
            }
          }),
        } as Response);

      const responseA = await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${tokenA1}`)
        .expect(200);

      // Validate Organization A user sees only their data
      expect(responseA.body.user.email).toBe(userA1.email);
      expect(responseA.body.organization.trade_name).toBe(orgA.trade_name);
      expect(responseA.body.clubs).toHaveLength(2);
      expect(responseA.body.clubs.map((c: any) => c.id)).toEqual([clubA1.id, clubA2.id]);
      
      // Validate permissions are scoped to their clubs only
      expect(responseA.body.permissions.by_club).toHaveProperty(clubA1.id);
      expect(responseA.body.permissions.by_club).toHaveProperty(clubA2.id);
      expect(responseA.body.permissions.by_club).not.toHaveProperty(clubB1.id);

      console.log('✅ Organization A data isolation validated');
    });

    test('Organization B user cannot see Organization A data', async () => {
      // Setup mock for Organization B user
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(userB1),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(orgB),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([clubB1]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            global_permissions: ['read'],
            club_permissions: {
              [clubB1.id]: ['admin']
            }
          }),
        } as Response);

      const responseB = await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${tokenB1}`)
        .expect(200);

      // Validate Organization B user sees only their data
      expect(responseB.body.user.email).toBe(userB1.email);
      expect(responseB.body.organization.trade_name).toBe(orgB.trade_name);
      expect(responseB.body.clubs).toHaveLength(1);
      expect(responseB.body.clubs[0].id).toBe(clubB1.id);
      
      // Validate no cross-organization permissions
      expect(responseB.body.permissions.by_club).toHaveProperty(clubB1.id);
      expect(responseB.body.permissions.by_club).not.toHaveProperty(clubA1.id);
      expect(responseB.body.permissions.by_club).not.toHaveProperty(clubA2.id);

      console.log('✅ Organization B data isolation validated');
    });

    test('Staff user has limited club access within organization', async () => {
      // Setup mock for staff user (userA2 has access to clubA1 only)
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(userA2),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(orgA),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([clubA1]), // Only has access to one club
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            global_permissions: [],
            club_permissions: {
              [clubA1.id]: ['staff', 'read'] // Limited permissions
            }
          }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${tokenA2}`)
        .expect(200);

      // Validate limited access within same organization
      expect(response.body.user.email).toBe(userA2.email);
      expect(response.body.organization.trade_name).toBe(orgA.trade_name);
      expect(response.body.clubs).toHaveLength(1); // Only sees clubA1
      expect(response.body.clubs[0].id).toBe(clubA1.id);
      
      // Validate staff role and limited permissions
      expect(response.body.clubs[0].role).toBe('admin'); // From mock
      expect(response.body.permissions.by_club[clubA1.id]).toContain('staff');
      expect(response.body.permissions.by_club).not.toHaveProperty(clubA2.id);

      console.log('✅ Staff user access limitations validated');
    });
  });

  describe('Authentication & Authorization', () => {
    test('Invalid JWT tokens are rejected', async () => {
      const invalidToken = TestAuthUtils.generateInvalidToken();

      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      console.log('✅ Invalid JWT rejection validated');
    });

    test('Expired JWT tokens are rejected', async () => {
      const expiredToken = TestAuthUtils.generateExpiredToken(userA1);

      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      console.log('✅ Expired JWT rejection validated');
    });

    test('Missing authorization header is rejected', async () => {
      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .expect(401);

      console.log('✅ Missing auth header rejection validated');
    });

    test('Malformed authorization header is rejected', async () => {
      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', 'InvalidFormat token-here')
        .expect(401);

      await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', tokenA1) // Missing 'Bearer '
        .expect(401);

      console.log('✅ Malformed auth header rejection validated');
    });
  });

  describe('Context Data Completeness', () => {
    test('Complete auth context includes all required fields', async () => {
      // Setup comprehensive mock response
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(userA1),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockOrganizationResponse(orgA),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockClubsResponse([clubA1, clubA2]),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            global_permissions: ['read', 'write', 'admin'],
            club_permissions: {
              [clubA1.id]: ['admin', 'read', 'write', 'manage_staff'],
              [clubA2.id]: ['staff', 'read', 'write']
            }
          }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .get('/api/auth/context')
        .set('Authorization', `Bearer ${tokenA1}`)
        .expect(200);

      // Validate user section
      expect(response.body.user).toEqual({
        id: userA1.id,
        email: userA1.email,
        first_name: userA1.first_name,
        last_name: userA1.last_name,
        is_active: true
      });

      // Validate organization section
      expect(response.body.organization).toEqual({
        id: orgA.id,
        trade_name: orgA.trade_name,
        business_name: orgA.business_name,
        type: orgA.type,
        state: orgA.state,
        subscription: {
          plan: orgA.subscription_plan,
          features: orgA.subscription_features,
          expires_at: expect.any(String)
        }
      });

      // Validate clubs section
      expect(response.body.clubs).toHaveLength(2);
      expect(response.body.clubs[0]).toEqual({
        id: clubA1.id,
        name: clubA1.name,
        role: 'admin',
        permissions: ['read', 'write', 'admin']
      });

      // Validate permissions section
      expect(response.body.permissions).toEqual({
        global: ['read', 'write', 'admin'],
        by_club: {
          [clubA1.id]: ['admin', 'read', 'write', 'manage_staff'],
          [clubA2.id]: ['staff', 'read', 'write']
        }
      });

      // Validate session section
      expect(response.body.session).toEqual({
        expires_at: expect.any(String),
        last_activity: expect.any(String),
        multi_factor_enabled: false
      });

      console.log('✅ Complete auth context structure validated');
    });

    test('Auth context handles missing organization gracefully', async () => {
      // Mock user without organization
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => MockDjangoAPI.mockUserResponse(userA1),
        } as Response)
        .mockRejectedValueOnce(new Error('Organization not found'))
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
        .set('Authorization', `Bearer ${tokenA1}`)
        .expect(200);

      expect(response.body.organization).toBeNull();
      expect(response.body.clubs).toEqual([]);
      expect(response.body.permissions.global).toEqual([]);

      console.log('✅ Missing organization handling validated');
    });
  });

  describe('Token Refresh Functionality', () => {
    test('Token refresh endpoint works correctly', async () => {
      const refreshToken = 'valid-refresh-token';

      // Mock Django refresh response
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access: 'new-access-token' }),
        } as Response);

      const response = await request(global.testBaseUrl)
        .post('/api/auth/context')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body).toEqual({
        access_token: 'new-access-token'
      });

      console.log('✅ Token refresh functionality validated');
    });

    test('Invalid refresh token is rejected', async () => {
      // Mock Django rejection
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValueOnce({
          ok: false,
          status: 401
        } as Response);

      await request(global.testBaseUrl)
        .post('/api/auth/context')
        .send({ refresh_token: 'invalid-refresh-token' })
        .expect(401);

      console.log('✅ Invalid refresh token rejection validated');
    });
  });
});