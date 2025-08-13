'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { RootService } from '@/lib/api/services/root.service';
import { Organization } from '@/lib/api/types';
import { Club } from '@/types/club';
import { toast } from '@/lib/toast';

interface ExtendedClub extends Club {
  organization_name?: string;
  organization_id?: string;
  subscription_plan?: string;
}

export default function TransferClubPage() {
  const router = useRouter();
  const params = useParams();
  const clubId = params.id as string;
  const locale = params.locale as string;
  
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [club, setClub] = useState<ExtendedClub | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [targetOrgId, setTargetOrgId] = useState('');
  const [targetOrg, setTargetOrg] = useState<Organization | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    loadData();
  }, [clubId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps


  useEffect(() => {
    if (targetOrgId) {
      const org = organizations.find(o => o.id === targetOrgId);
      setTargetOrg(org || null);
    } else {
      setTargetOrg(null);
    }
  }, [targetOrgId, organizations]);

  const loadData = async () => {
    try {
      const [clubData, orgsResponse] = await Promise.all([
        RootService.getClub(clubId),
        RootService.getOrganizations({ state: 'active' })
      ]);
      
      setClub(clubData);
      const orgs = orgsResponse.results || orgsResponse;
      // Filter out current organization
      const filteredOrgs = Array.isArray(orgs) 
        ? orgs.filter((org: Organization) => org.id !== clubData.organization_id)
        : [];
      setOrganizations(filteredOrgs);
    } catch (error) {
      toast.error('Error al cargar datos');
      router.push(`/${locale}/root/clubmngr`);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!targetOrgId || !club) return;

    setTransferring(true);
    try {
      await RootService.transferClub(clubId, targetOrgId);
      toast.success('Club transferido exitosamente');
      router.push(`/${locale}/root/clubmngr`);
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Error al transferir club');
    } finally {
      setTransferring(false);
    }
  };

  const canTransfer = () => {
    if (!targetOrg || !targetOrg.subscription) return false;
    
    const limits = {
      basic: 1,
      pro: 5,
      enterprise: -1 // unlimited
    };
    
    const limit = limits[targetOrg.subscription.plan as keyof typeof limits] || 1;
    const currentClubs = targetOrg.clubs_count || 0;
    
    return limit === -1 || currentClubs < limit;
  };

  const getSubscriptionBadge = (plan?: string) => {
    if (!plan) return null;
    const styles = {
      basic: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
    };
    return (
      <Badge className={styles[plan as keyof typeof styles] || ''}>
        {plan}
      </Badge>
    );
  };

  if (loading || !club) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Cargando información...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/${locale}/root/clubmngr/${clubId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Transferir Club
          </h1>
          <p className="text-gray-600 mt-1">
            Mover &quot;{club.name}&quot; a otra organización
          </p>
        </div>
      </div>

      {/* Current Organization */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Organización Actual</h2>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{club.organization_name}</p>
              <p className="text-sm text-gray-600 mt-1">
                Plan: {getSubscriptionBadge(club.subscription_plan)}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </Card>

      {/* Target Organization */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Organización Destino</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="target-org">Seleccionar Organización *</Label>
            <Select value={targetOrgId || ''} onValueChange={setTargetOrgId}>
              <SelectTrigger id="target-org">
                <SelectValue placeholder="Selecciona una organización" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id || ''}>
                    <div className="flex items-center justify-between w-full">
                      <span>{org.trade_name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({org.clubs_count || 0} clubes)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {targetOrg && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">RFC:</span>
                  <span className="text-sm font-medium">{targetOrg.rfc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Plan:</span>
                  {getSubscriptionBadge(targetOrg.subscription?.plan)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Clubes actuales:</span>
                  <span className="text-sm font-medium">{targetOrg.clubs_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Límite de clubes:</span>
                  <span className="text-sm font-medium">
                    {targetOrg.subscription?.plan === 'enterprise' 
                      ? 'Ilimitado'
                      : targetOrg.subscription?.plan === 'pro' ? '5' : '1'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Validation Messages */}
      {targetOrg && (
        <div>
          {canTransfer() ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Transferencia permitida</AlertTitle>
              <AlertDescription className="text-green-700">
                La organización destino puede recibir este club según su plan de suscripción.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertTitle className="text-red-800">Límite alcanzado</AlertTitle>
              <AlertDescription className="text-red-700">
                La organización destino ha alcanzado el límite de clubes permitidos por su plan.
                Debe actualizar su suscripción para agregar más clubes.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Importante</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Esta acción transferirá el club y todos sus datos asociados</li>
            <li>Las canchas, reservas y miembros permanecerán con el club</li>
            <li>El historial de transacciones se mantendrá intacto</li>
            <li>La organización destino será responsable de la facturación futura</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push(`/${locale}/root/clubmngr/${clubId}`)}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleTransfer}
          disabled={!targetOrgId || !canTransfer() || transferring}
        >
          {transferring ? (
            'Transfiriendo...'
          ) : (
            <>
              Transferir Club
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}