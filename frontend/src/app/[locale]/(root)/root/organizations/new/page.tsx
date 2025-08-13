'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { RootService } from '@/lib/api/services/root.service';
import { OrganizationCreate } from '@/lib/api/types';
import { toast } from '@/lib/toast';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OrganizationCreate>({
    type: 'club',
    business_name: '',
    trade_name: '',
    rfc: '',
    tax_address: {
      street: '',
      number: '',
      colony: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'México',
    },
    legal_representative: '',
    primary_email: '',
    primary_phone: '',
    plan: 'starter',
    billing_frequency: 'monthly',
    payment_method_type: 'card',
    cfdi_use: 'G03',
    invoice_email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const organization = await RootService.createOrganization(formData);
      toast.success('Organization created successfully');
      router.push(`/es/root/organizations/${organization.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Error creating organization');
          } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev: any) => ({
        ...prev,
        [parent as string]: {
          ...(prev?.[parent as string] || {}),
          [child as string]: value,
        },
      }));
    } else {
      setFormData((prev: any) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/es/root/organizations')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            New Organization
          </h1>
          <p className="text-gray-600 mt-1">
            Create a new organization in the system
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Organization Type</Label>
              <Select
                value={formData.type || ''}
                onValueChange={(value) => updateField('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="club">Club Individual</SelectItem>
                  <SelectItem value="chain">Cadena de Clubes</SelectItem>
                  <SelectItem value="franchise">Franquicia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rfc">RFC</Label>
              <Input
                id="rfc"
                value={formData.rfc || ''}
                onChange={(e) => updateField('rfc', e.target.value.toUpperCase())}
                placeholder="ABC123456DEF"
                required
              />
            </div>

            <div>
              <Label htmlFor="business_name">Razón Social</Label>
              <Input
                id="business_name"
                value={formData.business_name || ''}
                onChange={(e) => updateField('business_name', e.target.value)}
                placeholder="Empresa S.A. de C.V."
                required
              />
            </div>

            <div>
              <Label htmlFor="trade_name">Nombre Comercial</Label>
              <Input
                id="trade_name"
                value={formData.trade_name || ''}
                onChange={(e) => updateField('trade_name', e.target.value)}
                placeholder="Mi Club de Padel"
                required
              />
            </div>

            <div>
              <Label htmlFor="legal_representative">Representante Legal</Label>
              <Input
                id="legal_representative"
                value={formData.legal_representative || ''}
                onChange={(e) => updateField('legal_representative', e.target.value)}
                placeholder="Juan Pérez García"
                required
              />
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_email">Email</Label>
              <Input
                id="primary_email"
                type="email"
                value={formData.primary_email || ''}
                onChange={(e) => updateField('primary_email', e.target.value)}
                placeholder="contacto@miclub.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="primary_phone">Teléfono</Label>
              <Input
                id="primary_phone"
                value={formData.primary_phone || ''}
                onChange={(e) => updateField('primary_phone', e.target.value)}
                placeholder="+52 55 1234 5678"
                required
              />
            </div>

            <div>
              <Label htmlFor="invoice_email">Email para Facturas</Label>
              <Input
                id="invoice_email"
                type="email"
                value={formData.invoice_email || ''}
                onChange={(e) => updateField('invoice_email', e.target.value)}
                placeholder="facturas@miclub.com"
              />
            </div>
          </div>
        </Card>

        {/* Tax Address */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Dirección Fiscal</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="street">Calle</Label>
              <Input
                id="street"
                value={formData.tax_address.street || ''}
                onChange={(e) => updateField('tax_address.street', e.target.value)}
                placeholder="Av. Reforma"
                required
              />
            </div>

            <div>
              <Label htmlFor="number">Número</Label>
              <Input
                id="number"
                value={formData.tax_address.number || ''}
                onChange={(e) => updateField('tax_address.number', e.target.value)}
                placeholder="123"
                required
              />
            </div>

            <div>
              <Label htmlFor="colony">Colonia</Label>
              <Input
                id="colony"
                value={formData.tax_address.colony || ''}
                onChange={(e) => updateField('tax_address.colony', e.target.value)}
                placeholder="Polanco"
              />
            </div>

            <div>
              <Label htmlFor="city">Ciudad</Label>
              <Input
                id="city"
                value={formData.tax_address.city || ''}
                onChange={(e) => updateField('tax_address.city', e.target.value)}
                placeholder="Ciudad de México"
                required
              />
            </div>

            <div>
              <Label htmlFor="state">Estado</Label>
              <Input
                id="state"
                value={formData.tax_address.state || ''}
                onChange={(e) => updateField('tax_address.state', e.target.value)}
                placeholder="CDMX"
                required
              />
            </div>

            <div>
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input
                id="postal_code"
                value={formData.tax_address.postal_code || ''}
                onChange={(e) => updateField('tax_address.postal_code', e.target.value)}
                placeholder="11550"
                required
              />
            </div>
          </div>
        </Card>

        {/* Subscription */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Subscription Plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plan">Plan</Label>
              <Select
                value={formData.plan || ''}
                onValueChange={(value) => updateField('plan', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter - 1 Club</SelectItem>
                  <SelectItem value="professional">Professional - 5 Clubs</SelectItem>
                  <SelectItem value="enterprise">Enterprise - Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="billing_frequency">Billing Frequency</Label>
              <Select
                value={formData.billing_frequency || ''}
                onValueChange={(value) => updateField('billing_frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_method_type">Payment Method</Label>
              <Select
                value={formData.payment_method_type || ''}
                onValueChange={(value) => updateField('payment_method_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="cfdi_use">CFDI Use</Label>
              <Select
                value={formData.cfdi_use || ''}
                onValueChange={(value) => updateField('cfdi_use', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                  <SelectItem value="P01">P01 - Por definir</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/es/root/organizations')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Organization'}
          </Button>
        </div>
      </form>
    </div>
  );
}