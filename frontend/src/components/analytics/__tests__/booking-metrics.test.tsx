import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import BookingMetrics from '../booking-metrics'

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}))

describe('BookingMetrics', () => {
  const mockProps = {
    timeRange: '7d' as const,
    clubId: '1',
  }

  it('renders without crashing', () => {
    render(<BookingMetrics {...mockProps} />)
    expect(screen.getByText(/booking/i)).toBeInTheDocument()
  })

  it('displays chart container', () => {
    render(<BookingMetrics {...mockProps} />)
    expect(screen.getByTestId('chart-container')).toBeInTheDocument()
  })
})
