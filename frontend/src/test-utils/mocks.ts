import { Client } from '@/lib/api/types';
import { Invoice, Payment } from '@/types/finance';

export const mockClient: Client = {
  id: '1',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+34 600 123 456',
  document_type: 'dni',
  document_number: '12345678A',
  birth_date: '1990-05-15',
  membership: undefined,
  is_active: true,
  total_spent: 1250.5,
  total_reservations: 45,
  last_reservation: '2024-03-20',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-03-20T15:30:00Z',
};

export const mockClients: Client[] = [
  mockClient,
  {
    ...mockClient,
    id: '2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@example.com',
    phone: '+34 600 987 654',
    total_reservations: 32,
    total_spent: 980.0,
  },
  {
    ...mockClient,
    id: '3',
    first_name: 'Carlos',
    last_name: 'García',
    email: 'carlos.garcia@example.com',
    phone: '+34 600 555 333',
    is_active: false,
  },
];

export const createMockClient = (overrides: Partial<Client> = {}): Client => ({
  ...mockClient,
  ...overrides,
});

// Mock API responses
export const mockPaginatedClientsResponse = {
  count: 3,
  next: null,
  previous: null,
  results: mockClients,
};

// Mock form data
export const mockClientFormData = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+34 600 123 456',
  document_type: 'dni' as const,
  document_number: '12345678A',
  birth_date: '1990-05-15',
};

// Mock invoice
export const mockInvoice: Invoice = {
  id: '1',
  number: 'INV-2024-001',
  status: 'draft',
  subtotal: 50.0,
  tax: 5.0,
  discount: 0,
  total: 55.0,
  currency: 'USD',
  clientId: '1',
  client: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  },
  items: [
    {
      id: '1',
      description: 'Court Reservation',
      quantity: 1,
      unitPrice: 50.0,
      total: 50.0,
      type: 'reservation',
    },
  ],
  issueDate: '2024-01-15',
  dueDate: '2024-02-15',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  payments: [],
};

// Mock payment
export const mockPayment: Payment = {
  id: '1',
  amount: 55.0,
  currency: 'USD',
  method: 'card',
  status: 'completed',
  description: 'Payment for INV-2024-001',
  reference: 'PAY-001',
  clientId: '1',
  client: {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  },
  invoiceId: '1',
  gatewayTransactionId: 'txn_1234567890',
  processedAt: '2024-01-15T10:30:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};
