'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Search,
  Building2,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { RootService } from '@/lib/api/services/root.service';
import { Organization } from '@/lib/api/types';
import { toast } from '@/lib/toast';

export default function OrganizationsListPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    loadOrganizations();
  }, [stateFilter, riskFilter]);

  const loadOrganizations = async () => {
    try {
      const params: any = {};
      if (stateFilter !== 'all') params.state = stateFilter;
      if (riskFilter !== 'all') params.churn_risk = riskFilter;
      if (search) params.search = search;
      
      const data = await RootService.getOrganizations(params);
            
      // Handle both array and paginated responses
      if (Array.isArray(data)) {
        setOrganizations(data);
      } else if (data?.results && Array.isArray(data.results)) {
        setOrganizations(data.results);
      } else {
        setOrganizations([]);
      }
    } catch (error: any) {
            toast.error(error?.response?.data?.detail || 'Error loading organizations');
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrganizations();
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

  const getRiskBadge = (risk: string) => {
    const styles = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return (
      <Badge className={styles[risk as keyof typeof styles] || ''}>
        {risk}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Organizations
          </h1>
          <p className="text-gray-600 mt-1">
            Manage all organizations in the system
          </p>
        </div>
        <Button 
          onClick={() => router.push('/es/root/organizations/new')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Organization
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-end">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex gap-2">
              <Input
                placeholder="Search by name, RFC, or email..."
                value={search || ''}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="outline">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </form>
          
          <Select value={stateFilter || ''} onValueChange={setStateFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={riskFilter || ''} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Churn Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="low">Low Risk</SelectItem>
              <SelectItem value="medium">Medium Risk</SelectItem>
              <SelectItem value="high">High Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Organizations Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead>RFC</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading organizations...
                </TableCell>
              </TableRow>
            ) : organizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No organizations found
                </TableCell>
              </TableRow>
            ) : (
              organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{org.trade_name}</p>
                      <p className="text-sm text-gray-500">{org.primary_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{org.rfc}</TableCell>
                  <TableCell>{getStateBadge(org.state)}</TableCell>
                  <TableCell>
                    {org.subscription?.plan || 'No plan'}
                  </TableCell>
                  <TableCell>{formatCurrency(org.total_revenue)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-500" />
                      <span>{org.health_score}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{getRiskBadge(org.churn_risk)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/es/root/organizations/${org.id}`)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}