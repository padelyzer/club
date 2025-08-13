import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { InvoiceDetailModal } from '../invoice-detail-modal';
import { render } from '@/test-utils';
import { useFinanceStore } from '@/store/financeStore';
import { useUIStore } from '@/store/ui';
import {
  useSendInvoice,
  useDownloadInvoice,
  useMarkInvoiceAsPaid,
} from '@/lib/api/hooks/useFinance';
import { mockInvoice } from '@/test-utils/mocks';
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

describe('InvoiceDetailModal', () => {
  const mockCloseModal = jest.fn();
  const mockSetSelectedInvoice = jest.fn();
  const mockOpenInvoiceForm = jest.fn();
  const mockUpdateInvoice = jest.fn();
  const mockSendInvoice = jest.fn();
  const mockDownloadInvoice = jest.fn();
  const mockMarkAsPaid = jest.fn();

  const defaultStoreState = {
    pageState: {
      selectedInvoice: mockInvoice,
    },
    setSelectedInvoice: mockSetSelectedInvoice,
    openInvoiceForm: mockOpenInvoiceForm,
    updateInvoice: mockUpdateInvoice,
  };

  const defaultUIState = {
    closeModal: mockCloseModal,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useFinanceStore as jest.Mock).mockReturnValue(defaultStoreState);
    (useUIStore as jest.Mock).mockReturnValue(defaultUIState);
    (useSendInvoice as jest.Mock).mockReturnValue({
      mutateAsync: mockSendInvoice,
      isPending: false,
    });
    (useDownloadInvoice as jest.Mock).mockReturnValue({
      mutateAsync: mockDownloadInvoice,
      isPending: false,
    });
    (useMarkInvoiceAsPaid as jest.Mock).mockReturnValue({
      mutateAsync: mockMarkAsPaid,
      isPending: false,
    });
  });

  it('renders invoice details correctly', () => {
    render(<InvoiceDetailModal />);

    // Check header
    expect(
      screen.getByText(`finance.invoice #${mockInvoice.number}`)
    ).toBeInTheDocument();
    expect(
      screen.getByText('finance.created January 15, 2024')
    ).toBeInTheDocument();

    // Check status badge
    expect(screen.getByText('finance.invoiceStatus.draft')).toBeInTheDocument();

    // Check client information
    expect(screen.getByText('finance.clientInformation')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();

    // Check invoice details
    expect(screen.getByText('finance.invoiceDetails')).toBeInTheDocument();
    expect(screen.getByText('finance.issueDate')).toBeInTheDocument();
    expect(screen.getByText('finance.dueDate')).toBeInTheDocument();

    // Check items table
    expect(screen.getByText('finance.items')).toBeInTheDocument();
    expect(screen.getByText('Court Reservation')).toBeInTheDocument();

    // Check totals
    expect(screen.getByText('$50.00')).toBeInTheDocument(); // Subtotal
    expect(screen.getByText('$55.00')).toBeInTheDocument(); // Total
  });

  it('renders action buttons based on invoice status', () => {
    render(<InvoiceDetailModal />);

    // Should show Send Invoice button for draft status
    expect(screen.getByText('finance.sendInvoice')).toBeInTheDocument();
    expect(screen.getByText('common.edit')).toBeInTheDocument();
    expect(screen.getByText('finance.downloadPDF')).toBeInTheDocument();
    expect(screen.getByText('common.print')).toBeInTheDocument();
    expect(screen.getByText('common.share')).toBeInTheDocument();
    expect(screen.getByText('finance.markAsPaid')).toBeInTheDocument();
  });

  it('handles edit action', () => {
    render(<InvoiceDetailModal />);

    fireEvent.click(screen.getByText('common.edit'));

    expect(mockOpenInvoiceForm).toHaveBeenCalled();
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('handles send invoice action', async () => {
    mockSendInvoice.mockResolvedValue({});

    render(<InvoiceDetailModal />);

    fireEvent.click(screen.getByText('finance.sendInvoice'));

    await waitFor(() => {
      expect(mockSendInvoice).toHaveBeenCalledWith(mockInvoice.id);
      expect(mockUpdateInvoice).toHaveBeenCalledWith(mockInvoice.id, {
        status: 'sent',
      });
      expect(toast.success).toHaveBeenCalledWith('finance.invoiceSent');
    });
  });

  it('handles send invoice error', async () => {
    mockSendInvoice.mockRejectedValue(new Error('Network error'));

    render(<InvoiceDetailModal />);

    fireEvent.click(screen.getByText('finance.sendInvoice'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('finance.errorSendingInvoice');
    });
  });

  it('handles download invoice action', async () => {
    const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
    mockDownloadInvoice.mockResolvedValue(mockBlob);

    // Mock URL methods
    const mockCreateObjectURL = jest.fn(() => 'blob:url');
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement
    const mockAnchorElement = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    document.createElement = jest.fn(() => mockAnchorElement as any);

    render(<InvoiceDetailModal />);

    fireEvent.click(screen.getByText('finance.downloadPDF'));

    await waitFor(() => {
      expect(mockDownloadInvoice).toHaveBeenCalledWith(mockInvoice.id);
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockAnchorElement.download).toBe(
        `invoice-${mockInvoice.number}.pdf`
      );
      expect(mockAnchorElement.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:url');
      expect(toast.success).toHaveBeenCalledWith('finance.invoiceDownloaded');
    });
  });

  it('handles mark as paid action', async () => {
    mockMarkAsPaid.mockResolvedValue({});

    render(<InvoiceDetailModal />);

    fireEvent.click(screen.getByText('finance.markAsPaid'));

    await waitFor(() => {
      expect(mockMarkAsPaid).toHaveBeenCalledWith(mockInvoice.id);
      expect(mockUpdateInvoice).toHaveBeenCalledWith(
        mockInvoice.id,
        expect.objectContaining({
          status: 'paid',
          paidDate: expect.any(String),
        })
      );
      expect(toast.success).toHaveBeenCalledWith('finance.invoiceMarkedAsPaid');
    });
  });

  it('handles copy invoice number', () => {
    const mockWriteText = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<InvoiceDetailModal />);

    const copyButton = screen.getByLabelText('common.copy');
    fireEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(mockInvoice.number);
    expect(toast.success).toHaveBeenCalledWith('finance.invoiceNumberCopied');
  });

  it('handles share action', () => {
    const mockWriteText = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });

    render(<InvoiceDetailModal />);

    fireEvent.click(screen.getByText('common.share'));

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining(`/invoices/${mockInvoice.id}`)
    );
    expect(toast.success).toHaveBeenCalledWith('finance.shareLinkCopied');
  });

  it('handles close modal', () => {
    render(<InvoiceDetailModal />);

    // Find and click the close button (X)
    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    fireEvent.click(closeButton);

    expect(mockSetSelectedInvoice).toHaveBeenCalledWith(null);
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('shows loading state when mutations are pending', () => {
    (useSendInvoice as jest.Mock).mockReturnValue({
      mutateAsync: mockSendInvoice,
      isPending: true,
    });

    render(<InvoiceDetailModal />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays payment history when available', () => {
    const invoiceWithPayments = {
      ...mockInvoice,
      payments: [
        {
          id: '1',
          amount: 55.0,
          createdAt: '2024-01-20T10:00:00Z',
          method: 'card',
        },
      ],
    };

    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedInvoice: invoiceWithPayments,
      },
    });

    render(<InvoiceDetailModal />);

    expect(screen.getByText('finance.paymentHistory')).toBeInTheDocument();
    expect(screen.getByText('$55.00')).toBeInTheDocument();
    expect(screen.getByText('card')).toBeInTheDocument();
  });

  it('displays activity log', () => {
    render(<InvoiceDetailModal />);

    expect(screen.getByText('finance.activityLog')).toBeInTheDocument();
    expect(screen.getByText('finance.invoiceCreated')).toBeInTheDocument();
  });

  it('returns null when no invoice is selected', () => {
    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedInvoice: null,
      },
    });

    const { container } = render(<InvoiceDetailModal />);

    expect(container.firstChild).toBeNull();
  });

  it('displays notes and terms when available', () => {
    const invoiceWithNotesAndTerms = {
      ...mockInvoice,
      notes: 'Special payment instructions',
      terms: 'Payment due within 30 days',
    };

    (useFinanceStore as jest.Mock).mockReturnValue({
      ...defaultStoreState,
      pageState: {
        selectedInvoice: invoiceWithNotesAndTerms,
      },
    });

    render(<InvoiceDetailModal />);

    expect(screen.getByText('finance.notes')).toBeInTheDocument();
    expect(
      screen.getByText('Special payment instructions')
    ).toBeInTheDocument();
    expect(screen.getByText('finance.termsAndConditions')).toBeInTheDocument();
    expect(screen.getByText('Payment due within 30 days')).toBeInTheDocument();
  });
});
