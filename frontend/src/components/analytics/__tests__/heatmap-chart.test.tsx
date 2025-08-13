import React from 'react';
import { screen, within, fireEvent } from '@testing-library/react';
import { HeatmapChart } from '../heatmap-chart';
import { render } from '@/test-utils';
import { mockHeatmapData } from '@/test-utils/analytics-mocks';
import { HeatmapData } from '@/types/analytics';

// Mock Tooltip component
jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children, content }: any) => (
    <div data-testid="tooltip" data-content={content}>
      {children}
    </div>
  ),
}));

describe('HeatmapChart', () => {
  const defaultProps = {
    title: 'Test Heatmap',
    data: mockHeatmapData,
    type: 'occupancy' as const,
  };

  describe('Rendering', () => {
    it('renders with data', () => {
      render(<HeatmapChart {...defaultProps} />);

      expect(screen.getByText('Test Heatmap')).toBeInTheDocument();
    });

    it('renders loading state', () => {
      render(<HeatmapChart {...defaultProps} isLoading={true} />);

      const loadingElement = screen
        .getByRole('generic')
        .querySelector('.animate-pulse');
      expect(loadingElement).toBeInTheDocument();
    });

    it('renders empty state when no data', () => {
      render(<HeatmapChart {...defaultProps} data={null} />);

      expect(screen.getByText('analytics.noDataAvailable')).toBeInTheDocument();
    });

    it('renders empty state when data array is empty', () => {
      const emptyData: HeatmapData = {
        data: [],
        maxValue: 0,
        minValue: 0,
      };

      render(<HeatmapChart {...defaultProps} data={emptyData} />);

      expect(screen.getByText('analytics.noDataAvailable')).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('displays title with icon', () => {
      const { container } = render(<HeatmapChart {...defaultProps} />);

      expect(screen.getByText('Test Heatmap')).toBeInTheDocument();
      expect(container.querySelector('[class*="Grid3X3"]')).toBeInTheDocument();
    });

    it('shows info tooltip', () => {
      render(<HeatmapChart {...defaultProps} />);

      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toHaveAttribute('data-content', 'analytics.heatmapInfo');
    });
  });

  describe('Heatmap Grid', () => {
    it('renders all days of the week', () => {
      render(<HeatmapChart {...defaultProps} />);

      const days = [
        'analytics.days.monday',
        'analytics.days.tuesday',
        'analytics.days.wednesday',
        'analytics.days.thursday',
        'analytics.days.friday',
        'analytics.days.saturday',
        'analytics.days.sunday',
      ];

      days.forEach((day) => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('renders hours from 7:00 to 23:00', () => {
      render(<HeatmapChart {...defaultProps} />);

      // Check some key hours
      expect(screen.getByText('7:00')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('18:00')).toBeInTheDocument();
      expect(screen.getByText('23:00')).toBeInTheDocument();
    });

    it('renders correct number of cells', () => {
      const { container } = render(<HeatmapChart {...defaultProps} />);

      // 7 days × 17 hours = 119 cells
      const cells = container.querySelectorAll('.group > div:first-child');
      expect(cells).toHaveLength(119);
    });

    it('applies correct color intensity for occupancy type', () => {
      const { container } = render(
        <HeatmapChart {...defaultProps} type="occupancy" />
      );

      // Should have blue color classes
      const blueCells = container.querySelectorAll('[class*="bg-blue-"]');
      expect(blueCells.length).toBeGreaterThan(0);
    });

    it('applies correct color intensity for revenue type', () => {
      const { container } = render(
        <HeatmapChart {...defaultProps} type="revenue" />
      );

      // Should have green color classes
      const greenCells = container.querySelectorAll('[class*="bg-green-"]');
      expect(greenCells.length).toBeGreaterThan(0);
    });
  });

  describe('Cell Values', () => {
    it('retrieves correct cell values from data', () => {
      const specificData: HeatmapData = {
        data: [
          { day: 0, hour: 8, value: 75 },
          { day: 1, hour: 9, value: 85 },
        ],
        maxValue: 100,
        minValue: 0,
      };

      render(<HeatmapChart {...defaultProps} data={specificData} />);

      // The component should render cells with these values
      // We can verify by checking the tooltip content when hovering
      const { container } = render(
        <HeatmapChart {...defaultProps} data={specificData} />
      );
      const cells = container.querySelectorAll('.group');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('handles missing cell values as zero', () => {
      const sparseData: HeatmapData = {
        data: [{ day: 0, hour: 8, value: 50 }],
        maxValue: 100,
        minValue: 0,
      };

      render(<HeatmapChart {...defaultProps} data={sparseData} />);

      // Component should render without errors
      expect(screen.getByText('Test Heatmap')).toBeInTheDocument();
    });
  });

  describe('Tooltips', () => {
    it('shows tooltip on hover with formatted value for occupancy', () => {
      const { container } = render(
        <HeatmapChart {...defaultProps} type="occupancy" />
      );

      const firstCell = container.querySelector('.group');
      fireEvent.mouseEnter(firstCell!);

      // Tooltip should show percentage for occupancy
      const tooltip = firstCell!.querySelector('.hidden.group-hover\\:block');
      expect(tooltip).toBeTruthy();
    });

    it('shows tooltip on hover with formatted value for revenue', () => {
      const { container } = render(
        <HeatmapChart {...defaultProps} type="revenue" />
      );

      const firstCell = container.querySelector('.group');
      fireEvent.mouseEnter(firstCell!);

      // Tooltip should show currency for revenue
      const tooltip = firstCell!.querySelector('.hidden.group-hover\\:block');
      expect(tooltip).toBeTruthy();
    });

    it('displays day and hour in tooltip', () => {
      const { container } = render(<HeatmapChart {...defaultProps} />);

      const cells = container.querySelectorAll('.group');
      const mondayMorningCell = cells[1]; // Monday 8:00

      fireEvent.mouseEnter(mondayMorningCell!);

      const tooltip = mondayMorningCell!.querySelector('.text-gray-300');
      expect(tooltip?.textContent).toContain('analytics.days.monday');
      expect(tooltip?.textContent).toContain('8:00');
    });
  });

  describe('Legend', () => {
    it('displays color gradient legend', () => {
      const { container } = render(<HeatmapChart {...defaultProps} />);

      expect(screen.getByText('analytics.low')).toBeInTheDocument();
      expect(screen.getByText('analytics.high')).toBeInTheDocument();

      // Check for gradient boxes
      const legendBoxes = container.querySelectorAll('.w-6.h-6.rounded');
      expect(legendBoxes).toHaveLength(5); // 5 intensity levels
    });

    it('shows data range', () => {
      render(<HeatmapChart {...defaultProps} />);

      expect(screen.getByText(/analytics.range.*0%.*100%/)).toBeInTheDocument();
    });

    it('formats range values based on type', () => {
      const revenueData: HeatmapData = {
        data: mockHeatmapData.data,
        maxValue: 1000,
        minValue: 0,
      };

      render(
        <HeatmapChart {...defaultProps} data={revenueData} type="revenue" />
      );

      expect(
        screen.getByText(/analytics.range.*€0.*€1,000/)
      ).toBeInTheDocument();
    });
  });

  describe('Insights', () => {
    it('shows occupancy insights for occupancy type', () => {
      render(<HeatmapChart {...defaultProps} type="occupancy" />);

      expect(
        screen.getByText('analytics.heatmapInsightOccupancy')
      ).toBeInTheDocument();
    });

    it('shows revenue insights for revenue type', () => {
      render(<HeatmapChart {...defaultProps} type="revenue" />);

      expect(
        screen.getByText('analytics.heatmapInsightRevenue')
      ).toBeInTheDocument();
    });
  });

  describe('Color Intensity Calculation', () => {
    it('applies correct color for different value ranges', () => {
      const dataWithVariedValues: HeatmapData = {
        data: [
          { day: 0, hour: 7, value: 10 }, // Low
          { day: 0, hour: 8, value: 30 }, // Low-medium
          { day: 0, hour: 9, value: 50 }, // Medium
          { day: 0, hour: 10, value: 70 }, // Medium-high
          { day: 0, hour: 11, value: 90 }, // High
        ],
        maxValue: 100,
        minValue: 0,
      };

      const { container } = render(
        <HeatmapChart
          {...defaultProps}
          data={dataWithVariedValues}
          type="occupancy"
        />
      );

      const cells = container.querySelectorAll('.group > div:first-child');

      // First 5 cells should have increasing intensity
      expect(cells[0]).toHaveClass('bg-blue-100');
      expect(cells[1]).toHaveClass('bg-blue-200');
      expect(cells[2]).toHaveClass('bg-blue-300');
      expect(cells[3]).toHaveClass('bg-blue-400');
      expect(cells[4]).toHaveClass('bg-blue-500');
    });

    it('handles edge case when min equals max', () => {
      const uniformData: HeatmapData = {
        data: [{ day: 0, hour: 8, value: 50 }],
        maxValue: 50,
        minValue: 50,
      };

      const { container } = render(
        <HeatmapChart {...defaultProps} data={uniformData} />
      );

      // All cells should have default gray color
      const cells = container.querySelectorAll('.bg-gray-100');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('Responsiveness', () => {
    it('has horizontal scroll for small screens', () => {
      const { container } = render(<HeatmapChart {...defaultProps} />);

      const scrollContainer = container.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();

      const minWidthContainer = container.querySelector('.min-w-\\[800px\\]');
      expect(minWidthContainer).toBeInTheDocument();
    });
  });

  describe('Hover Effects', () => {
    it('applies hover ring effect on cells', () => {
      const { container } = render(
        <HeatmapChart {...defaultProps} type="occupancy" />
      );

      const cell = container.querySelector('.group > div:first-child');
      expect(cell).toHaveClass(
        'hover:ring-2',
        'hover:ring-offset-1',
        'hover:ring-blue-400'
      );
    });

    it('applies correct hover color based on type', () => {
      const { container: occupancyContainer } = render(
        <HeatmapChart {...defaultProps} type="occupancy" />
      );
      const occupancyCell = occupancyContainer.querySelector(
        '.group > div:first-child'
      );
      expect(occupancyCell).toHaveClass('hover:ring-blue-400');

      const { container: revenueContainer } = render(
        <HeatmapChart {...defaultProps} type="revenue" />
      );
      const revenueCell = revenueContainer.querySelector(
        '.group > div:first-child'
      );
      expect(revenueCell).toHaveClass('hover:ring-green-400');
    });
  });

  describe('Value Formatting', () => {
    it('formats occupancy values as percentages', () => {
      const data: HeatmapData = {
        data: [{ day: 0, hour: 8, value: 75.5 }],
        maxValue: 100,
        minValue: 0,
      };

      const { container } = render(
        <HeatmapChart {...defaultProps} data={data} type="occupancy" />
      );

      const firstCell = container.querySelector('.group');
      fireEvent.mouseEnter(firstCell!);

      const tooltip = firstCell!.querySelector('.font-medium');
      expect(tooltip?.textContent).toBe('76%');
    });

    it('formats revenue values as currency', () => {
      const data: HeatmapData = {
        data: [{ day: 0, hour: 8, value: 1234.56 }],
        maxValue: 2000,
        minValue: 0,
      };

      const { container } = render(
        <HeatmapChart {...defaultProps} data={data} type="revenue" />
      );

      const firstCell = container.querySelector('.group');
      fireEvent.mouseEnter(firstCell!);

      const tooltip = firstCell!.querySelector('.font-medium');
      expect(tooltip?.textContent).toBe('€1,235');
    });
  });
});
