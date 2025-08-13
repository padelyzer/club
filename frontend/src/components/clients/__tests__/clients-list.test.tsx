import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ClientsList } from '../clients-list';
import { render } from '@/test-utils';
import { useClientsStore } from '@/store/clientsStore';
import { mockClients } from '@/test-utils/mocks';
import { useClientMutations } from '@/lib/api/hooks/useClients';

// Mock dependencies
jest.mock('@/store/clientsStore');
jest.mock('@/lib/api/hooks/useClients');
jest.mock('date-fns', () => ({
  format: jest.fn(() => '15/01/2024'),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
}));

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

describe('ClientsList', () => {
  const mockOpenForm = jest.fn();
  const mockOpenDetail = jest.fn();
  const mockSetCurrentPage = jest.fn();
  const mockDeleteClient = jest.fn();

  const defaultStoreState = {
    clients: mockClients,
    viewMode: 'list' as const,
    currentPage: 1,
    pageSize: 10,
    totalClients: 3,
    openForm: mockOpenForm,
    openDetail: mockOpenDetail,
    setCurrentPage: mockSetCurrentPage,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    (useClientsStore as jest.Mock).mockReturnValue(defaultStoreState);
    (useClientMutations as jest.Mock).mockReturnValue({
      deleteClient: mockDeleteClient,
    });
  });

  describe('List View', () => {
    it('renders clients in table format', () => {
      render(<ClientsList />);

      // Check table headers
      expect(screen.getByText('clients.name')).toBeInTheDocument();
      expect(screen.getByText('clients.contact')).toBeInTheDocument();
      expect(screen.getByText('clients.status')).toBeInTheDocument();
      expect(screen.getByText('clients.stats')).toBeInTheDocument();
      expect(screen.getByText('clients.lastReservation')).toBeInTheDocument();

      // Check client data
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
      expect(screen.getByText('Carlos García')).toBeInTheDocument();
    });

    it('displays client contact information', () => {
      render(<ClientsList />);

      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('+34 600 123 456')).toBeInTheDocument();
    });

    it('displays client status badges', () => {
      render(<ClientsList />);

      // Active clients show active badge
      const activeBadges = screen.getAllByText('common.active');
      expect(activeBadges).toHaveLength(2); // John and Jane are active

      // Inactive client shows inactive badge
      expect(screen.getByText('common.inactive')).toBeInTheDocument();
    });

    it('displays client statistics', () => {
      render(<ClientsList />);

      // Check total spent (in ARS format)
      expect(screen.getByText(/1\.250,50/)).toBeInTheDocument();
      expect(screen.getByText(/980,00/)).toBeInTheDocument();

      // Check reservations count
      expect(screen.getByText('45 clients.reservations')).toBeInTheDocument();
      expect(screen.getByText('32 clients.reservations')).toBeInTheDocument();
    });

    it('displays last reservation date', () => {
      render(<ClientsList />);

      // All clients should show the formatted date
      const dates = screen.getAllByText('15/01/2024');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('shows never for clients without last reservation', () => {
      const clientsWithoutReservation = mockClients.map((client) => ({
        ...client,
        last_reservation: undefined,
      }));

      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        clients: clientsWithoutReservation,
      });

      render(<ClientsList />);

      const neverTexts = screen.getAllByText('common.never');
      expect(neverTexts).toHaveLength(3);
    });
  });

  describe('Grid View', () => {
    beforeEach(() => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        viewMode: 'grid',
      });
    });

    it('renders clients in grid format', () => {
      render(<ClientsList />);

      // Should not render table
      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      // Should render client cards
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Carlos García')).toBeInTheDocument();
    });

    it('passes correct props to ClientCard', () => {
      render(<ClientsList />);

      // Check that client information is displayed in cards
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('+34 600 123 456')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('handles view action', () => {
      render(<ClientsList />);

      // Open dropdown for first client
      const menuButtons = screen.getAllByRole('button', {
        name: 'common.openMenu',
      });
      fireEvent.click(menuButtons[0]);

      // Click view
      fireEvent.click(screen.getByText('common.view'));

      expect(mockOpenDetail).toHaveBeenCalledWith(mockClients[0]);
    });

    it('handles edit action', () => {
      render(<ClientsList />);

      // Open dropdown for first client
      const menuButtons = screen.getAllByRole('button', {
        name: 'common.openMenu',
      });
      fireEvent.click(menuButtons[0]);

      // Click edit
      fireEvent.click(screen.getByText('common.edit'));

      expect(mockOpenForm).toHaveBeenCalledWith(mockClients[0]);
    });

    it('handles delete action with confirmation', async () => {
      render(<ClientsList />);

      // Open dropdown for first client
      const menuButtons = screen.getAllByRole('button', {
        name: 'common.openMenu',
      });
      fireEvent.click(menuButtons[0]);

      // Click delete
      fireEvent.click(screen.getByText('common.delete'));

      expect(mockConfirm).toHaveBeenCalledWith('clients.confirmDelete');

      await waitFor(() => {
        expect(mockDeleteClient).toHaveBeenCalledWith(mockClients[0].id);
      });
    });

    it('cancels delete when user declines confirmation', async () => {
      mockConfirm.mockReturnValue(false);
      render(<ClientsList />);

      // Open dropdown for first client
      const menuButtons = screen.getAllByRole('button', {
        name: 'common.openMenu',
      });
      fireEvent.click(menuButtons[0]);

      // Click delete
      fireEvent.click(screen.getByText('common.delete'));

      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDeleteClient).not.toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('does not show pagination for single page', () => {
      render(<ClientsList />);

      expect(screen.queryByText('common.previous')).not.toBeInTheDocument();
      expect(screen.queryByText('common.next')).not.toBeInTheDocument();
    });

    it('shows pagination for multiple pages', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        totalClients: 25,
        pageSize: 10,
      });

      render(<ClientsList />);

      expect(screen.getByText('common.previous')).toBeInTheDocument();
      expect(screen.getByText('common.next')).toBeInTheDocument();
      expect(screen.getByText('common.pageOf')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        totalClients: 25,
        pageSize: 10,
        currentPage: 1,
      });

      render(<ClientsList />);

      const prevButton = screen.getByText('common.previous');
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        totalClients: 25,
        pageSize: 10,
        currentPage: 3,
      });

      render(<ClientsList />);

      const nextButton = screen.getByText('common.next');
      expect(nextButton).toBeDisabled();
    });

    it('handles page navigation', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        totalClients: 25,
        pageSize: 10,
        currentPage: 2,
      });

      render(<ClientsList />);

      // Click previous
      fireEvent.click(screen.getByText('common.previous'));
      expect(mockSetCurrentPage).toHaveBeenCalledWith(1);

      // Click next
      fireEvent.click(screen.getByText('common.next'));
      expect(mockSetCurrentPage).toHaveBeenCalledWith(3);
    });

    it('shows correct items count in list view', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        viewMode: 'list',
        totalClients: 25,
        pageSize: 10,
        currentPage: 2,
      });

      render(<ClientsList />);

      expect(screen.getByText('common.showing')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty table when no clients', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        clients: [],
        totalClients: 0,
      });

      render(<ClientsList />);

      // Table should still be rendered with headers
      expect(screen.getByText('clients.name')).toBeInTheDocument();

      // But no client rows
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  describe('Document Information', () => {
    it('displays document information when available', () => {
      render(<ClientsList />);

      expect(screen.getByText('DNI: 12345678A')).toBeInTheDocument();
    });

    it('does not display document info when not available', () => {
      const clientsWithoutDocs = mockClients.map((client) => ({
        ...client,
        document_type: undefined,
        document_number: undefined,
      }));

      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        clients: clientsWithoutDocs,
      });

      render(<ClientsList />);

      expect(screen.queryByText(/DNI:/)).not.toBeInTheDocument();
    });
  });
});
