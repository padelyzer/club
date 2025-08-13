import type { Meta, StoryObj } from '@storybook/react';
import { ClubCard, ClubLogo, ClubStatus, ClubInfo, ClubStats, ClubFeatures } from './index';
import { Club } from '@/types/club';

const mockClub: Club = {
  id: '1',
  name: 'Padel Paradise Club',
  slug: 'padel-paradise',
  description: 'The best padel club in town with modern facilities',
  logo_url: 'https://via.placeholder.com/150',
  cover_image_url: 'https://via.placeholder.com/400x200',
  phone: '+1 234 567 890',
  email: 'info@padelparadise.com',
  website: 'https://padelparadise.com',
  address: {
    street: '123 Sport Avenue',
    city: 'Madrid',
    state: 'Madrid',
    country: 'Spain',
    postal_code: '28001',
    latitude: 40.4168,
    longitude: -3.7038,
  },
  schedule: [
    { day: 'monday', is_open: true, open_time: '07:00', close_time: '23:00' },
    { day: 'tuesday', is_open: true, open_time: '07:00', close_time: '23:00' },
    { day: 'wednesday', is_open: true, open_time: '07:00', close_time: '23:00' },
    { day: 'thursday', is_open: true, open_time: '07:00', close_time: '23:00' },
    { day: 'friday', is_open: true, open_time: '07:00', close_time: '23:00' },
    { day: 'saturday', is_open: true, open_time: '08:00', close_time: '22:00' },
    { day: 'sunday', is_open: true, open_time: '08:00', close_time: '20:00' },
  ],
  features: ['Pro Shop', 'Parking', 'Cafeteria', 'Locker Rooms'],
  services: ['Coaching', 'Equipment Rental', 'Tournaments', 'Leagues'],
  courts: [],
  total_members: 256,
  average_occupancy: 78,
  is_active: true,
  created_at: '2024-01-01',
  updated_at: '2024-01-15',
};

const meta = {
  title: 'Clubs/ClubCard',
  component: ClubCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ClubCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Main ClubCard stories
export const GridView: Story = {
  args: {
    club: mockClub,
    viewMode: 'grid',
  },
};

export const ListView: Story = {
  args: {
    club: mockClub,
    viewMode: 'list',
  },
};

export const ActiveClub: Story = {
  args: {
    club: mockClub,
    viewMode: 'grid',
  },
  decorators: [
    (Story) => {
      // Mock the active club state
      const useClubsStore = require('@/store/clubsStore').useClubsStore;
      useClubsStore.setState({ activeClubId: '1' });
      return <Story />;
    },
  ],
};

export const WithoutImage: Story = {
  args: {
    club: {
      ...mockClub,
      logo: undefined,
      cover_image_url: undefined,
    },
    viewMode: 'grid',
  },
};

export const ClosedClub: Story = {
  args: {
    club: {
      ...mockClub,
      schedule: mockClub.schedule.map(s => ({ ...s, is_open: false })),
    },
    viewMode: 'grid',
  },
};

// Component parts stories
export const LogoVariants = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <ClubLogo name="Club" size="sm" />
        <p className="text-sm mt-2">Small</p>
      </div>
      <div className="text-center">
        <ClubLogo name="Club" size="md" />
        <p className="text-sm mt-2">Medium</p>
      </div>
      <div className="text-center">
        <ClubLogo name="Club" size="lg" />
        <p className="text-sm mt-2">Large</p>
      </div>
      <div className="text-center">
        <ClubLogo name="Club" size="xl" as any />
        <p className="text-sm mt-2">Extra Large</p>
      </div>
    </div>
  ),
};

export const StatusVariants = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Open Club</h3>
        <ClubStatus 
          schedule={[
            { day: 'monday', is_open: true, open_time: '07:00', close_time: '23:00' },
          ]} 
        />
      </div>
      <div>
        <h3 className="font-semibold mb-2">Closed Club</h3>
        <ClubStatus 
          schedule={[
            { day: 'monday', is_open: false },
          ]} 
        />
      </div>
    </div>
  ),
};

export const InfoVariants = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold mb-2">Compact</h3>
        <ClubInfo club={mockClub} variant="compact" />
      </div>
      <div>
        <h3 className="font-semibold mb-2">Detailed</h3>
        <ClubInfo club={mockClub} variant="detailed" />
      </div>
    </div>
  ),
};

export const StatsVariants = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Inline</h3>
        <ClubStats 
          courts={8}
          members={256}
          occupancy={78}
          revenue={125000}
          variant="inline"
        />
      </div>
      <div>
        <h3 className="font-semibold mb-2">Grid</h3>
        <ClubStats 
          courts={8}
          members={256}
          occupancy={78}
          revenue={125000}
          variant="grid"
        />
      </div>
    </div>
  ),
};

export const FeaturesVariants = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2">Badges</h3>
        <ClubFeatures 
          features={['Pro Shop', 'Parking', 'Cafeteria']}
          services={['Coaching', 'Equipment Rental']}
          variant="badges"
        />
      </div>
      <div>
        <h3 className="font-semibold mb-2">List</h3>
        <ClubFeatures 
          features={['Pro Shop', 'Parking', 'Cafeteria']}
          services={['Coaching', 'Equipment Rental']}
          variant="list"
        />
      </div>
    </div>
  ),
};

// Multiple cards layout
export const CardGrid = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ClubCard club={mockClub} viewMode="grid" />
      <ClubCard 
        club={{
          ...mockClub,
          id: '2',
          name: 'Sports Center Elite',
          total_members: 189,
          average_occupancy: 65,
        }} 
        viewMode="grid" 
      />
      <ClubCard 
        club={{
          ...mockClub,
          id: '3',
          name: 'Urban Padel Club',
          total_members: 324,
          average_occupancy: 85,
          schedule: mockClub.schedule.map(s => ({ ...s, is_open: false })),
        }} 
        viewMode="grid" 
      />
    </div>
  ),
};

export const CardList = {
  render: () => (
    <div className="space-y-2">
      <ClubCard club={mockClub} viewMode="list" />
      <ClubCard 
        club={{
          ...mockClub,
          id: '2',
          name: 'Sports Center Elite',
          total_members: 189,
          average_occupancy: 65,
        }} 
        viewMode="list" 
      />
      <ClubCard 
        club={{
          ...mockClub,
          id: '3',
          name: 'Urban Padel Club',
          total_members: 324,
          average_occupancy: 85,
        }} 
        viewMode="list" 
      />
    </div>
  ),
};