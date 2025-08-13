'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoadingState } from '@/components/ui/loading';
import { ErrorState } from '@/components/ui/states/error-state';
import {
  Plus,
  FileText,
  Send,
  Download,
  Eye,
  MoreHorizontal,
  Calendar,
  DollarSign,
  User,
  Building,
  Mail,
  Receipt,
  Check,
  Clock,
  AlertTriangle,
  X,
  Search,
  Filter,
  RefreshCw,
  CreditCard,
  Hash,
  Globe,
  Printer,
  Share,
} from 'lucide-react';
import {
  useBackendInvoices,
  useCreateInvoiceFromTransactions,
  useGenerateCFDI,
  useBackendTransactions,
} from '@/lib/api/hooks/useFinance';

interface InvoiceGeneratorProps {
  className?: string;
}

interface InvoiceFormData {
  customer_rfc: string;
  customer_name: string;
  customer_email: string;
  customer_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  customer_tax_regime: string;
  transaction_ids: string[];
  cfdi_use: string;
  payment_method: string;
  payment_way: string;
  notes: string;
}

const CFDI_USE_OPTIONS = [
  { value: 'G01', label: 'Adquisición de mercancías' },
  { value: 'G02', label: 'Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'Gastos en general' },
  { value: 'D10', label: 'Pagos por servicios educativos' },
  { value: 'P01', label: 'Por definir' },
];

const PAYMENT_METHODS = [
  { value: '01', label: 'Efectivo' },
  { value: '02', label: 'Cheque nominativo' },
  { value: '03', label: 'Transferencia electrónica de fondos' },
  { value: '04', label: 'Tarjeta de crédito' },
  { value: '05', label: 'Monedero electrónico' },
  { value: '28', label: 'Tarjeta de débito' },
];

const PAYMENT_WAYS = [
  { value: 'PUE', label: 'Pago en una sola exhibición' },
  { value: 'PPD', label: 'Pago en parcialidades o diferido' },
];

export const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ 
  className = '' 
}) => {
  const { t } = useTranslation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTransactionSelectorOpen, setIsTransactionSelectorOpen] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    start_date: '',
    end_date: '',
  });

  // Data fetching
  const {
    data: invoicesResponse,
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useBackendInvoices(filters);

  const {
    data: transactionsResponse,
    isLoading: transactionsLoading,
  } = useBackendTransactions({
    transaction_type: 'income',
    status: 'completed',
  });

  // Mutations
  const createInvoiceMutation = useCreateInvoiceFromTransactions();
  const generateCFDIMutation = useGenerateCFDI();

  const invoices = invoicesResponse?.data || [];
  const transactions = transactionsResponse?.data || [];

  // Form state
  const [formData, setFormData] = useState<InvoiceFormData>({
    customer_rfc: '',
    customer_name: '',
    customer_email: '',
    customer_address: {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'México',
    },
    customer_tax_regime: '601',
    transaction_ids: [],
    cfdi_use: 'P01',
    payment_method: '01',
    payment_way: 'PUE',
    notes: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      search: '',
      start_date: '',
      end_date: '',
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.transaction_ids.length === 0) {
      alert(t('finance.selectTransactionsFirst'));
      return;
    }

    try {
      await createInvoiceMutation.mutateAsync(formData);
      setFormData({
        customer_rfc: '',
        customer_name: '',
        customer_email: '',
        customer_address: {
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: 'México',
        },
        customer_tax_regime: '601',
        transaction_ids: [],
        cfdi_use: 'P01',
        payment_method: '01',
        payment_way: 'PUE',
        notes: '',
      });
      setSelectedTransactions([]);
      setIsCreateModalOpen(false);
      refetchInvoices();
    } catch (error) {
          }
  };

  const handleGenerateCFDI = async (invoiceId: string) => {
    try {
      await generateCFDIMutation.mutateAsync(invoiceId);
      refetchInvoices();
    } catch (error) {
          }
  };

  const handleTransactionSelect = (transactionId: string) => {
    const updatedSelection = selectedTransactions.includes(transactionId)
      ? selectedTransactions.filter(id => id !== transactionId)
      : [...selectedTransactions, transactionId];
    
    setSelectedTransactions(updatedSelection);
    setFormData(prev => ({
      ...prev,
      transaction_ids: updatedSelection,
    }));
  };

  const getSelectedTransactionsTotal = () => {
    return transactions
      .filter(t => selectedTransactions.includes(t.id))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      draft: { variant: 'secondary' as const, icon: Clock, color: 'text-gray-600' },
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      sent: { variant: 'default' as const, icon: Send, color: 'text-blue-600' },
      stamped: { variant: 'default' as const, icon: Check, color: 'text-green-600' },
      cancelled: { variant: 'destructive' as const, icon: X, color: 'text-red-600' },
      error: { variant: 'destructive' as const, icon: AlertTriangle, color: 'text-red-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {t(`finance.invoiceStatus.${status}`, status)}
      </Badge>
    );
  };

  if (invoicesLoading) {
    return <LoadingState message={t('finance.loadingInvoices')} />;
  }

  if (invoicesError) {
    return (
      <ErrorState
        title={t('finance.errorLoadingInvoices')}
        message={invoicesError.message}
        onRetry={refetchInvoices}
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-8 w-8" />
            {t('finance.invoiceGenerator')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('finance.createCFDIInvoices')}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchInvoices()}
            disabled={invoicesLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${invoicesLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('finance.createInvoice')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('finance.createInvoice')}</DialogTitle>
              </DialogHeader>
              <InvoiceForm
                formData={formData}
                setFormData={setFormData}
                selectedTransactions={selectedTransactions}
                transactions={transactions}
                onTransactionSelect={handleTransactionSelect}
                onSubmit={handleFormSubmit}
                onCancel={() => setIsCreateModalOpen(false)}
                isLoading={createInvoiceMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('finance.totalInvoices')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invoices.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">{t('finance.stamped')}</p>
                <p className="text-2xl font-bold text-green-900">
                  {invoices.filter(inv => inv.status === 'stamped').length}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">{t('finance.sent')}</p>
                <p className="text-2xl font-bold text-blue-900">
                  {invoices.filter(inv => inv.status === 'sent').length}
                </p>
              </div>
              <Send className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">{t('finance.totalValue')}</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0).toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('common.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>{t('common.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('finance.searchInvoices')}
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label>{t('common.status')}</Label>
              <Select
                value={filters.status || ''}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('common.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('common.all')}</SelectItem>
                  <SelectItem value="draft">{t('finance.invoiceStatus.draft')}</SelectItem>
                  <SelectItem value="pending">{t('finance.invoiceStatus.pending')}</SelectItem>
                  <SelectItem value="sent">{t('finance.invoiceStatus.sent')}</SelectItem>
                  <SelectItem value="stamped">{t('finance.invoiceStatus.stamped')}</SelectItem>
                  <SelectItem value="cancelled">{t('finance.invoiceStatus.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('common.startDate')}</Label>
              <Input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>

            <div>
              <Label>{t('common.endDate')}</Label>
              <Input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>
          </div>

          {Object.values(filters).some(filter => filter) && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <span className="text-sm text-gray-600">
                {t('common.filtersApplied', { count: Object.values(filters).filter(f => f).length })}
              </span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                {t('common.clearFilters')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('finance.invoiceNumber')}</TableHead>
                <TableHead>{t('finance.customer')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
                <TableHead>{t('common.amount')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('finance.cfdiUuid')}</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-gray-50">
                  <TableCell className="font-mono text-sm font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-sm">{invoice.customer_name}</div>
                      <div className="text-xs text-gray-500">{invoice.customer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(invoice.issue_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {parseFloat(invoice.total).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {invoice.uuid ? (
                      <div className="flex items-center gap-2">
                        <Hash className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{invoice.uuid}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('common.view')}
                        </DropdownMenuItem>
                        {!invoice.uuid && invoice.status === 'draft' && (
                          <DropdownMenuItem 
                            onClick={() => handleGenerateCFDI(invoice.id)}
                            disabled={generateCFDIMutation.isPending}
                          >
                            <Receipt className="h-4 w-4 mr-2" />
                            {t('finance.generateCFDI')}
                          </DropdownMenuItem>
                        )}
                        {invoice.uuid && (
                          <>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              {t('finance.downloadPDF')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              {t('finance.downloadXML')}
                            </DropdownMenuItem>
                          </>
                        )}
                        {invoice.status === 'stamped' && (
                          <DropdownMenuItem>
                            <Send className="h-4 w-4 mr-2" />
                            {t('finance.sendToCustomer')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Share className="h-4 w-4 mr-2" />
                          {t('common.share')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Empty State */}
          {invoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('finance.noInvoicesFound')}
              </h3>
              <p className="text-gray-600 mb-4">
                {t('finance.noInvoicesMessage')}
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('finance.createFirstInvoice')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Invoice Form Component
interface InvoiceFormProps {
  formData: InvoiceFormData;
  setFormData: (data: InvoiceFormData) => void;
  selectedTransactions: string[];
  transactions: any[];
  onTransactionSelect: (transactionId: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const InvoiceForm: React.FC<InvoiceFormProps> = ({
  formData,
  setFormData,
  selectedTransactions,
  transactions,
  onTransactionSelect,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const { t } = useTranslation();

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...(formData as any)[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({ ...formData, [field]: value });
    }
  };

  const selectedTransactionsTotal = transactions
    .filter(t => selectedTransactions.includes(t.id))
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('finance.customerInformation')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>{t('finance.customerRFC')}</Label>
            <Input
              value={formData.customer_rfc || ''}
              onChange={(e) => handleInputChange('customer_rfc', e.target.value)}
              placeholder="XAXX010101000"
              required
            />
          </div>
          <div>
            <Label>{t('finance.customerName')}</Label>
            <Input
              value={formData.customer_name || ''}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
              placeholder={t('finance.customerNamePlaceholder')}
              required
            />
          </div>
          <div>
            <Label>{t('finance.customerEmail')}</Label>
            <Input
              type="email"
              value={formData.customer_email || ''}
              onChange={(e) => handleInputChange('customer_email', e.target.value)}
              placeholder={t('finance.customerEmailPlaceholder')}
              required
            />
          </div>
          <div>
            <Label>{t('finance.taxRegime')}</Label>
            <Input
              value={formData.customer_tax_regime || ''}
              onChange={(e) => handleInputChange('customer_tax_regime', e.target.value)}
              placeholder="601"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label>{t('common.address')}</Label>
          <div className="grid grid-cols-2 gap-4">
            <Input
              value={formData.customer_address.street || ''}
              onChange={(e) => handleInputChange('customer_address.street', e.target.value)}
              placeholder={t('common.street')}
            />
            <Input
              value={formData.customer_address.city || ''}
              onChange={(e) => handleInputChange('customer_address.city', e.target.value)}
              placeholder={t('common.city')}
            />
            <Input
              value={formData.customer_address.state || ''}
              onChange={(e) => handleInputChange('customer_address.state', e.target.value)}
              placeholder={t('common.state')}
            />
            <Input
              value={formData.customer_address.postal_code || ''}
              onChange={(e) => handleInputChange('customer_address.postal_code', e.target.value)}
              placeholder={t('common.postalCode')}
            />
          </div>
        </div>
      </div>

      {/* CFDI Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t('finance.cfdiConfiguration')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>{t('finance.cfdiUse')}</Label>
            <Select
              value={formData.cfdi_use || ''}
              onValueChange={(value) => handleInputChange('cfdi_use', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CFDI_USE_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value || ''}>
                    {option.value} - {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('finance.paymentMethod')}</Label>
            <Select
              value={formData.payment_method || ''}
              onValueChange={(value) => handleInputChange('payment_method', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(method => (
                  <SelectItem key={method.value} value={method.value || ''}>
                    {method.value} - {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('finance.paymentWay')}</Label>
            <Select
              value={formData.payment_way || ''}
              onValueChange={(value) => handleInputChange('payment_way', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_WAYS.map(way => (
                  <SelectItem key={way.value} value={way.value || ''}>
                    {way.value} - {way.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Transaction Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('finance.selectTransactions')}</h3>
          <div className="text-sm text-gray-600">
            {t('finance.selectedTotal')}: <strong>${selectedTransactionsTotal.toLocaleString()}</strong>
          </div>
        </div>
        
        <div className="border rounded-lg max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t('finance.reference')}</TableHead>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead>{t('common.amount')}</TableHead>
                <TableHead>{t('common.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => onTransactionSelect(transaction.id)}
                      className="rounded"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {transaction.reference_number}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {transaction.description}
                  </TableCell>
                  <TableCell className="font-semibold">
                    ${parseFloat(transaction.amount).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {new Date(transaction.transaction_date).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label>{t('common.notes')} ({t('common.optional')})</Label>
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder={t('finance.invoiceNotes')}
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading || selectedTransactions.length === 0}
        >
          {isLoading ? t('common.creating') : t('finance.createInvoice')}
        </Button>
      </div>
    </form>
  );
};

export default InvoiceGenerator;