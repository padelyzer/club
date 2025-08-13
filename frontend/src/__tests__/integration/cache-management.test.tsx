import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CacheManager } from '@/lib/cache-manager';
import { useUnifiedStore } from '@/store/unified-store';

// Mock API calls
const mockApi = {
  fetchUser: jest.fn(async (id: string) => ({
    id,
    name: `User ${id}`,
    email: `user${id}@example.com`,
  })),
  
  fetchPosts: jest.fn(async (userId: string) => [
    { id: '1', title: 'Post 1', userId },
    { id: '2', title: 'Post 2', userId },
  ]),
  
  fetchComments: jest.fn(async (postId: string) => [
    { id: '1', text: 'Comment 1', postId },
    { id: '2', text: 'Comment 2', postId },
  ]),
};

// Test component using cache
const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const cacheManager = CacheManager.getInstance();

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      
      // Try cache first
      const cached = await cacheManager.get(`user-${userId}`);
      if (cached) {
        setUser(cached);
        setFromCache(true);
        setLoading(false);
        return;
      }
      
      // Fetch from API
      const data = await mockApi.fetchUser(userId);
      await cacheManager.set(`user-${userId}`, data, { ttl: 60000 });
      setUser(data);
      setFromCache(false);
      setLoading(false);
    };
    
    loadUser();
  }, [userId]);

  const invalidateCache = async () => {
    await cacheManager.invalidate(`user-${userId}`);
    window.location.reload();
  };

  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <p>From Cache: {fromCache ? 'Yes' : 'No'}</p>
      <button onClick={invalidateCache}>Invalidate Cache</button>
    </div>
  );
};

// Component with dependent data caching
const PostsWithComments = ({ userId }: { userId: string }) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const cacheManager = CacheManager.getInstance();

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    const loadPosts = async () => {
      const cacheKey = `posts-${userId}`;
      
      // Check cache with tags
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        setPosts(cached);
        return;
      }
      
      // Fetch and cache with tags
      const data = await mockApi.fetchPosts(userId);
      await cacheManager.set(cacheKey, data, {
        ttl: 300000,
        tags: ['posts', `user-${userId}`],
      });
      setPosts(data);
    };
    
    loadPosts();
  }, [userId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (!selectedPost) return;
    
    const loadComments = async () => {
      const cacheKey = `comments-${selectedPost}`;
      
      const cached = await cacheManager.get(cacheKey);
      if (cached) {
        setComments(cached);
        return;
      }
      
      const data = await mockApi.fetchComments(selectedPost);
      await cacheManager.set(cacheKey, data, {
        ttl: 300000,
        tags: ['comments', `post-${selectedPost}`],
      });
      setComments(data);
    };
    
    loadComments();
  }, [selectedPost]);

  const invalidateUserData = async () => {
    await cacheManager.invalidateByTags([`user-${userId}`]);
    window.location.reload();
  };

  return (
    <div>
      <h3>Posts</h3>
      {posts.map(post => (
        <div key={post.id}>
          <button onClick={() => setSelectedPost(post.id)}>
            {post.title}
          </button>
        </div>
      ))}
      
      {selectedPost && (
        <div>
          <h4>Comments</h4>
          {comments.map(comment => (
            <p key={comment.id}>{comment.text}</p>
          ))}
        </div>
      )}
      
      <button onClick={invalidateUserData}>Invalidate User Data</button>
    </div>
  );
};

// Component using store cache
const StoreCache = () => {
  const { setCache, getCache, invalidateCache } = useUnifiedStore();
  const [value, setValue] = useState('');
  const [cachedValue, setCachedValue] = useState<string | null>(null);
  
  const handleSave = () => {
    setCache('test-key', { value });
  };
  
  const handleLoad = () => {
    const cached = getCache('test-key');
    setCachedValue(cached?.value || null);
  };
  
  const handleInvalidate = () => {
    invalidateCache('test-key');
    setCachedValue(null);
  };
  
  return (
    <div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter value"
      />
      <button onClick={handleSave}>Save to Cache</button>
      <button onClick={handleLoad}>Load from Cache</button>
      <button onClick={handleInvalidate}>Invalidate</button>
      {cachedValue && <p>Cached: {cachedValue}</p>}
    </div>
  );
};

// Test batch operations
const BatchOperations = () => {
  const cacheManager = CacheManager.getInstance();
  const [status, setStatus] = useState('');
  
  const performBatchSet = async () => {
    const entries = [
      { key: 'batch-1', value: 'Value 1', options: { ttl: 60000 } },
      { key: 'batch-2', value: 'Value 2', options: { ttl: 60000 } },
      { key: 'batch-3', value: 'Value 3', options: { ttl: 60000 } },
    ];
    
    await cacheManager.setMany(entries);
    setStatus('Batch set complete');
  };
  
  const performBatchGet = async () => {
    const keys = ['batch-1', 'batch-2', 'batch-3'];
    const values = await cacheManager.getMany(keys);
    setStatus(`Retrieved ${Object.keys(values).length} items`);
  };
  
  const performBatchDelete = async () => {
    const keys = ['batch-1', 'batch-2', 'batch-3'];
    await cacheManager.deleteMany(keys);
    setStatus('Batch delete complete');
  };
  
  return (
    <div>
      <button onClick={performBatchSet}>Batch Set</button>
      <button onClick={performBatchGet}>Batch Get</button>
      <button onClick={performBatchDelete}>Batch Delete</button>
      <p>Status: {status}</p>
    </div>
  );
};

describe('Cache Management Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    CacheManager.getInstance().clear();
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Basic Caching', () => {
    it('caches API responses', async () => {
      const { rerender } = render(<UserProfile userId="1" />);
      
      // First load - from API
      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
        expect(screen.getByText('From Cache: No')).toBeInTheDocument();
      });
      
      expect(mockApi.fetchUser).toHaveBeenCalledTimes(1);
      
      // Remount component - should load from cache
      rerender(<UserProfile userId="1" />);
      
      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
        expect(screen.getByText('From Cache: Yes')).toBeInTheDocument();
      });
      
      // Should not call API again
      expect(mockApi.fetchUser).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache entries', async () => {
      render(<UserProfile userId="1" />);
      
      await waitFor(() => {
        expect(screen.getByText('User 1')).toBeInTheDocument();
      });
      
      // Mock reload
      const reloadSpy = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        configurable: true,
        value: reloadSpy,
      });
      
      fireEvent.click(screen.getByText('Invalidate Cache'));
      
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('Tagged Caching', () => {
    it('invalidates by tags', async () => {
      render(<PostsWithComments userId="1" />);
      
      // Load posts
      await waitFor(() => {
        expect(screen.getByText('Post 1')).toBeInTheDocument();
        expect(screen.getByText('Post 2')).toBeInTheDocument();
      });
      
      expect(mockApi.fetchPosts).toHaveBeenCalledTimes(1);
      
      // Load comments for post 1
      fireEvent.click(screen.getByText('Post 1'));
      
      await waitFor(() => {
        expect(screen.getByText('Comment 1')).toBeInTheDocument();
      });
      
      expect(mockApi.fetchComments).toHaveBeenCalledTimes(1);
      
      // Mock reload
      const reloadSpy = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        configurable: true,
        value: reloadSpy,
      });
      
      // Invalidate all user data
      fireEvent.click(screen.getByText('Invalidate User Data'));
      
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('Store Cache Integration', () => {
    it('integrates with unified store', () => {
      render(<StoreCache />);
      
      // Save to cache
      fireEvent.change(screen.getByPlaceholderText('Enter value'), {
        target: { value: 'Test Value' },
      });
      fireEvent.click(screen.getByText('Save to Cache'));
      
      // Load from cache
      fireEvent.click(screen.getByText('Load from Cache'));
      
      expect(screen.getByText('Cached: Test Value')).toBeInTheDocument();
      
      // Invalidate
      fireEvent.click(screen.getByText('Invalidate'));
      
      expect(screen.queryByText('Cached: Test Value')).not.toBeInTheDocument();
    });
  });

  describe('Batch Operations', () => {
    it('performs batch set operations', async () => {
      render(<BatchOperations />);
      
      fireEvent.click(screen.getByText('Batch Set'));
      
      await waitFor(() => {
        expect(screen.getByText('Status: Batch set complete')).toBeInTheDocument();
      });
    });

    it('performs batch get operations', async () => {
      render(<BatchOperations />);
      
      // First set the values
      fireEvent.click(screen.getByText('Batch Set'));
      
      await waitFor(() => {
        expect(screen.getByText('Status: Batch set complete')).toBeInTheDocument();
      });
      
      // Then get them
      fireEvent.click(screen.getByText('Batch Get'));
      
      await waitFor(() => {
        expect(screen.getByText('Status: Retrieved 3 items')).toBeInTheDocument();
      });
    });

    it('performs batch delete operations', async () => {
      render(<BatchOperations />);
      
      // Set values
      fireEvent.click(screen.getByText('Batch Set'));
      
      await waitFor(() => {
        expect(screen.getByText('Status: Batch set complete')).toBeInTheDocument();
      });
      
      // Delete them
      fireEvent.click(screen.getByText('Batch Delete'));
      
      await waitFor(() => {
        expect(screen.getByText('Status: Batch delete complete')).toBeInTheDocument();
      });
      
      // Verify deletion
      fireEvent.click(screen.getByText('Batch Get'));
      
      await waitFor(() => {
        expect(screen.getByText('Status: Retrieved 0 items')).toBeInTheDocument();
      });
    });
  });

  describe('Cache Expiration', () => {
    it('respects TTL settings', async () => {
      jest.useFakeTimers();
      
      const cacheManager = CacheManager.getInstance();
      
      // Set with short TTL
      await cacheManager.set('ttl-test', 'value', { ttl: 1000 });
      
      // Should exist immediately
      let value = await cacheManager.get('ttl-test');
      expect(value).toBe('value');
      
      // Advance time past TTL
      jest.advanceTimersByTime(1500);
      
      // Should be expired
      value = await cacheManager.get('ttl-test');
      expect(value).toBeNull();
      
      jest.useRealTimers();
    });
  });
});