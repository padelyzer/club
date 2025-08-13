import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientForm } from '../client-form';
import { render } from '@/test-utils';
import { mockClient, mockClientFormData } from '@/test-utils/mocks';

// Mock hooks
jest.mock('@/lib/api/hooks/useClients', () => ({
  useClientMutations: () => ({
    createClient: jest.fn().mockResolvedValue({}),
    updateClient: jest.fn().mockResolvedValue({}),
  }),
  useCheckEmail: () => ({
    checkEmail: jest.fn().mockResolvedValue(true),
  }),
}));

// Mock Modal component
jest.mock('@/components/layout/Modal', () => ({
  Modal: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn(() => '2024-01-15'),
}));

describe('ClientForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  const defaultProps = {
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders create form with empty fields', () => {
      render(<ClientForm {...defaultProps} />);

      expect(screen.getByText('clients.newClient')).toBeInTheDocument();
      expect(screen.getByLabelText('clients.firstName')).toHaveValue('');
      expect(screen.getByLabelText('clients.lastName')).toHaveValue('');
      expect(screen.getByLabelText('clients.email')).toHaveValue('');
      expect(screen.getByLabelText('clients.phone')).toHaveValue('');
    });

    it('validates required fields', async () => {
      render(<ClientForm {...defaultProps} />);

      const submitButton = screen.getByText('common.create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Name must be at least 2 characters')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Last name must be at least 2 characters')
        ).toBeInTheDocument();
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
        expect(
          screen.getByText('Phone must be at least 8 characters')
        ).toBeInTheDocument();
      });
    });

    it('checks email availability', async () => {
      const { useCheckEmail } = require('@/lib/api/hooks/useClients');
      const mockCheckEmail = jest.fn().mockResolvedValue(false);
      useCheckEmail.mockReturnValue({ checkEmail: mockCheckEmail });

      render(<ClientForm {...defaultProps} />);

      const emailInput = screen.getByLabelText('clients.email');
      await userEvent.type(emailInput, 'taken@example.com');

      await waitFor(() => {
        expect(mockCheckEmail).toHaveBeenCalledWith('taken@example.com');
        expect(
          screen.getByText('clients.emailNotAvailable')
        ).toBeInTheDocument();
      });
    });

    it('submits form with valid data', async () => {
      const { useClientMutations } = require('@/lib/api/hooks/useClients');
      const mockCreateClient = jest.fn().mockResolvedValue({});
      useClientMutations.mockReturnValue({
        createClient: mockCreateClient,
        updateClient: jest.fn(),
      });

      render(<ClientForm {...defaultProps} />);

      // Fill form
      await userEvent.type(screen.getByLabelText('clients.firstName'), 'John');
      await userEvent.type(screen.getByLabelText('clients.lastName'), 'Doe');
      await userEvent.type(
        screen.getByLabelText('clients.email'),
        'john.doe@example.com'
      );
      await userEvent.type(
        screen.getByLabelText('clients.phone'),
        '+34600123456'
      );

      const submitButton = screen.getByText('common.create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateClient).toHaveBeenCalledWith({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+34600123456',
          document_type: undefined,
          document_number: '',
          birth_date: '',
        });
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    it('renders edit form with client data', () => {
      render(<ClientForm {...defaultProps} client={mockClient} />);

      expect(screen.getByText('clients.editClient')).toBeInTheDocument();
      expect(screen.getByLabelText('clients.firstName')).toHaveValue('John');
      expect(screen.getByLabelText('clients.lastName')).toHaveValue('Doe');
      expect(screen.getByLabelText('clients.email')).toHaveValue(
        'john.doe@example.com'
      );
      expect(screen.getByLabelText('clients.phone')).toHaveValue(
        '+34 600 123 456'
      );
    });

    it('does not check email availability in edit mode', async () => {
      const { useCheckEmail } = require('@/lib/api/hooks/useClients');
      const mockCheckEmail = jest.fn();
      useCheckEmail.mockReturnValue({ checkEmail: mockCheckEmail });

      render(<ClientForm {...defaultProps} client={mockClient} />);

      const emailInput = screen.getByLabelText('clients.email');
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'newemail@example.com');

      await waitFor(() => {
        expect(mockCheckEmail).not.toHaveBeenCalled();
      });
    });

    it('updates client with valid data', async () => {
      const { useClientMutations } = require('@/lib/api/hooks/useClients');
      const mockUpdateClient = jest.fn().mockResolvedValue({});
      useClientMutations.mockReturnValue({
        createClient: jest.fn(),
        updateClient: mockUpdateClient,
      });

      render(<ClientForm {...defaultProps} client={mockClient} />);

      // Update name
      const firstNameInput = screen.getByLabelText('clients.firstName');
      await userEvent.clear(firstNameInput);
      await userEvent.type(firstNameInput, 'Jane');

      const submitButton = screen.getByText('common.update');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockUpdateClient).toHaveBeenCalledWith(
          mockClient.id,
          expect.objectContaining({
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'john.doe@example.com',
            phone: '+34 600 123 456',
          })
        );
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('Form Interactions', () => {
    it('handles document type selection', async () => {
      render(<ClientForm {...defaultProps} />);

      const documentTypeButton = screen.getByText('clients.selectDocumentType');
      fireEvent.click(documentTypeButton);

      const dniOption = screen.getByText('clients.dni');
      fireEvent.click(dniOption);

      expect(documentTypeButton).toHaveTextContent('clients.dni');
    });

    it('handles birth date input', async () => {
      render(<ClientForm {...defaultProps} />);

      const birthDateInput = screen.getByLabelText('clients.birthDate');
      await userEvent.type(birthDateInput, '1990-05-15');

      expect(birthDateInput).toHaveValue('1990-05-15');
    });

    it('disables submit button when submitting', async () => {
      render(<ClientForm {...defaultProps} />);

      // Fill required fields
      await userEvent.type(screen.getByLabelText('clients.firstName'), 'John');
      await userEvent.type(screen.getByLabelText('clients.lastName'), 'Doe');
      await userEvent.type(
        screen.getByLabelText('clients.email'),
        'john@example.com'
      );
      await userEvent.type(screen.getByLabelText('clients.phone'), '12345678');

      const submitButton = screen.getByText('common.create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('closes form when cancel is clicked', () => {
      render(<ClientForm {...defaultProps} />);

      const cancelButton = screen.getByText('common.cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('closes form when X button is clicked', () => {
      render(<ClientForm {...defaultProps} />);

      const closeButton = screen.getByRole('button', {
        name: '',
      }).parentElement;
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles submission errors gracefully', async () => {
      const { useClientMutations } = require('@/lib/api/hooks/useClients');
      const mockCreateClient = jest
        .fn()
        .mockRejectedValue(new Error('API Error'));
      useClientMutations.mockReturnValue({
        createClient: mockCreateClient,
        updateClient: jest.fn(),
      });

      // Spy on console.error
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<ClientForm {...defaultProps} />);

      // Fill required fields
      await userEvent.type(screen.getByLabelText('clients.firstName'), 'John');
      await userEvent.type(screen.getByLabelText('clients.lastName'), 'Doe');
      await userEvent.type(
        screen.getByLabelText('clients.email'),
        'john@example.com'
      );
      await userEvent.type(screen.getByLabelText('clients.phone'), '12345678');

      const submitButton = screen.getByText('common.create');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error saving client:',
          expect.any(Error)
        );
        expect(mockOnSuccess).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });
});
