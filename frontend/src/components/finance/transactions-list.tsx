'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransactions, useFinanceFilters } from '@/lib/api/hooks/useFinance';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Tag,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  TransactionCategory,
} from '@/types/finance';

export const TransactionsList = () => {
  const { t } = useTranslation();
  const { transactionFilters, updateTransactionFilters } = useFinanceFilters();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'description'>(
    'date'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    data: transactionsData,
    isLoading,
    error,
  } = useTransactions(transactionFilters);

  const transactions = transactionsData?.data || [];

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter(
    (transaction: any) =>
      transaction.description
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.amount.toString().includes(searchQuery)
  );

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let valueA: any, valueB: any;

    switch (sortBy) {
      case 'date':
        valueA = new Date(a.date);
        valueB = new Date(b.date);
        break;
      case 'amount':
        valueA = a.amount;
        valueB = b.amount;
        break;
      case 'description':
        valueA = a.description.toLowerCase();
        valueB = b.description.toLowerCase();
        break;
      default:
        return 0;
    }

    if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
    if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getTransactionTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'refund':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'adjustment':
        return <ArrowUpDown className="h-4 w-4 text-orange-600" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionTypeColor = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expense':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'refund':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'adjustment':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getCategoryColor = (category: TransactionCategory) => {
    const colors = {
      reservations:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      memberships:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      classes:
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      products:
        'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      services:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      equipment:
        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      maintenance:
        'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      salaries:
        'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      utilities:
        'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    };
    return colors[category] || colors.other;
  };

  if (isLoading) {
    return <LoadingState message={t('finance.loadingTransactions')} />;
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          {t('finance.errorLoadingTransactions')}
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
            <h2 className="text-2xl font-bold">{t('finance.transactions')}</h2>
            <p className="text-muted-foreground">
              {t('finance.transactionsSubtitle', {
                count: transactions.length,
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('common.export')}
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('finance.searchTransactions')}
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select
              value={transactionFilters.type?.[0] || ''}
              onValueChange={(value) =>
                updateTransactionFilters({
                  type: value ? [value as TransactionType] : undefined,
                })
              }
            >
              <option value="">{t('finance.allTypes')}</option>
              <option value="income">{t('finance.income')}</option>
              <option value="expense">{t('finance.expense')}</option>
              <option value="refund">{t('finance.refund')}</option>
              <option value="adjustment">{t('finance.adjustment')}</option>
            </Select>

            <Select
              value={transactionFilters.category?.[0] || ''}
              onValueChange={(value) =>
                updateTransactionFilters({
                  category: value ? [value as TransactionCategory] : undefined,
                })
              }
            >
              <option value="">{t('finance.allCategories')}</option>
              <option value="reservations">{t('finance.reservations')}</option>
              <option value="memberships">{t('finance.memberships')}</option>
              <option value="classes">{t('finance.classes')}</option>
              <option value="products">{t('finance.products')}</option>
              <option value="services">{t('finance.services')}</option>
              <option value="equipment">{t('finance.equipment')}</option>
              <option value="maintenance">{t('finance.maintenance')}</option>
              <option value="salaries">{t('finance.salaries')}</option>
              <option value="utilities">{t('finance.utilities')}</option>
              <option value="other">{t('finance.other')}</option>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              {t('common.filter')}
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <Card>
        {sortedTransactions.length === 0 ? (
          <EmptyState
            title={t('finance.noTransactions')}
            description={t('finance.noTransactionsDescription')}
            icon={DollarSign as any}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('date')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.date')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('description')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.description')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>{t('finance.type')}</TableHead>
                <TableHead>{t('finance.category')}</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSort('amount')}
                    className="h-auto p-0 font-medium"
                  >
                    {t('finance.amount')}
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {new Date(transaction.date).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      {transaction.subcategory && (
                        <p className="text-sm text-muted-foreground">
                          {transaction.subcategory}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTransactionTypeIcon(transaction.type)}
                      <Badge
                        className={getTransactionTypeColor(transaction.type)}
                      >
                        {t(`finance.transactionType.${transaction.type}`)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(transaction.category)}>
                      <Tag className="h-3 w-3 mr-1" />
                      {t(`finance.category.${transaction.category}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-semibold ${
                        transaction.type === 'income'
                          ? 'text-green-600'
                          : transaction.type === 'expense'
                            ? 'text-red-600'
                            : 'text-blue-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}$
                      {transaction.amount.toLocaleString()}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {transaction.currency}
                    </p>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>{t('common.view')}</DropdownMenuItem>
                        <DropdownMenuItem>{t('common.edit')}</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};
