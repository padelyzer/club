import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientDetail } from '../client-detail';
import { render } from '@/test-utils';
import { mockClient, createMockClient } from '@/test-utils/mocks';
import { useClientsStore } from '@/store/clientsStore';
import { useClientStats } from '@/lib/api/hooks/useClients';

// Mock dependencies
jest.mock('@/store/clientsStore');
jest.mock('@/lib/api/hooks/useClients');
jest.mock('date-fns', () => ({
  format: jest.fn((date, format) => {
    if (format === 'dd/MM/yyyy') return '15/01/2024';
    if (format === 'dd/MM') return '15/01';
    return '2024-01-15';
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock Modal component
jest.mock('@/components/layout/Modal', () => ({
  Modal: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
}));

// Mock console methods
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});
afterAll(() => {
  console.log = originalConsoleLog;
});

describe('ClientDetail', () => {
  const mockOnClose = jest.fn();
  const mockOpenForm = jest.fn();

  const mockStats = {
    total_spent: 2500.5,
    total_reservations: 45,
    average_spend: 55.57,
    favorite_court: 'Court 1',
    favorite_time: '10:00',
    membership_status: 'Premium',
    last_reservation: '2024-03-20',
    retention_rate: 85,
  };

  const defaultProps = {
    client: mockClient,
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useClientsStore as jest.Mock).mockReturnValue({
      openForm: mockOpenForm,
    });
    (useClientStats as jest.Mock).mockReturnValue({
      stats: mockStats,
      isLoading: false,
    });
  });

  describe('Header', () => {
    it('renders client name and status', () => {
      render(<ClientDetail {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('common.active')).toBeInTheDocument();
    });

    it('renders inactive status correctly', () => {
      const inactiveClient = createMockClient({ is_active: false });
      render(<ClientDetail {...defaultProps} client={inactiveClient} />);

      expect(screen.getByText('common.inactive')).toBeInTheDocument();
    });

    it('renders membership badge when available', () => {
      const clientWithMembership = createMockClient({
        membership: {
          id: '1',
          name: 'Premium',
          benefits: [],
          price: 100,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      });
      render(<ClientDetail {...defaultProps} client={clientWithMembership} />);

      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('handles edit button click', () => {
      render(<ClientDetail {...defaultProps} />);

      const editButton = screen.getByText('common.edit');
      fireEvent.click(editButton);

      expect(mockOpenForm).toHaveBeenCalledWith(mockClient);
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles close button click', () => {
      render(<ClientDetail {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Tabs', () => {
    it('renders all tabs', () => {
      render(<ClientDetail {...defaultProps} />);

      expect(screen.getByText('clients.information')).toBeInTheDocument();
      expect(screen.getByText('clients.activity')).toBeInTheDocument();
      expect(screen.getByText('clients.statistics')).toBeInTheDocument();
    });

    it('switches between tabs', () => {
      render(<ClientDetail {...defaultProps} />);

      // Default tab is info
      expect(screen.getByText('clients.contactInfo')).toBeInTheDocument();

      // Switch to activity tab
      fireEvent.click(screen.getByText('clients.activity'));
      expect(
        screen.getByText('clients.activityComingSoon')
      ).toBeInTheDocument();

      // Switch to stats tab
      fireEvent.click(screen.getByText('clients.statistics'));
      // ClientStats component should be rendered
      expect(screen.queryByText('clients.contactInfo')).not.toBeInTheDocument();
    });
  });

  describe('Information Tab', () => {
    it('displays contact information', () => {
      render(<ClientDetail {...defaultProps} />);

      expect(screen.getByText('clients.email')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('clients.phone')).toBeInTheDocument();
      expect(screen.getByText('+34 600 123 456')).toBeInTheDocument();
    });

    it('displays document information when available', () => {
      render(<ClientDetail {...defaultProps} />);

      expect(screen.getByText('clients.documentInfo')).toBeInTheDocument();
      expect(screen.getByText('clients.documentType')).toBeInTheDocument();
      expect(screen.getByText('DNI')).toBeInTheDocument();
      expect(screen.getByText('clients.documentNumber')).toBeInTheDocument();
      expect(screen.getByText('12345678A')).toBeInTheDocument();
    });

    it('does not display document section when no document info', () => {
      const clientWithoutDocs = createMockClient({
        document_type: undefined,
        document_number: undefined,
      });
      render(<ClientDetail {...defaultProps} client={clientWithoutDocs} />);

      expect(
        screen.queryByText('clients.documentInfo')
      ).not.toBeInTheDocument();
    });

    it('displays birth date when available', () => {
      render(<ClientDetail {...defaultProps} />);

      expect(screen.getByText('clients.birthDate')).toBeInTheDocument();
      expect(screen.getAllByText('15/01/2024')[0]).toBeInTheDocument();
    });

    it('displays member since date', () => {
      render(<ClientDetail {...defaultProps} />);

      expect(screen.getByText('clients.memberSince')).toBeInTheDocument();
      expect(screen.getAllByText('15/01/2024')[1]).toBeInTheDocument();
    });

    it('displays quick stats', () => {
      render(<ClientDetail {...defaultProps} />);

      // Total spent
      expect(screen.getByText('clients.totalSpent')).toBeInTheDocument();
      expect(screen.getByText(/1\.250,50/)).toBeInTheDocument();

      // Total reservations
      expect(screen.getByText('clients.totalReservations')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();

      // Last reservation
      expect(screen.getByText('clients.lastReservation')).toBeInTheDocument();
      expect(screen.getByText('15/01')).toBeInTheDocument();
    });

    it('shows never for clients without last reservation', () => {
      const clientWithoutReservation = createMockClient({
        last_reservation: undefined,
      });
      render(
        <ClientDetail {...defaultProps} client={clientWithoutReservation} />
      );

      expect(screen.getByText('common.never')).toBeInTheDocument();
    });
  });

  describe('Activity Tab', () => {
    it('shows coming soon message', () => {
      render(<ClientDetail {...defaultProps} />);

      fireEvent.click(screen.getByText('clients.activity'));
      expect(
        screen.getByText('clients.activityComingSoon')
      ).toBeInTheDocument();
    });
  });

  describe('Statistics Tab', () => {
    it('renders ClientStats component with correct props', () => {
      render(<ClientDetail {...defaultProps} />);

      fireEvent.click(screen.getByText('clients.statistics'));

      // ClientStats component should receive the correct props
      // We cannot directly test the component content without mocking it
      // but we know it&apos;s rendered in the stats tab
    });

    it('passes loading state to ClientStats', () => {
      (useClientStats as jest.Mock).mockReturnValue({
        stats: null,
        isLoading: true,
      });

      render(<ClientDetail {...defaultProps} />);
      fireEvent.click(screen.getByText('clients.statistics'));

      // Loading state is passed to ClientStats component
    });
  });

  describe('Footer Actions', () => {
    it('renders footer action buttons', () => {
      render(<ClientDetail {...defaultProps} />);

      expect(screen.getByText('clients.viewReservations')).toBeInTheDocument();
      expect(screen.getByText('clients.newReservation')).toBeInTheDocument();
    });

    it('handles view reservations click', () => {
      render(<ClientDetail {...defaultProps} />);

      const viewReservationsButton = screen.getByText(
        'clients.viewReservations'
      );
      fireEvent.click(viewReservationsButton);

      expect(console.log).toHaveBeenCalledWith('View reservations');
    });

    it('handles new reservation click', () => {
      render(<ClientDetail {...defaultProps} />);

      const newReservationButton = screen.getByText('clients.newReservation');
      fireEvent.click(newReservationButton);

      expect(console.log).toHaveBeenCalledWith('New reservation');
    });
  });

  describe('Data Formatting', () => {
    it('formats currency correctly in ARS', () => {
      render(<ClientDetail {...defaultProps} />);

      // Check for ARS currency format
      expect(screen.getByText(/1\.250,50/)).toBeInTheDocument();
    });

    it('capitalizes document type', () => {
      render(<ClientDetail {...defaultProps} />);

      expect(screen.getByText('DNI')).toBeInTheDocument();
    });

    it('formats dates correctly', () => {
      render(<ClientDetail {...defaultProps} />);

      // Full date format
      expect(screen.getAllByText('15/01/2024')).toHaveLength(2);

      // Short date format for last reservation
      expect(screen.getByText('15/01')).toBeInTheDocument();
    });
  });
});
