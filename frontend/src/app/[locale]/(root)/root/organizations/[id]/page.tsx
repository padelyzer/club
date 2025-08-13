'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Activity,
  Ban,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { RootService } from '@/lib/api/services/root.service';
import { Organization } from '@/lib/api/types';
import { toast } from '@/lib/toast';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadOrganization(params.id as string);
    }
  }, [params.id]);

  const loadOrganization = async (id: string) => {
    try {
      const data = await RootService.getOrganization(id);
      setOrganization(data);
    } catch (error) {
      toast.error('Error loading organization');
          } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!organization || !suspendReason) return;
    
    try {
      const updated = await RootService.suspendOrganization(organization.id, suspendReason);
      setOrganization(updated);
      setShowSuspendModal(false);
      setSuspendReason('');
      toast.success('Organization suspended successfully');
    } catch (error) {
      toast.error('Error suspending organization');
          }
  };

  const handleReactivate = async () => {
    if (!organization) return;
    
    try {
      const updated = await RootService.reactivateOrganization(organization.id);
      setOrganization(updated);
      toast.success('Organization reactivated successfully');
    } catch (error) {
      toast.error('Error reactivating organization');
          }
  };

  const getStateBadge = (state: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      trial: 'bg-blue-100 text-blue-800',
      suspended: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={styles[state as keyof typeof styles] || ''}>
        {state}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading organization...</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">Organization not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/es/root/organizations')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {organization.trade_name}
            </h1>
            <p className="text-gray-600 mt-1">
              {organization.business_name} - RFC: {organization.rfc}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStateBadge(organization.state)}
          {organization.state === 'active' ? (
            <Button
              variant="destructive"
              onClick={() => setShowSuspendModal(true)}
            >
              <Ban className="w-4 h-4 mr-2" />
              Suspend
            </Button>
          ) : organization.state === 'suspended' ? (
            <Button
              variant="default"
              onClick={handleReactivate}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Reactivate
            </Button>
          ) : null}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="font-semibold">{formatCurrency(organization.total_revenue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="font-semibold">{organization.active_users}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Health Score</p>
              <p className="font-semibold">{organization.health_score}%</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm text-gray-600">Churn Risk</p>
              <Badge className={
                organization.churn_risk === 'low' ? 'bg-green-100 text-green-800' :
                organization.churn_risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {organization.churn_risk}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General Info</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Organization Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-medium capitalize">{organization.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Legal Representative</p>
                <p className="font-medium">{organization.legal_representative}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">{formatDate(organization.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Activity</p>
                <p className="font-medium">
                  {organization.last_activity ? formatDate(organization.last_activity) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Clubs</p>
                <p className="font-medium">{organization.clubs_count || 0} clubs</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Reservations</p>
                <p className="font-medium">{organization.monthly_reservations}</p>
              </div>
            </div>
          </Card>

          {organization.state === 'suspended' && (
            <Card className="p-6 border-orange-200 bg-orange-50">
              <h3 className="text-lg font-semibold mb-2">Suspension Details</h3>
              <p className="text-sm text-gray-600">Suspended on: {formatDate(organization.suspended_at!)}</p>
              <p className="text-sm text-gray-600 mt-1">Reason: {organization.suspended_reason}</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Subscription Details</h3>
            {organization.subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Plan</p>
                  <p className="font-medium capitalize">{organization.subscription.plan}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Billing Frequency</p>
                  <p className="font-medium capitalize">{organization.subscription.billing_frequency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium">{formatCurrency(organization.subscription.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total with Tax</p>
                  <p className="font-medium">{formatCurrency(organization.subscription.total_with_tax)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Clubs Allowed</p>
                  <p className="font-medium">{organization.subscription.clubs_allowed}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Users per Club</p>
                  <p className="font-medium">{organization.subscription.users_per_club}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Billing</p>
                  <p className="font-medium">
                    {organization.subscription.next_billing_date 
                      ? formatDate(organization.subscription.next_billing_date)
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Auto Renew</p>
                  <p className="font-medium">{organization.subscription.auto_renew ? 'Yes' : 'No'}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No subscription found</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{organization.primary_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{organization.primary_phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Tax Address</p>
                  <p className="font-medium">
                    {organization.tax_address.street} {organization.tax_address.number}
                    {organization.tax_address.colony && `, ${organization.tax_address.colony}`}
                    <br />
                    {organization.tax_address.city}, {organization.tax_address.state} {organization.tax_address.postal_code}
                    <br />
                    {organization.tax_address.country}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Activity History</h3>
            <p className="text-gray-500">Activity history will be displayed here</p>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Suspend Organization</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for suspending this organization.
            </p>
            <textarea
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Suspension reason..."
              value={suspendReason || ''}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuspendModal(false);
                  setSuspendReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSuspend}
                disabled={!suspendReason}
              >
                Suspend
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}