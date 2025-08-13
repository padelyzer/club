import { useState, useEffect, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  User,
  Calendar,
  FileText,
  Plus,
  Trash2,
  Calculator,
  Percent,
  DollarSign,
  Eye,
  AlertCircle,
  CreditCard,
  Hash,
  Clock,
} from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

import {
  Invoice,
  InvoiceFormData,
  InvoiceItem,
  InvoiceStatus,
  PaymentMethod,
  Currency,
} from '@/types/finance';
import { useCreateInvoice, useUpdateInvoice } from '@/lib/api/hooks/useFinance';
import { useFinanceStore } from '@/store/financeStore';
import { Modal } from '@/components/layout/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClientSearch } from '@/components/reservations/client-search';
import { cn } from '@/lib/utils';

interface InvoiceFormProps {
  invoice?: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Invoice item types for better categorization
const itemTypes = [
  { value: 'reservation', label: 'Reserva de cancha' },
  { value: 'membership', label: 'Membresía' },
  { value: 'class', label: 'Clase' },
  { value: 'product', label: 'Producto' },
  { value: 'service', label: 'Servicio' },
  { value: 'other', label: 'Otro' },
] as const;

// Payment methods
const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'online', label: 'Pago en línea' },
  { value: 'wallet', label: 'Billetera digital' },
  { value: 'other', label: 'Otro' },
];

// Invoice statuses
const invoiceStatuses: {
  value: InvoiceStatus;
  label: string;
  color: string;
}[] = [
  { value: 'draft', label: 'Borrador', color: 'text-gray-600' },
  { value: 'sent', label: 'Enviada', color: 'text-blue-600' },
  { value: 'viewed', label: 'Vista', color: 'text-purple-600' },
  { value: 'paid', label: 'Pagada', color: 'text-green-600' },
  { value: 'overdue', label: 'Vencida', color: 'text-red-600' },
  { value: 'cancelled', label: 'Cancelada', color: 'text-gray-500' },
  { value: 'refunded', label: 'Reembolsada', color: 'text-orange-600' },
];

// Currencies
const currencies: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'ARS', label: 'ARS', symbol: '$' },
  { value: 'BRL', label: 'BRL', symbol: 'R$' },
  { value: 'MXN', label: 'MXN', symbol: '$' },
  { value: 'CLP', label: 'CLP', symbol: '$' },
];

// Form schema
const invoiceSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  currency: z.enum(['USD', 'EUR', 'ARS', 'BRL', 'MXN', 'CLP']),
  status: z.enum([
    'draft',
    'sent',
    'viewed',
    'paid',
    'overdue',
    'cancelled',
    'refunded',
  ]),
  items: z
    .array(
      z.object({
        description: z.string().min(1, 'Description is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        unitPrice: z.number().min(0, 'Unit price must be positive'),
        type: z.enum([
          'reservation',
          'membership',
          'class',
          'product',
          'service',
          'other',
        ]),
      })
    )
    .min(1, 'At least one item is required'),
  discount: z.number().min(0).max(100).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  paymentMethod: z
    .enum(['cash', 'card', 'transfer', 'online', 'wallet', 'other'])
    .optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

function InvoiceFormComponent({ invoice, onClose, onSuccess }: InvoiceFormProps) {
  const { t } = useTranslation();
  const { createInvoice } = useCreateInvoice();
  const { updateInvoice } = useUpdateInvoice();
  const { closeInvoiceForm } = useFinanceStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    'percentage'
  );

  const isEditing = !!invoice;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: invoice?.clientId || '',
      issueDate: invoice?.issueDate
        ? format(new Date(invoice.issueDate), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      dueDate: invoice?.dueDate
        ? format(new Date(invoice.dueDate), 'yyyy-MM-dd')
        : format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      currency: invoice?.currency || 'USD',
      status: invoice?.status || 'draft',
      items: invoice?.items?.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        type: item.type,
      })) || [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          type: 'service' as const,
        },
      ],
      discount: invoice?.discount || 0,
      discountType: 'percentage',
      taxRate: invoice?.tax ? (invoice.tax / invoice.subtotal) * 100 : 21, // Calculate tax rate from invoice or use default
      paymentMethod: 'cash',
      notes: invoice?.notes || '',
      terms: invoice?.terms || '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const watchDiscount = watch('discount') || 0;
  const watchTaxRate = watch('taxRate') || 0;
  const watchCurrency = watch('currency');

  // Calculate totals
  const calculations = useMemo(() => {
    const subtotal = watchItems.reduce((sum, item) => {
      return sum + item.quantity * item.unitPrice;
    }, 0);

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = (subtotal * watchDiscount) / 100;
    } else {
      discountAmount = watchDiscount;
    }

    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * watchTaxRate) / 100;
    const total = taxableAmount + taxAmount;

    return {
      subtotal,
      discountAmount,
      taxAmount,
      total,
    };
  }, [watchItems, watchDiscount, watchTaxRate, discountType]);

  const currencySymbol =
    currencies.find((c) => c.value === watchCurrency)?.symbol || '$';

  const handleAddItem = () => {
    append({
      description: '',
      quantity: 1,
      unitPrice: 0,
      type: 'service',
    });
  };

  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);
    try {
      const formData: InvoiceFormData = {
        clientId: data.clientId,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        currency: data.currency,
        status: data.status,
        items: data.items.map((item) => ({
          ...item,
          id: '', // Will be generated by backend
          total: item.quantity * item.unitPrice,
        })),
        discount:
          discountType === 'percentage'
            ? data.discount || 0
            : calculations.discountAmount,
        taxRate: data.taxRate || 0,
        notes: data.notes,
        terms: data.terms,
      };

      if (isEditing) {
        await updateInvoice.mutateAsync({
          id: invoice.id,
          data: formData,
        });
      } else {
        await createInvoice.mutateAsync(formData);
      }

      closeInvoiceForm();
      onSuccess();
    } catch (error) {
          } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  return (
    <>
      <Modal isOpen onClose={onClose} size="xl" as any>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex h-full flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditing ? t('finance.editInvoice') : t('finance.newInvoice')}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreview}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                title={t('finance.previewInvoice')}
              >
                <Eye className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6">
              {/* Invoice Header Info */}
              <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Client Selection */}
                  <div className="md:col-span-2">
                    <ClientSearch
                      control={control}
                      error={errors.clientId?.message}
                    />
                  </div>

                  {/* Invoice Number (auto-generated) */}
                  <div>
                    <Label htmlFor="invoiceNumber">
                      <Hash className="inline h-4 w-4 mr-1" />
                      {t('finance.invoiceNumber')}
                    </Label>
                    <Input
                      id="invoiceNumber"
                      value={invoice?.number || t('finance.autoGenerated')}
                      disabled
                      className="bg-gray-50 dark:bg-gray-800"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <Label htmlFor="status">{t('finance.status')}</Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {invoiceStatuses.map((status) => (
                              <SelectItem
                                key={status.value}
                                value={status.value || ''}
                              >
                                <span className={status.color}>
                                  {status.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Issue Date */}
                  <div>
                    <Label htmlFor="issueDate">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      {t('finance.issueDate')}
                    </Label>
                    <Input
                      id="issueDate"
                      type="date"
                      {...register('issueDate')}
                      className={errors.issueDate ? 'border-danger-500' : ''}
                    />
                    {errors.issueDate && (
                      <p className="mt-1 text-xs text-danger-600">
                        {errors.issueDate.message}
                      </p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <Label htmlFor="dueDate">
                      <Clock className="inline h-4 w-4 mr-1" />
                      {t('finance.dueDate')}
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      {...register('dueDate')}
                      min={watch('issueDate')}
                      className={errors.dueDate ? 'border-danger-500' : ''}
                    />
                    {errors.dueDate && (
                      <p className="mt-1 text-xs text-danger-600">
                        {errors.dueDate.message}
                      </p>
                    )}
                  </div>

                  {/* Currency */}
                  <div>
                    <Label htmlFor="currency">
                      <DollarSign className="inline h-4 w-4 mr-1" />
                      {t('finance.currency')}
                    </Label>
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem
                                key={currency.value}
                                value={currency.value || ''}
                              >
                                {currency.label} ({currency.symbol})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  {/* Payment Method */}
                  <div>
                    <Label htmlFor="paymentMethod">
                      <CreditCard className="inline h-4 w-4 mr-1" />
                      {t('finance.paymentMethod')}
                    </Label>
                    <Controller
                      name="paymentMethod"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={t('finance.selectPaymentMethod')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem
                                key={method.value}
                                value={method.value || ''}
                              >
                                {method.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              </Card>

              {/* Invoice Items */}
              <Card className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    <FileText className="inline h-5 w-5 mr-2" />
                    {t('finance.invoiceItems')}
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('finance.addItem')}
                  </Button>
                </div>

                {errors.items && (
                  <div className="mb-4 flex items-center gap-2 text-danger-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{errors.items.message}</span>
                  </div>
                )}

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <motion.div
                      key={field.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="grid gap-4 md:grid-cols-12">
                        {/* Type */}
                        <div className="md:col-span-2">
                          <Label>{t('finance.type')}</Label>
                          <Controller
                            name={`items.${index}.type`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value || ''}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {itemTypes.map((type) => (
                                    <SelectItem
                                      key={type.value}
                                      value={type.value || ''}
                                    >
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Description */}
                        <div className="md:col-span-5">
                          <Label>{t('finance.description')}</Label>
                          <Input
                            {...register(`items.${index}.description`)}
                            placeholder={t(
                              'finance.itemDescriptionPlaceholder'
                            )}
                            className={
                              errors.items?.[index]?.description
                                ? 'border-danger-500'
                                : ''
                            }
                          />
                          {errors.items?.[index]?.description && (
                            <p className="mt-1 text-xs text-danger-600">
                              {errors.items[index]?.description?.message}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div className="md:col-span-1">
                          <Label>{t('finance.qty')}</Label>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            {...register(`items.${index}.quantity`, {
                              valueAsNumber: true,
                            })}
                            className={
                              errors.items?.[index]?.quantity
                                ? 'border-danger-500'
                                : ''
                            }
                          />
                        </div>

                        {/* Unit Price */}
                        <div className="md:col-span-2">
                          <Label>{t('finance.unitPrice')}</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                              {currencySymbol}
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              {...register(`items.${index}.unitPrice`, {
                                valueAsNumber: true,
                              })}
                              className={cn(
                                'pl-8',
                                errors.items?.[index]?.unitPrice
                                  ? 'border-danger-500'
                                  : ''
                              )}
                            />
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="md:col-span-2 flex items-end justify-between">
                          <div className="flex-1">
                            <Label>{t('finance.subtotal')}</Label>
                            <div className="mt-1 text-lg font-medium">
                              {currencySymbol}{' '}
                              {(
                                watchItems[index]?.quantity *
                                  watchItems[index]?.unitPrice || 0
                              ).toFixed(2)}
                            </div>
                          </div>
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="ml-2 rounded-lg p-2 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                              title={t('finance.removeItem')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>

              {/* Totals and Discounts */}
              <Card className="p-4">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Discount */}
                    <div>
                      <Label>{t('finance.discount')}</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            min="0"
                            max={
                              discountType === 'percentage'
                                ? 100
                                : calculations.subtotal
                            }
                            step="0.01"
                            {...register('discount', { valueAsNumber: true })}
                            className="pr-12"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                            {discountType === 'percentage'
                              ? '%'
                              : currencySymbol}
                          </span>
                        </div>
                        <Select
                          value={discountType || ''}
                          onValueChange={(v: any) => setDiscountType(v)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">
                              <Percent className="inline h-4 w-4 mr-1" />
                              {t('finance.percentage')}
                            </SelectItem>
                            <SelectItem value="fixed">
                              <DollarSign className="inline h-4 w-4 mr-1" />
                              {t('finance.fixedAmount')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Tax Rate */}
                    <div>
                      <Label>{t('finance.taxRate')}</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          {...register('taxRate', { valueAsNumber: true })}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Totals Summary */}
                  <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {t('finance.subtotal')}
                        </span>
                        <span className="font-medium">
                          {currencySymbol} {calculations.subtotal.toFixed(2)}
                        </span>
                      </div>
                      {calculations.discountAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('finance.discount')}
                          </span>
                          <span className="font-medium text-green-600">
                            - {currencySymbol}{' '}
                            {calculations.discountAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {calculations.taxAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {t('finance.tax')} ({watchTaxRate}%)
                          </span>
                          <span className="font-medium">
                            {currencySymbol} {calculations.taxAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="mt-2 border-t pt-2 dark:border-gray-700">
                        <div className="flex justify-between">
                          <span className="text-lg font-semibold">
                            {t('finance.total')}
                          </span>
                          <span className="text-lg font-semibold text-primary-600">
                            {currencySymbol} {calculations.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notes and Terms */}
              <Card className="p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="notes">
                      <FileText className="inline h-4 w-4 mr-1" />
                      {t('finance.notes')}
                    </Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder={t('finance.notesPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="terms">
                      <FileText className="inline h-4 w-4 mr-1" />
                      {t('finance.termsAndConditions')}
                    </Label>
                    <Textarea
                      id="terms"
                      {...register('terms')}
                      placeholder={t('finance.termsPlaceholder')}
                      rows={3}
                    />
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calculator className="h-4 w-4" />
              <span>
                {t('finance.total')}: {currencySymbol}{' '}
                {calculations.total.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('common.saving')}
                  </div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? t('common.update') : t('common.create')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <InvoicePreview
            invoiceData={{
              ...watch(),
              calculations,
              currencySymbol,
            }}
            onClose={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Invoice Preview Component
interface InvoicePreviewProps {
  invoiceData: any;
  onClose: () => void;
}

function InvoicePreview({ invoiceData, onClose }: InvoicePreviewProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('finance.invoicePreview')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <Card className="p-8">
              {/* Invoice Header */}
              <div className="mb-8 flex justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('finance.invoice')}
                  </h1>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('finance.invoiceNumber')}: #INV-
                    {format(new Date(), 'yyyyMMddHHmmss')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {t('finance.issueDate')}
                  </p>
                  <p className="font-medium">
                    {format(new Date(invoiceData.issueDate), 'PPP', {
                      locale: es,
                    })}
                  </p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('finance.dueDate')}
                  </p>
                  <p className="font-medium">
                    {format(new Date(invoiceData.dueDate), 'PPP', {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>

              {/* Client Info */}
              <div className="mb-8">
                <h3 className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t('finance.billTo')}
                </h3>
                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                  <p className="font-medium">Cliente Seleccionado</p>
                  {/* Client details would be loaded here */}
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="pb-2 text-left text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('finance.description')}
                      </th>
                      <th className="pb-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('finance.qty')}
                      </th>
                      <th className="pb-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('finance.unitPrice')}
                      </th>
                      <th className="pb-2 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('finance.total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b dark:border-gray-700">
                        <td className="py-3">{item.description}</td>
                        <td className="py-3 text-right">{item.quantity}</td>
                        <td className="py-3 text-right">
                          {invoiceData.currencySymbol}{' '}
                          {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {invoiceData.currencySymbol}{' '}
                          {(item.quantity * item.unitPrice).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mb-8">
                <div className="ml-auto max-w-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      {t('finance.subtotal')}
                    </span>
                    <span className="font-medium">
                      {invoiceData.currencySymbol}{' '}
                      {invoiceData.calculations.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {invoiceData.calculations.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('finance.discount')}
                      </span>
                      <span className="font-medium text-green-600">
                        - {invoiceData.currencySymbol}{' '}
                        {invoiceData.calculations.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {invoiceData.calculations.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('finance.tax')} ({invoiceData.taxRate}%)
                      </span>
                      <span className="font-medium">
                        {invoiceData.currencySymbol}{' '}
                        {invoiceData.calculations.taxAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold">
                        {t('finance.total')}
                      </span>
                      <span className="text-lg font-semibold text-primary-600">
                        {invoiceData.currencySymbol}{' '}
                        {invoiceData.calculations.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              {(invoiceData.notes || invoiceData.terms) && (
                <div className="space-y-4 border-t pt-4 dark:border-gray-700">
                  {invoiceData.notes && (
                    <div>
                      <h4 className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('finance.notes')}
                      </h4>
                      <p className="text-sm">{invoiceData.notes}</p>
                    </div>
                  )}
                  {invoiceData.terms && (
                    <div>
                      <h4 className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                        {t('finance.termsAndConditions')}
                      </h4>
                      <p className="text-sm">{invoiceData.terms}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export const InvoiceForm = memo(InvoiceFormComponent);
