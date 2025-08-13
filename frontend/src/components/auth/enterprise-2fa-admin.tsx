'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Shield, 
  ShieldCheck, 
  Users, 
  Settings, 
  AlertTriangle,
  ChevronRight,
  Loader2,
  Download,
  Filter
} from 'lucide-react';
import { toast } from '@/lib/toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const policySchema = z.object({
  require_2fa: z.boolean(),
  grace_period_days: z.number().min(0).max(30),
  allowed_methods: z.array(z.enum(['email', 'sms', 'whatsapp'])).min(1),
  session_timeout_minutes: z.number().min(5).max(480),
  max_devices: z.number().min(1).max(10),
});

type PolicyFormData = z.infer<typeof policySchema>;

interface User2FAStatus {
  id: string;
  email: string;
  name: string;
  role: string;
  has_2fa: boolean;
  last_login: string;
  devices_count: number;
  compliance_status: 'compliant' | 'grace_period' | 'non_compliant';
  grace_period_ends?: string;
}

interface ComplianceReport {
  total_users: number;
  compliant_users: number;
  grace_period_users: number;
  non_compliant_users: number;
  compliance_percentage: number;
}

export function Enterprise2FAAdmin() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User2FAStatus[]>([]);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'compliant' | 'grace_period' | 'non_compliant'>('all');

  const policyForm = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      require_2fa: false,
      grace_period_days: 7,
      allowed_methods: ['email'],
      session_timeout_minutes: 60,
      max_devices: 3,
    },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API calls
      const mockUsers: User2FAStatus[] = [
        {
          id: '1',
          email: 'admin@padel.com',
          name: 'Admin User',
          role: 'ADMIN',
          has_2fa: true,
          last_login: '2025-01-15T10:30:00Z',
          devices_count: 2,
          compliance_status: 'compliant'
        },
        {
          id: '2',
          email: 'manager@padel.com',
          name: 'Manager User',
          role: 'MANAGER',
          has_2fa: false,
          last_login: '2025-01-14T15:45:00Z',
          devices_count: 1,
          compliance_status: 'grace_period',
          grace_period_ends: '2025-01-22T00:00:00Z'
        },
        {
          id: '3',
          email: 'staff@padel.com',
          name: 'Staff User',
          role: 'STAFF',
          has_2fa: false,
          last_login: '2025-01-13T09:15:00Z',
          devices_count: 3,
          compliance_status: 'non_compliant'
        }
      ];

      const mockReport: ComplianceReport = {
        total_users: 3,
        compliant_users: 1,
        grace_period_users: 1,
        non_compliant_users: 1,
        compliance_percentage: 33
      };

      setUsers(mockUsers);
      setReport(mockReport);
    } catch (error) {
      toast.error('Failed to load 2FA data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePolicy = async (data: PolicyFormData) => {
    try {
      // Mock API call - replace with actual implementation
            toast.success('2FA policy updated successfully');
      setShowPolicyModal(false);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update policy';
      toast.error(message);
    }
  };

  const handleEnforce2FA = async (userId: string) => {
    try {
      // Mock API call - replace with actual implementation
            toast.success('2FA enforcement email sent to user');
      await loadData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to enforce 2FA';
      toast.error(message);
    }
  };

  const handleRevokeDevices = async (userId: string) => {
    if (!confirm('This will sign out the user from all devices. Continue?')) {
      return;
    }
    
    try {
      // Mock API call - replace with actual implementation
            toast.success('All devices revoked for user');
      await loadData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to revoke devices';
      toast.error(message);
    }
  };

  const exportComplianceReport = () => {
    const csvContent = [
      ['Email', 'Name', 'Role', '2FA Enabled', 'Compliance Status', 'Last Login', 'Devices'],
      ...users.map(user => [
        user.email,
        user.name,
        user.role,
        user.has_2fa ? 'Yes' : 'No',
        user.compliance_status,
        new Date(user.last_login).toLocaleString(),
        user.devices_count.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'padelyzer-2fa-compliance-report.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Compliance report exported');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge variant="default" className="bg-green-100 text-green-800">Compliant</Badge>;
      case 'grace_period':
        return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Grace Period</Badge>;
      case 'non_compliant':
        return <Badge variant="destructive">Non-Compliant</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    if (filter === 'all') return true;
    return user.compliance_status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enterprise 2FA Management</h1>
          <p className="text-muted-foreground">
            Manage two-factor authentication policies and user compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportComplianceReport}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button onClick={() => setShowPolicyModal(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Configure Policy
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="compliance">Compliance Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Compliance Overview */}
          {report && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-2xl font-bold">{report.total_users}</p>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-600">{report.compliant_users}</p>
                      <p className="text-sm text-muted-foreground">Compliant</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{report.grace_period_users}</p>
                      <p className="text-sm text-muted-foreground">Grace Period</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-600">{report.non_compliant_users}</p>
                      <p className="text-sm text-muted-foreground">Non-Compliant</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Compliance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Compliance Rate</CardTitle>
              <CardDescription>
                Overall 2FA compliance across your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance Rate</span>
                  <span className="text-2xl font-bold">{report?.compliance_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${report?.compliance_percentage}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {report && report.compliance_percentage < 80 && (
                    "Consider enforcing 2FA policy to improve security compliance."
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          {/* Filter Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter || ''} onValueChange={(value: any) => setFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="grace_period">Grace Period</SelectItem>
                  <SelectItem value="non_compliant">Non-Compliant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Users Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>2FA Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Devices</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.has_2fa ? (
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                        ) : (
                          <Shield className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm">
                          {user.has_2fa ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(user.compliance_status)}
                        {user.grace_period_ends && (
                          <p className="text-xs text-muted-foreground">
                            Ends: {new Date(user.grace_period_ends).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{user.devices_count} device{user.devices_count !== 1 ? 's' : ''}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {new Date(user.last_login).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {!user.has_2fa && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEnforce2FA(user.id)}
                          >
                            Enforce 2FA
                          </Button>
                        )}
                        {user.devices_count > 1 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRevokeDevices(user.id)}
                          >
                            Revoke Devices
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Report</CardTitle>
              <CardDescription>
                Detailed compliance analysis and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {report && report.compliance_percentage < 80 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Action Required:</strong> Your organization's 2FA compliance is below 80%. 
                    Consider implementing mandatory 2FA to improve security posture.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <h3 className="font-semibold">Recommendations</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    Enable mandatory 2FA for all administrative roles
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    Provide training on 2FA setup and security best practices
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    Set grace period to 7 days for non-compliant users
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    Monitor and audit 2FA usage regularly
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Policy Configuration Modal */}
      <Dialog open={showPolicyModal} onOpenChange={setShowPolicyModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure 2FA Policy</DialogTitle>
            <DialogDescription>
              Set organization-wide two-factor authentication requirements
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={policyForm.handleSubmit(handleUpdatePolicy)} className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require 2FA</Label>
                  <p className="text-sm text-muted-foreground">
                    Mandate 2FA for all users
                  </p>
                </div>
                <Switch 
                  checked={policyForm.watch('require_2fa')}
                  onCheckedChange={(checked) => policyForm.setValue('require_2fa', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Grace Period (days)</Label>
                <Input
                  type="number"
                  min="0"
                  max="30"
                  {...policyForm.register('grace_period_days', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Time given to users to enable 2FA before access is restricted
                </p>
              </div>

              <div className="space-y-2">
                <Label>Session Timeout (minutes)</Label>
                <Input
                  type="number"
                  min="5"
                  max="480"
                  {...policyForm.register('session_timeout_minutes', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Devices</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  {...policyForm.register('max_devices', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                disabled={policyForm.formState.isSubmitting}
                className="flex-1"
              >
                {policyForm.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Policy'
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowPolicyModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}