import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import LoginPage, { } from '../login/page';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useAuthStore } from '@/store/auth';
import { ClubsService } from '@/lib/api/services/clubs.service';
import { RedirectHandler } from '@/lib/auth/redirect-handler';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn().mockReturnValue({ locale: 'es' }),
}));

// Mock auth hooks and services
jest.mock('@/lib/api/hooks/useAuth');
jest.mock('@/store/auth');
jest.mock('@/lib/api/services/clubs.service', () => ({
  ClubsService: {
    getUserClubs: jest.fn(),
    getById: jest.fn(),
  },
}));
jest.mock('@/lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock components that might cause issues
jest.mock('@/components/auth/two-factor-modal', () => ({
  TwoFactorModal: () => null,
}));

// Mock fetch for BFF
global.fetch = jest.fn();

describe('Login Page - Simplified Redirect Logic', () => {
  const mockPush = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup router mock
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    // Setup auth mock
    (useAuth as jest.Mock).mockReturnValue({
      login: mockLogin,
    });
    
    // Setup auth store mock
    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      login: jest.fn(),
      isLocked: () => false,
      loginAttempts: 0,
    });
    
    (useAuthStore as any).getState = jest.fn().mockReturnValue({
      recordLoginAttempt: jest.fn(),
    });
  });

  test('ROOT users (superadmin/staff) redirect to /root immediately', async () => {
    const user = userEvent.setup();
    
    // Mock successful ROOT user login
    mockLogin.mockResolvedValueOnce({
      access: 'token',
      refresh: 'refresh',
      user: {
        id: '1',
        email: 'admin@padelyzer.com',
        is_superuser: true,
        is_staff: true,
        is_active: true,
        role: 'ADMIN',
      },
    });
    
    render(<LoginPage />);
    
    // Login
    await user.type(screen.getByLabelText(/email/i), 'admin@padelyzer.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    
    // Verify immediate redirect without waiting for clubs
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/root');
      expect(ClubsService.getUserClubs).not.toHaveBeenCalled();
    });
  });

  test('ADMIN users redirect to clubs management immediately', async () => {
    const user = userEvent.setup();
    
    // Mock admin login
    mockLogin.mockResolvedValueOnce({
      access: 'token',
      refresh: 'refresh',
      user: {
        id: '2',
        email: 'admin@club.com',
        is_superuser: false,
        is_staff: false,
        is_active: true,
        role: 'ADMIN',
      },
    });
    
    render(<LoginPage />);
    
    // Login
    await user.type(screen.getByLabelText(/email/i), 'admin@club.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    
    // Verify immediate redirect to clubs management
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/clubs');
    });
  });

  test('CLIENT users with club redirect to reservations', async () => {
    const user = userEvent.setup();
    
    // Mock client with club
    mockLogin.mockResolvedValueOnce({
      access: 'token',
      refresh: 'refresh',
      user: {
        id: '3',
        email: 'client@padelyzer.com',
        is_superuser: false,
        is_staff: false,
        is_active: true,
        role: 'CLIENT',
        current_club_slug: 'test-club',
      },
    });
    
    render(<LoginPage />);
    
    // Login
    await user.type(screen.getByLabelText(/email/i), 'client@padelyzer.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    
    // Verify redirect to reservations
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/test-club/reservations');
    });
  });

  test('Uses stored club preference when available', async () => {
    const user = userEvent.setup();
    
    // Set stored preference
    localStorage.setItem('preferredClubSlug', 'preferred-club');
    
    // Mock any user login
    mockLogin.mockResolvedValueOnce({
      access: 'token',
      refresh: 'refresh',
      user: {
        id: '4',
        email: 'user@club.com',
        is_superuser: false,
        is_staff: false,
        is_active: true,
        role: 'EMPLOYEE',
      },
    });
    
    render(<LoginPage />);
    
    // Login
    await user.type(screen.getByLabelText(/email/i), 'user@club.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    
    // Verify uses stored preference
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/es/preferred-club');
    });
  });
  
  test('Updates club context in background after redirect', async () => {
    const updateSpy = jest.spyOn(RedirectHandler, 'updateUserClubContext');
    const user = userEvent.setup();
    
    mockLogin.mockResolvedValueOnce({
      access: 'token',
      refresh: 'refresh',
      user: {
        id: '5',
        email: 'user@test.com',
        is_superuser: false,
        is_staff: false,
        is_active: true,
        role: 'CLIENT',
      },
    });
    
    render(<LoginPage />);
    
    // Login
    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    
    // Verify background update is called
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ id: '5' }),
        'token'
      );
    });
    
    updateSpy.mockRestore();
  });
});