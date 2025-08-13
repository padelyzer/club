import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientFilters } from '../client-filters';
import { render } from '@/test-utils';
import { useClientsStore } from '@/store/clientsStore';

// Mock the store
jest.mock('@/store/clientsStore');

// Mock useDebounce hook
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

describe('ClientFilters', () => {
  const mockSetFilters = jest.fn();
  const mockSetSearchQuery = jest.fn();
  const mockResetFilters = jest.fn();

  const defaultStoreState = {
    filters: {},
    searchQuery: '',
    setFilters: mockSetFilters,
    setSearchQuery: mockSetSearchQuery,
    resetFilters: mockResetFilters,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useClientsStore as jest.Mock).mockReturnValue(defaultStoreState);
  });

  describe('Search Functionality', () => {
    it('renders search input with placeholder', () => {
      render(<ClientFilters />);

      const searchInput = screen.getByPlaceholderText(
        'clients.searchPlaceholder'
      );
      expect(searchInput).toBeInTheDocument();
    });

    it('updates search query on input', async () => {
      render(<ClientFilters />);

      const searchInput = screen.getByPlaceholderText(
        'clients.searchPlaceholder'
      );
      await userEvent.type(searchInput, 'John Doe');

      expect(searchInput).toHaveValue('John Doe');
      await waitFor(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledWith('John Doe');
      });
    });

    it('shows clear button when search has value', async () => {
      render(<ClientFilters />);

      const searchInput = screen.getByPlaceholderText(
        'clients.searchPlaceholder'
      );
      await userEvent.type(searchInput, 'test');

      const clearButton = screen.getByRole('button', { name: '' });
      expect(clearButton).toBeInTheDocument();
    });

    it('clears search when clear button is clicked', async () => {
      render(<ClientFilters />);

      const searchInput = screen.getByPlaceholderText(
        'clients.searchPlaceholder'
      );
      await userEvent.type(searchInput, 'test');

      const clearButton = screen.getByRole('button', { name: '' });
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
      await waitFor(() => {
        expect(mockSetSearchQuery).toHaveBeenCalledWith('');
      });
    });
  });

  describe('Filter Dropdown', () => {
    it('renders filter button', () => {
      render(<ClientFilters />);

      const filterButton = screen.getByText('common.filter');
      expect(filterButton).toBeInTheDocument();
    });

    it('shows filter count badge when filters are active', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        filters: { is_active: true, has_membership: false },
      });

      render(<ClientFilters />);

      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
    });

    it('opens dropdown menu when filter button is clicked', async () => {
      render(<ClientFilters />);

      const filterButton = screen.getByText('common.filter');
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('clients.filterBy')).toBeInTheDocument();
        expect(screen.getByText('clients.status')).toBeInTheDocument();
        expect(screen.getByText('clients.membership')).toBeInTheDocument();
      });
    });

    describe('Status Filter', () => {
      it('filters by active status', async () => {
        render(<ClientFilters />);

        const filterButton = screen.getByText('common.filter');
        fireEvent.click(filterButton);

        await waitFor(() => {
          const activeOption = screen.getByRole('menuitemcheckbox', {
            name: /common.active/,
          });
          fireEvent.click(activeOption);
        });

        expect(mockSetFilters).toHaveBeenCalledWith({ is_active: true });
      });

      it('filters by inactive status', async () => {
        render(<ClientFilters />);

        const filterButton = screen.getByText('common.filter');
        fireEvent.click(filterButton);

        await waitFor(() => {
          const inactiveOption = screen.getByRole('menuitemcheckbox', {
            name: /common.inactive/,
          });
          fireEvent.click(inactiveOption);
        });

        expect(mockSetFilters).toHaveBeenCalledWith({ is_active: false });
      });

      it('clears status filter when all is selected', async () => {
        (useClientsStore as jest.Mock).mockReturnValue({
          ...defaultStoreState,
          filters: { is_active: true },
        });

        render(<ClientFilters />);

        const filterButton = screen.getByText('common.filter');
        fireEvent.click(filterButton);

        await waitFor(() => {
          const allOption = screen.getAllByText('common.all')[0];
          fireEvent.click(allOption);
        });

        expect(mockSetFilters).toHaveBeenCalledWith({});
      });
    });

    describe('Membership Filter', () => {
      it('filters by with membership', async () => {
        render(<ClientFilters />);

        const filterButton = screen.getByText('common.filter');
        fireEvent.click(filterButton);

        await waitFor(() => {
          const withMembershipOption = screen.getByText(
            'clients.withMembership'
          );
          fireEvent.click(withMembershipOption);
        });

        expect(mockSetFilters).toHaveBeenCalledWith({ has_membership: true });
      });

      it('filters by without membership', async () => {
        render(<ClientFilters />);

        const filterButton = screen.getByText('common.filter');
        fireEvent.click(filterButton);

        await waitFor(() => {
          const withoutMembershipOption = screen.getByText(
            'clients.withoutMembership'
          );
          fireEvent.click(withoutMembershipOption);
        });

        expect(mockSetFilters).toHaveBeenCalledWith({ has_membership: false });
      });
    });

    it('shows clear filters option when filters are active', async () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        filters: { is_active: true },
      });

      render(<ClientFilters />);

      const filterButton = screen.getByText('common.filter');
      fireEvent.click(filterButton);

      await waitFor(() => {
        const clearOption = screen.getByText('common.clearFilters');
        expect(clearOption).toBeInTheDocument();
        fireEvent.click(clearOption);
      });

      expect(mockResetFilters).toHaveBeenCalled();
    });
  });

  describe('Active Filters Display', () => {
    it('shows active filters section when filters are applied', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        filters: { is_active: true },
        searchQuery: 'John',
      });

      render(<ClientFilters />);

      expect(screen.getByText('common.activeFilters:')).toBeInTheDocument();
      expect(screen.getByText('common.search: John')).toBeInTheDocument();
      expect(screen.getByText('common.active')).toBeInTheDocument();
    });

    it('removes individual filter when X is clicked', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        filters: { is_active: true, has_membership: false },
      });

      render(<ClientFilters />);

      const activeBadge = screen.getByText('common.active').closest('.badge');
      const removeButton = activeBadge?.querySelector('button');

      if (removeButton) {
        fireEvent.click(removeButton);
      }

      expect(mockSetFilters).toHaveBeenCalledWith({ has_membership: false });
    });

    it('clears all filters when clear all button is clicked', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        filters: { is_active: true },
        searchQuery: 'John',
      });

      render(<ClientFilters />);

      const clearAllButton = screen.getByText('common.clearAll');
      fireEvent.click(clearAllButton);

      expect(mockResetFilters).toHaveBeenCalled();
    });

    it('removes search filter individually', () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        searchQuery: 'John',
      });

      render(<ClientFilters />);

      const searchBadge = screen
        .getByText('common.search: John')
        .closest('.badge');
      const removeButton = searchBadge?.querySelector('button');

      if (removeButton) {
        fireEvent.click(removeButton);
      }

      expect(mockSetSearchQuery).toHaveBeenCalledWith('');
    });
  });

  describe('Filter Combinations', () => {
    it('handles multiple filters simultaneously', async () => {
      render(<ClientFilters />);

      const filterButton = screen.getByText('common.filter');
      fireEvent.click(filterButton);

      await waitFor(() => {
        // Apply active filter
        const activeOption = screen.getByRole('menuitemcheckbox', {
          name: /common.active/,
        });
        fireEvent.click(activeOption);
      });

      // Open menu again
      fireEvent.click(filterButton);

      await waitFor(() => {
        // Apply membership filter
        const withMembershipOption = screen.getByText('clients.withMembership');
        fireEvent.click(withMembershipOption);
      });

      expect(mockSetFilters).toHaveBeenCalledTimes(2);
      expect(mockSetFilters).toHaveBeenCalledWith({ is_active: true });
      expect(mockSetFilters).toHaveBeenCalledWith({ has_membership: true });
    });

    it('preserves other filters when updating one', async () => {
      (useClientsStore as jest.Mock).mockReturnValue({
        ...defaultStoreState,
        filters: { is_active: true },
      });

      render(<ClientFilters />);

      const filterButton = screen.getByText('common.filter');
      fireEvent.click(filterButton);

      await waitFor(() => {
        const withMembershipOption = screen.getByText('clients.withMembership');
        fireEvent.click(withMembershipOption);
      });

      expect(mockSetFilters).toHaveBeenCalledWith({ has_membership: true });
    });
  });
});
