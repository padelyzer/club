import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { PaymentDetailModal } from '../payment-detail-modal';
import { render } from '@/test-utils';
import { useFinanceStore } from '@/store/financeStore';
import { useUIStore } from '@/store/ui';
import {
  useProcessPayment,
  useRefundPayment,
} from '@/lib/api/hooks/useFinance';
import { mockPayment } from '@/test-utils/mocks';
import { toast } from '@/lib/toast';

// Mock dependencies
jest.mock('@/store/financeStore');
jest.mock('@/store/ui');
jest.mock('@/lib/api/hooks/useFinance');
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'PPP') return 'January 15, 2024';
    if (formatStr === 'PPp') return 'January 15, 2024 at 10:30 AM';
    return '2024-01-15';
  }),
}));

describe('PaymentDetailModal', () => {
  const mockCloseModal = jest.fn();
  const mockSetSelectedPayment = jest.fn();
  const mockUpdatePayment = jest.fn();
  const mockOpenRefundForm = jest.fn();
  const mockProcessPayment = jest.fn();
  const mockRefundPayment = jest.fn();

  const defaultStoreState = {
    pageState: {
      selectedPayment: mockPayment,
    },
    setSelectedPayment: mockSetSelectedPayment,
    updatePayment: mockUpdatePayment,
    openRefundForm: mockOpenRefundForm,
  };

  const defaultUIState = {
    closeModal: mockCloseModal,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useFinanceStore as jest.Mock).mockReturnValue(defaultStoreState);
    (useUIStore as jest.Mock).mockReturnValue(defaultUIState);
    (useProcessPayment as jest.Mock).mockReturnValue({
      mutateAsync: mockProcessPayment,
      isPending: false,
    });
    (useRefundPayment as jest.Mock).mockReturnValue({
      mutateAsync: mockRefundPayment,
      isPending: false,
    });
  });

  it('renders payment details correctly', () => {
    render(<PaymentDetailModal />);

    // Check header
    expect(screen.getByText('finance.paymentDetails')).toBeInTheDocument();
    expect(
      screen.getByText('finance.created January 15, 2024')
    ).toBeInTheDocument();

    // Check status badge
    expect(
      screen.getByText('finance.paymentStatus.completed')
    ).toBeInTheDocument();

    // Check payment information
    expect(screen.getByText('finance.paymentInformation')).toBeInTheDocument();
    expect(screen.getByText('$55.00 USD')).toBeInTheDocument();
    expect(screen.getByText('finance.paymentMethod.card')).toBeInTheDocument();
    expect(screen.getByText('PAY-001')).toBeInTheDocument();
    expect(screen.getByText('txn_1234567890')).toBeInTheDocument();

    // Check client information
    expect(screen.getByText('finance.clientInformation')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('shows action buttons based on payment status', () => {
    render(<PaymentDetailModal />);

    // Should show refund button for completed status
    expect(screen.getByText('finance.requestRefund')).toBeInTheDocument();
    expect(screen.getByText('finance.viewInvoice')).toBeInTheDocument();
    expect(screen.getByText('finance.downloadReceipt')).toBeInTheDocument();
  });

  it('shows process button for pending payment', () => {
    const pendingPayment = {
      ...mockPayment,
      status: 'pending',
    };

    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedPayment: pendingPayment,
      },
    });

    render(<PaymentDetailModal />);

    expect(screen.getByText('finance.processPayment')).toBeInTheDocument();
  });

  it('handles process payment action', async () => {
    const pendingPayment = {
      ...mockPayment,
      status: 'pending',
    };

    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedPayment: pendingPayment,
      },
    });

    mockProcessPayment.mockResolvedValue({});

    render(<PaymentDetailModal />);

    fireEvent.click(screen.getByText('finance.processPayment'));

    await waitFor(() => {
      expect(mockProcessPayment).toHaveBeenCalledWith(pendingPayment.id);
      expect(mockUpdatePayment).toHaveBeenCalledWith(pendingPayment.id, {
        status: 'processing',
      });
      expect(toast.success).toHaveBeenCalledWith('finance.paymentProcessing');
    });
  });

  it('handles process payment error', async () => {
    const pendingPayment = {
      ...mockPayment,
      status: 'pending',
    };

    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedPayment: pendingPayment,
      },
    });

    mockProcessPayment.mockRejectedValue(new Error('Processing failed'));

    render(<PaymentDetailModal />);

    fireEvent.click(screen.getByText('finance.processPayment'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'finance.errorProcessingPayment'
      );
    });
  });

  it('handles refund action', () => {
    render(<PaymentDetailModal />);

    fireEvent.click(screen.getByText('finance.requestRefund'));

    expect(mockOpenRefundForm).toHaveBeenCalled();
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('handles copy transaction ID', () => {
    const mockWriteText = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<PaymentDetailModal />);

    // Find the copy button for transaction ID
    const copyButtons = screen.getAllByLabelText('common.copy');
    fireEvent.click(copyButtons[1]); // Second copy button is for transaction ID

    expect(mockWriteText).toHaveBeenCalledWith('txn_1234567890');
    expect(toast.success).toHaveBeenCalledWith('finance.transactionIdCopied');
  });

  it('handles copy reference', () => {
    const mockWriteText = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<PaymentDetailModal />);

    // Find the copy button for reference
    const copyButtons = screen.getAllByLabelText('common.copy');
    fireEvent.click(copyButtons[0]); // First copy button is for reference

    expect(mockWriteText).toHaveBeenCalledWith('PAY-001');
    expect(toast.success).toHaveBeenCalledWith('finance.referenceCopied');
  });

  it('handles close modal', () => {
    render(<PaymentDetailModal />);

    // Find and click the close button (X)
    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    fireEvent.click(closeButton);

    expect(mockSetSelectedPayment).toHaveBeenCalledWith(null);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('displays payment timeline', () => {
    render(<PaymentDetailModal />);

    expect(screen.getByText('finance.paymentTimeline')).toBeInTheDocument();
    expect(screen.getByText('finance.paymentCreated')).toBeInTheDocument();
    expect(screen.getByText('finance.paymentProcessed')).toBeInTheDocument();
  });

  it('displays related information when available', () => {
    const paymentWithRelations = {
      ...mockPayment,
      reservationId: 'res-123',
      subscriptionId: 'sub-456',
    };

    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedPayment: paymentWithRelations,
      },
    });

    render(<PaymentDetailModal />);

    expect(screen.getByText('finance.relatedInformation')).toBeInTheDocument();
    expect(screen.getByText('finance.courtReservation')).toBeInTheDocument();
    expect(screen.getByText('ID: res-123')).toBeInTheDocument();
    expect(screen.getByText('finance.subscription')).toBeInTheDocument();
    expect(screen.getByText('ID: sub-456')).toBeInTheDocument();
  });

  it('displays gateway data when available', () => {
    const paymentWithGatewayData = {
      ...mockPayment,
      gatewayData: {
        cardBrand: 'Visa',
        last4: '4242',
      },
    };

    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedPayment: paymentWithGatewayData,
      },
    });

    render(<PaymentDetailModal />);

    expect(screen.getByText('finance.gatewayData')).toBeInTheDocument();
    expect(screen.getByText(/"cardBrand": "Visa"/)).toBeInTheDocument();
    expect(screen.getByText(/"last4": "4242"/)).toBeInTheDocument();
  });

  it('shows loading state when mutations are pending', () => {
    (useProcessPayment as jest.Mock).mockReturnValue({
      mutateAsync: mockProcessPayment,
      isPending: true,
    });

    render(<PaymentDetailModal />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('returns null when no payment is selected', () => {
    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedPayment: null,
      },
    });

    const { container } = render(<PaymentDetailModal />);

    expect(container.firstChild).toBeNull();
  });

  it('displays refunded status correctly', () => {
    const refundedPayment = {
      ...mockPayment,
      status: 'refunded',
    };

    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedPayment: refundedPayment,
      },
    });

    render(<PaymentDetailModal />);

    expect(
      screen.getByText('finance.paymentStatus.refunded')
    ).toBeInTheDocument();
    expect(screen.getByText('finance.paymentRefunded')).toBeInTheDocument();
  });
});
