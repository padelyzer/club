import React from 'react';

interface LoadingStateProps {
  message?: string;
  overlay?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  overlay,
}) => {
  if (overlay) {
    return <div data-testid="loading-spinner">Loading overlay...</div>;
  }

  return <div data-testid="loading-state">{message || 'Loading...'}</div>;
};
