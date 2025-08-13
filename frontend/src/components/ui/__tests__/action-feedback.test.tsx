import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  FeedbackProvider, 
  feedback, 
  ActionButton, 
  ProgressFeedback,
  ConfirmationDialog 
} from '../action-feedback';

// Mock createPortal
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: any) => node,
}));

describe('FeedbackProvider', () => {
  beforeEach(() => {
    render(<FeedbackProvider />);
  });

  it('shows success feedback', async () => {
    feedback.success('Operation successful');
    
    await waitFor(() => {
      expect(screen.getByText('Operation successful')).toBeInTheDocument();
    });
  });

  it('shows error feedback', async () => {
    feedback.error('Something went wrong');
    
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  it('shows warning feedback', async () => {
    feedback.warning('Please be careful');
    
    await waitFor(() => {
      expect(screen.getByText('Please be careful')).toBeInTheDocument();
    });
  });

  it('shows info feedback', async () => {
    feedback.info('Here is some information');
    
    await waitFor(() => {
      expect(screen.getByText('Here is some information')).toBeInTheDocument();
    });
  });

  it('shows loading feedback', async () => {
    feedback.loading('Processing...');
    
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  it('auto-dismisses feedback after duration', async () => {
    feedback.success('Will disappear', { duration: 100 });
    
    expect(screen.getByText('Will disappear')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Will disappear')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  it('shows action button in feedback', async () => {
    const handleAction = jest.fn();
    
    feedback.error('Error occurred', {
      action: {
        label: 'Retry',
        onClick: handleAction,
      },
    });
    
    await waitFor(() => {
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
    });
    
    expect(handleAction).toHaveBeenCalled();
  });

  it('allows manual dismissal', async () => {
    feedback.info('Dismissible message');
    
    await waitFor(() => {
      expect(screen.getByText('Dismissible message')).toBeInTheDocument();
    });
    
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Dismissible message')).not.toBeInTheDocument();
    });
  });
});

describe('ActionButton', () => {
  it('renders children when idle', () => {
    render(<ActionButton>Click me</ActionButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ActionButton loading loadingText="Loading...">
        Click me
      </ActionButton>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows success state', async () => {
    render(
      <ActionButton success successText="Done!">
        Click me
      </ActionButton>
    );
    
    expect(screen.getByText('Done!')).toBeInTheDocument();
    
    // Should revert to idle after timeout
    await waitFor(() => {
      expect(screen.getByText('Click me')).toBeInTheDocument();
    }, { timeout: 2500 });
  });

  it('shows error state', async () => {
    render(
      <ActionButton error errorText="Failed!">
        Click me
      </ActionButton>
    );
    
    expect(screen.getByText('Failed!')).toBeInTheDocument();
    
    // Should revert to idle after timeout
    await waitFor(() => {
      expect(screen.getByText('Click me')).toBeInTheDocument();
    }, { timeout: 2500 });
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    
    render(
      <ActionButton onClick={handleClick}>
        Click me
      </ActionButton>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});

describe('ProgressFeedback', () => {
  it('renders progress bar with percentage', () => {
    render(<ProgressFeedback progress={75} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(
      <ProgressFeedback 
        progress={50} 
        message="Uploading file..." 
      />
    );
    
    expect(screen.getByText('Uploading file...')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('hides percentage when showPercentage is false', () => {
    render(
      <ProgressFeedback 
        progress={25} 
        showPercentage={false}
      />
    );
    
    expect(screen.queryByText('25%')).not.toBeInTheDocument();
  });

  it('animates progress bar width', () => {
    const { container } = render(<ProgressFeedback progress={60} />);
    
    const progressBar = container.querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '60%' });
  });
});

describe('ConfirmationDialog', () => {
  it('does not render when closed', () => {
    render(
      <ConfirmationDialog
        isOpen={false}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Are you sure?"
      />
    );
    
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('renders when open', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Delete Item"
        message="This action cannot be undone."
      />
    );
    
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    const handleClose = jest.fn();
    
    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Are you sure?"
      />
    );
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onConfirm and onClose when confirm is clicked', () => {
    const handleClose = jest.fn();
    const handleConfirm = jest.fn();
    
    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="Confirm"
        message="Are you sure?"
      />
    );
    
    fireEvent.click(screen.getByText('Confirm'));
    expect(handleConfirm).toHaveBeenCalled();
    expect(handleClose).toHaveBeenCalled();
  });

  it('uses custom button texts', () => {
    render(
      <ConfirmationDialog
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Confirm"
        message="Are you sure?"
        confirmText="Yes, delete"
        cancelText="No, keep it"
      />
    );
    
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('No, keep it')).toBeInTheDocument();
  });

  it('shows correct icon based on type', () => {
    const { rerender } = render(
      <ConfirmationDialog
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Warning"
        message="Be careful!"
        type="warning"
      />
    );
    
    expect(screen.getByRole('dialog')).toHaveTextContent('Warning');
    
    rerender(
      <ConfirmationDialog
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        title="Danger"
        message="This is dangerous!"
        type="danger"
      />
    );
    
    expect(screen.getByRole('dialog')).toHaveTextContent('Danger');
  });
});