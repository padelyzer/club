import { useEffect, useRef, useState, RefObject, KeyboardEvent } from 'react';

/**
 * Accessibility hooks for improved UX
 */

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean = true): RefObject<HTMLDivElement> {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Store currently focused element
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus first element
    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown as any);

    return () => {
      container.removeEventListener('keydown', handleKeyDown as any);
      // Restore focus to previously focused element
      previouslyFocused?.focus();
    };
  }, [isActive]);

  return containerRef;
}

// Keyboard navigation for lists
export function useListKeyboardNavigation<T extends HTMLElement>(
  items: T[],
  options: {
    onSelect?: (index: number) => void;
    onEscape?: () => void;
    loop?: boolean;
    orientation?: 'vertical' | 'horizontal' | 'grid';
    gridColumns?: number;
  } = {}
) {
  const {
    onSelect,
    onEscape,
    loop = true,
    orientation = 'vertical',
    gridColumns = 1,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < items.length) {
      items[focusedIndex]?.focus();
    }
  }, [focusedIndex, items]);

  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;
    const currentIndex = focusedIndex;
    let nextIndex = currentIndex;

    switch (key) {
      case 'ArrowDown':
        e.preventDefault();
        if (orientation === 'vertical') {
          nextIndex = currentIndex + 1;
        } else if (orientation === 'grid') {
          nextIndex = currentIndex + gridColumns;
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (orientation === 'vertical') {
          nextIndex = currentIndex - 1;
        } else if (orientation === 'grid') {
          nextIndex = currentIndex - gridColumns;
        }
        break;

      case 'ArrowRight':
        e.preventDefault();
        if (orientation === 'horizontal' || orientation === 'grid') {
          nextIndex = currentIndex + 1;
        }
        break;

      case 'ArrowLeft':
        e.preventDefault();
        if (orientation === 'horizontal' || orientation === 'grid') {
          nextIndex = currentIndex - 1;
        }
        break;

      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;

      case 'End':
        e.preventDefault();
        nextIndex = items.length - 1;
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (currentIndex >= 0 && onSelect) {
          onSelect(currentIndex);
        }
        break;

      case 'Escape':
        e.preventDefault();
        if (onEscape) {
          onEscape();
        }
        break;

      default:
        return;
    }

    // Handle looping
    if (loop) {
      if (nextIndex < 0) {
        nextIndex = items.length - 1;
      } else if (nextIndex >= items.length) {
        nextIndex = 0;
      }
    } else {
      nextIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
    }

    setFocusedIndex(nextIndex);
  };

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    focusFirst: () => setFocusedIndex(0),
    focusLast: () => setFocusedIndex(items.length - 1),
  };
}

// Announce changes to screen readers
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create announce element
    const announceEl = document.createElement('div');
    announceEl.setAttribute('role', 'status');
    announceEl.setAttribute('aria-live', 'polite');
    announceEl.setAttribute('aria-atomic', 'true');
    announceEl.style.position = 'absolute';
    announceEl.style.left = '-10000px';
    announceEl.style.width = '1px';
    announceEl.style.height = '1px';
    announceEl.style.overflow = 'hidden';
    document.body.appendChild(announceEl);
    announceRef.current = announceEl;

    return () => {
      document.body.removeChild(announceEl);
    };
  }, []);

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  };

  return announce;
}

// Skip navigation link
export function useSkipNav() {
  const skipNavRef = useRef<HTMLAnchorElement>(null);

  const focusSkipNav = () => {
    skipNavRef.current?.focus();
  };

  return {
    skipNavRef,
    focusSkipNav,
  };
}

// Roving tabindex for composite widgets
export function useRovingTabIndex(
  items: HTMLElement[],
  defaultIndex: number = 0
) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  useEffect(() => {
    items.forEach((item, index) => {
      item.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
    });
  }, [items, activeIndex]);

  const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = items.length - 1;
        break;
    }

    if (nextIndex !== currentIndex) {
      setActiveIndex(nextIndex);
      items[nextIndex]?.focus();
    }
  };

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}

// ARIA live region for dynamic updates
export function useLiveRegion(
  mode: 'polite' | 'assertive' = 'polite',
  atomic: boolean = true
) {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = (text: string, clearAfter: number = 5000) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMessage(text);

    if (clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        setMessage('');
      }, clearAfter);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const liveRegionProps = {
    role: 'status',
    'aria-live': mode,
    'aria-atomic': atomic,
    className: 'sr-only',
  };

  return {
    announce,
    message,
    liveRegionProps,
  };
}

