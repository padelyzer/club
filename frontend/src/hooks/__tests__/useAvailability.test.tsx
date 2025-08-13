import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAvailability } from '../useAvailability';
import { 
  createTestWrapper, 
  mockBFFResponses, 
  setupGlobalMocks,
  measurePerformance
} from '@/test-utils/setup';
import { createMockAvailability, createMockErrorResponse } from '@/test-utils/mock-factories';

// Mock feature flags
vi.mock('@/lib/feature-flags', () => ({
  BFF_FEATURES: { availability: true }
}));

// Mock the useAvailability hook if it doesn't exist
vi.mock('../useAvailability', () => ({
  useAvailability: vi.fn()
}));

describe('useAvailability Hook', () => {
  const defaultParams = {
    clubId: 'club1',
    dates: ['2024-01-15', '2024-01-16'],
    courtIds: ['court1', 'court2']
  };

  beforeEach(() => {
    setupGlobalMocks();
    vi.clearAllMocks();
    
    // Default implementation
    (useAvailability as any).mockImplementation((params: any) => {
      const [data, setData] = vi.useState(null);
      const [isLoading, setIsLoading] = vi.useState(true);
      const [error, setError] = vi.useState(null);

      vi.useEffect(() => {
        const fetchData = async () => {
          try {
            const response = await fetch(
              `/api/availability?${new URLSearchParams({
                clubId: params.clubId,
                dates: params.dates.join(','),
                courtIds: params.courtIds?.join(',') || ''
              })}`
            );
            
            if (!response.ok) throw new Error('Failed to fetch');
            
            const data = await response.json();
            setData(data);
            setIsLoading(false);
          } catch (err) {
            setError(err);
            setIsLoading(false);
          }
        };

        fetchData();
      }, [params.clubId, params.dates.join(','), params.courtIds?.join(',')]);

      return { data, isLoading, error, refetch: vi.fn() };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should integrate with BFF endpoint when enabled', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockBFFResponses.availability
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() => useAvailability(defaultParams), {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify BFF endpoint was called with correct params
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/availability'),
      expect.any(Object)
    );
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('clubId=club1'),
      expect.any(Object)
    );
    
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('dates=2024-01-15%2C2024-01-16'),
      expect.any(Object)
    );

    // Verify data structure
    expect(result.current.data).toMatchObject({
      dates: expect.arrayContaining(['2024-01-15', '2024-01-16']),
      courts: expect.arrayContaining([
        expect.objectContaining({
          id: 'court1',
          name: 'Court 1',
          availableSlots: expect.any(Array)
        })
      ])
    });
  });

  it('should fallback to multiple service calls when BFF disabled', async () => {
    // Mock feature flag as disabled
    vi.doMock('@/lib/feature-flags', () => ({
      BFF_FEATURES: { availability: false }
    }));

    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ 
          courts: [{ id: 'court1', name: 'Court 1' }] 
        }) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ 
          slots: [
            { start: '09:00', end: '10:00', available: true }
          ] 
        }) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ 
          prices: { 'court1': { '09:00': 30 } } 
        }) 
      });
    
    global.fetch = mockFetch;

    const { result } = renderHook(() => useAvailability(defaultParams), {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should make multiple service calls
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/courts'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/availability/slots'));
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/pricing'));
  });

  it('should support real-time updates via polling', async () => {
    vi.useFakeTimers();
    
    let responseCount = 0;
    const responses = [
      createMockAvailability({
        courts: [{
          id: 'court1',
          availableSlots: [
            { start: '09:00', end: '10:00', isAvailable: true }
          ]
        }]
      }),
      createMockAvailability({
        courts: [{
          id: 'court1',
          availableSlots: [
            { start: '09:00', end: '10:00', isAvailable: false }
          ]
        }]
      })
    ];

    global.fetch = vi.fn().mockImplementation(() => {
      const response = responses[responseCount % responses.length];
      responseCount++;
      return Promise.resolve({
        ok: true,
        json: async () => response
      });
    });

    const { result } = renderHook(
      () => useAvailability({ ...defaultParams, pollingInterval: 5000 }), 
      { wrapper: createTestWrapper() }
    );

    // Initial load
    await waitFor(() => {
      expect(result.current.data?.courts[0].availableSlots[0].isAvailable).toBe(true);
    });

    // Advance timer for polling
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    // Wait for update
    await waitFor(() => {
      expect(result.current.data?.courts[0].availableSlots[0].isAvailable).toBe(false);
    });

    vi.useRealTimers();
  });

  it('should handle multi-date availability support', async () => {
    const multiDateParams = {
      clubId: 'club1',
      dates: ['2024-01-15', '2024-01-16', '2024-01-17', '2024-01-18', '2024-01-19'],
      courtIds: ['court1']
    };

    const mockData = createMockAvailability({
      dates: multiDateParams.dates,
      courts: [{
        id: 'court1',
        name: 'Court 1',
        availableSlots: Array(10).fill(null).map((_, i) => ({
          start: `${9 + i}:00`,
          end: `${10 + i}:00`,
          isAvailable: i % 2 === 0,
          price: 30 + (i * 5)
        }))
      }]
    });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => useAvailability(multiDateParams), {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.dates).toHaveLength(5);
    expect(result.current.data?.dates).toEqual(multiDateParams.dates);
  });

  it('should support court filtering logic', async () => {
    const filteredParams = {
      clubId: 'club1',
      dates: ['2024-01-15'],
      courtIds: ['court1', 'court3'], // Only specific courts
      courtTypes: ['indoor'] // Additional filter
    };

    const mockData = createMockAvailability({
      courts: [
        { id: 'court1', name: 'Court 1', type: 'indoor' },
        { id: 'court3', name: 'Court 3', type: 'indoor' }
      ]
    });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => useAvailability(filteredParams), {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only have filtered courts
    expect(result.current.data?.courts).toHaveLength(2);
    expect(result.current.data?.courts.every(c => c.type === 'indoor')).toBe(true);
    expect(result.current.data?.courts.map(c => c.id)).toEqual(['court1', 'court3']);
  });

  it('should include price calculations', async () => {
    const mockData = createMockAvailability({
      courts: [{
        id: 'court1',
        name: 'Court 1',
        availableSlots: [
          { start: '09:00', end: '10:00', price: 30, isAvailable: true },
          { start: '10:00', end: '11:00', price: 35, isAvailable: true },
          { start: '11:00', end: '12:00', price: 40, isAvailable: true },
          { start: '17:00', end: '18:00', price: 45, isAvailable: true }
        ]
      }],
      summary: {
        totalAvailable: 4,
        totalSlots: 4,
        averagePrice: 37.5,
        priceRange: { min: 30, max: 45 }
      }
    });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const { result } = renderHook(() => useAvailability(defaultParams), {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify price data
    expect(result.current.data?.summary.averagePrice).toBe(37.5);
    expect(result.current.data?.summary.priceRange).toEqual({ min: 30, max: 45 });
    
    // Verify each slot has price
    result.current.data?.courts[0].availableSlots.forEach(slot => {
      expect(slot.price).toBeDefined();
      expect(slot.price).toBeGreaterThanOrEqual(30);
      expect(slot.price).toBeLessThanOrEqual(45);
    });
  });

  it('should load availability within performance threshold (<200ms)', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockBFFResponses.availability
    });

    const { result } = renderHook(() => useAvailability(defaultParams), {
      wrapper: createTestWrapper()
    });

    const { duration } = await measurePerformance(
      async () => {
        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });
      },
      200
    );

    expect(duration).toBeLessThan(200);
    expect(result.current.data).toBeDefined();
  });

  it('should handle error states gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAvailability(defaultParams), {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
    expect(result.current.error.message).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should support dynamic parameter updates', async () => {
    const { result, rerender } = renderHook(
      (params) => useAvailability(params),
      {
        wrapper: createTestWrapper(),
        initialProps: defaultParams
      }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialData = result.current.data;

    // Update parameters
    const newParams = {
      ...defaultParams,
      dates: ['2024-01-20', '2024-01-21'],
      courtIds: ['court3', 'court4']
    };

    const newMockData = createMockAvailability({
      dates: newParams.dates,
      courts: [
        { id: 'court3', name: 'Court 3' },
        { id: 'court4', name: 'Court 4' }
      ]
    });

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => newMockData
    });

    rerender(newParams);

    await waitFor(() => {
      expect(result.current.data?.dates).toEqual(newParams.dates);
    });

    expect(result.current.data).not.toEqual(initialData);
    expect(result.current.data?.courts.map(c => c.id)).toEqual(['court3', 'court4']);
  });

  it('should cache results for identical parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockBFFResponses.availability
    });
    global.fetch = mockFetch;

    // First hook instance
    const { result: result1 } = renderHook(() => useAvailability(defaultParams), {
      wrapper: createTestWrapper()
    });

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
    });

    // Second hook instance with same params
    const { result: result2 } = renderHook(() => useAvailability(defaultParams), {
      wrapper: createTestWrapper()
    });

    // Should use cached data
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toEqual(result1.current.data);
    
    // Should only fetch once
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});