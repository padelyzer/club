import type { Meta, StoryObj } from '@storybook/react';
import { 
  Skeleton, 
  SkeletonText, 
  SkeletonAvatar, 
  SkeletonButton 
} from './skeleton';
import {
  CardSkeleton,
  ClubCardSkeleton,
  StatsCardSkeleton,
  ProfileCardSkeleton,
} from './skeletons/card-skeleton';
import {
  TableSkeleton,
  DataTableSkeleton,
  ClubsTableSkeleton,
} from './skeletons/table-skeleton';
import {
  ListSkeleton,
  TimelineSkeleton,
  FeedSkeleton,
} from './skeletons/list-skeleton';
import {
  FormSkeleton,
  ClubFormSkeleton,
  LoginFormSkeleton,
} from './skeletons/form-skeleton';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Skeletons
export const Default: Story = {
  args: {
    width: 200,
    height: 20,
  },
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold">Text</h3>
        <Skeleton variant="text" width="80%" />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Circular</h3>
        <Skeleton variant="circular" width={64} height={64} />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Rectangular</h3>
        <Skeleton variant="rectangular" width={200} height={100} />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Rounded</h3>
        <Skeleton variant="rounded" width={200} height={100} />
      </div>
    </div>
  ),
};

export const Animations: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold">Pulse (Default)</h3>
        <Skeleton animation="pulse" width="100%" height={40} />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Wave</h3>
        <Skeleton animation="wave" width="100%" height={40} />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">None</h3>
        <Skeleton animation="none" width="100%" height={40} />
      </div>
    </div>
  ),
};

// Utility Skeletons
export const TextLines: Story = {
  render: () => (
    <div className="space-y-4 max-w-md">
      <div>
        <h3 className="mb-2 font-semibold">Single Line</h3>
        <SkeletonText lines={1} />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Multiple Lines</h3>
        <SkeletonText lines={3} />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Paragraph</h3>
        <SkeletonText lines={5} />
      </div>
    </div>
  ),
};

export const Avatars: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <SkeletonAvatar size="sm" />
        <p className="text-sm mt-2">Small</p>
      </div>
      <div className="text-center">
        <SkeletonAvatar size="md" />
        <p className="text-sm mt-2">Medium</p>
      </div>
      <div className="text-center">
        <SkeletonAvatar size="lg" />
        <p className="text-sm mt-2">Large</p>
      </div>
    </div>
  ),
};

export const Buttons: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <SkeletonButton size="sm" />
      <SkeletonButton size="default" />
      <SkeletonButton size="lg" />
    </div>
  ),
};

// Card Skeletons
export const Cards: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 className="mb-2 font-semibold">Basic Card</h3>
        <CardSkeleton />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Stats Card</h3>
        <StatsCardSkeleton />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Profile Card</h3>
        <ProfileCardSkeleton />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Club Card (Grid)</h3>
        <ClubCardSkeleton viewMode="grid" />
      </div>
    </div>
  ),
};

export const ClubCardVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 font-semibold">Grid View</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ClubCardSkeleton viewMode="grid" />
          <ClubCardSkeleton viewMode="grid" />
          <ClubCardSkeleton viewMode="grid" />
        </div>
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">List View</h3>
        <div className="space-y-2">
          <ClubCardSkeleton viewMode="list" />
          <ClubCardSkeleton viewMode="list" />
          <ClubCardSkeleton viewMode="list" />
        </div>
      </div>
    </div>
  ),
};

// Table Skeletons
export const Tables: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="mb-2 font-semibold">Basic Table</h3>
        <TableSkeleton columns={4} rows={3} />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Data Table with Controls</h3>
        <DataTableSkeleton />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Clubs Table</h3>
        <ClubsTableSkeleton />
      </div>
    </div>
  ),
};

// List Skeletons
export const Lists: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="mb-2 font-semibold">Basic List</h3>
        <ListSkeleton items={3} />
      </div>
      
      <div>
        <h3 className="mb-2 font-semibold">Timeline</h3>
        <TimelineSkeleton days={3} />
      </div>
      
      <div className="md:col-span-2">
        <h3 className="mb-2 font-semibold">Feed</h3>
        <FeedSkeleton items={2} />
      </div>
    </div>
  ),
};

// Form Skeletons
export const Forms: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h3 className="mb-4 font-semibold">Basic Form</h3>
        <FormSkeleton sections={2} />
      </div>
      
      <div>
        <h3 className="mb-4 font-semibold">Login Form</h3>
        <LoginFormSkeleton />
      </div>
      
      <div className="md:col-span-2">
        <h3 className="mb-4 font-semibold">Club Form</h3>
        <ClubFormSkeleton />
      </div>
    </div>
  ),
};

// Real World Example
export const RealWorldLoading: Story = {
  render: () => {
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
      const timer = setTimeout(() => setIsLoading(false), 3000);
      return () => clearTimeout(timer);
    }, [false, setTimeout, const, setIsLoading, clearTimeout]);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Clubs Management</h2>
          <button
            onClick={() => setIsLoading(!isLoading)}
            className="px-4 py-2 bg-primary text-white rounded-lg"
          >
            Toggle Loading
          </button>
        </div>
        
        {isLoading ? (
          <>
            <div className="flex gap-4 mb-4">
              <Skeleton variant="rounded" width={300} height={40} />
              <Skeleton variant="rounded" width={120} height={40} />
              <div className="ml-auto">
                <Skeleton variant="rounded" width={100} height={40} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ClubCardSkeleton />
              <ClubCardSkeleton />
              <ClubCardSkeleton />
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl">Content Loaded!</h3>
            <p className="text-muted-foreground">Your clubs would appear here</p>
          </div>
        )}
      </div>
    );
  },
};