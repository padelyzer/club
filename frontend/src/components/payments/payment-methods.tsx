'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit,
  Star,
  Shield,
  Calendar,
  Settings,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { toast } from '@/lib/toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  brand: string;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  billing_details: {
    name: string;
    email: string;
    phone?: string;
    address?: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
}

interface PaymentMethodsProps {
  customerId?: string;
}

export const PaymentMethods = ({ customerId }: PaymentMethodsProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Mock data - replace with actual API calls
  const mockPaymentMethods: PaymentMethod[] = [
    {
      id: '1',
      type: 'card',
      brand: 'visa',
      last4: '4242',
      expiry_month: 12,
      expiry_year: 2025,
      is_default: true,
      is_verified: true,
      created_at: new Date().toISOString(),
      billing_details: {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '+52 555 123 4567',
        address: {
          line1: 'Av. Reforma 123',
          city: 'Ciudad de México',
          state: 'CDMX',
          postal_code: '06600',
          country: 'MX',
        },
      },
    },
    {
      id: '2',
      type: 'card',
      brand: 'mastercard',
      last4: '5555',
      expiry_month: 8,
      expiry_year: 2024,
      is_default: false,
      is_verified: true,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      billing_details: {
        name: 'Juan Pérez',
        email: 'juan@example.com',
      },
    },
  ];

  const {
    data: paymentMethods,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['payment-methods', customerId],
    queryFn: async () => {
      // Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return mockPaymentMethods;
    },
  });

  const deleteMethodMutation = useMutation({
    mutationFn: async (methodId: string) => {
      // Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return methodId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago eliminado');
    },
    onError: () => {
      toast.error('Error al eliminar el método de pago');
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (methodId: string) => {
      // Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return methodId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pago predeterminado actualizado');
    },
    onError: () => {
      toast.error('Error al actualizar el método predeterminado');
    },
  });

  if (isLoading) return <LoadingState message="Cargando métodos de pago..." fullScreen={false} />;
  if (error)
    return <ErrorState message="Error al cargar los métodos de pago" />;

  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳 Visa';
      case 'mastercard':
        return '💳 Mastercard';
      case 'amex':
        return '💳 American Express';
      default:
        return '💳';
    }
  };

  const getBrandColor = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return 'bg-blue-100 text-blue-800';
      case 'mastercard':
        return 'bg-red-100 text-red-800';
      case 'amex':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpiringSoon = (month: number, year: number) => {
    const now = new Date();
    const expiryDate = new Date(year, month - 1);
    const monthsDiff =
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsDiff <= 2 && monthsDiff > 0;
  };

  const isExpired = (month: number, year: number) => {
    const now = new Date();
    const expiryDate = new Date(year, month - 1);
    return expiryDate < now;
  };

  const handleDelete = (methodId: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error('No puedes eliminar el método de pago predeterminado');
      return;
    }

    if (
      window.confirm(
        '¿Estás seguro de que quieres eliminar este método de pago?'
      )
    ) {
      deleteMethodMutation.mutate(methodId);
    }
  };

  const handleSetDefault = (methodId: string) => {
    setDefaultMutation.mutate(methodId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Métodos de Pago
          </h2>
          <p className="text-gray-600 mt-1">
            Gestiona tus tarjetas y métodos de pago
          </p>
        </div>

        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Método
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Método de Pago</DialogTitle>
            </DialogHeader>
            <AddPaymentMethodForm onClose={() => setShowAddModal(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Methods */}
      {paymentMethods && paymentMethods.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {paymentMethods.map((method, index) => {
            const expiringSoon = isExpiringSoon(
              method.expiry_month,
              method.expiry_year
            );
            const expired = isExpired(method.expiry_month, method.expiry_year);

            return (
              <motion.div
                key={method.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`p-6 transition-all ${
                    method.is_default
                      ? 'ring-2 ring-blue-500 bg-blue-50'
                      : 'hover:shadow-md'
                  } ${expired ? 'bg-red-50 border-red-200' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={getBrandColor(method.brand)}>
                            {getBrandIcon(method.brand)}
                          </Badge>
                          {method.is_default && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <Star className="w-3 h-3 mr-1" />
                              Predeterminado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          •••• •••• •••• {method.last4}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {!method.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                          disabled={setDefaultMutation.isPending}
                        >
                          <Star className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowCardDetails(
                            showCardDetails === method.id ? null : method.id
                          )
                        }
                      >
                        {showCardDetails === method.id ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleDelete(method.id, method.is_default)
                        }
                        disabled={deleteMethodMutation.isPending}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Vencimiento:</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            expired
                              ? 'text-red-600'
                              : expiringSoon
                                ? 'text-yellow-600'
                                : ''
                          }
                        >
                          {method.expiry_month.toString().padStart(2, '0')}/
                          {method.expiry_year}
                        </span>
                        {expired && (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                        {expiringSoon && !expired && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Estado:</span>
                      <div className="flex items-center gap-1">
                        {method.is_verified ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verificado
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Pendiente
                          </Badge>
                        )}
                      </div>
                    </div>

                    {expired && (
                      <div className="p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                        Esta tarjeta ha expirado. Actualiza la información o
                        agrega un nuevo método.
                      </div>
                    )}

                    {expiringSoon && !expired && (
                      <div className="p-2 bg-yellow-100 border border-yellow-200 rounded text-sm text-yellow-700">
                        Esta tarjeta expira pronto. Considera actualizar la
                        información.
                      </div>
                    )}

                    {showCardDetails === method.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-3 border-t border-gray-200 space-y-2 text-sm"
                      >
                        <div>
                          <span className="text-gray-600">Titular: </span>
                          <span className="font-medium">
                            {method.billing_details.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Email: </span>
                          <span className="font-medium">
                            {method.billing_details.email}
                          </span>
                        </div>
                        {method.billing_details.phone && (
                          <div>
                            <span className="text-gray-600">Teléfono: </span>
                            <span className="font-medium">
                              {method.billing_details.phone}
                            </span>
                          </div>
                        )}
                        {method.billing_details.address && (
                          <div>
                            <span className="text-gray-600">Dirección: </span>
                            <span className="font-medium">
                              {method.billing_details.address.line1},{' '}
                              {method.billing_details.address.city}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-600">Agregado: </span>
                          <span className="font-medium">
                            {format(
                              new Date(method.created_at),
                              "d 'de' MMMM 'de' yyyy",
                              { locale: es }
                            )}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Sin métodos de pago
          </h3>
          <p className="text-gray-500 mb-4">
            Agrega tu primera tarjeta o método de pago para comenzar
          </p>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Primer Método
          </Button>
        </Card>
      )}

      {/* Security Notice */}
      <Card className="p-4 bg-gray-50 border-gray-200">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-gray-900 mb-1">
              Seguridad garantizada
            </h4>
            <p className="text-sm text-gray-600">
              Todos los datos de tarjetas son encriptados y procesados de forma
              segura. No almacenamos información sensible en nuestros
              servidores.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Add Payment Method Form Component
const AddPaymentMethodForm = ({ onClose }: { onClose: () => void }) => {
  const [formData, setFormData] = useState({
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvc: '',
    name: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success('Método de pago agregado exitosamente');
      onClose();
    } catch (error) {
      toast.error('Error al agregar el método de pago');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData((prev) => ({ ...prev, card_number: formatted }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          Número de tarjeta *
        </label>
        <Input
          value={formData.card_number || ''}
          onChange={handleCardNumberChange}
          placeholder="1234 5678 9012 3456"
          maxLength={19}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Mes *</label>
          <Select
            value={formData.expiry_month || ''}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, expiry_month: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="MM" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <SelectItem
                  key={month}
                  value={month.toString().padStart(2, '0') || ''}
                >
                  {month.toString().padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Año *</label>
          <Select
            value={formData.expiry_year || ''}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, expiry_year: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="YYYY" />
            </SelectTrigger>
            <SelectContent>
              {Array.from(
                { length: 10 },
                (_, i) => new Date().getFullYear() + i
              ).map((year) => (
                <SelectItem key={year} value={year.toString() || ''}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">CVC *</label>
          <Input
            value={formData.cvc || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, cvc: e.target.value }))
            }
            placeholder="123"
            maxLength={4}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Nombre del titular *
        </label>
        <Input
          value={formData.name || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="Juan Pérez"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Email *</label>
        <Input
          type="email"
          value={formData.email || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, email: e.target.value }))
          }
          placeholder="juan@example.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Teléfono</label>
        <Input
          value={formData.phone || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, phone: e.target.value }))
          }
          placeholder="+52 555 123 4567"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Agregando...' : 'Agregar Método'}
        </Button>
      </div>
    </form>
  );
};
