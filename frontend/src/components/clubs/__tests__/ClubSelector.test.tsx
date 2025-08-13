import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ClubSwitcher } from '../club-switcher';
import { 
  createTestWrapper, 
  mockBFFResponses, 
  setupGlobalMocks
} from '@/test-utils/setup';
import { createMockClub, createMockAuthContext } from '@/test-utils/mock-factories';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useRouter } from 'next/navigation';

// Mock dependencies
vi.mock('@/lib/api/hooks/useAuth');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}));

describe('ClubSelector Multi-tenant Component', () => {
  const user = userEvent.setup();
  const mockPush = vi.fn();
  const mockRouter = { push: mockPush, refresh: vi.fn() };
  const mockSwitchClub = vi.fn();

  beforeEach(() => {
    setupGlobalMocks();
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue(mockRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should show correct clubs for user', async () => {
    const mockAuthData = createMockAuthContext({
      clubs: [
        { id: 'club1', name: 'Tennis Club Central', role: 'admin' },
        { id: 'club2', name: 'Padel Paradise', role: 'manager' },
        { id: 'club3', name: 'Sports Complex', role: 'staff' }
      ],
      currentClub: { id: 'club1', name: 'Tennis Club Central' }
    });

    (useAuth as any).mockReturnValue({
      ...mockAuthData,
      isLoading: false,
      switchClub: mockSwitchClub
    });

    render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Click to open dropdown
    const trigger = screen.getByRole('button', { name: /tennis club central/i });
    await user.click(trigger);

    // Verify all clubs are shown
    await waitFor(() => {
      expect(screen.getByText('Tennis Club Central')).toBeInTheDocument();
      expect(screen.getByText('Padel Paradise')).toBeInTheDocument();
      expect(screen.getByText('Sports Complex')).toBeInTheDocument();
    });

    // Verify roles are displayed
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('manager')).toBeInTheDocument();
    expect(screen.getByText('staff')).toBeInTheDocument();
  });

  it('should handle single club auto-selection', async () => {
    const mockAuthData = createMockAuthContext({
      clubs: [
        { id: 'club1', name: 'Single Club', role: 'admin' }
      ],
      currentClub: { id: 'club1', name: 'Single Club' }
    });

    (useAuth as any).mockReturnValue({
      ...mockAuthData,
      isLoading: false,
      switchClub: mockSwitchClub
    });

    render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Should show the single club
    expect(screen.getByText('Single Club')).toBeInTheDocument();
    
    // Selector should be disabled since there's only one club
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
  });

  it('should handle multi-club switching', async () => {
    const mockAuthData = createMockAuthContext({
      clubs: [
        { id: 'club1', name: 'Club A', role: 'admin' },
        { id: 'club2', name: 'Club B', role: 'manager' }
      ],
      currentClub: { id: 'club1', name: 'Club A' }
    });

    (useAuth as any).mockReturnValue({
      ...mockAuthData,
      isLoading: false,
      switchClub: mockSwitchClub.mockResolvedValueOnce(true)
    });

    render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Open dropdown
    await user.click(screen.getByRole('button', { name: /club a/i }));

    // Click on Club B
    await user.click(screen.getByText('Club B'));

    // Verify switch was called
    expect(mockSwitchClub).toHaveBeenCalledWith('club2');
    
    // Should show loading state during switch
    await waitFor(() => {
      expect(screen.getByTestId('club-switch-loading')).toBeInTheDocument();
    });
  });

  it('should update context on selection', async () => {
    let currentAuthData = createMockAuthContext({
      clubs: [
        { id: 'club1', name: 'First Club', role: 'admin' },
        { id: 'club2', name: 'Second Club', role: 'manager' }
      ],
      currentClub: { id: 'club1', name: 'First Club' }
    });

    const switchClubMock = vi.fn().mockImplementation(async (clubId: any) => {
      currentAuthData = {
        ...currentAuthData,
        currentClub: currentAuthData.clubs.find(c => c.id === clubId)
      };
      return true;
    });

    (useAuth as any).mockImplementation(() => ({
      ...currentAuthData,
      isLoading: false,
      switchClub: switchClubMock
    }));

    const { rerender } = render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Initially shows First Club
    expect(screen.getByText('First Club')).toBeInTheDocument();

    // Open and switch
    await user.click(screen.getByRole('button', { name: /first club/i }));
    await user.click(screen.getByText('Second Club'));

    // Update mock to reflect new state
    (useAuth as any).mockReturnValue({
      ...currentAuthData,
      currentClub: { id: 'club2', name: 'Second Club' },
      isLoading: false,
      switchClub: switchClubMock
    });

    rerender(<ClubSwitcher />);

    // Should now show Second Club
    await waitFor(() => {
      expect(screen.getByText('Second Club')).toBeInTheDocument();
    });
  });

  it('should apply permission-based filtering', async () => {
    const mockAuthData = createMockAuthContext({
      clubs: [
        { id: 'club1', name: 'Admin Club', role: 'admin' },
        { id: 'club2', name: 'Manager Club', role: 'manager' },
        { id: 'club3', name: 'View Only Club', role: 'viewer' }
      ],
      currentClub: { id: 'club1', name: 'Admin Club' },
      permissions: ['clubs:read', 'clubs:write']
    });

    (useAuth as any).mockReturnValue({
      ...mockAuthData,
      isLoading: false,
      switchClub: mockSwitchClub
    });

    render(<ClubSwitcher minRole="manager" />, {
      wrapper: createTestWrapper()
    });

    // Open dropdown
    await user.click(screen.getByRole('button'));

    // Should only show clubs where user has manager or higher role
    expect(screen.getByText('Admin Club')).toBeInTheDocument();
    expect(screen.getByText('Manager Club')).toBeInTheDocument();
    expect(screen.queryByText('View Only Club')).not.toBeInTheDocument();
  });

  it('should handle loading states properly', async () => {
    (useAuth as any).mockReturnValue({
      clubs: [],
      currentClub: null,
      isLoading: true,
      switchClub: mockSwitchClub
    });

    render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Should show loading skeleton
    expect(screen.getByTestId('club-switcher-skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should handle no clubs scenario', async () => {
    (useAuth as any).mockReturnValue({
      clubs: [],
      currentClub: null,
      isLoading: false,
      switchClub: mockSwitchClub
    });

    render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Should show empty state
    expect(screen.getByText(/no clubs available/i)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should display club icons and metadata', async () => {
    const mockAuthData = createMockAuthContext({
      clubs: [
        { 
          id: 'club1', 
          name: 'Premium Tennis Club', 
          role: 'admin',
          logo: 'https://example.com/logo1.png',
          memberCount: 250
        },
        { 
          id: 'club2', 
          name: 'City Padel Center', 
          role: 'manager',
          logo: 'https://example.com/logo2.png',
          memberCount: 180
        }
      ],
      currentClub: { 
        id: 'club1', 
        name: 'Premium Tennis Club',
        logo: 'https://example.com/logo1.png'
      }
    });

    (useAuth as any).mockReturnValue({
      ...mockAuthData,
      isLoading: false,
      switchClub: mockSwitchClub
    });

    render(<ClubSwitcher showMetadata />, {
      wrapper: createTestWrapper()
    });

    // Open dropdown
    await user.click(screen.getByRole('button'));

    // Verify logos are displayed
    const logos = screen.getAllByRole('img');
    expect(logos).toHaveLength(2);
    expect(logos[0]).toHaveAttribute('src', 'https://example.com/logo1.png');

    // Verify member counts
    expect(screen.getByText('250 members')).toBeInTheDocument();
    expect(screen.getByText('180 members')).toBeInTheDocument();
  });

  it('should handle switch errors gracefully', async () => {
    const mockAuthData = createMockAuthContext({
      clubs: [
        { id: 'club1', name: 'Club One', role: 'admin' },
        { id: 'club2', name: 'Club Two', role: 'manager' }
      ],
      currentClub: { id: 'club1', name: 'Club One' }
    });

    const switchError = new Error('Failed to switch club');
    (useAuth as any).mockReturnValue({
      ...mockAuthData,
      isLoading: false,
      switchClub: mockSwitchClub.mockRejectedValueOnce(switchError)
    });

    render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Open and try to switch
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Club Two'));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to switch club/i)).toBeInTheDocument();
    });

    // Should remain on current club
    expect(screen.getByText('Club One')).toBeInTheDocument();
  });

  it('should show current club indicator', async () => {
    const mockAuthData = createMockAuthContext({
      clubs: [
        { id: 'club1', name: 'Active Club', role: 'admin' },
        { id: 'club2', name: 'Other Club', role: 'manager' }
      ],
      currentClub: { id: 'club1', name: 'Active Club' }
    });

    (useAuth as any).mockReturnValue({
      ...mockAuthData,
      isLoading: false,
      switchClub: mockSwitchClub
    });

    render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Open dropdown
    await user.click(screen.getByRole('button'));

    // Current club should have indicator
    const activeClubItem = screen.getByRole('option', { name: /active club/i });
    expect(within(activeClubItem).getByTestId('current-club-indicator')).toBeInTheDocument();

    // Other club should not have indicator
    const otherClubItem = screen.getByRole('option', { name: /other club/i });
    expect(within(otherClubItem).queryByTestId('current-club-indicator')).not.toBeInTheDocument();
  });

  it('should support keyboard navigation', async () => {
    const mockAuthData = createMockAuthContext({
      clubs: [
        { id: 'club1', name: 'First', role: 'admin' },
        { id: 'club2', name: 'Second', role: 'manager' },
        { id: 'club3', name: 'Third', role: 'staff' }
      ],
      currentClub: { id: 'club1', name: 'First' }
    });

    (useAuth as any).mockReturnValue({
      ...mockAuthData,
      isLoading: false,
      switchClub: mockSwitchClub
    });

    render(<ClubSwitcher />, {
      wrapper: createTestWrapper()
    });

    // Focus the button
    const button = screen.getByRole('button');
    button.focus();

    // Open with Enter key
    await user.keyboard('{Enter}');

    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');

    // Select with Enter
    await user.keyboard('{Enter}');

    // Should have selected the third club
    expect(mockSwitchClub).toHaveBeenCalledWith('club3');
  });
});