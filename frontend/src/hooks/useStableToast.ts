import { useCallback, useRef } from 'react';
import { toast } from '@/lib/toast';

export function useStableToast() {
  const lastToastRef = useRef<{ message: string; timestamp: number } | null>(null);
  
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    const now = Date.now();
    
    // Prevent duplicate toasts within 100ms
    if (lastToastRef.current && 
        lastToastRef.current.message === message && 
        now - lastToastRef.current.timestamp < 100) {
      return;
    }
    
    lastToastRef.current = { message, timestamp: now };
    
    if (type === 'success') {
      toast.success(message);
    } else {
      toast.error(message);
    }
  }, []);

  return {
    success: useCallback((message: string) => showToast('success', message), [showToast]),
    error: useCallback((message: string) => showToast('error', message), [showToast]),
  };
}