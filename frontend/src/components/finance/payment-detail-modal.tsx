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
  useProcessPayment,
  useRefundPayment,
} from '@/lib/api/hooks/useFinance';
import { format } from 'date-fns';
import { toast } from '@/lib/toast';
import {
  CreditCard,
  Calendar,
  User,
  Mail,
  Phone,
  DollarSign,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  AlertCircle,
  FileText,
  Hash,
  Copy,
  Receipt,
  Wallet,
  Banknote,
  Smartphone,
  Globe,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentStatus, PaymentMethod } from '@/types/finance';

export const PaymentDetailModal = () => {
  const { t } = useTranslation();
  const { closeModal } = useUIStore();
  const { pageState, setSelectedPayment, updatePayment, openRefundForm } =
    useFinanceStore();
  const payment = pageState.selectedPayment;

  const processPaymentMutation = useProcessPayment();
  const refundPaymentMutation = useRefundPayment();

  if (!payment) {
    return null;
  }

  const handleProcess = async () => {
    try {
      await processPaymentMutation.mutateAsync(payment.id);
      updatePayment(payment.id, { status: 'processing' });
      toast.success(t('finance.paymentProcessing'));
    } catch (error) {
      toast.error(t('finance.errorProcessingPayment'));
    }
  };

  const handleRefund = () => {
    openRefundForm();
    closeModal();
  };

  const handleClose = () => {
    setSelectedPayment(null);
    closeModal();
  };

  const handleCopyTransactionId = () => {
    if (payment.gatewayTransactionId) {
      navigator.clipboard.writeText(payment.gatewayTransactionId);
      toast.success(t('finance.transactionIdCopied'));
    }
  };

  const handleCopyReference = () => {
    if (payment.reference) {
      navigator.clipboard.writeText(payment.reference);
      toast.success(t('finance.referenceCopied'));
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
        return <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-600" />;
      case 'refunded':
      case 'partially_refunded':
        return <AlertCircle className="h-5 w-5 text-purple-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'refunded':
      case 'partially_refunded':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-5 w-5 text-blue-600" />;
      case 'cash':
        return <Banknote className="h-5 w-5 text-green-600" />;
      case 'transfer':
        return <RefreshCw className="h-5 w-5 text-purple-600" />;
      case 'online':
        return <Globe className="h-5 w-5 text-indigo-600" />;
      case 'wallet':
        return <Wallet className="h-5 w-5 text-orange-600" />;
      default:
        return <DollarSign className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case 'card':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'transfer':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'online':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'wallet':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const isLoading =
    processPaymentMutation.isPending || refundPaymentMutation.isPending;

  return (
    <Modal size="lg" onClose={handleClose}>
      {isLoading && <LoadingState overlay />}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {t('finance.paymentDetails')}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('finance.created')}{' '}
                {format(new Date(payment.createdAt), 'PPP')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusIcon(payment.status)}
            <Badge className={cn('text-sm', getStatusColor(payment.status))}>
              {t(`finance.paymentStatus.${payment.status}`)}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {payment.status === 'pending' && (
            <Button onClick={handleProcess} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('finance.processPayment')}
            </Button>
          )}

          {payment.status === 'completed' && (
            <Button onClick={handleRefund} variant="outline">
              <AlertCircle className="h-4 w-4 mr-2" />
              {t('finance.requestRefund')}
            </Button>
          )}

          {payment.invoiceId && (
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              {t('finance.viewInvoice')}
            </Button>
          )}

          <Button variant="outline">
            <Receipt className="h-4 w-4 mr-2" />
            {t('finance.downloadReceipt')}
          </Button>
        </div>

        <Separator />

        {/* Payment Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('finance.paymentInformation')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-2xl font-bold">
                  ${payment.amount.toFixed(2)} {payment.currency}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('finance.amount')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              {getMethodIcon(payment.method)}
              <div>
                <Badge className={getMethodColor(payment.method)}>
                  {t(`finance.paymentMethod.${payment.method}`)}
                </Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('finance.paymentMethod')}
                </p>
              </div>
            </div>

            {payment.reference && (
              <div className="flex items-start gap-3">
                <Hash className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {payment.reference}
                    <button
                      onClick={handleCopyReference}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label={t('common.copy')}
                    >
                      <Copy className="h-3 w-3 text-gray-500" />
                    </button>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('finance.reference')}
                  </p>
                </div>
              </div>
            )}

            {payment.gatewayTransactionId && (
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {payment.gatewayTransactionId}
                    <button
                      onClick={handleCopyTransactionId}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      aria-label={t('common.copy')}
                    >
                      <Copy className="h-3 w-3 text-gray-500" />
                    </button>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('finance.transactionId')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {payment.description && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <p className="text-sm text-muted-foreground mb-1">
                {t('finance.description')}
              </p>
              <p className="font-medium">{payment.description}</p>
            </div>
          )}
        </Card>

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
                  {payment.client?.firstName} {payment.client?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('finance.client')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{payment.client?.email}</p>
                <p className="text-sm text-muted-foreground">
                  {t('common.email')}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Timeline */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {t('finance.paymentTimeline')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{t('finance.paymentCreated')}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(payment.createdAt), 'PPp')}
                </p>
              </div>
            </div>

            {payment.processedAt && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-full">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t('finance.paymentProcessed')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.processedAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}

            {payment.status === 'failed' && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{t('finance.paymentFailed')}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.updatedAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}

            {(payment.status === 'refunded' ||
              payment.status === 'partially_refunded') && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                  <AlertCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {payment.status === 'refunded'
                      ? t('finance.paymentRefunded')
                      : t('finance.paymentPartiallyRefunded')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(payment.updatedAt), 'PPp')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Related Information */}
        {(payment.reservationId || payment.subscriptionId) && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('finance.relatedInformation')}
            </h3>
            <div className="space-y-3">
              {payment.reservationId && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">
                        {t('finance.courtReservation')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ID: {payment.reservationId}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    {t('common.view')}
                  </Button>
                </div>
              )}

              {payment.subscriptionId && (
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">{t('finance.subscription')}</p>
                      <p className="text-sm text-muted-foreground">
                        ID: {payment.subscriptionId}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    {t('common.view')}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Gateway Data (for debugging/admin) */}
        {payment.gatewayData && Object.keys(payment.gatewayData).length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('finance.gatewayData')}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(payment.gatewayData, null, 2)}
              </pre>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};
