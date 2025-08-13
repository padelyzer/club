import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';
import { Plus, Search, FileText, Users } from 'lucide-react';

// Empty State Stories
export default {
  title: 'UI/States',
} as Meta;

export const Empty = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
      <div className="border rounded-lg p-6">
        <EmptyState
          icon={<FileText size={48} />}
          title="No documents found"
          description="Start by uploading your first document"
          action={{
            label: 'Upload Document',
            onClick: () => ,
          }}
        />
      </div>
      
      <div className="border rounded-lg p-6">
        <EmptyState
          icon={<Search size={48} />}
          title="No results"
          description="Try adjusting your search or filters"
        />
      </div>
      
      <div className="border rounded-lg p-6">
        <EmptyState
          icon={<Users size={48} />}
          title="No team members"
          description="Invite your team to collaborate"
          action={{
            label: 'Invite Members',
            onClick: () => ,
          }}
        />
      </div>
      
      <div className="border rounded-lg p-6">
        <EmptyState
          icon={<Plus size={48} />}
          title="Create your first project"
          action={{
            label: 'New Project',
            onClick: () => ,
          }}
        />
      </div>
    </div>
  ),
};

export const Error = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
      <div className="border rounded-lg p-6">
        <ErrorState onRetry={() => } />
      </div>
      
      <div className="border rounded-lg p-6">
        <ErrorState title="Connection Error" description="Unable to connect to the server. Please check your internet connection." action={{ label: "Reintentar", onClick: () =>  }}
        />
      </div>
      
      <div className="border rounded-lg p-6">
        <ErrorState
          title="Permission Denied"
          message="You don&apos;t have permission to access this resource."
        />
      </div>
      
      <div className="border rounded-lg p-6">
        <ErrorState title="404 - Not Found" description="The page you're looking for doesn't exist." action={{ label: "Reintentar", onClick: () =>  }}
        />
      </div>
    </div>
  ),
};

export const Loading = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
      <div className="border rounded-lg p-6">
        <LoadingState />
      </div>
      
      <div className="border rounded-lg p-6">
        <LoadingState text="Loading your data..." />
      </div>
      
      <div className="border rounded-lg p-6">
        <LoadingState text="Processing payment..." />
      </div>
      
      <div className="border rounded-lg p-6">
        <LoadingState text="Almost there..." />
      </div>
    </div>
  ),
};

export const LoadingFullScreen = {
  render: () => <LoadingState fullScreen text="Loading application..." />,
  parameters: {
    layout: 'fullscreen',
  },
};