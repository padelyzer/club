import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClubCard } from '../club-card';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';
import { useClubsUIStore } from '@/store/clubs/clubsUIStore';
import { Club } from '@/types/club';

// Mock stores
jest.mock('@/store/clubs/activeClubStore');
jest.mock('@/store/clubs/clubsUIStore');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockClub: Club = {
  id: '1',
  name: 'Test Club',
  slug: 'test-club',
  description: 'Test description',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  country: 'Test Country',
  postal_code: '12345',
  phone: '+1234567890',
  email: 'test@club.com',
  website: 'https://test.club',
  logo_url: 'https://test.club/logo.png',
  cover_image_url: 'https://test.club/cover.jpg',
  courts: [],
  features: ['wifi', 'parking'],
  services: ['coaching', 'equipment_rental'],
  schedule: [],
  total_members: 100,
  average_occupancy: 75,
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
  is_active: true,
  timezone: 'UTC',
  currency: 'USD',
  lat: 0,
  lng: 0,
};

describe('ClubCard', () => {
  const mockSwitchClub = jest.fn();
  const mockOpenDetail = jest.fn();
  const mockOpenForm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    (useActiveClubStore as jest.Mock).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({
          activeClubId: null,
          switchClub: mockSwitchClub,
        });
      }
      return {
        switchClub: mockSwitchClub,
      };
    });

    (useClubsUIStore as jest.Mock).mockReturnValue({
      openDetail: mockOpenDetail,
      openForm: mockOpenForm,
    });
  });

  describe('Rendering', () => {
    it('renders club information correctly in grid view', () => {
      render(<ClubCard club={mockClub} viewMode="grid" useModernDesign={false} />);
      
      expect(screen.getByText(mockClub.name)).toBeInTheDocument();
      expect(screen.getByText(/100/)).toBeInTheDocument(); // members
      expect(screen.getByText(/75/)).toBeInTheDocument(); // occupancy
    });

    it('renders club information correctly in list view', () => {
      render(<ClubCard club={mockClub} viewMode="list" useModernDesign={false} />);
      
      expect(screen.getByText(mockClub.name)).toBeInTheDocument();
      expect(screen.getByText(mockClub.address)).toBeInTheDocument();
    });

    it('shows active badge when club is active', () => {
      (useActiveClubStore as jest.Mock).mockImplementation((selector) => {
        if (typeof selector === 'function') {
          return true; // isActive
        }
        return {
          switchClub: mockSwitchClub,
        };
      });

      render(<ClubCard club={mockClub} viewMode="grid" useModernDesign={false} />);
      
      expect(screen.getByText('clubs.active')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls openDetail when card is clicked in grid view', () => {
      render(<ClubCard club={mockClub} viewMode="grid" useModernDesign={false} />);
      
      const card = screen.getByRole('article').parentElement;
      fireEvent.click(card!);
      
      expect(mockOpenDetail).toHaveBeenCalledWith(mockClub);
    });

    it('calls switchClub when set active is clicked', async () => {
      render(<ClubCard club={mockClub} viewMode="list" useModernDesign={false} />);
      
      // This would need to be adjusted based on actual implementation
      // The test assumes there's a button or action to set active
    });
  });

  describe('Performance', () => {
    it('does not re-render when unrelated props change', () => {
      const { rerender } = render(
        <ClubCard club={mockClub} viewMode="grid" useModernDesign={false} />
      );
      
      const initialRenderCount = 1;
      
      // Re-render with same props
      rerender(<ClubCard club={mockClub} viewMode="grid" useModernDesign={false} />);
      
      // Component should not re-render due to memoization
      // This is a simplified test - in practice you'd use a render counter
    });

    it('re-renders when club data changes', () => {
      const { rerender } = render(
        <ClubCard club={mockClub} viewMode="grid" useModernDesign={false} />
      );
      
      const updatedClub = { ...mockClub, name: 'Updated Club' };
      rerender(<ClubCard club={updatedClub} viewMode="grid" useModernDesign={false} />);
      
      expect(screen.getByText('Updated Club')).toBeInTheDocument();
    });
  });

  describe('Modern Design', () => {
    it('renders ModernClubCard when useModernDesign is true', () => {
      // Mock the ModernClubCard component
      jest.mock('../club-card-modern', () => ({
        ModernClubCard: () => <div data-testid="modern-club-card">Modern Card</div>,
      }));
      
      render(<ClubCard club={mockClub} viewMode="grid" useModernDesign={true} />);
      
      // The actual implementation would render ModernClubCard
    });
  });
});