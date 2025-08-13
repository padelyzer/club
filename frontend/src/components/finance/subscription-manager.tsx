'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useSubscriptions,
  useSubscriptionPlans,
  useCreateSubscription,
} from '@/lib/api/hooks/useFinance';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Search,
  Users,
  Plus,
  MoreHorizontal,
  ArrowUpDown,
  Eye,
  Pause,
  Play,
  XCircle,
  Calendar,
  User,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  Crown,
  Star,
} from 'lucide-react';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
} from '@/types/finance';
import { SubscriptionForm } from './subscription-form';

export const SubscriptionManager = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );
  const [isNewSubscriptionOpen, setIsNewSubscriptionOpen] = useState(false);

  const {
// data: subscriptionsData
// isLoading: subscriptionsLoading
// error: subscriptionsError
  } = useSubscriptions();

  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();

  const createSubscriptionMutation = useCreateSubscription();

  const subscriptions = subscriptionsData?.data || [];

  // Filter subscriptions based on search query
  const filteredSubscriptions = subscriptions.filter(
    (subscription: any) =>
      subscription.client?.firstName
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      subscription.client?.lastName
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      subscription.client?.email
// toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      subscription.plan.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-red-600" />;
      case 'suspended':
        return <Pause className="h-4 w-4 text-orange-600" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
// default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'suspended':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
// default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPlanBadgeColor = (planName: string) => {
    const lowerName = planName.toLowerCase();
    if (lowerName.includes('premium') || lowerName.includes('pro')) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
    }
    if (lowerName.includes('basic') || lowerName.includes('starter')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
    if (lowerName.includes('enterprise') || lowerName.includes('unlimited')) {
      return 'bg-gold-100 text-gold-800 dark:bg-gold-900/20 dark:text-gold-400';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  const getDaysUntilExpiry = (endDate?: string) => {
    if (!endDate) return null;
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (subscriptionsLoading) {
    return <LoadingState message={t('finance.loadingSubscriptions')} />;
  }

  if (subscriptionsError) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          {t('finance.errorLoadingSubscriptions')}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('finance.subscriptions')}</h2>
            <p className="text-muted-foreground">
              {t('finance.subscriptionsSubtitle', {
// count: subscriptions.length
              })}
            </p>
          </div>
          <Button onClick={() => setIsNewSubscriptionOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('finance.newSubscription')}
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('finance.searchSubscriptions')}
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.activeSubscriptions')}
              </p>
              <p className="text-2xl font-bold">
                {subscriptions.filter((s: any) => s.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.monthlyRevenue')}
              </p>
              <p className="text-2xl font-bold">
                $
                {subscriptions
                  .filter(
                    (s: any) =>
                      s.status === 'active' && s.billingInterval === 'monthly'
                  )
                  .reduce((sum: any, s: any) => sum + s.amount, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.expiringThisMonth')}
              </p>
              <p className="text-2xl font-bold">
                {
                  subscriptions.filter((s: any) => {
                    const daysUntilExpiry = getDaysUntilExpiry(s.endDate);
                    return (
                      daysUntilExpiry !== null &&
                      daysUntilExpiry <= 30 &&
                      daysUntilExpiry > 0
                    );
                  }).length
                }
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-muted-foreground">
                {t('finance.totalSubscribers')}
              </p>
              <p className="text-2xl font-bold">
                {new Set(subscriptions.map((s: any) => s.clientId)).size}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscription Plans Overview */}
      {plans && plans.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {t('finance.subscriptionPlans')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans
              .filter((plan: any) => plan.isActive)
              .map((plan: any) => (
                <Card
                  key={plan.id}
                  className="p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{plan.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>
                    {plan.name.toLowerCase().includes('premium') && (
                      <Crown className="h-5 w-5 text-yellow-500" />
                    )}
                  </div>

                  <div className="mb-4">
                    <span className="text-2xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">
                      /{plan.billingInterval}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    {plan.features.slice(0, 3).map((feature: any, index: any) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    {plan.features.length > 3 && (
                      <p className="text-sm text-muted-foreground">
                        +{plan.features.length - 3} more features
                      </p>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {
                      subscriptions.filter(
                        (s: any) => s.plan.id === plan.id && s.status === 'active'
                      ).length
                    }{' '}
                    active subscribers
                  </p>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <Card>
        {filteredSubscriptions.length === 0 ? (
          <EmptyState
            title={t('finance.noSubscriptions')}
            description={t('finance.noSubscriptionsDescription')}
            icon={Users as any}
            action={{
// label: t('finance.createFirstSubscription')
// onClick: () => setIsNewSubscriptionOpen(true)
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('finance.subscriber')}</TableHead>
                <TableHead>{t('finance.plan')}</TableHead>
                <TableHead>{t('finance.status')}</TableHead>
                <TableHead>{t('finance.startDate')}</TableHead>
                <TableHead>{t('finance.nextPayment')}</TableHead>
                <TableHead className="text-right">
                  {t('finance.amount')}
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.map((subscription: any) => {
                const daysUntilExpiry = getDaysUntilExpiry(
                  subscription.endDate
                );

                return (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {subscription.client?.firstName}{' '}
                            {subscription.client?.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {subscription.client?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={getPlanBadgeColor(subscription.plan.name)}
                        >
                          {subscription.plan.name}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {subscription.billingInterval}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(subscription.status)}
                        <Badge className={getStatusColor(subscription.status)}>
                          {t(
                            `finance.subscriptionStatus.${subscription.status}`
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {new Date(
                            subscription.startDate
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {subscription.nextPaymentDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="text-sm">
                              {new Date(
                                subscription.nextPaymentDate
                              ).toLocaleDateString()}
                            </span>
                            {daysUntilExpiry !== null &&
                              daysUntilExpiry <= 7 &&
                              daysUntilExpiry > 0 && (
                                <p className="text-xs text-orange-500">
                                  In {daysUntilExpiry} days
                                </p>
                              )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">
                          ${subscription.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {subscription.currency}
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
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('common.view')}
                          </DropdownMenuItem>
                          {subscription.status === 'active' && (
                            <DropdownMenuItem>
                              <Pause className="h-4 w-4 mr-2" />
                              {t('finance.suspend')}
                            </DropdownMenuItem>
                          )}
                          {subscription.status === 'suspended' && (
                            <DropdownMenuItem>
                              <Play className="h-4 w-4 mr-2" />
                              {t('finance.resume')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <XCircle className="h-4 w-4 mr-2" />
                            {t('finance.cancel')}
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

      {/* New Subscription Dialog */}
      <Dialog
        open={isNewSubscriptionOpen}
        onOpenChange={setIsNewSubscriptionOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('finance.newSubscription')}</DialogTitle>
            <DialogDescription>
              {t('finance.newSubscriptionDescription')}
            </DialogDescription>
          </DialogHeader>

          <SubscriptionForm
            onSuccess={(subscription) => {
              setIsNewSubscriptionOpen(false);
              // The query will be refetched automatically due to the mutation
            }}
            onCancel={() => setIsNewSubscriptionOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
