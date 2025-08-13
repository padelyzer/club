import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useUnifiedStore } from '@/store/unified-store';
import { feedback } from '@/components/ui/action-feedback';

// Mock components that use the store
const UserProfile = () => {
  const { user, isAuthenticated, login, logout } = useUnifiedStore();
  
  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <button onClick={() => login({ email: 'test@example.com', id: '1' } as any)}>
          Login
        </button>
      )}
    </div>
  );
};

const NotificationPanel = () => {
  const { notifications, addNotification, removeNotification, clearNotifications } = useUnifiedStore();
  
  return (
    <div>
      <button onClick={() => addNotification({
        id: Date.now().toString(),
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test',
      })}>
        Add Notification
      </button>
      <button onClick={clearNotifications}>Clear All</button>
      <div>
        {notifications.map(notif => (
          <div key={notif.id}>
            <span>{notif.title}</span>
            <button onClick={() => removeNotification(notif.id)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useUnifiedStore();
  
  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
};

const OptimisticUpdateDemo = () => {
  const { 
    addOptimisticUpdate, 
    commitOptimisticUpdate, 
    revertOptimisticUpdate 
  } = useUnifiedStore();
  
  const handleUpdate = async () => {
    const updateId = Date.now().toString();
    
    // Add optimistic update
    addOptimisticUpdate(updateId, {
      type: 'update',
      data: { status: 'pending' }
    });
    
    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.5) {
            resolve(true);
          } else {
            reject(new Error('Failed'));
          }
        }, 1000);
      });
      
      // Commit on success
      commitOptimisticUpdate(updateId);
    } catch (error) {
      // Revert on failure
      revertOptimisticUpdate(updateId);
    }
  };
  
  return (
    <button onClick={handleUpdate}>
      Perform Optimistic Update
    </button>
  );
};

describe('Unified Store Integration', () => {
  beforeEach(() => {
    // Reset store state
    useUnifiedStore.setState({
      user: null,
      isAuthenticated: false,
      notifications: [],
      theme: 'light',
      optimisticUpdates: new Map(),
    });
  });

  describe('Authentication Flow', () => {
    it('handles login and logout correctly', async () => {
      render(<UserProfile />);
      
      // Initially not authenticated
      expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
      
      // Login
      fireEvent.click(screen.getByText('Login'));
      
      await waitFor(() => {
        expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
      });
      
      // Logout
      fireEvent.click(screen.getByText('Logout'));
      
      await waitFor(() => {
        expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
      });
    });

    it('persists authentication state', () => {
      const { rerender } = render(<UserProfile />);
      
      // Login
      fireEvent.click(screen.getByText('Login'));
      
      // Unmount and remount
      rerender(<div />);
      rerender(<UserProfile />);
      
      // Should still be authenticated
      expect(screen.getByText('Welcome, test@example.com')).toBeInTheDocument();
    });
  });

  describe('Notification Management', () => {
    it('adds and removes notifications', async () => {
      render(<NotificationPanel />);
      
      // Add notification
      fireEvent.click(screen.getByText('Add Notification'));
      
      await waitFor(() => {
        expect(screen.getByText('Test Notification')).toBeInTheDocument();
      });
      
      // Remove notification
      fireEvent.click(screen.getByText('Remove'));
      
      await waitFor(() => {
        expect(screen.queryByText('Test Notification')).not.toBeInTheDocument();
      });
    });

    it('clears all notifications', async () => {
      render(<NotificationPanel />);
      
      // Add multiple notifications
      fireEvent.click(screen.getByText('Add Notification'));
      fireEvent.click(screen.getByText('Add Notification'));
      
      await waitFor(() => {
        expect(screen.getAllByText('Test Notification')).toHaveLength(2);
      });
      
      // Clear all
      fireEvent.click(screen.getByText('Clear All'));
      
      await waitFor(() => {
        expect(screen.queryByText('Test Notification')).not.toBeInTheDocument();
      });
    });
  });

  describe('Theme Management', () => {
    it('toggles theme between light and dark', () => {
      render(<ThemeToggle />);
      
      expect(screen.getByText('Current theme: light')).toBeInTheDocument();
      
      // Toggle to dark
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Current theme: dark')).toBeInTheDocument();
      
      // Toggle back to light
      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByText('Current theme: light')).toBeInTheDocument();
    });
  });

  describe('Optimistic Updates', () => {
    it('handles successful optimistic update', async () => {
      // Mock Math.random to always succeed
      jest.spyOn(Math, 'random').mockReturnValue(0.7);
      
      render(<OptimisticUpdateDemo />);
      
      const store = useUnifiedStore.getState();
      expect(store.optimisticUpdates.size).toBe(0);
      
      // Perform update
      fireEvent.click(screen.getByText('Perform Optimistic Update'));
      
      // Check optimistic update was added
      await waitFor(() => {
        const state = useUnifiedStore.getState();
        expect(state.optimisticUpdates.size).toBe(1);
      });
      
      // Wait for commit
      await waitFor(() => {
        const state = useUnifiedStore.getState();
        expect(state.optimisticUpdates.size).toBe(0);
      }, { timeout: 2000 });
      
      jest.restoreAllMocks();
    });

    it('handles failed optimistic update with revert', async () => {
      // Mock Math.random to always fail
      jest.spyOn(Math, 'random').mockReturnValue(0.3);
      
      render(<OptimisticUpdateDemo />);
      
      // Perform update
      fireEvent.click(screen.getByText('Perform Optimistic Update'));
      
      // Check optimistic update was added
      await waitFor(() => {
        const state = useUnifiedStore.getState();
        expect(state.optimisticUpdates.size).toBe(1);
      });
      
      // Wait for revert
      await waitFor(() => {
        const state = useUnifiedStore.getState();
        expect(state.optimisticUpdates.size).toBe(0);
      }, { timeout: 2000 });
      
      jest.restoreAllMocks();
    });
  });

  describe('Cache Management', () => {
    it('sets and retrieves cached data', () => {
      const store = useUnifiedStore.getState();
      
      // Set cache
      act(() => {
        store.setCache('test-key', { data: 'test-value' });
      });
      
      // Get cache
      const cached = store.getCache('test-key');
      expect(cached).toEqual({ data: 'test-value' });
    });

    it('invalidates cache', () => {
      const store = useUnifiedStore.getState();
      
      // Set cache
      act(() => {
        store.setCache('test-key', { data: 'test-value' });
      });
      
      // Invalidate
      act(() => {
        store.invalidateCache('test-key');
      });
      
      // Should return null
      const cached = store.getCache('test-key');
      expect(cached).toBeNull();
    });

    it('clears all cache', () => {
      const store = useUnifiedStore.getState();
      
      // Set multiple cache entries
      act(() => {
        store.setCache('key1', { data: 'value1' });
        store.setCache('key2', { data: 'value2' });
      });
      
      // Clear all
      act(() => {
        store.clearCache();
      });
      
      // Both should be null
      expect(store.getCache('key1')).toBeNull();
      expect(store.getCache('key2')).toBeNull();
    });
  });

  describe('Cross-Slice Interactions', () => {
    it('coordinates between auth and notifications', async () => {
      const TestComponent = () => {
        const { isAuthenticated, login, logout, notifications } = useUnifiedStore();
        
        const handleLogin = () => {
          login({ email: 'test@example.com', id: '1' } as any);
          // Simulate adding a welcome notification on login
          useUnifiedStore.getState().addNotification({
            id: 'welcome',
            type: 'success',
            title: 'Welcome back!',
            message: 'You have successfully logged in.',
          });
        };
        
        const handleLogout = () => {
          logout();
          // Clear notifications on logout
          useUnifiedStore.getState().clearNotifications();
        };
        
        return (
          <div>
            <div>Auth: {isAuthenticated ? 'Yes' : 'No'}</div>
            <div>Notifications: {notifications.length}</div>
            {!isAuthenticated && <button onClick={handleLogin}>Login</button>}
            {isAuthenticated && <button onClick={handleLogout}>Logout</button>}
          </div>
        );
      };
      
      render(<TestComponent />);
      
      expect(screen.getByText('Auth: No')).toBeInTheDocument();
      expect(screen.getByText('Notifications: 0')).toBeInTheDocument();
      
      // Login
      fireEvent.click(screen.getByText('Login'));
      
      await waitFor(() => {
        expect(screen.getByText('Auth: Yes')).toBeInTheDocument();
        expect(screen.getByText('Notifications: 1')).toBeInTheDocument();
      });
      
      // Logout
      fireEvent.click(screen.getByText('Logout'));
      
      await waitFor(() => {
        expect(screen.getByText('Auth: No')).toBeInTheDocument();
        expect(screen.getByText('Notifications: 0')).toBeInTheDocument();
      });
    });
  });
});