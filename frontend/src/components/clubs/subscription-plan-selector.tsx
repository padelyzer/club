'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown } from 'lucide-react';
import { subscriptionPlans, type SubscriptionPlan } from '@/lib/validations/club-form';
import { cn } from '@/lib/utils';

interface SubscriptionPlanSelectorProps {
  selectedPlan: string;
  selectedFrequency: string;
  onPlanChange: (plan: string) => void;
  onFrequencyChange: (frequency: string) => void;
  className?: string;
}

const billingFrequencies = [
  { id: 'monthly', name: 'Mensual', discount: 0 },
  { id: 'quarterly', name: 'Trimestral', discount: 10 },
  { id: 'yearly', name: 'Anual', discount: 20 },
] as const;

export function SubscriptionPlanSelector({
  selectedPlan,
  selectedFrequency,
  onPlanChange,
  onFrequencyChange,
  className,
}: SubscriptionPlanSelectorProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Billing Frequency Toggle */}
      <div className="flex justify-center">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          {billingFrequencies.map((frequency) => (
            <Button
              key={frequency.id}
              variant={selectedFrequency === frequency.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onFrequencyChange(frequency.id)}
              className="relative"
            >
              {frequency.name}
              {frequency.discount > 0 && (
                <Badge className="ml-2" variant="secondary">
                  -{frequency.discount}%
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subscriptionPlans.map((plan: any) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan === plan.id}
            onSelect={() => onPlanChange(plan.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface PlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, isSelected, onSelect }: PlanCardProps) {
  return (
    <Card
      className={cn(
        'relative p-6 cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500 ring-opacity-20'
          : 'border-gray-200 dark:border-gray-700',
        plan.isPopular && 'border-primary-400'
      )}
      onClick={onSelect}
    >
      {/* Popular Badge */}
      {plan.isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <Badge className="bg-primary-500 text-white px-3 py-1">
            <Crown className="w-3 h-3 mr-1" />
            Popular
          </Badge>
        </div>
      )}

      {/* Selection Indicator */}
      <div className="absolute top-4 right-4">
        <div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex items-center justify-center',
            isSelected
              ? 'border-primary-500 bg-primary-500'
              : 'border-gray-300 dark:border-gray-600'
          )}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>
      </div>

      {/* Plan Content */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {plan.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {plan.description}
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-2">
          {plan.features.map((feature: any, index: any) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 dark:text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Price Display (placeholder for future pricing) */}
        {plan.id !== 'basic' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Contacta para precios personalizados
            </p>
          </div>
        )}
        
        {plan.id === 'basic' && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              Gratis
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}