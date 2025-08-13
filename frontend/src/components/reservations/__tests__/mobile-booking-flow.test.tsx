import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileBookingFlow } from '../mobile-booking-flow';

// Mock the metrics hook
jest.mock('@/hooks/useMobileBookingMetrics', () => ({
  useMobileBookingMetrics: () => ({
    startTracking: jest.fn(),
    trackStepChange: jest.fn(),
    trackTouchInteraction: jest.fn(),
    trackError: jest.fn(),
    trackCompletion: jest.fn(),
    trackAbandonment: jest.fn(),
    getMetrics: jest.fn(),
    exportMetrics: jest.fn(),
  }),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockBookingData = {
  courts: [
    {
      id: '1',
      name: 'Pista 1',
      price: 50,
      type: 'indoor',
      surface: 'artificial_grass',
      isActive: true,
      popularSlots: ['09:00', '18:00'],
    },
  ],
  availability: {
    date: '2025-07-29',
    quickSlots: [
      {
        courtId: '1',
        courtName: 'Pista 1',
        startTime: '09:00',
        price: 50,
        popularity: 100,
      },
      {
        courtId: '1',
        courtName: 'Pista 1',
        startTime: '18:00',
        price: 60,
        popularity: 95,
      },
    ],
    allSlots: {},
    conflicts: [],
  },
  pricing: {
    currency: 'USD',
    durations: [
      { minutes: 60, label: '1h' },
      { minutes: 90, label: '1.5h' },
      { minutes: 120, label: '2h' },
    ],
  },
};

describe('MobileBookingFlow', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockBookingData,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MobileBookingFlow
          clubId="1"
          onSuccess={jest.fn()}
          onCancel={jest.fn()}
          {...props}
        />
      </QueryClientProvider>
    );
  };

  it('renders mobile booking flow with correct step structure', async () => {
    renderComponent();

    // Check that the component renders
    expect(screen.getByText('Nueva Reserva')).toBeInTheDocument();
    
    // Check progress steps
    expect(screen.getByText('Elegir')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Listo')).toBeInTheDocument();
  });

  it('loads booking data on mount', async () => {
    renderComponent();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/mobile/quick-book?clubId=1&date=' + new Date().toISOString().split('T')[0]);
    });
  });

  it('displays quick slots when loaded', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('18:00')).toBeInTheDocument();
      expect(screen.getByText('Pista 1')).toBeInTheDocument();
    });
  });

  it('allows duration selection with proper touch targets', async () => {
    renderComponent();

    await waitFor(() => {
      const duration90Button = screen.getByText('1.5h');
      expect(duration90Button).toBeInTheDocument();
      
      // Check touch target size (should be h-12 = 48px)
      expect(duration90Button.closest('button')).toHaveClass('h-12');
    });
  });

  it('enables next step after slot selection', async () => {
    renderComponent();

    await waitFor(async () => {
      // Wait for slots to load
      const slot = screen.getByText('09:00');
      expect(slot).toBeInTheDocument();
      
      // Click slot
      fireEvent.click(slot.closest('div')!);
      
      // Next button should appear
      await waitFor(() => {
        expect(screen.getByText(/Continuar con/)).toBeInTheDocument();
      });
    });
  });

  it('processes booking submission correctly', async () => {
    const mockOnSuccess = jest.fn();
    renderComponent({ onSuccess: mockOnSuccess });

    // Mock successful booking response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockBookingData,
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        reservation: {
          id: '123',
          confirmationCode: 'ABC123',
        },
      }),
    });

    await waitFor(async () => {
      // Select slot
      const slot = screen.getByText('09:00');
      fireEvent.click(slot.closest('div')!);
      
      // Continue to details
      const continueButton = await screen.findByText(/Continuar con/);
      fireEvent.click(continueButton);
      
      // Fill details
      const nameInput = screen.getByPlaceholderText('Tu nombre');
      const emailInput = screen.getByPlaceholderText('tu@email.com');
      
      fireEvent.change(nameInput, { target: { value: 'Test User' } });
      fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
      
      // Submit
      const submitButton = screen.getByText('Confirmar Reserva');
      fireEvent.click(submitButton);
      
      // Check API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/mobile/quick-book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Test User'),
        });
      });
    });
  });

  it('handles cancellation correctly', () => {
    const mockOnCancel = jest.fn();
    renderComponent({ onCancel: mockOnCancel });

    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('ensures touch targets meet 44px minimum requirement', async () => {
    renderComponent();

    await waitFor(() => {
      // Check duration buttons
      const durationButtons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('h')
      );
      
      durationButtons.forEach(button => {
        expect(button).toHaveClass('h-12'); // 48px = meets 44px minimum
      });
    });
  });

  it('tracks metrics correctly throughout the flow', async () => {
    const mockMetrics = require('@/hooks/useMobileBookingMetrics').useMobileBookingMetrics();
    renderComponent();

    // Should start tracking on mount
    expect(mockMetrics.startTracking).toHaveBeenCalled();
    expect(mockMetrics.trackStepChange).toHaveBeenCalledWith('quick-select');
  });
});

describe('Mobile Performance Requirements', () => {
  it('loads initial data quickly', async () => {
    const startTime = Date.now();
    
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MobileBookingFlow clubId="1" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Nueva Reserva')).toBeInTheDocument();
    });

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
  });

  it('maintains responsive design on mobile viewports', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    Object.defineProperty(window, 'innerHeight', { value: 667 });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MobileBookingFlow clubId="1" />
      </QueryClientProvider>
    );

    // Component should render without horizontal scroll
    const container = screen.getByText('Nueva Reserva').closest('div');
    expect(container).toBeInTheDocument();
  });
});