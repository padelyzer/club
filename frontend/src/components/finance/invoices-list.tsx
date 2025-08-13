'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useInvoices,
  useSendInvoice,
  useFinanceFilters,
} from '@/lib/api/hooks/useFinance';
import { useFinanceStore } from '@/store/financeStore';
import { useUIStore } from '@/store/ui';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { LoadingState } from '@/components/ui/states/loading-state';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Send,
  FileText,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Plus,
} from 'lucide-react';
import { Invoice, InvoiceStatus } from '@/types/finance';

export const InvoicesList = () => {
  const { t } = useTranslation();
  const { invoiceFilters, updateInvoiceFilters } = useFinanceFilters();
  const { setSelectedInvoice, openInvoiceForm } = useFinanceStore();
  const { openModal } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'issueDate' | 'dueDate' | 'total' | 'number'
  >('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: invoicesData, isLoading, error } = useInvoices(invoiceFilters);

  const sendInvoiceMutation = useSendInvoice();

  const invoices = invoicesData?.data || [];

  // Filter invoices based on search query
  const filteredInvoices = invoices.filter(
    (invoice: any) =>
      invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.client?.firstName
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      invoice.client?.lastName
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      invoice.client?.email
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      invoice.total.toString().includes(searchQuery)
  );

  // Sort invoices
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let valueA: any, valueB: any;

    switch (sortBy) {
      case 'issueDate':
        valueA = new Date(a.issueDate);
        valueB = new Date(b.issueDate);
        break;
      case 'dueDate':
        valueA = new Date(a.dueDate);
        valueB = new Date(b.dueDate);
        break;
      case 'total':
        valueA = a.total;
        valueB = b.total;
        break;
      case 'number':
        valueA = a.number.toLowerCase();
        valueB = b.number.toLowerCase();
        break;
// default: return 0;
    }

    if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
    return 0;

  const handleSort = (field: 'issueDate' | 'dueDate' | 'total' | 'number') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    openModal('invoice-detail');
  };

  const handleSendInvoice = (invoice: Invoice) => {
    sendInvoiceMutation.mutate(invoice.id);
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'sent':
      case 'viewed':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'draft':
        return <FileText className="h-4 w-4 text-gray-600" />;
// default: return <FileText className="h-4 w-4 text-gray-600" />;
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
// default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return <LoadingState message={t('finance.loadingInvoices')} />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          {t('finance.errorLoadingInvoices')}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('finance.invoices')}</h2>
            <p className="text-muted-foreground">
              {t('finance.invoicesSubtitle', { count: invoices.length })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
            <Button onClick={openInvoiceForm}>
              <Plus className="h-4 w-4 mr-2" />
              {t('finance.newInvoice')}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('finance.searchInvoices')}
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={invoiceFilters.status?.[0] || ''}
              onValueChange={(value) =>
                updateInvoiceFilters({
// status: value ? [value as InvoiceStatus] : undefined
                })
              }
            >
              <option value="">{t('finance.allStatuses')}</option>
              <option value="draft">{t('finance.draft')}</option>
              <option value="sent">{t('finance.sent')}</option>
              <option value="viewed">{t('finance.viewed')}</option>
              <option value="paid">{t('finance.paid')}</option>
              <option value="overdue">{t('finance.overdue')}</option>
              <option value="cancelled">{t('finance.cancelled')}</option>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {t('common.filter')}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.totalInvoices')}
              </p>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.paidInvoices')}
              </p>
              <p className="text-2xl font-bold">
                {invoices.filter((i: any) => i.status === 'paid').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.pendingInvoices')}
              </p>
              <p className="text-2xl font-bold">
                {
                  invoices.filter((i: any) => ['sent', 'viewed'].includes(i.status))
                    .length
                }
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.overdueInvoices')}
              </p>
              <p className="text-2xl font-bold">
                {invoices.filter((i: any) => i.status === 'overdue').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        {sortedInvoices.length === 0 ? (
          <EmptyState
            title={t('finance.noInvoices')}
            description={t('finance.noInvoicesDescription')}
            icon={FileText as any}
            action={{
// label: t('finance.createFirstInvoice')
// onClick: openInvoiceForm
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('number')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.invoiceNumber')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>{t('finance.client')}</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('issueDate')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.issueDate')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('dueDate')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.dueDate')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>{t('finance.status')}</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('total')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.total')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((invoice) => {
                const daysUntilDue = getDaysUntilDue(invoice.dueDate);
                const isOverdue = daysUntilDue < 0 && invoice.status !== 'paid';

                return (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">#{invoice.number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {invoice.client?.firstName}{' '}
                            {invoice.client?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invoice.client?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(invoice.issueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span
                            className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : ''}`}
                          >
                            {new Date(invoice.dueDate).toLocaleDateString()}
                          </span>
                          {invoice.status !== 'paid' && (
                            <p
                              className={`text-xs ${
                                isOverdue
                                  ? 'text-red-500'
                                  : daysUntilDue <= 3
                                    ? 'text-orange-500'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {isOverdue
                                ? `${Math.abs(daysUntilDue)} days overdue`
                                : daysUntilDue === 0
                                  ? 'Due today'
                                  : `Due in ${daysUntilDue} days`}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(invoice.status)}
                        <Badge className={getStatusColor(invoice.status)}>
                          {t(`finance.invoiceStatus.${invoice.status}`)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">
                          ${invoice.total.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {invoice.currency}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              openInvoiceForm();
                            }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            {t('common.edit')}
                          </DropdownMenuItem>
                          {invoice.status === 'draft' && (
                            <DropdownMenuItem
                              onClick={() => handleSendInvoice(invoice)}
                              disabled={sendInvoiceMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {t('finance.sendInvoice')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            {t('finance.downloadPDF')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {invoice.status !== 'paid' && (
                            <DropdownMenuItem>
                              <DollarSign className="h-4 w-4 mr-2" />
                              {t('finance.markAsPaid')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <FileText className="h-4 w-4 mr-2" />
                            {t('finance.duplicate')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            {t('finance.cancelInvoice')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
