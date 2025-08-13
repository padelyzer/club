import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonForm,
  SkeletonStats,
  SkeletonChart,
  SkeletonCalendar,
  SkeletonAvatar,
  SkeletonText,
  SkeletonTabs,
  SkeletonModal,
  SkeletonBreadcrumb,
  SkeletonNotification,
  SkeletonWidget,
  SkeletonHero,
} from '../skeleton-variants';

describe('Skeleton Components', () => {
  describe('SkeletonCard', () => {
    it('renders without image by default', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders with image when hasImage is true', () => {
      const { container } = render(<SkeletonCard hasImage />);
      const imageSkeletons = container.querySelectorAll('.h-48');
      expect(imageSkeletons.length).toBe(1);
    });

    it('renders with custom height', () => {
      const { container } = render(<SkeletonCard height="h-64" />);
      expect(container.firstChild).toHaveClass('h-64');
    });
  });

  describe('SkeletonTable', () => {
    it('renders default number of rows', () => {
      const { container } = render(<SkeletonTable />);
      const rows = container.querySelectorAll('tr');
      expect(rows.length).toBe(6); // 1 header + 5 body rows
    });

    it('renders custom number of rows', () => {
      const { container } = render(<SkeletonTable rows={10} />);
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(10);
    });

    it('renders custom number of columns', () => {
      const { container } = render(<SkeletonTable columns={3} />);
      const headerCells = container.querySelectorAll('thead th');
      expect(headerCells.length).toBe(3);
    });
  });

  describe('SkeletonList', () => {
    it('renders default number of items', () => {
      const { container } = render(<SkeletonList />);
      const items = container.querySelectorAll('.flex.space-x-4');
      expect(items.length).toBe(5);
    });

    it('renders custom number of items', () => {
      const { container } = render(<SkeletonList items={8} />);
      const items = container.querySelectorAll('.flex.space-x-4');
      expect(items.length).toBe(8);
    });

    it('renders without avatar when hasAvatar is false', () => {
      const { container } = render(<SkeletonList hasAvatar={false} />);
      const avatars = container.querySelectorAll('.rounded-full');
      expect(avatars.length).toBe(0);
    });
  });

  describe('SkeletonForm', () => {
    it('renders default number of fields', () => {
      const { container } = render(<SkeletonForm />);
      const fields = container.querySelectorAll('.space-y-2');
      expect(fields.length).toBe(4);
    });

    it('renders custom number of fields', () => {
      const { container } = render(<SkeletonForm fields={6} />);
      const fields = container.querySelectorAll('.space-y-2');
      expect(fields.length).toBe(6);
    });
  });

  describe('SkeletonStats', () => {
    it('renders default number of stats', () => {
      const { container } = render(<SkeletonStats />);
      const stats = container.querySelectorAll('.bg-white');
      expect(stats.length).toBe(4);
    });

    it('renders custom number of stats', () => {
      const { container } = render(<SkeletonStats count={6} />);
      const stats = container.querySelectorAll('.bg-white');
      expect(stats.length).toBe(6);
    });
  });

  describe('SkeletonChart', () => {
    it('renders chart skeleton', () => {
      const { container } = render(<SkeletonChart />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders with custom height', () => {
      const { container } = render(<SkeletonChart height="h-96" />);
      const chart = container.querySelector('.bg-gray-200');
      expect(chart).toHaveClass('h-96');
    });
  });

  describe('SkeletonCalendar', () => {
    it('renders calendar skeleton', () => {
      const { container } = render(<SkeletonCalendar />);
      const cells = container.querySelectorAll('.aspect-square');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('SkeletonAvatar', () => {
    it('renders avatar skeleton', () => {
      const { container } = render(<SkeletonAvatar />);
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('renders with custom size', () => {
      const { container } = render(<SkeletonAvatar size="h-16 w-16" />);
      const avatar = container.querySelector('.rounded-full');
      expect(avatar).toHaveClass('h-16', 'w-16');
    });
  });

  describe('SkeletonText', () => {
    it('renders default number of lines', () => {
      const { container } = render(<SkeletonText />);
      const lines = container.querySelectorAll('.h-4');
      expect(lines.length).toBe(3);
    });

    it('renders custom number of lines', () => {
      const { container } = render(<SkeletonText lines={5} />);
      const lines = container.querySelectorAll('.h-4');
      expect(lines.length).toBe(5);
    });
  });

  describe('SkeletonTabs', () => {
    it('renders default number of tabs', () => {
      const { container } = render(<SkeletonTabs />);
      const tabs = container.querySelectorAll('.h-10');
      expect(tabs.length).toBe(3);
    });

    it('renders custom number of tabs', () => {
      const { container } = render(<SkeletonTabs tabs={5} />);
      const tabs = container.querySelectorAll('.h-10');
      expect(tabs.length).toBe(5);
    });
  });

  describe('SkeletonModal', () => {
    it('renders modal skeleton', () => {
      const { container } = render(<SkeletonModal />);
      expect(container.querySelector('.max-w-md')).toBeInTheDocument();
    });

    it('renders with custom size', () => {
      const { container } = render(<SkeletonModal size="max-w-2xl" />);
      const modal = container.querySelector('.w-full');
      expect(modal).toHaveClass('max-w-2xl');
    });
  });

  describe('SkeletonBreadcrumb', () => {
    it('renders default number of items', () => {
      const { container } = render(<SkeletonBreadcrumb />);
      const items = container.querySelectorAll('.w-20');
      expect(items.length).toBe(3);
    });

    it('renders custom number of items', () => {
      const { container } = render(<SkeletonBreadcrumb items={5} />);
      const items = container.querySelectorAll('.w-20');
      expect(items.length).toBe(5);
    });
  });

  describe('SkeletonNotification', () => {
    it('renders notification skeleton', () => {
      const { container } = render(<SkeletonNotification />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });

  describe('SkeletonWidget', () => {
    it('renders widget skeleton', () => {
      const { container } = render(<SkeletonWidget />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders without chart when hasChart is false', () => {
      const { container } = render(<SkeletonWidget hasChart={false} />);
      const chart = container.querySelector('.h-32');
      expect(chart).not.toBeInTheDocument();
    });
  });

  describe('SkeletonHero', () => {
    it('renders hero skeleton', () => {
      const { container } = render(<SkeletonHero />);
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('renders without image when hasImage is false', () => {
      const { container } = render(<SkeletonHero hasImage={false} />);
      const images = container.querySelectorAll('.aspect-video');
      expect(images.length).toBe(0);
    });
  });
});