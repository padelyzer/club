'use client';

import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '@/store/financeStore';
import { useUIStore } from '@/store/ui';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingState } from '@/components/ui/states/loading-state';
import {
  useSendInvoice,
  useDownloadInvoice,
  useMarkInvoiceAsPaid,
} from '@/lib/api/hooks/useFinance';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import {
  FileText,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Send,
  Download,
  Printer,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Eye,
  Copy,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InvoiceStatus } from '@/types/finance';

export const InvoiceDetailModal = () => {
  const { t } = useTranslation();
  const { closeModal } = useUIStore();
  const { pageState, setSelectedInvoice, openInvoiceForm, updateInvoice } =
    useFinanceStore();
  const invoice = pageState.selectedInvoice;

  const sendInvoiceMutation = useSendInvoice();
  const downloadInvoiceMutation = useDownloadInvoice();
  const markAsPaidMutation = useMarkInvoiceAsPaid();

  if (!invoice) {
    return null;
  }

  const handleEdit = () => {
    openInvoiceForm();
    closeModal();
  };

  const handleSend = async () => {
    try {
      await sendInvoiceMutation.mutateAsync(invoice.id);
      updateInvoice(invoice.id, { status: 'sent' });
      toast.success(t('finance.invoiceSent'));
    } catch (error) {
      toast.error(t('finance.errorSendingInvoice'));
    }
  };

  const handleDownload = async () => {
    try {
      const blob = await downloadInvoiceMutation.mutateAsync(invoice.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('finance.invoiceDownloaded'));
    } catch (error) {
      toast.error(t('finance.errorDownloadingInvoice'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMarkAsPaid = async () => {
    try {
      await markAsPaidMutation.mutateAsync(invoice.id);
      updateInvoice(invoice.id, {
        status: 'paid',
        paidDate: new Date().toISOString(),
      });
      toast.success(t('finance.invoiceMarkedAsPaid'));
    } catch (error) {
      toast.error(t('finance.errorMarkingAsPaid'));
    }
  };

  const handleCopyInvoiceNumber = () => {
    navigator.clipboard.writeText(invoice.number);
    toast.success(t('finance.invoiceNumberCopied'));
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/invoices/${invoice.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(t('finance.shareLinkCopied'));
  };

  const handleClose = () => {
    setSelectedInvoice(null);
    closeModal();
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'sent':
      case 'viewed':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'draft':
        return <FileText className="h-5 w-5 text-gray-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'sent':
      case 'viewed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const isLoading =
    sendInvoiceMutation.isPending ||
    downloadInvoiceMutation.isPending ||
    markAsPaidMutation.isPending;

  return (
    <Modal size="xl" as any onClose={handleClose}>
      {isLoading && <LoadingState overlay />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {t('finance.invoice')} #{invoice.number}
                <button
                  onClick={handleCopyInvoiceNumber}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  aria-label={t('common.copy')}
                >
                  <Copy className="h-4 w-4 text-gray-500" />
                </button>
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('finance.created')}{' '}
                {format(new Date(invoice.createdAt), 'PPP')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusIcon(invoice.status)}
            <Badge className={cn('text-sm', getStatusColor(invoice.status))}>
              {t(`finance.invoiceStatus.${invoice.status}`)}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleEdit} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </Button>

          {invoice.status === 'draft' && (
            <Button onClick={handleSend} variant="default">
              <Send className="h-4 w-4 mr-2" />
              {t('finance.sendInvoice')}
            </Button>
          )}

          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('finance.downloadPDF')}
          </Button>

          <Button onClick={handlePrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            {t('common.print')}
          </Button>

          <Button onClick={handleShare} variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            {t('common.share')}
          </Button>

          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button
              onClick={handleMarkAsPaid}
              variant="outline"
              className="ml-auto"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {t('finance.markAsPaid')}
            </Button>
          )}
        </div>

        <Separator />

        {/* Client Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('finance.clientInformation')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {invoice.client?.firstName} {invoice.client?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('finance.client')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{invoice.client?.email}</p>
                <p className="text-sm text-muted-foreground">
                  {t('common.email')}
                </p>
              </div>
            </div>

            {invoice.client?.address && (
              <div className="flex items-start gap-3 md:col-span-2">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{invoice.client.address}</p>
                  {invoice.client.city && invoice.client.postalCode && (
                    <p className="text-sm">
                      {invoice.client.city}, {invoice.client.postalCode}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {t('common.address')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Invoice Details */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('finance.invoiceDetails')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {format(new Date(invoice.issueDate), 'PPP')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('finance.issueDate')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  {format(new Date(invoice.dueDate), 'PPP')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('finance.dueDate')}
                </p>
              </div>
            </div>

            {invoice.paidDate && (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {format(new Date(invoice.paidDate), 'PPP')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('finance.paidDate')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Invoice Items */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              {t('finance.items')}
            </h4>
            <div className="border dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('finance.description')}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('finance.quantity')}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('finance.unitPrice')}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('finance.total')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {invoice.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.type}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        ${item.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t('finance.subtotal')}
              </span>
              <span>
                ${invoice.subtotal.toFixed(2)} {invoice.currency}
              </span>
            </div>
            {invoice.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('finance.discount')}
                </span>
                <span className="text-green-600">
                  -${invoice.discount.toFixed(2)} {invoice.currency}
                </span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('finance.tax')}
                </span>
                <span>
                  ${invoice.tax.toFixed(2)} {invoice.currency}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>{t('finance.total')}</span>
              <span>
                ${invoice.total.toFixed(2)} {invoice.currency}
              </span>
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <>
              <Separator className="my-6" />
              {invoice.notes && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    {t('finance.notes')}
                  </h4>
                  <p className="text-sm">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-2">
                    {t('finance.termsAndConditions')}
                  </h4>
                  <p className="text-sm">{invoice.terms}</p>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('finance.paymentHistory')}
            </h3>
            <div className="space-y-3">
              {invoice.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">
                        ${payment.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), 'PPP')}
                      </p>
                    </div>
                  </div>
                  <Badge className="capitalize">{payment.method}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Activity Log */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('finance.activityLog')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">
                    {t('finance.invoiceCreated')}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(invoice.createdAt), 'PPp')}
                </p>
              </div>
            </div>

            {invoice.status === 'sent' && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">
                      {t('finance.invoiceSentToClient')}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(invoice.updatedAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}

            {invoice.status === 'viewed' && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">
                      {t('finance.invoiceViewedByClient')}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(invoice.updatedAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}

            {invoice.status === 'paid' && invoice.paidDate && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">
                      {t('finance.invoicePaid')}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(invoice.paidDate), 'PPp')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Modal>
  );
};
