'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useClients } from '@/lib/api/hooks/useClients';
import {
  useSubscriptionPlans,
  useCreateSubscription,
  useUpdateSubscription,
} from '@/lib/api/hooks/useFinance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DatePicker } from '@/components/ui/date-picker';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingState } from '@/components/ui/states/loading-state';
import { toast } from '@/lib/toast';
import {
  Calendar,
  User,
  CreditCard,
  Crown,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Clock,
} from 'lucide-react';
import { Subscription, SubscriptionPlan } from '@/types/finance';
import { format, addMonths, addYears } from 'date-fns';

const subscriptionSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  planId: z.string().min(1, 'Plan is required'),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  billingInterval: z.enum(['monthly', 'quarterly', 'yearly']),
  autoRenew: z.boolean(),
  discount: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  paymentMethod: z.enum(['card', 'bank_transfer', 'cash']),
  promoCode: z.string().optional(),
});

type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

interface SubscriptionFormProps {
  subscription?: Subscription;
  onSuccess?: (subscription: Subscription) => void;
  onCancel?: () => void;
}

export const SubscriptionForm = ({
  subscription,
  onSuccess,
  onCancel,
}: SubscriptionFormProps) => {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [pricePreview, setPricePreview] = useState({
    originalPrice: 0,
    discount: 0,
    finalPrice: 0,
    nextPaymentDate: new Date(),
  });

  const isEditMode = !!subscription;

  const { data: clientsData, isLoading: clientsLoading } = useClients({
    page: 1,
    limit: 1000,
  });
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();

  const clients = clientsData?.data || [];
  const activePlans = plans?.filter((plan: any) => plan.isActive) || [];

  const form = useForm<SubscriptionFormData>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      clientId: subscription?.clientId || '',
      planId: subscription?.plan.id || '',
      startDate: subscription ? new Date(subscription.startDate) : new Date(),
      billingInterval: subscription?.billingInterval || 'monthly',
      autoRenew: subscription?.autoRenew ?? true,
      discount: subscription?.discount || 0,
      notes: subscription?.notes || '',
      paymentMethod: subscription?.paymentMethod || 'card',
      promoCode: '',
    },
  });

  const watchedValues = form.watch();

  // Update price preview when form values change
  useEffect(() => {
    if (!selectedPlan) return;

    const startDate = watchedValues.startDate;
    const billingInterval = watchedValues.billingInterval;
    const discount = watchedValues.discount || 0;

    let basePrice = selectedPlan.price;
    let nextPayment = startDate;

    // Adjust price based on billing interval
    switch (billingInterval) {
      case 'quarterly':
        basePrice = selectedPlan.price * 3;
        nextPayment = addMonths(startDate, 3);
        break;
      case 'yearly':
        basePrice = selectedPlan.price * 12;
        nextPayment = addYears(startDate, 1);
        break;
      default:
        nextPayment = addMonths(startDate, 1);
    }

    const discountAmount = (basePrice * discount) / 100;
    const finalPrice = basePrice - discountAmount;

    setPricePreview({
      originalPrice: basePrice,
      discount: discountAmount,
      finalPrice,
      nextPaymentDate: nextPayment,
    });
  }, [
    watchedValues.billingInterval,
    watchedValues.discount,
    watchedValues.startDate,
    selectedPlan,
  ]);

  // Update selected plan when planId changes
  useEffect(() => {
    const plan = activePlans.find((p: any) => p.id === watchedValues.planId);
    setSelectedPlan(plan || null);
  }, [watchedValues.planId, activePlans]);

  const onSubmit = async (data: SubscriptionFormData) => {
    try {
      const subscriptionData = {
        ...data,
        amount: pricePreview.finalPrice,
        currency: 'EUR',
        status: 'active' as const,
      };

      if (isEditMode) {
        const result = await updateMutation.mutateAsync({
          id: subscription.id,
          data: subscriptionData,
        });
        toast.success(t('finance.subscriptionUpdated'));
        onSuccess?.(result);
      } else {
        const result = await createMutation.mutateAsync(subscriptionData);
        toast.success(t('finance.subscriptionCreated'));
        onSuccess?.(result);
      }
    } catch (error) {
            toast.error(t('finance.subscriptionError'));
    }
  };

  if (clientsLoading || plansLoading) {
    return <LoadingState message={t('finance.loadingData')} />;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Client Selection */}
      <div className="space-y-2">
        <Label htmlFor="client">{t('finance.selectClient')}</Label>
        <Select
          id="client"
          value={form.watch('clientId') || ''}
          onValueChange={(value) => form.setValue('clientId', value)}
          disabled={isEditMode}
        >
          <option value="">{t('finance.selectClientPlaceholder')}</option>
          {clients.map((client: any) => (
            <option key={client.id} value={client.id || ''}>
              {client.firstName} {client.lastName} - {client.email}
            </option>
          ))}
        </Select>
        {form.formState.errors.clientId && (
          <p className="text-sm text-red-500">
            {form.formState.errors.clientId.message}
          </p>
        )}
      </div>

      <Separator />

      {/* Plan Selection */}
      <div className="space-y-4">
        <Label>{t('finance.selectPlan')}</Label>
        <RadioGroup
          value={form.watch('planId') || ''}
          onValueChange={(value) => form.setValue('planId', value)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePlans.map((plan: any) => (
              <label
                key={plan.id}
                htmlFor={`plan-${plan.id}`}
                className={`
                  relative flex cursor-pointer rounded-lg border p-4 hover:bg-gray-50 
                  ${form.watch('planId') === plan.id ? 'border-primary ring-2 ring-primary' : 'border-gray-200'}
                `}
              >
                <RadioGroupItem
                  id={`plan-${plan.id}`}
                  value={plan.id || ''}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        {plan.name}
                        {plan.name.toLowerCase().includes('premium') && (
                          <Crown className="h-4 w-4 text-yellow-500" />
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${plan.price}</p>
                      <p className="text-xs text-muted-foreground">/month</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {plan.features.slice(0, 3).map((feature: any, index: any) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </RadioGroup>
        {form.formState.errors.planId && (
          <p className="text-sm text-red-500">
            {form.formState.errors.planId.message}
          </p>
        )}
      </div>

      <Separator />

      {/* Billing Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t('finance.startDate')}</Label>
          <DatePicker
            date={form.watch('startDate')}
            onDateChange={(date) =>
              form.setValue('startDate', date || new Date())
            }
          />
          {form.formState.errors.startDate && (
            <p className="text-sm text-red-500">
              {form.formState.errors.startDate.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="billingInterval">
            {t('finance.billingInterval')}
          </Label>
          <Select
            id="billingInterval"
            value={form.watch('billingInterval') || ''}
            onValueChange={(value: any) =>
              form.setValue('billingInterval', value)
            }
          >
            <option value="monthly">{t('finance.monthly')}</option>
            <option value="quarterly">{t('finance.quarterly')}</option>
            <option value="yearly">{t('finance.yearly')}</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">{t('finance.paymentMethod')}</Label>
          <Select
            id="paymentMethod"
            value={form.watch('paymentMethod') || ''}
            onValueChange={(value: any) =>
              form.setValue('paymentMethod', value)
            }
          >
            <option value="card">{t('finance.paymentMethod.card')}</option>
            <option value="bank_transfer">
              {t('finance.paymentMethod.bankTransfer')}
            </option>
            <option value="cash">{t('finance.paymentMethod.cash')}</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount">{t('finance.discount')} (%)</Label>
          <Input
            id="discount"
            type="number"
            min={0}
            max={100}
            {...form.register('discount', { valueAsNumber: true })}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label
          htmlFor="autoRenew"
          className="flex items-center gap-2 cursor-pointer"
        >
          <Switch
            id="autoRenew"
            checked={form.watch('autoRenew')}
            onCheckedChange={(checked) => form.setValue('autoRenew', checked)}
          />
          <span>{t('finance.autoRenew')}</span>
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">
          {t('finance.notes')} ({t('common.optional')})
        </Label>
        <Input
          id="notes"
          {...form.register('notes')}
          placeholder={t('finance.notesPlaceholder')}
        />
      </div>

      <Separator />

      {/* Price Preview */}
      {selectedPlan && (
        <Alert>
          <DollarSign className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>{t('finance.basePrice')}:</span>
                <span>${pricePreview.originalPrice.toFixed(2)}</span>
              </div>
              {pricePreview.discount > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <span>{t('finance.discount')}:</span>
                  <span>-${pricePreview.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold">
                <span>{t('finance.total')}:</span>
                <span>${pricePreview.finalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{t('finance.nextPayment')}:</span>
                <span>{format(pricePreview.nextPaymentDate, 'PP')}</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              {t('common.saving')}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {isEditMode
                ? t('common.update')
                : t('finance.createSubscription')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
