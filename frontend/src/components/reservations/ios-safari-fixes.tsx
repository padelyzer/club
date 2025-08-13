'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * iOS Safari Booking Fixes
 * 
 * Known issues in iOS Safari:
 * 1. Date inputs don't trigger onChange reliably
 * 2. Touch events can be delayed or missed
 * 3. Viewport issues with keyboard
 * 4. CSS animations can cause flickering
 * 5. Fixed positioning problems with bottom navigation
 */

// Detect iOS Safari
export const isIOSSafari = () => {
  if (typeof window === 'undefined') return false;
  
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const webkit = /WebKit/.test(ua);
  const safari = /Safari/.test(ua);
  const chrome = /Chrome/.test(ua);
  const edge = /Edge/.test(ua);
  
  return iOS && webkit && safari && !chrome && !edge;
};

// iOS-optimized date input wrapper
export const IOSDateInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
}> = ({ value, onChange, min, max, className }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [internalValue, setInternalValue] = useState(value);
  
  useEffect(() => {
    setInternalValue(value);
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    
    // Use RAF to ensure iOS Safari processes the change
    requestAnimationFrame(() => {
      onChange(newValue);
    });
  };
  
  const handleBlur = () => {
    // Force update on blur for iOS Safari
    if (internalValue !== value) {
      onChange(internalValue);
    }
  };
  
  // Fix iOS Safari date input styling
  useEffect(() => {
    if (isIOSSafari() && inputRef.current) {
      // Force native date picker
      inputRef.current.setAttribute('type', 'date');
      
      // Prevent zoom on focus
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        const originalContent = viewport.getAttribute('content') || '';
        
        inputRef.current.addEventListener('focus', () => {
          viewport.setAttribute('content', originalContent + ', maximum-scale=1.0');
        });
        
        inputRef.current.addEventListener('blur', () => {
          viewport.setAttribute('content', originalContent);
        });
      }
    }
  }, []);
  
  return (
    <input
      ref={inputRef}
      type="date"
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      className={cn(
        'w-full px-4 py-3 border border-gray-200 rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        // iOS Safari specific styles
        isIOSSafari() && [
          'appearance-none',
          '-webkit-appearance-none',
          'min-h-[44px]', // Apple HIG minimum touch target
          'text-[16px]', // Prevent zoom on focus
        ],
        className
      )}
    />
  );
};

// iOS-optimized touch button
export const IOSTouchButton: React.FC<{
  onClick: (e: React.MouseEvent | React.TouchEvent) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, disabled, variant = 'primary', size = 'md', className, children }) => {
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(true);
    
    // Haptic feedback for iOS
    if (isIOSSafari() && window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsPressed(false);
    
    if (!disabled) {
      // Use RAF to ensure iOS Safari processes the event
      requestAnimationFrame(() => {
        onClick(e);
      });
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (!disabled && !isIOSSafari()) {
      onClick(e);
    }
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[44px]',
    md: 'px-4 py-3 text-base min-h-[44px]',
    lg: 'px-6 py-4 text-lg min-h-[56px]',
  };
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
    outline: 'border-2 border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
  };
  
  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      onTouchStart={isIOSSafari() ? handleTouchStart : undefined}
      onTouchEnd={isIOSSafari() ? handleTouchEnd : undefined}
      disabled={disabled}
      className={cn(
        'rounded-xl font-medium transition-all',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        sizeClasses[size],
        variantClasses[variant],
        isPressed && 'scale-95 opacity-90',
        disabled && 'opacity-50 cursor-not-allowed',
        // iOS Safari specific
        isIOSSafari() && [
          'touch-manipulation', // Disable double-tap zoom
          '-webkit-tap-highlight-color-transparent', // Remove tap highlight
          'select-none', // Prevent text selection
        ],
        className
      )}
    >
      {children}
    </button>
  );
};

// iOS-optimized time slot grid
export const IOSTimeSlotGrid: React.FC<{
  slots: Array<{ time: string; available: boolean; price?: number }>;
  selectedTime: string;
  onSelectTime: (time: string) => void;
  className?: string;
}> = ({ slots, selectedTime, onSelectTime, className }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Prevent momentum scrolling issues
  useEffect(() => {
    if (isIOSSafari() && gridRef.current) {
      gridRef.current.style.webkitOverflowScrolling = 'touch';
      
      // Prevent bounce scrolling
      let startY = 0;
      
      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0].pageY;
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        const element = gridRef.current!;
        const y = e.touches[0].pageY;
        const scrollTop = element.scrollTop;
        const scrollHeight = element.scrollHeight;
        const height = element.clientHeight;
        
        const isScrollingUp = y > startY && scrollTop === 0;
        const isScrollingDown = y < startY && scrollHeight - height === scrollTop;
        
        if (isScrollingUp || isScrollingDown) {
          e.preventDefault();
        }
      };
      
      gridRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
      gridRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
      
      return () => {
        if (gridRef.current) {
          gridRef.current.removeEventListener('touchstart', handleTouchStart);
          gridRef.current.removeEventListener('touchmove', handleTouchMove);
        }
      };
    }
  }, []);
  
  return (
    <div
      ref={gridRef}
      className={cn(
        'grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto',
        // iOS Safari scrolling optimization
        isIOSSafari() && [
          'overflow-scrolling-touch',
          '-webkit-overflow-scrolling-touch',
        ],
        className
      )}
    >
      {slots.map((slot) => (
        <IOSTouchButton
          key={slot.time}
          onClick={() => slot.available && onSelectTime(slot.time)}
          disabled={!slot.available}
          variant={selectedTime === slot.time ? 'primary' : 'outline'}
          size="sm"
          className="w-full"
        >
          <div className="flex flex-col items-center">
            <span className="font-medium">{slot.time}</span>
            {slot.available && slot.price && (
              <span className="text-xs mt-1 opacity-75">
                ${slot.price}
              </span>
            )}
          </div>
        </IOSTouchButton>
      ))}
    </div>
  );
};

// iOS viewport fix hook
export const useIOSViewportFix = () => {
  useEffect(() => {
    if (!isIOSSafari()) return;
    
    // Fix viewport height issues with iOS Safari
    const updateViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    window.addEventListener('orientationchange', updateViewportHeight);
    
    // Fix for iOS Safari address bar
    let lastScrollY = 0;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const difference = Math.abs(currentScrollY - lastScrollY);
      
      // Minimal scroll to hide address bar
      if (difference < 10 && currentScrollY > 0) {
        window.scrollTo(0, 1);
      }
      
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
};

// Export all iOS Safari fixes
export const IOSSafariFixes = {
  isIOSSafari,
  IOSDateInput,
  IOSTouchButton,
  IOSTimeSlotGrid,
  useIOSViewportFix,
};