import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Modal } from '../Modal';
import { render } from '@/test-utils';
import { useUIStore } from '@/store/ui';
import { createPortal } from 'react-dom';

// Mock dependencies
jest.mock('@/store/ui');
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: jest.fn((element) => element),
}));

// Mock modal components
jest.mock('@/components/finance/invoice-detail-modal', () => ({
  InvoiceDetailModal: () => <div>Invoice Detail Modal</div>,
}));
jest.mock('@/components/finance/payment-detail-modal', () => ({
  PaymentDetailModal: () => <div>Payment Detail Modal</div>,
}));
jest.mock('@/components/reservations/edit-reservation-modal', () => ({
  EditReservationModal: () => <div>Edit Reservation Modal</div>,
}));

describe('Modal', () => {
  const mockCloseModal = jest.fn();

  const defaultUIState = {
    activeModal: 'test-modal',
    closeModal: mockCloseModal,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUIStore as jest.Mock).mockReturnValue(defaultUIState);
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders children when provided', () => {
    render(
      <Modal>
        <div>Test Modal Content</div>
      </Modal>
    );

    expect(screen.getByText('Test Modal Content')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <Modal size="sm">
        <div>Small Modal</div>
      </Modal>
    );

    let modalContent = screen.getByRole('dialog');
    expect(modalContent).toHaveClass('max-w-md');

    rerender(
      <Modal size="lg">
        <div>Large Modal</div>
      </Modal>
    );

    modalContent = screen.getByRole('dialog');
    expect(modalContent).toHaveClass('max-w-2xl');

    rerender(
      <Modal size="full">
        <div>Full Modal</div>
      </Modal>
    );

    modalContent = screen.getByRole('dialog');
    expect(modalContent).toHaveClass('max-w-none', 'm-4', 'h-full');
  });

  it('shows close button by default', () => {
    render(
      <Modal>
        <div>Test Content</div>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    expect(closeButton).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Modal showCloseButton={false}>
        <div>Test Content</div>
      </Modal>
    );

    const closeButton = screen.queryByRole('button', { name: 'Close modal' });
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();

    render(
      <Modal onClose={mockOnClose}>
        <div>Test Content</div>
      </Modal>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls closeModal from store when no onClose provided', () => {
    render(
      <Modal>
        <div>Test Content</div>
      </Modal>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(mockCloseModal).toHaveBeenCalled();
  });

  it('closes on backdrop click when closeOnOverlayClick is true', () => {
    const mockOnClose = jest.fn();

    render(
      <Modal onClose={mockOnClose} closeOnOverlayClick={true}>
        <div>Test Content</div>
      </Modal>
    );

    const backdrop = screen.getByRole('dialog').previousElementSibling;
    fireEvent.click(backdrop!);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close on backdrop click when closeOnOverlayClick is false', () => {
    const mockOnClose = jest.fn();

    render(
      <Modal onClose={mockOnClose} closeOnOverlayClick={false}>
        <div>Test Content</div>
      </Modal>
    );

    const backdrop = screen.getByRole('dialog').previousElementSibling;
    fireEvent.click(backdrop!);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes on Escape key when closeOnEscape is true', () => {
    const mockOnClose = jest.fn();

    render(
      <Modal onClose={mockOnClose} closeOnEscape={true}>
        <div>Test Content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('does not close on Escape key when closeOnEscape is false', () => {
    const mockOnClose = jest.fn();

    render(
      <Modal onClose={mockOnClose} closeOnEscape={false}>
        <div>Test Content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('prevents body scroll when open', () => {
    render(
      <Modal>
        <div>Test Content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when unmounted', () => {
    const { unmount } = render(
      <Modal>
        <div>Test Content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('unset');
  });

  it('focuses modal on mount', async () => {
    render(
      <Modal>
        <div>Test Content</div>
      </Modal>
    );

    await waitFor(() => {
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();
    });
  });

  it('renders specific modal content based on activeModal', () => {
    (useUIStore as jest.Mock).mockReturnValue({
      ...defaultUIState,
      activeModal: 'invoice-detail',
    });

    render(<Modal />);

    expect(screen.getByText('Invoice Detail Modal')).toBeInTheDocument();
  });

  it('renders payment detail modal', () => {
    (useUIStore as jest.Mock).mockReturnValue({
      ...defaultUIState,
      activeModal: 'payment-detail',
    });

    render(<Modal />);

    expect(screen.getByText('Payment Detail Modal')).toBeInTheDocument();
  });

  it('renders edit reservation modal', () => {
    (useUIStore as jest.Mock).mockReturnValue({
      ...defaultUIState,
      activeModal: 'edit-reservation',
    });

    render(<Modal />);

    expect(screen.getByText('Edit Reservation Modal')).toBeInTheDocument();
  });

  it('renders default content for unknown modal', () => {
    (useUIStore as jest.Mock).mockReturnValue({
      ...defaultUIState,
      activeModal: 'unknown-modal',
    });

    render(<Modal />);

    expect(screen.getByText('Modal')).toBeInTheDocument();
    expect(
      screen.getByText('Unknown modal: unknown-modal')
    ).toBeInTheDocument();
  });

  it('does not render when activeModal is null', () => {
    (useUIStore as jest.Mock).mockReturnValue({
      ...defaultUIState,
      activeModal: null,
    });

    const { container } = render(<Modal />);

    expect(container.firstChild).toBeNull();
  });

  it('uses createPortal to render in document.body', () => {
    render(
      <Modal>
        <div>Test Content</div>
      </Modal>
    );

    expect(createPortal).toHaveBeenCalledWith(expect.anything(), document.body);
  });

  it('applies custom className', () => {
    render(
      <Modal className="custom-modal-class">
        <div>Test Content</div>
      </Modal>
    );

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('custom-modal-class');
  });

  it('handles multiple event listeners cleanup', () => {
    const { unmount } = render(
      <Modal closeOnEscape={true}>
        <div>Test Content</div>
      </Modal>
    );

    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
  });
});
