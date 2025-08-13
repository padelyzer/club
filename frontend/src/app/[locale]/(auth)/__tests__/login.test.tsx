import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
const vi = {
  fn: jest.fn,
  mocked: jest.mocked,
  clearAllMocks: jest.clearAllMocks,
  resetAllMocks: jest.resetAllMocks,
  spyOn: jest.spyOn,
};
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage from '../login/page';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/lib/toast';
import { ClubsService } from '@/lib/api/services/clubs.service';
import { BFF_FEATURES } from '@/lib/feature-flags';

// Mock dependencies
vi.mock('next/navigation');
vi.mock('@/lib/api/hooks/useAuth');
vi.mock('@/store/auth');
vi.mock('@/lib/toast');
vi.mock('@/lib/api/services/clubs.service');
vi.mock('@/lib/feature-flags', () => ({
  BFF_FEATURES: { auth: false }
}));

// Mock fetch for BFF requests
global.fetch = vi.fn();

describe('Login Page - B2B System', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
  };

  const mockLogin = vi.fn();
  const mockSetAuthState = vi.fn();
  const mockRecordLoginAttempt = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup router mock
    (useRouter as any).mockReturnValue(mockRouter);
    
    // Setup auth hook mock
    (useAuth as any).mockReturnValue({
      login: mockLogin,
    });
    
    // Setup auth store mock
    (useAuthStore as any).mockReturnValue({
      login: mockSetAuthState,
      isLocked: () => false,
      loginAttempts: 0,
    });
    
    (useAuthStore.getState as any) = vi.fn().mockReturnValue({
      recordLoginAttempt: mockRecordLoginAttempt,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('ROOT User Login (Superadmin)', () => {
    it('should redirect superuser to ROOT module', async () => {
      const user = userEvent.setup();
      
      // Mock successful login response for superuser
      const mockResponse = {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          id: '1',
          email: 'admin@padelyzer.com',
          first_name: 'Super',
          last_name: 'Admin',
          is_superuser: true,
          is_staff: true,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };
      
      mockLogin.mockResolvedValueOnce(mockResponse);
      
      render(<LoginPage />);
      
      // Fill in login form
      await user.type(screen.getByLabelText(/email/i), 'admin@padelyzer.com');
      await user.type(screen.getByLabelText(/password/i), 'superpassword');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);
      
      // Wait for async operations
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'admin@padelyzer.com',
          password: 'superpassword',
        });
        
        expect(mockSetAuthState).toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith('/es/root');
        expect(toast.success).toHaveBeenCalledWith('Welcome back!');
      });
    });

    it('should redirect staff user to ROOT module', async () => {
      const user = userEvent.setup();
      
      const mockResponse = {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          id: '2',
          email: 'staff@padelyzer.com',
          first_name: 'Staff',
          last_name: 'User',
          is_superuser: false,
          is_staff: true,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };
      
      mockLogin.mockResolvedValueOnce(mockResponse);
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), 'staff@padelyzer.com');
      await user.type(screen.getByLabelText(/password/i), 'staffpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/es/root');
      });
    });
  });

  describe('Club Owner Login', () => {
    it('should redirect club owner to their club module', async () => {
      const user = userEvent.setup();
      
      const mockResponse = {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          id: '3',
          email: 'owner@clubpadel.com',
          first_name: 'Club',
          last_name: 'Owner',
          is_superuser: false,
          is_staff: false,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };
      
      const mockClubResponse = {
        results: [{
          id: 'club-123',
          name: 'Club Padel Madrid',
          slug: 'club-padel-madrid',
          is_active: true,
        }],
      };
      
      mockLogin.mockResolvedValueOnce(mockResponse);
      (ClubsService.getUserClubs as any).mockResolvedValueOnce(mockClubResponse);
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), 'owner@clubpadel.com');
      await user.type(screen.getByLabelText(/password/i), 'clubpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
        expect(ClubsService.getUserClubs).toHaveBeenCalled();
        expect(mockRouter.push).toHaveBeenCalledWith('/es/club-padel-madrid');
      });
    });

    it('should handle club owner with multiple clubs (use first)', async () => {
      const user = userEvent.setup();
      
      const mockResponse = {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          id: '4',
          email: 'multiowner@clubpadel.com',
          first_name: 'Multi',
          last_name: 'Owner',
          is_superuser: false,
          is_staff: false,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };
      
      const mockClubResponse = {
        results: [
          {
            id: 'club-1',
            name: 'Club Padel Barcelona',
            slug: 'club-padel-barcelona',
            is_active: true,
          },
          {
            id: 'club-2',
            name: 'Club Padel Valencia',
            slug: 'club-padel-valencia',
            is_active: true,
          },
        ],
      };
      
      mockLogin.mockResolvedValueOnce(mockResponse);
      (ClubsService.getUserClubs as any).mockResolvedValueOnce(mockClubResponse);
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), 'multiowner@clubpadel.com');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/es/club-padel-barcelona');
      });
    });

    it('should redirect to dashboard if no club assigned', async () => {
      const user = userEvent.setup();
      
      const mockResponse = {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          id: '5',
          email: 'noclub@padelyzer.com',
          first_name: 'No',
          last_name: 'Club',
          is_superuser: false,
          is_staff: false,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };
      
      const mockClubResponse = {
        results: [],
      };
      
      mockLogin.mockResolvedValueOnce(mockResponse);
      (ClubsService.getUserClubs as any).mockResolvedValueOnce(mockClubResponse);
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), 'noclub@padelyzer.com');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/es/dashboard');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle login failure', async () => {
      const user = userEvent.setup();
      
      mockLogin.mockRejectedValueOnce({
        response: {
          data: {
            detail: 'Invalid credentials',
          },
        },
      });
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), 'bad@email.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
        expect(mockRecordLoginAttempt).toHaveBeenCalled();
        expect(mockRouter.push).not.toHaveBeenCalled();
      });
    });

    it('should handle club fetch failure gracefully', async () => {
      const user = userEvent.setup();
      
      const mockResponse = {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          id: '6',
          email: 'error@clubpadel.com',
          first_name: 'Error',
          last_name: 'User',
          is_superuser: false,
          is_staff: false,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };
      
      mockLogin.mockResolvedValueOnce(mockResponse);
      (ClubsService.getUserClubs as any).mockRejectedValueOnce(new Error('Network error'));
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), 'error@clubpadel.com');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/es/dashboard');
      });
    });

    it('should prevent login when account is locked', async () => {
      const user = userEvent.setup();
      
      (useAuthStore as any).mockReturnValue({
        login: mockSetAuthState,
        isLocked: () => true,
        loginAttempts: 5,
      });
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), 'locked@email.com');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Account is temporarily locked due to multiple failed login attempts. Please try again later.'
        );
        expect(mockLogin).not.toHaveBeenCalled();
      });
    });
  });

  describe('2FA Flow', () => {
    it('should handle 2FA requirement and redirect correctly', async () => {
      const user = userEvent.setup();
      
      const mockResponse = {
        requires_2fa: true,
        message: 'Verification code sent',
        location_info: {
          city: 'Madrid',
          country: 'Spain',
        },
      };
      
      mockLogin.mockResolvedValueOnce(mockResponse);
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), '2fa@padelyzer.com');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith('Verification code sent');
        // Should show 2FA modal
        expect(screen.getByText(/two.*factor/i)).toBeInTheDocument();
      });
    });
  });

  describe('BFF Integration', () => {
    it('should use BFF endpoint when enabled', async () => {
      // Mock BFF enabled
      (BFF_FEATURES as any).auth = true;
      
      const user = userEvent.setup();
      
      const mockResponse = {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token',
        user: {
          id: '7',
          email: 'bff@clubpadel.com',
          first_name: 'BFF',
          last_name: 'User',
          is_superuser: false,
          is_staff: false,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      };
      
      const mockBFFContext = {
        clubs: [{
          id: 'bff-club',
          name: 'BFF Club',
          role: 'owner',
          permissions: ['manage_club'],
        }],
      };
      
      const mockClubDetail = {
        id: 'bff-club',
        name: 'BFF Club',
        slug: 'bff-club',
        is_active: true,
      };
      
      mockLogin.mockResolvedValueOnce(mockResponse);
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBFFContext,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockClubDetail,
        });
      
      render(<LoginPage />);
      
      await user.type(screen.getByLabelText(/email/i), 'bff@clubpadel.com');
      await user.type(screen.getByLabelText(/password/i), 'password');
      await user.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/context', expect.any(Object));
        expect(mockRouter.push).toHaveBeenCalledWith('/es/bff-club');
      });
      
      // Reset BFF flag
      (BFF_FEATURES as any).auth = false;
    });
  });
});