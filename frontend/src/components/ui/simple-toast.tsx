'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

let toastId = 0;
const listeners = new Set<(toasts: Toast[]) => void>();
let toasts: Toast[] = [];

function notifyListeners() {
  listeners.forEach(listener => listener([...toasts]));
}

export const toast = {
  success: (message: string) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = { id, message, type: 'success', timestamp: Date.now() };
    toasts = [...toasts, newToast];
    notifyListeners();
    
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, 4000);
  },
  error: (message: string) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = { id, message, type: 'error', timestamp: Date.now() };
    toasts = [...toasts, newToast];
    notifyListeners();
    
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, 4000);
  },
  info: (message: string) => {
    const id = `toast-${++toastId}`;
    const newToast: Toast = { id, message, type: 'info', timestamp: Date.now() };
    toasts = [...toasts, newToast];
    notifyListeners();
    
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
      notifyListeners();
    }, 4000);
  }
};

export function SimpleToaster() {
  const [activeToasts, setActiveToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Clear all toasts on mount
    toasts = [];
    notifyListeners();
    
    const updateToasts = (newToasts: Toast[]) => {
      setActiveToasts(newToasts);
    };
    
    listeners.add(updateToasts);
    return () => {
      listeners.delete(updateToasts);
    };
  }, []);

  const removeToast = (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notifyListeners();
  };

  if (activeToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {activeToasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center justify-between gap-3 px-4 py-3 rounded-lg shadow-lg
            min-w-[300px] max-w-[500px] animate-slide-in-right
            ${toast.type === 'success' ? 'bg-green-600 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-600 text-white' : ''}
            ${toast.type === 'info' ? 'bg-gray-800 text-white' : ''}
          `}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}