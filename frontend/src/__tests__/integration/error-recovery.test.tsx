import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useErrorRecovery, useComponentErrorRecovery } from '@/hooks/use-error-recovery';
import { ErrorBoundary } from '@/components/error-boundary/error-boundary';
import { feedback } from '@/components/ui/action-feedback';
import { FeedbackProvider } from '@/components/ui/action-feedback';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Test component that uses error recovery
const DataFetcher = ({ shouldFail = false, failCount = 1 }) => {
  const { executeWithRecovery, isRecovering, lastError, retryCount } = useErrorRecovery();
  const [data, setData] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const fetchData = async () => {
    const result = await executeWithRecovery(
      async () => {
        setAttemptCount(prev => prev + 1);
        
        if (attemptCount < failCount) {
          throw new Error('Network error');
        }
        
        return 'Success data';
      },
      {
        maxRetries: 3,
        delay: 100,
        showNotification: true,
      }
    );
    
    if (result) {
      setData(result);
    }
  };

  return (
    <div>
      <button onClick={fetchData}>Fetch Data</button>
      {isRecovering && <p>Recovering...</p>}
      {data && <p>Data: {data}</p>}
      {lastError && <p>Error: {lastError.message}</p>}
      <p>Retry Count: {retryCount}</p>
      <p>Attempt Count: {attemptCount}</p>
    </div>
  );
};

// Component with error boundary
const ComponentWithErrors = ({ shouldThrow = false }) => {
  const { handleError, hasError, errorCount, reset } = useComponentErrorRecovery('TestComponent');
  
  if (shouldThrow && !hasError) {
    handleError(new Error('Component error'));
  }
  
  if (hasError) {
    return (
      <div>
        <p>Component has error</p>
        <p>Error count: {errorCount}</p>
        <button onClick={reset}>Reset</button>
      </div>
    );
  }
  
  return <div>Component working fine</div>;
};

// Test component with multiple recovery strategies
const ResilientComponent = () => {
  const [failureMode, setFailureMode] = useState<'none' | 'network' | 'validation' | 'fatal'>('none');
  const { executeWithRecovery } = useErrorRecovery();
  const [result, setResult] = useState<string>('');

  const performAction = async () => {
    try {
      const data = await executeWithRecovery(
        async () => {
          switch (failureMode) {
            case 'network':
              throw new Error('Network timeout');
            case 'validation':
              const error: any = new Error('Validation failed');
              error.response = { status: 400 };
              throw error;
            case 'fatal':
              const fatalError: any = new Error('Server error');
              error.response = { status: 500 };
              throw fatalError;
            default:
              return 'Operation successful';
          }
        },
        {
          maxRetries: 2,
          delay: 50,
          fallback: 'Fallback data',
        }
      );
      
      setResult(data || 'No data');
    } catch (error: any) {
      setResult(`Failed: ${error.message}`);
    }
  };

  return (
    <div>
      <select onChange={(e) => setFailureMode(e.target.value as any)}>
        <option value="none">No failure</option>
        <option value="network">Network failure</option>
        <option value="validation">Validation failure</option>
        <option value="fatal">Fatal error</option>
      </select>
      <button onClick={performAction}>Perform Action</button>
      <p>Result: {result}</p>
    </div>
  );
};

describe('Error Recovery Integration', () => {
  beforeEach(() => {
    render(<FeedbackProvider />);
  });

  describe('Basic Error Recovery', () => {
    it('recovers from temporary failures', async () => {
      render(<DataFetcher failCount={2} />);
      
      fireEvent.click(screen.getByText('Fetch Data'));
      
      // Should show recovering state
      await waitFor(() => {
        expect(screen.getByText('Recovering...')).toBeInTheDocument();
      });
      
      // Should eventually succeed
      await waitFor(() => {
        expect(screen.getByText('Data: Success data')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should have retried once
      expect(screen.getByText('Retry Count: 0')).toBeInTheDocument();
      expect(screen.getByText('Attempt Count: 2')).toBeInTheDocument();
    });

    it('fails after max retries', async () => {
      render(<DataFetcher failCount={10} />);
      
      fireEvent.click(screen.getByText('Fetch Data'));
      
      // Should eventually show error
      await waitFor(() => {
        expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Should have hit max retries
      expect(screen.getByText('Retry Count: 3')).toBeInTheDocument();
    });
  });

  describe('Component Error Recovery', () => {
    it('recovers from component errors automatically', async () => {
      const { rerender } = render(<ComponentWithErrors />);
      
      expect(screen.getByText('Component working fine')).toBeInTheDocument();
      
      // Trigger error
      rerender(<ComponentWithErrors shouldThrow />);
      
      expect(screen.getByText('Component has error')).toBeInTheDocument();
      expect(screen.getByText('Error count: 1')).toBeInTheDocument();
      
      // Should auto-recover after timeout
      await waitFor(() => {
        expect(screen.getByText('Component working fine')).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it('allows manual reset', () => {
      const { rerender } = render(<ComponentWithErrors />);
      
      // Trigger error
      rerender(<ComponentWithErrors shouldThrow />);
      
      expect(screen.getByText('Component has error')).toBeInTheDocument();
      
      // Manual reset
      fireEvent.click(screen.getByText('Reset'));
      
      expect(screen.getByText('Component working fine')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Integration', () => {
    it('catches and recovers from errors', () => {
      const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
        if (shouldThrow) throw new Error('Test error');
        return <div>No error</div>;
      };
      
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
      
      // Trigger error
      rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Component Error')).toBeInTheDocument();
      
      // Try again
      fireEvent.click(screen.getByText('Try Again'));
      
      rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('Different Failure Modes', () => {
    it('handles successful operations', async () => {
      render(<ResilientComponent />);
      
      fireEvent.click(screen.getByText('Perform Action'));
      
      await waitFor(() => {
        expect(screen.getByText('Result: Operation successful')).toBeInTheDocument();
      });
    });

    it('retries network failures', async () => {
      render(<ResilientComponent />);
      
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'network' } });
      fireEvent.click(screen.getByText('Perform Action'));
      
      await waitFor(() => {
        expect(screen.getByText('Result: Fallback data')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('does not retry validation errors', async () => {
      render(<ResilientComponent />);
      
      fireEvent.change(screen.getByRole('combobox'), { target: { value: 'validation' } });
      fireEvent.click(screen.getByText('Perform Action'));
      
      await waitFor(() => {
        expect(screen.getByText('Result: Failed: Validation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Feedback Integration', () => {
    it('shows feedback during recovery', async () => {
      render(<DataFetcher failCount={2} />);
      
      fireEvent.click(screen.getByText('Fetch Data'));
      
      // Should show warning feedback
      await waitFor(() => {
        const feedbackElements = document.querySelectorAll('[role="alert"]');
        expect(feedbackElements.length).toBeGreaterThan(0);
      });
    });
  });
});