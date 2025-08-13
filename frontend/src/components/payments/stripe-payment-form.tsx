'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Lock,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/lib/toast';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { FinanceService } from '@/lib/api/services/finance.service';

interface StripePaymentFormProps {
  amount: number;
  currency: string;
  description?: string;
  onSuccess: (paymentIntent: any) => void;
  onError: (error: any) => void;
  onCancel?: () => void;
  clientSecret?: string;
}

// Initialize Stripe - we'll need to get this from environment variables
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy');

// Stripe card element options
const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
};

// Inner form component that uses Stripe hooks
function StripePaymentFormInner({
  amount,
  currency = 'MXN',
  description,
  onSuccess,
  onError,
  onCancel,
}: StripePaymentFormProps) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'oxxo'>('card');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  // Create payment intent on component mount
  useEffect(() => {
    createPaymentIntent();
  }, [amount, currency]);

  const createPaymentIntent = async () => {
    try {
      const response = await FinanceService.createStripePaymentIntent({
        amount: amount,
        currency: currency.toLowerCase(),
        description: description || 'Payment for Padelyzer service',
        metadata: {
          source: 'frontend-payment-form',
          timestamp: new Date().toISOString(),
        },
      });
      
      setClientSecret(response.client_secret);
    } catch (error) {
            onError(error);
      toast.error(t('payments.paymentIntentFailed'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      toast.error(t('payments.stripeNotReady'));
      return;
    }

    setIsProcessing(true);
    setCardError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setCardError(error.message || t('payments.paymentFailed'));
        onError(error);
        toast.error(error.message || t('payments.paymentFailed'));
      } else if (paymentIntent.status === 'succeeded') {
        // Confirm payment with backend
        try {
          const confirmation = await FinanceService.confirmPayment(paymentIntent.id);
          // Payment successful!
          toast.success(t('payments.paymentSuccessful'));
          onSuccess(paymentIntent);
        } catch (confirmError) {
                    // Payment went through on Stripe but failed to confirm on backend
          toast.warning(t('payments.paymentProcessingDelayed'));
          onSuccess(paymentIntent); // Still call success since payment went through
        }
      } else {
        // Payment processing
        toast.loading(t('payments.processingPayment'));
      }
    } catch (error) {
            setCardError(t('payments.paymentFailed'));
      onError(error);
      toast.error(t('payments.paymentFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardChange = (event: any) => {
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError(null);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{t('payments.completePayment')}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Lock className="w-3 h-3 mr-1" />
              {t('payments.securePayment')}
            </Badge>
          </div>
        </CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Payment Amount */}
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('payments.total')}
            </span>
            <span className="text-2xl font-bold">
              ${amount.toFixed(2)} {currency}
            </span>
          </div>
        </div>

        <Separator />

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <div className="text-sm font-medium">{t('payments.paymentMethod')}</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-3 rounded-lg border-2 transition-all ${
                paymentMethod === 'card'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <CreditCard className="w-5 h-5 mx-auto mb-1" />
              <span className="text-sm">{t('payments.creditCard')}</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('oxxo')}
              className={`p-3 rounded-lg border-2 transition-all ${
                paymentMethod === 'oxxo'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-lg mb-1">🏪</div>
              <span className="text-sm">OXXO</span>
            </button>
          </div>
        </div>

        {paymentMethod === 'card' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Stripe Card Element */}
            <div>
              <div className="text-sm font-medium mb-2">{t('payments.cardDetails')}</div>
              <div className="border rounded-md p-3 bg-background">
                <CardElement 
                  options={cardElementOptions}
                  onChange={handleCardChange}
                />
              </div>
              {cardError && (
                <p className="text-sm text-destructive mt-1">{cardError}</p>
              )}
            </div>

            {/* Loading State */}
            {!clientSecret && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">
                  {t('payments.preparingPayment')}
                </span>
              </div>
            )}
          </form>
        )}

        {paymentMethod === 'oxxo' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('payments.oxxoInstructions')}
            </AlertDescription>
          </Alert>
        )}

        {/* Security Notice */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>{t('payments.securityNotice')}</span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          onClick={handleSubmit}
          disabled={isProcessing || !clientSecret || paymentMethod !== 'card'}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('payments.processing')}
            </>
          ) : (
            <>
              <Lock className="mr-2 h-4 w-4" />
              {t('payments.pay')} ${amount.toFixed(2)}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Main wrapper component that provides Stripe Elements context
export function StripePaymentForm(props: StripePaymentFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <StripePaymentFormInner {...props} />
    </Elements>
  );
}
