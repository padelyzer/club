import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { ReservationsList } from '../reservations-list';
import { render } from '@/test-utils';
import { useUIStore } from '@/store/ui';
import { useReservationStore } from '@/store/reservations';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { Reservation } from '@/lib/api/types';

// Mock dependencies
jest.mock('@/store/ui');
jest.mock('@/store/reservations');
jest.mock('@tanstack/react-query');
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr.includes('EEEE')) return 'Monday, January 15, 2024';
    return '2024-01-15';
  }),
}));

const mockReservation: Reservation = {
  id: '1',
  court: {
    id: '1',
    name: 'Court A',
    sport_type: 'padel',
    indoor: true,
    price_per_hour: 40,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  client: {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+34 600 123 456',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  start_time: '10:00',
  end_time: '11:00',
  date: '2024-01-15',
  status: 'confirmed',
  payment_status: 'paid',
  total_amount: 40,
  notes: 'Regular weekly booking',
  created_by: {
    id: '1',
    email: 'staff@padelyzer.com',
    first_name: 'Staff',
    last_name: 'User',
    role: 'STAFF',
    organization: {
      id: '1',
      name: 'Test Club',
      slug: 'test-club',
      plan: 'professional',
      is_active: true,
      settings: {
        currency: 'USD',
        timezone: 'Europe/Madrid',
        language: 'es',
        booking_advance_days: 30,
        cancellation_hours: 24,
        payment_methods: ['cash', 'card'],
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    permissions: [],
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  created_at: '2024-01-10T10:00:00Z',
  updated_at: '2024-01-10T10:00:00Z',
};

describe('ReservationsList', () => {
  const mockOpenModal = jest.fn();
  const mockSetSelectedReservation = jest.fn();
  const mockCancelMutate = jest.fn();
  const mockConfirmMutate = jest.fn();

  const mockQueryData = {
    results: [
      mockReservation,
      {
        ...mockReservation,
        id: '2',
        status: 'pending',
        payment_status: 'pending',
        notes: undefined,
      },
      {
        ...mockReservation,
        id: '3',
        status: 'cancelled',
        payment_status: 'refunded',
      },
    ],
    count: 3,
    next: null,
    previous: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);

    (useUIStore as jest.Mock).mockReturnValue({
      openModal: mockOpenModal,
    });

    (useReservationStore as jest.Mock).mockReturnValue({
      setSelectedReservation: mockSetSelectedReservation,
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: mockQueryData,
      isLoading: false,
    });

    (useMutation as jest.Mock).mockImplementation((config) => {
      if (config.mutationFn.name.includes('cancel')) {
        return {
          mutate: mockCancelMutate,
        };
      }
      return {
        mutate: mockConfirmMutate,
      };
    });
  });

  it('renders reservations list correctly', () => {
    render(<ReservationsList />);

    // Check if reservations are displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Monday, January 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    expect(screen.getByText('Court A')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('$40')).toBeInTheDocument();
  });

  it('displays reservation status badges correctly', () => {
    render(<ReservationsList />);

    expect(screen.getByText('Confirmada')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
  });

  it('displays payment status badges correctly', () => {
    render(<ReservationsList />);

    expect(screen.getByText('Pagado')).toBeInTheDocument();
    expect(screen.getByText('Pago pendiente')).toBeInTheDocument();
    expect(screen.getByText('Reembolsado')).toBeInTheDocument();
  });

  it('displays notes when available', () => {
    render(<ReservationsList />);

    expect(
      screen.getByText('Nota: Regular weekly booking')
    ).toBeInTheDocument();
  });

  it('handles edit action', () => {
    render(<ReservationsList />);

    // Open dropdown menu for first reservation
    const menuButtons = screen.getAllByRole('button');
    const firstMenuButton = menuButtons.find((btn) =>
      btn.querySelector('.lucide-more-vertical')
    );
    fireEvent.click(firstMenuButton!);

    // Click edit
    fireEvent.click(screen.getByText('Editar'));

    expect(mockSetSelectedReservation).toHaveBeenCalledWith(mockReservation);
    expect(mockOpenModal).toHaveBeenCalledWith('edit-reservation');
  });

  it('shows confirm button only for pending reservations', () => {
    render(<ReservationsList />);

    // Open dropdown for pending reservation (second one)
    const menuButtons = screen.getAllByRole('button');
    const secondMenuButton = menuButtons[1];
    fireEvent.click(secondMenuButton);

    expect(screen.getByText('Confirmar')).toBeInTheDocument();
  });

  it('handles confirm action', () => {
    render(<ReservationsList />);

    // Open dropdown for pending reservation
    const menuButtons = screen.getAllByRole('button');
    const secondMenuButton = menuButtons[1];
    fireEvent.click(secondMenuButton);

    fireEvent.click(screen.getByText('Confirmar'));

    expect(mockConfirmMutate).toHaveBeenCalledWith('2');
  });

  it('handles cancel action with confirmation', () => {
    render(<ReservationsList />);

    // Open dropdown for first reservation
    const menuButtons = screen.getAllByRole('button');
    const firstMenuButton = menuButtons[0];
    fireEvent.click(firstMenuButton);

    fireEvent.click(screen.getByText('Cancelar'));

    expect(window.confirm).toHaveBeenCalledWith(
      '¿Estás seguro de cancelar esta reserva?'
    );
    expect(mockCancelMutate).toHaveBeenCalledWith({ id: '1' });
  });

  it('does not cancel when user declines confirmation', () => {
    window.confirm = jest.fn(() => false);

    render(<ReservationsList />);

    // Open dropdown for first reservation
    const menuButtons = screen.getAllByRole('button');
    const firstMenuButton = menuButtons[0];
    fireEvent.click(firstMenuButton);

    fireEvent.click(screen.getByText('Cancelar'));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockCancelMutate).not.toHaveBeenCalled();
  });

  it('does not show cancel button for completed or cancelled reservations', () => {
    render(<ReservationsList />);

    // Open dropdown for cancelled reservation (third one)
    const menuButtons = screen.getAllByRole('button');
    const thirdMenuButton = menuButtons[2];
    fireEvent.click(thirdMenuButton);

    expect(screen.queryByText('Cancelar')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<ReservationsList />);

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('shows empty state when no reservations', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: { results: [], count: 0, next: null, previous: null },
      isLoading: false,
    });

    render(<ReservationsList />);

    expect(screen.getByText('No hay reservas disponibles')).toBeInTheDocument();
  });

  it('handles pagination when there are many reservations', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: {
        ...mockQueryData,
        count: 25,
        next: 'http://api.example.com/reservations?page=2',
      },
      isLoading: false,
    });

    render(<ReservationsList />);

    expect(
      screen.getByText('Mostrando 1 - 3 de 25 reservas')
    ).toBeInTheDocument();
    expect(screen.getByText('Anterior')).toBeDisabled();
    expect(screen.getByText('Siguiente')).toBeEnabled();
  });

  it('handles next page navigation', () => {
    const setPageMock = jest.fn();
    React.useState = jest
      .fn()
      .mockImplementationOnce(() => [1, setPageMock])
      .mockImplementation((initial) => [initial, jest.fn()]);

    (useQuery as jest.Mock).mockReturnValue({
      data: {
        ...mockQueryData,
        count: 25,
        next: 'http://api.example.com/reservations?page=2',
      },
      isLoading: false,
    });

    render(<ReservationsList />);

    fireEvent.click(screen.getByText('Siguiente'));
    expect(setPageMock).toHaveBeenCalledWith(2);
  });

  it('shows success toast on successful cancellation', async () => {
    (useMutation as jest.Mock).mockImplementation((config) => {
      if (config.mutationFn.name.includes('cancel')) {
        return {
          mutate: (data: any) => {
            config.onSuccess();
          },
        };
      }
      return { mutate: jest.fn() };
    });

    render(<ReservationsList />);

    // Open dropdown and cancel
    const menuButtons = screen.getAllByRole('button');
    fireEvent.click(menuButtons[0]);
    fireEvent.click(screen.getByText('Cancelar'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Reserva cancelada');
    });
  });

  it('shows error toast on failed cancellation', async () => {
    (useMutation as jest.Mock).mockImplementation((config) => {
      if (config.mutationFn.name.includes('cancel')) {
        return {
          mutate: (data: any) => {
            config.onError();
          },
        };
      }
      return { mutate: jest.fn() };
    });

    render(<ReservationsList />);

    // Open dropdown and cancel
    const menuButtons = screen.getAllByRole('button');
    fireEvent.click(menuButtons[0]);
    fireEvent.click(screen.getByText('Cancelar'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al cancelar la reserva');
    });
  });
});
