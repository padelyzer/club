import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, EmptyStates, IllustratedEmptyState, EmptyStateWithStats } from '../empty-states';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('EmptyState', () => {
  it('renders with title and description', () => {
    render(
      <EmptyState
        title="No data found"
        description="There is no data to display"
      />
    );

    expect(screen.getByText('No data found')).toBeInTheDocument();
    expect(screen.getByText('There is no data to display')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    const CustomIcon = () => <div data-testid="custom-icon">Icon</div>;
    
    render(
      <EmptyState
        icon={CustomIcon}
        title="Empty"
        description="Nothing here"
      />
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    const handleAction = jest.fn();
    
    render(
      <EmptyState
        title="No items"
        description="Add your first item"
        action={{
          label: 'Add Item',
          onClick: handleAction,
        }}
      />
    );

    const button = screen.getByText('Add Item');
    fireEvent.click(button);
    expect(handleAction).toHaveBeenCalled();
  });

  it('renders secondary action when provided', () => {
    const handlePrimary = jest.fn();
    const handleSecondary = jest.fn();
    
    render(
      <EmptyState
        title="No results"
        description="Try different filters"
        action={{
          label: 'Clear Filters',
          onClick: handlePrimary,
        }}
        secondaryAction={{
          label: 'Adjust Filters',
          onClick: handleSecondary,
        }}
      />
    );

    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    expect(screen.getByText('Adjust Filters')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Adjust Filters'));
    expect(handleSecondary).toHaveBeenCalled();
  });

  it('disables animation when animate is false', () => {
    const { container } = render(
      <EmptyState
        title="Static"
        description="No animation"
        animate={false}
      />
    );

    // Should not have motion wrapper
    expect(container.firstChild).not.toHaveAttribute('initial');
  });
});

describe('EmptyStates presets', () => {
  it('renders NoSearchResults', () => {
    render(<EmptyStates.NoSearchResults />);
    
    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your search/)).toBeInTheDocument();
  });

  it('renders NoData', () => {
    render(<EmptyStates.NoData />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
    expect(screen.getByText(/no data to display/)).toBeInTheDocument();
  });

  it('renders NoDocuments', () => {
    render(<EmptyStates.NoDocuments />);
    
    expect(screen.getByText('No documents yet')).toBeInTheDocument();
    expect(screen.getByText(/Upload your first document/)).toBeInTheDocument();
  });

  it('renders EmptyCart', () => {
    render(<EmptyStates.EmptyCart />);
    
    expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    expect(screen.getByText(/Add items to your cart/)).toBeInTheDocument();
  });

  it('renders NoReservations', () => {
    render(<EmptyStates.NoReservations />);
    
    expect(screen.getByText('No reservations')).toBeInTheDocument();
    expect(screen.getByText(/haven't made any court reservations/)).toBeInTheDocument();
  });

  it('renders ConnectionError', () => {
    render(<EmptyStates.ConnectionError />);
    
    expect(screen.getByText('Connection error')).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to the server/)).toBeInTheDocument();
  });

  it('renders PermissionDenied', () => {
    render(<EmptyStates.PermissionDenied />);
    
    expect(screen.getByText('Access denied')).toBeInTheDocument();
    expect(screen.getByText(/don&apos;t have permission/)).toBeInTheDocument();
  });

  it('allows overriding preset properties', () => {
    const handleClick = jest.fn();
    
    render(
      <EmptyStates.NoData
        action={{
          label: 'Custom Action',
          onClick: handleClick,
        }}
      />
    );
    
    const button = screen.getByText('Custom Action');
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });
});

describe('IllustratedEmptyState', () => {
  it('renders with illustration', () => {
    const illustration = <div data-testid="illustration">Illustration</div>;
    
    render(
      <IllustratedEmptyState
        illustration={illustration}
        title="No content"
        description="Add some content to get started"
      />
    );

    expect(screen.getByTestId('illustration')).toBeInTheDocument();
    expect(screen.getByText('No content')).toBeInTheDocument();
  });

  it('renders action button', () => {
    const handleAction = jest.fn();
    const illustration = <div>Illustration</div>;
    
    render(
      <IllustratedEmptyState
        illustration={illustration}
        title="Empty"
        action={{
          label: 'Get Started',
          onClick: handleAction,
        }}
      />
    );

    fireEvent.click(screen.getByText('Get Started'));
    expect(handleAction).toHaveBeenCalled();
  });
});

describe('EmptyStateWithStats', () => {
  it('renders with stats', () => {
    const stats = [
      { label: 'Total Users', value: 100 },
      { label: 'Active Sessions', value: 25 },
      { label: 'Completion Rate', value: '75%' },
    ];
    
    render(
      <EmptyStateWithStats
        title="Overview"
        stats={stats}
      />
    );

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Active Sessions')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders with icon and action', () => {
    const handleAction = jest.fn();
    const Icon = () => <div data-testid="icon">Icon</div>;
    
    render(
      <EmptyStateWithStats
        icon={Icon}
        title="Stats"
        stats={[{ label: 'Count', value: 10 }]}
        action={{
          label: 'View Details',
          onClick: handleAction,
        }}
      />
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    fireEvent.click(screen.getByText('View Details'));
    expect(handleAction).toHaveBeenCalled();
  });
});