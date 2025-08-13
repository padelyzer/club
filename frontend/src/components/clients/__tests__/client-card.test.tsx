import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ClientCard from '../client-card'

const mockClient = {
  id: '1',
  user: {
    id: '1',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    is_staff: false,
    is_superuser: false,
  },
  phone: '+1234567890',
  level: 'intermediate',
  rating: 4.5,
  created_at: '2024-01-01T00:00:00Z',
}

describe('ClientCard', () => {
  it('renders without crashing', () => {
    render(<ClientCard client={mockClient} />)
    expect(screen.getByText('John')).toBeInTheDocument()
    expect(screen.getByText('Doe')).toBeInTheDocument()
  })

  it('displays client email', () => {
    render(<ClientCard client={mockClient} />)
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('displays client rating', () => {
    render(<ClientCard client={mockClient} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })
})
