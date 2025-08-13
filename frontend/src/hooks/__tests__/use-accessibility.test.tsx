import { renderHook, act } from '@testing-library/react';
import { 
  useFocusTrap, 
  useListKeyboardNavigation,
  useAnnounce,
  useSkipNav,
  useRovingTabIndex,
  useLiveRegion
} from '../use-accessibility';

// Mock DOM elements
const createMockElement = (tag = 'div'): HTMLElement => {
  const element = document.createElement(tag);
  element.focus = jest.fn();
  element.blur = jest.fn();
  return element;
};

describe('useFocusTrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns a ref object', () => {
    const { result } = renderHook(() => useFocusTrap());
    expect(result.current).toHaveProperty('current');
  });

  it('traps focus within container when active', () => {
    const { result } = renderHook(() => useFocusTrap(true));
    
    // Create container with focusable elements
    const container = document.createElement('div');
    const button1 = createMockElement('button');
    const button2 = createMockElement('button');
    const input = createMockElement('input');
    
    container.appendChild(button1);
    container.appendChild(input);
    container.appendChild(button2);
    
    // Set the ref
    result.current.current = container;
    
    // Trigger effect
    act(() => {
      // Force useEffect to run
      result.rerender();
    });
    
    // First element should be focused
    expect(button1.focus).toHaveBeenCalled();
  });

  it('restores previous focus when deactivated', () => {
    const previousElement = createMockElement('button');
    document.body.appendChild(previousElement);
    previousElement.focus();
    
    const { result, rerender } = renderHook(
      ({ active }) => useFocusTrap(active),
      { initialProps: { active: true } }
    );
    
    const container = document.createElement('div');
    const button = createMockElement('button');
    container.appendChild(button);
    result.current.current = container;
    
    // Deactivate trap
    rerender({ active: false });
    
    // Cleanup function should restore focus
    act(() => {
      result.unmount();
    });
  });
});

describe('useListKeyboardNavigation', () => {
  it('manages focused index state', () => {
    const items = [
      createMockElement(),
      createMockElement(),
      createMockElement(),
    ];
    
    const { result } = renderHook(() => 
      useListKeyboardNavigation(items)
    );
    
    expect(result.current.focusedIndex).toBe(-1);
    
    act(() => {
      result.current.setFocusedIndex(1);
    });
    
    expect(result.current.focusedIndex).toBe(1);
  });

  it('handles arrow key navigation', () => {
    const items = [
      createMockElement(),
      createMockElement(),
      createMockElement(),
    ];
    
    const { result } = renderHook(() => 
      useListKeyboardNavigation(items)
    );
    
    // Set initial focus
    act(() => {
      result.current.setFocusedIndex(0);
    });
    
    // Press ArrowDown
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    event.preventDefault = jest.fn();
    
    act(() => {
      result.current.handleKeyDown(event as any);
    });
    
    expect(result.current.focusedIndex).toBe(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('handles looping navigation', () => {
    const items = [
      createMockElement(),
      createMockElement(),
    ];
    
    const { result } = renderHook(() => 
      useListKeyboardNavigation(items, { loop: true })
    );
    
    // Set focus to last item
    act(() => {
      result.current.setFocusedIndex(1);
    });
    
    // Press ArrowDown (should loop to first)
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    
    act(() => {
      result.current.handleKeyDown(event as any);
    });
    
    expect(result.current.focusedIndex).toBe(0);
  });

  it('handles selection with Enter key', () => {
    const items = [createMockElement()];
    const onSelect = jest.fn();
    
    const { result } = renderHook(() => 
      useListKeyboardNavigation(items, { onSelect })
    );
    
    act(() => {
      result.current.setFocusedIndex(0);
    });
    
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    event.preventDefault = jest.fn();
    
    act(() => {
      result.current.handleKeyDown(event as any);
    });
    
    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('handles escape key', () => {
    const items = [createMockElement()];
    const onEscape = jest.fn();
    
    const { result } = renderHook(() => 
      useListKeyboardNavigation(items, { onEscape })
    );
    
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    event.preventDefault = jest.fn();
    
    act(() => {
      result.current.handleKeyDown(event as any);
    });
    
    expect(onEscape).toHaveBeenCalled();
  });
});

describe('useAnnounce', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('creates announcer element', () => {
    const { result } = renderHook(() => useAnnounce());
    
    const announcer = document.querySelector('[role="status"]');
    expect(announcer).toBeInTheDocument();
    expect(announcer).toHaveAttribute('aria-live', 'polite');
    expect(announcer).toHaveAttribute('aria-atomic', 'true');
  });

  it('announces messages', () => {
    const { result } = renderHook(() => useAnnounce());
    
    act(() => {
      result.current('Test announcement');
    });
    
    const announcer = document.querySelector('[role="status"]');
    expect(announcer?.textContent).toBe('Test announcement');
  });

  it('clears announcement after timeout', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useAnnounce());
    
    act(() => {
      result.current('Temporary message');
    });
    
    const announcer = document.querySelector('[role="status"]');
    expect(announcer?.textContent).toBe('Temporary message');
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(announcer?.textContent).toBe('');
    jest.useRealTimers();
  });

  it('sets aria-live priority', () => {
    const { result } = renderHook(() => useAnnounce());
    
    act(() => {
      result.current('Urgent message', 'assertive');
    });
    
    const announcer = document.querySelector('[role="status"]');
    expect(announcer).toHaveAttribute('aria-live', 'assertive');
  });
});

describe('useSkipNav', () => {
  it('returns skip nav ref and focus function', () => {
    const { result } = renderHook(() => useSkipNav());
    
    expect(result.current).toHaveProperty('skipNavRef');
    expect(result.current).toHaveProperty('focusSkipNav');
    expect(typeof result.current.focusSkipNav).toBe('function');
  });

  it('focuses skip nav element', () => {
    const { result } = renderHook(() => useSkipNav());
    
    const skipLink = createMockElement('a');
    result.current.skipNavRef.current = skipLink as HTMLAnchorElement;
    
    act(() => {
      result.current.focusSkipNav();
    });
    
    expect(skipLink.focus).toHaveBeenCalled();
  });
});

describe('useRovingTabIndex', () => {
  it('manages tabindex attributes', () => {
    const items = [
      createMockElement(),
      createMockElement(),
      createMockElement(),
    ];
    
    items.forEach(item => {
      item.setAttribute = jest.fn();
    });
    
    const { result } = renderHook(() => 
      useRovingTabIndex(items, 0)
    );
    
    // First item should have tabindex="0"
    expect(items[0].setAttribute).toHaveBeenCalledWith('tabindex', '0');
    // Others should have tabindex="-1"
    expect(items[1].setAttribute).toHaveBeenCalledWith('tabindex', '-1');
    expect(items[2].setAttribute).toHaveBeenCalledWith('tabindex', '-1');
  });

  it('handles keyboard navigation', () => {
    const items = [
      createMockElement(),
      createMockElement(),
    ];
    
    const { result } = renderHook(() => 
      useRovingTabIndex(items, 0)
    );
    
    const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    event.preventDefault = jest.fn();
    
    act(() => {
      result.current.handleKeyDown(event as any, 0);
    });
    
    expect(result.current.activeIndex).toBe(1);
    expect(items[1].focus).toHaveBeenCalled();
  });
});

describe('useLiveRegion', () => {
  it('manages live region messages', () => {
    const { result } = renderHook(() => useLiveRegion());
    
    expect(result.current.message).toBe('');
    
    act(() => {
      result.current.announce('New update available');
    });
    
    expect(result.current.message).toBe('New update available');
  });

  it('provides live region props', () => {
    const { result } = renderHook(() => 
      useLiveRegion('assertive', false)
    );
    
    expect(result.current.liveRegionProps).toEqual({
      role: 'status',
      'aria-live': 'assertive',
      'aria-atomic': false,
      className: 'sr-only',
    });
  });

  it('clears message after timeout', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useLiveRegion());
    
    act(() => {
      result.current.announce('Temporary', 1000);
    });
    
    expect(result.current.message).toBe('Temporary');
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current.message).toBe('');
    jest.useRealTimers();
  });
});