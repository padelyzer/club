import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CalendarView } from '../calendar-view';
import { 
  createTestWrapper, 
  mockBFFResponses, 
  setupGlobalMocks
} from '@/test-utils/setup';
import { createMockAvailability, createMockReservation } from '@/test-utils/mock-factories';

// Mock feature flags
vi.mock('@/lib/feature-flags', () => ({
  BFF_FEATURES: { availability: true }
}));

// Mock the availability hook
vi.mock('@/hooks/useAvailability', () => ({
  useAvailability: vi.fn(() => ({
    data: mockBFFResponses.availability,
    isLoading: false,
    error: null,
    refetch: vi.fn()
  }))
}));

// Mock drag and drop library
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false
  }),
  SortableContext: ({ children }: any) => children,
  verticalListSortingStrategy: []
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => children,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(),
  DragOverlay: () => null
}));

describe('ReservationCalendar with BFF Availability', () => {
  const user = userEvent.setup();
  const mockOnSlotSelect = vi.fn();
  const mockOnReservationClick = vi.fn();

  const defaultProps = {
    selectedDate: new Date('2024-01-15'),
    onSlotSelect: mockOnSlotSelect,
    onReservationClick: mockOnReservationClick,
    clubId: 'club1'
  };

  beforeEach(() => {
    setupGlobalMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should load availability from BFF', async () => {
    const useAvailabilityMock = await import('@/hooks/useAvailability');
    const mockRefetch = vi.fn();
    
    (useAvailabilityMock.useAvailability as any).mockReturnValue({
      data: mockBFFResponses.availability,
      isLoading: false,
      error: null,
      refetch: mockRefetch
    });

    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    });

    // Verify BFF data is used
    expect(useAvailabilityMock.useAvailability).toHaveBeenCalledWith({
      clubId: 'club1',
      dates: expect.arrayContaining(['2024-01-15']),
      courtIds: undefined
    });
  });

  it('should show correct time slots', async () => {
    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument();
    });

    // Verify time slots from BFF data
    expect(screen.getByText('09:00')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('11:00')).toBeInTheDocument();

    // Verify court headers
    expect(screen.getByText('Court 1')).toBeInTheDocument();
    expect(screen.getByText('Court 2')).toBeInTheDocument();
  });

  it('should display pricing properly', async () => {
    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByTestId('slot-09:00-court1')).toBeInTheDocument();
    });

    // Check price display for available slots
    const slot1 = screen.getByTestId('slot-09:00-court1');
    expect(within(slot1).getByText('$30')).toBeInTheDocument();

    const slot2 = screen.getByTestId('slot-10:00-court1');
    expect(within(slot2).getByText('$35')).toBeInTheDocument();
  });

  it('should show conflict detection visual', async () => {
    // Mock data with conflicts
    const mockDataWithConflicts = {
      ...mockBFFResponses.availability,
      courts: [
        {
          id: 'court1',
          name: 'Court 1',
          availableSlots: [
            { start: '09:00', end: '10:00', price: 30, isAvailable: true },
            { start: '10:00', end: '11:00', price: 35, isAvailable: false }
          ]
        }
      ]
    };

    const useAvailabilityMock = await import('@/hooks/useAvailability');
    (useAvailabilityMock.useAvailability as any).mockReturnValue({
      data: mockDataWithConflicts,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByTestId('slot-10:00-court1')).toBeInTheDocument();
    });

    // Unavailable slot should have different styling
    const unavailableSlot = screen.getByTestId('slot-10:00-court1');
    expect(unavailableSlot).toHaveClass('bg-gray-100', 'cursor-not-allowed');
    expect(within(unavailableSlot).getByText('Unavailable')).toBeInTheDocument();
  });

  it('should support drag & drop functionality', async () => {
    const mockReservations = [
      createMockReservation({
        id: 'res1',
        courtId: 'court1',
        startTime: '09:00',
        endTime: '10:00'
      })
    ];

    render(
      <CalendarView 
        {...defaultProps} 
        reservations={mockReservations}
        enableDragDrop 
      />, 
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('reservation-res1')).toBeInTheDocument();
    });

    const reservation = screen.getByTestId('reservation-res1');
    const targetSlot = screen.getByTestId('slot-10:00-court1');

    // Simulate drag start
    fireEvent.dragStart(reservation);

    // Simulate drag over
    fireEvent.dragOver(targetSlot);

    // Simulate drop
    fireEvent.drop(targetSlot);

    // Should trigger reservation update
    expect(mockOnSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        courtId: 'court1',
        startTime: '10:00',
        reservationId: 'res1'
      })
    );
  });

  it('should handle mobile touch gestures', async () => {
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true
    });

    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByTestId('slot-09:00-court1')).toBeInTheDocument();
    });

    const slot = screen.getByTestId('slot-09:00-court1');

    // Simulate touch events
    fireEvent.touchStart(slot, {
      touches: [{ clientX: 0, clientY: 0 }]
    });

    fireEvent.touchEnd(slot);

    // Should select slot on touch
    expect(mockOnSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        courtId: 'court1',
        startTime: '09:00',
        price: 30
      })
    );
  });

  it('should show loading state while fetching', async () => {
    const useAvailabilityMock = await import('@/hooks/useAvailability');
    (useAvailabilityMock.useAvailability as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn()
    });

    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    // Should show loading skeleton
    expect(screen.getByTestId('calendar-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Court 1')).not.toBeInTheDocument();
  });

  it('should handle date navigation', async () => {
    const useAvailabilityMock = await import('@/hooks/useAvailability');
    const mockRefetch = vi.fn();

    (useAvailabilityMock.useAvailability as any).mockReturnValue({
      data: mockBFFResponses.availability,
      isLoading: false,
      error: null,
      refetch: mockRefetch
    });

    const { rerender } = render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    // Change date
    const newDate = new Date('2024-01-16');
    rerender(<CalendarView {...defaultProps} selectedDate={newDate} />);

    // Should refetch with new date
    await waitFor(() => {
      expect(useAvailabilityMock.useAvailability).toHaveBeenCalledWith({
        clubId: 'club1',
        dates: expect.arrayContaining(['2024-01-16']),
        courtIds: undefined
      });
    });
  });

  it('should support court filtering', async () => {
    const filteredProps = {
      ...defaultProps,
      selectedCourts: ['court1']
    };

    const useAvailabilityMock = await import('@/hooks/useAvailability');
    (useAvailabilityMock.useAvailability as any).mockReturnValue({
      data: {
        ...mockBFFResponses.availability,
        courts: mockBFFResponses.availability.courts.filter(c => c.id === 'court1')
      },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    render(<CalendarView {...filteredProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByText('Court 1')).toBeInTheDocument();
    });

    // Should only show filtered court
    expect(screen.getByText('Court 1')).toBeInTheDocument();
    expect(screen.queryByText('Court 2')).not.toBeInTheDocument();

    // Verify hook was called with court filter
    expect(useAvailabilityMock.useAvailability).toHaveBeenCalledWith({
      clubId: 'club1',
      dates: expect.any(Array),
      courtIds: ['court1']
    });
  });

  it('should display time slot duration', async () => {
    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByTestId('slot-09:00-court1')).toBeInTheDocument();
    });

    // Check duration display
    const slot = screen.getByTestId('slot-09:00-court1');
    expect(within(slot).getByText('60 min')).toBeInTheDocument();
  });

  it('should handle slot selection', async () => {
    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByTestId('slot-09:00-court1')).toBeInTheDocument();
    });

    // Click available slot
    const availableSlot = screen.getByTestId('slot-09:00-court1');
    await user.click(availableSlot);

    expect(mockOnSlotSelect).toHaveBeenCalledWith({
      courtId: 'court1',
      courtName: 'Court 1',
      date: '2024-01-15',
      startTime: '09:00',
      endTime: '10:00',
      price: 30,
      duration: 60
    });
  });

  it('should not allow selection of unavailable slots', async () => {
    const mockDataWithUnavailable = {
      ...mockBFFResponses.availability,
      courts: [{
        id: 'court1',
        name: 'Court 1',
        availableSlots: [
          { start: '11:00', end: '12:00', price: 35, isAvailable: false }
        ]
      }]
    };

    const useAvailabilityMock = await import('@/hooks/useAvailability');
    (useAvailabilityMock.useAvailability as any).mockReturnValue({
      data: mockDataWithUnavailable,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    });

    render(<CalendarView {...defaultProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByTestId('slot-11:00-court1')).toBeInTheDocument();
    });

    // Click unavailable slot
    const unavailableSlot = screen.getByTestId('slot-11:00-court1');
    await user.click(unavailableSlot);

    // Should not trigger selection
    expect(mockOnSlotSelect).not.toHaveBeenCalled();
  });

  it('should show reservation details on hover', async () => {
    const mockReservations = [
      createMockReservation({
        id: 'res1',
        courtId: 'court1',
        courtName: 'Court 1',
        startTime: '09:00',
        endTime: '10:00',
        client: { name: 'John Doe' }
      })
    ];

    render(
      <CalendarView 
        {...defaultProps} 
        reservations={mockReservations}
      />, 
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('reservation-res1')).toBeInTheDocument();
    });

    const reservation = screen.getByTestId('reservation-res1');
    
    // Hover over reservation
    await user.hover(reservation);

    // Should show tooltip with details
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Court 1')).toBeInTheDocument();
      expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    });
  });

  it('should support week view mode', async () => {
    const weekViewProps = {
      ...defaultProps,
      viewMode: 'week' as const
    };

    render(<CalendarView {...weekViewProps} />, {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(screen.getByTestId('calendar-week-view')).toBeInTheDocument();
    });

    // Should show 7 days
    const dayHeaders = screen.getAllByTestId(/day-header-/);
    expect(dayHeaders).toHaveLength(7);

    // Should show dates for the week
    expect(screen.getByText('Mon 15')).toBeInTheDocument();
    expect(screen.getByText('Sun 21')).toBeInTheDocument();
  });
});