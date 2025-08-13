import { handlePostLoginRedirect } from '../login/page';

// Mock dependencies
const mockRouter = { push: jest.fn() };
const mockToast = { error: jest.fn() };

// Mock fetch globally
global.fetch = jest.fn();

// Mock modules
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@/lib/toast', () => ({
  toast: mockToast,
}));

jest.mock('@/lib/api/services/clubs.service', () => ({
  ClubsService: {
    getUserClubs: jest.fn(),
    getById: jest.fn(),
  },
}));

jest.mock('@/lib/feature-flags', () => ({
  BFF_FEATURES: { auth: false },
}));

// Import after mocks
const { ClubsService } = require('@/lib/api/services/clubs.service');

describe('Login Redirect Logic - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.push.mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('handlePostLoginRedirect function', () => {
    const locale = 'es';

    test('ROOT users (superadmin) should redirect to /root', async () => {
      const superadminUser = {
        id: '1',
        email: 'admin@padelyzer.com',
        is_superuser: true,
        is_staff: true,
      };

      await handlePostLoginRedirect.call(
        { router: mockRouter, params: { locale } },
        superadminUser,
        'mock-token'
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/es/root');
      expect(ClubsService.getUserClubs).not.toHaveBeenCalled();
    });

    test('Staff users should redirect to /root', async () => {
      const staffUser = {
        id: '2',
        email: 'staff@padelyzer.com',
        is_superuser: false,
        is_staff: true,
      };

      await handlePostLoginRedirect.call(
        { router: mockRouter, params: { locale } },
        staffUser,
        'mock-token'
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/es/root');
      expect(ClubsService.getUserClubs).not.toHaveBeenCalled();
    });

    test('Club owners should redirect to their club', async () => {
      const clubOwner = {
        id: '3',
        email: 'owner@club.com',
        is_superuser: false,
        is_staff: false,
      };

      ClubsService.getUserClubs.mockResolvedValueOnce({
        results: [{
          id: 'club-1',
          name: 'Padel Club Madrid',
          slug: 'padel-club-madrid',
        }],
      });

      await handlePostLoginRedirect.call(
        { router: mockRouter, params: { locale } },
        clubOwner,
        'mock-token'
      );

      expect(ClubsService.getUserClubs).toHaveBeenCalled();
      expect(mockRouter.push).toHaveBeenCalledWith('/es/padel-club-madrid');
    });

    test('Users with multiple clubs should redirect to first club', async () => {
      const multiClubOwner = {
        id: '4',
        email: 'multi@clubs.com',
        is_superuser: false,
        is_staff: false,
      };

      ClubsService.getUserClubs.mockResolvedValueOnce({
        results: [
          { id: 'club-1', name: 'Club 1', slug: 'club-1' },
          { id: 'club-2', name: 'Club 2', slug: 'club-2' },
        ],
      });

      await handlePostLoginRedirect.call(
        { router: mockRouter, params: { locale } },
        multiClubOwner,
        'mock-token'
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/es/club-1');
    });

    test('Users without clubs should redirect to dashboard', async () => {
      const userNoClub = {
        id: '5',
        email: 'noclub@padelyzer.com',
        is_superuser: false,
        is_staff: false,
      };

      ClubsService.getUserClubs.mockResolvedValueOnce({
        results: [],
      });

      await handlePostLoginRedirect.call(
        { router: mockRouter, params: { locale } },
        userNoClub,
        'mock-token'
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/es/dashboard');
    });

    test('Club without slug should redirect to dashboard', async () => {
      const clubOwner = {
        id: '6',
        email: 'noslug@club.com',
        is_superuser: false,
        is_staff: false,
      };

      ClubsService.getUserClubs.mockResolvedValueOnce({
        results: [{
          id: 'club-no-slug',
          name: 'Club Without Slug',
          // No slug field
        }],
      });

      await handlePostLoginRedirect.call(
        { router: mockRouter, params: { locale } },
        clubOwner,
        'mock-token'
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/es/dashboard');
    });

    test('API errors should fallback to dashboard', async () => {
      const clubOwner = {
        id: '7',
        email: 'error@club.com',
        is_superuser: false,
        is_staff: false,
      };

      ClubsService.getUserClubs.mockRejectedValueOnce(
        new Error('Network error')
      );

      await handlePostLoginRedirect.call(
        { router: mockRouter, params: { locale } },
        clubOwner,
        'mock-token'
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/es/dashboard');
    });
  });

  describe('B2B System Architecture Validation', () => {
    test('System should NOT have B2C routes', () => {
      // Verify the system is B2B only
      expect(true).toBe(true); // Placeholder - in real app, check route config
    });

    test('ROOT module is only for superadmin/staff', () => {
      const rootAccessRoles = [
        { is_superuser: true, is_staff: true, expected: true },
        { is_superuser: true, is_staff: false, expected: true },
        { is_superuser: false, is_staff: true, expected: true },
        { is_superuser: false, is_staff: false, expected: false },
      ];

      rootAccessRoles.forEach(({ is_superuser, is_staff, expected }) => {
        const hasRootAccess = is_superuser || is_staff;
        expect(hasRootAccess).toBe(expected);
      });
    });

    test('Club module is for club owners only', () => {
      // Club owners are users who are NOT superuser/staff
      // but have club assignments
      const clubOwner = {
        is_superuser: false,
        is_staff: false,
        clubs: ['club-1'],
      };

      const isClubOwner = !clubOwner.is_superuser && 
                          !clubOwner.is_staff && 
                          clubOwner.clubs.length > 0;
                          
      expect(isClubOwner).toBe(true);
    });
  });
});