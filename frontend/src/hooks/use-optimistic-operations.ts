import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDataSync } from './use-data-sync';
import { toast } from '@/components/ui/simple-toast';

/**
 * Hook for common optimistic operations
 */

// Optimistic reservation creation
export function useOptimisticReservation() {
  const queryClient = useQueryClient();
  
  return useDataSync(
    async (data: any) => {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to create reservation');
      return response.json();
    },
    {
      key: ['reservations'],
      optimistic: true,
      invalidateOnSuccess: true,
      invalidatePattern: 'reservation|court|availability',
      onSuccess: () => {
        toast.success('Reservation created successfully!');
      },
      onError: (error) => {
        toast.error('Failed to create reservation. Please try again.');
      },
    }
  );
}

// Optimistic client update
export function useOptimisticClientUpdate() {
  return useDataSync(
    async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to update client');
      return response.json();
    },
    {
      key: ['clients'],
      optimistic: true,
      invalidateOnSuccess: true,
      onSuccess: () => {
        toast.success('Client updated successfully!');
      },
      onError: (error) => {
        toast.error('Failed to update client. Please try again.');
      },
    }
  );
}

// Optimistic tournament registration
export function useOptimisticTournamentRegistration() {
  const queryClient = useQueryClient();
  
  return useDataSync(
    async ({ tournamentId, data }: { tournamentId: string; data: any }) => {
      const response = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) throw new Error('Failed to register for tournament');
      return response.json();
    },
    {
      key: ['tournament-registrations'],
      optimistic: true,
      invalidatePattern: 'tournament',
      onSuccess: () => {
        toast.success('Successfully registered for tournament!');
      },
      onError: (error) => {
        toast.error('Failed to register. Please try again.');
      },
    }
  );
}

// Optimistic class enrollment
export function useOptimisticClassEnrollment() {
  return useDataSync(
    async ({ classId, studentId }: { classId: string; studentId: string }) => {
      const response = await fetch(`/api/classes/${classId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId }),
      });
      
      if (!response.ok) throw new Error('Failed to enroll in class');
      return response.json();
    },
    {
      key: ['class-enrollments'],
      optimistic: true,
      invalidatePattern: 'class|enrollment',
      onSuccess: () => {
        toast.success('Successfully enrolled in class!');
      },
      onError: (error) => {
        toast.error('Failed to enroll. Please try again.');
      },
    }
  );
}

// Optimistic payment processing
export function useOptimisticPayment() {
  const queryClient = useQueryClient();
  
  return useDataSync(
    async (paymentData: any) => {
      // Simulate payment processing
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      });
      
      if (!response.ok) throw new Error('Payment failed');
      return response.json();
    },
    {
      key: ['payments'],
      optimistic: true,
      invalidateOnSuccess: true,
      invalidatePattern: 'payment|transaction|balance',
      onSuccess: (data) => {
        toast.success(`Payment of $${data.amount} processed successfully!`);
      },
      onError: (error) => {
        toast.error('Payment failed. Please check your payment details.');
      },
    }
  );
}

// Optimistic notification actions
export function useOptimisticNotificationUpdate() {
  const queryClient = useQueryClient();
  
  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistically update the notification
    queryClient.setQueryData(['notifications'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        results: old.results.map((n: any) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      };
    });
    
    try {
      await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
    } catch (error) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      throw error;
    }
  }, [queryClient]);
  
  const markAllAsRead = useCallback(async () => {
    // Optimistically update all notifications
    queryClient.setQueryData(['notifications'], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        results: old.results.map((n: any) => ({ ...n, read: true })),
      };
    });
    
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
      });
    } catch (error) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      throw error;
    }
  }, [queryClient]);
  
  return { markAsRead, markAllAsRead };
}

// Optimistic favorite toggle
export function useOptimisticFavorite(entityType: 'club' | 'court' | 'instructor') {
  const queryClient = useQueryClient();
  
  return useCallback(async (entityId: string, isFavorite: boolean) => {
    const queryKey = [`${entityType}s`];
    
    // Optimistically update
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        results: old.results.map((item: any) =>
          item.id === entityId ? { ...item, is_favorite: !isFavorite } : item
        ),
      };
    });
    
    try {
      const response = await fetch(`/api/${entityType}s/${entityId}/favorite`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to update favorite');
      
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey });
      toast.error('Failed to update favorite');
      throw error;
    }
  }, [entityType, queryClient]);
}

// Optimistic bulk operations
export function useOptimisticBulkOperation<T>(
  operation: (items: T[]) => Promise<any>,
  options: {
    queryKey: string[];
    onProgress?: (progress: number) => void;
  }
) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const execute = useCallback(async (items: T[]) => {
    setIsProcessing(true);
    setProgress(0);
    
    // Store original data for rollback
    const originalData = queryClient.getQueryData(options.queryKey);
    
    try {
      // Optimistically update UI
      queryClient.setQueryData(options.queryKey, (old: any) => {
        // Update based on operation type
        return old;
      });
      
      // Process in batches
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(item => operation([item]).catch(err => ({ error: err })))
        );
        
        results.push(...batchResults);
        
        const currentProgress = Math.round(((i + batch.length) / items.length) * 100);
        setProgress(currentProgress);
        options.onProgress?.(currentProgress);
      }
      
      // Invalidate to get fresh data
      await queryClient.invalidateQueries({ queryKey: options.queryKey });
      
      return results;
    } catch (error) {
      // Rollback on error
      queryClient.setQueryData(options.queryKey, originalData);
      throw error;
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [operation, options, queryClient]);
  
  return {
    execute,
    isProcessing,
    progress,
  };
}

// Import useState
import { useState } from 'react';