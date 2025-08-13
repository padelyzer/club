'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Receipt,
  Download,
  Eye,
  Filter,
  Search,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileText,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Payment {
  id: string;
  invoice_number: string;
  date: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  payment_method: {
    type: 'card' | 'bank' | 'cash' | 'transfer';
    brand?: string;
    last4?: string;
  };
  description: string;
  reservation_id?: string;
  customer: {
    name: string;
    email: string;
  };
  gateway: string;
  transaction_id?: string;
  failure_reason?: string;
  refund_amount?: number;
  refund_date?: string;
}

interface PaymentHistoryProps {
  customerId?: string;
  reservationId?: string;
}

export const PaymentHistory = ({
  customerId,
  reservationId,
}: PaymentHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Mock data - replace with actual API call
  const mockPayments: Payment[] = [
    {
      id: '1',
      invoice_number: 'INV-2024-001',
      date: new Date().toISOString(),
      amount: 450.0,
      currency: 'MXN',
      status: 'completed',
      payment_method: {
        type: 'card',
        brand: 'visa',
        last4: '4242',
      },
      description: 'Reserva de cancha - Cancha 1',
      reservation_id: 'RES-001',
      customer: {
        name: 'Juan Pérez',
        email: 'juan@example.com',
      },
      gateway: 'stripe',
      transaction_id: 'tx_1234567890',
    },
    {
      id: '2',
      invoice_number: 'INV-2024-002',
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      amount: 300.0,
      currency: 'MXN',
      status: 'pending',
      payment_method: {
        type: 'bank',
      },
      description: 'Inscripción a liga - Liga Primavera',
      customer: {
        name: 'María García',
        email: 'maria@example.com',
      },
      gateway: 'mercadopago',
    },
    {
      id: '3',
      invoice_number: 'INV-2024-003',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 150.0,
      currency: 'MXN',
      status: 'failed',
      payment_method: {
        type: 'card',
        brand: 'mastercard',
        last4: '5555',
      },
      description: 'Reserva de cancha - Cancha 2',
      customer: {
        name: 'Carlos López',
        email: 'carlos@example.com',
      },
      gateway: 'stripe',
      failure_reason: 'Fondos insuficientes',
    },
    {
      id: '4',
      invoice_number: 'INV-2024-004',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      amount: 600.0,
      currency: 'MXN',
      status: 'refunded',
      payment_method: {
        type: 'card',
        brand: 'visa',
        last4: '1234',
      },
      description: 'Reserva cancelada - Cancha 3',
      customer: {
        name: 'Ana Rodríguez',
        email: 'ana@example.com',
      },
      gateway: 'stripe',
      refund_amount: 600.0,
      refund_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const {
    data: payments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['payment-history', customerId, reservationId],
    queryFn: async () => {
      // Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return mockPayments;
    },
  });

  if (isLoading)
    return <LoadingState message="Cargando historial de pagos..." fullScreen={false} />;
  if (error) return <ErrorState message="Error al cargar el historial" />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'refunded':
        return <RefreshCw className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'pending':
        return 'Pendiente';
      case 'failed':
        return 'Fallido';
      case 'refunded':
        return 'Reembolsado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getPaymentMethodDisplay = (method: Payment['payment_method']) => {
    if (method.type === 'card' && method.brand && method.last4) {
      return `${method.brand.toUpperCase()} •••• ${method.last4}`;
    }
    switch (method.type) {
      case 'bank':
        return 'Transferencia bancaria';
      case 'cash':
        return 'Efectivo';
      case 'transfer':
        return 'Transferencia';
      default:
        return method.type;
    }
  };

  // Filter payments
  const filteredPayments =
    payments?.filter((payment) => {
      if (
        searchTerm &&
        !payment.invoice_number
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) &&
        !payment.customer.name
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) &&
        !payment.description.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      if (statusFilter !== 'all' && payment.status !== statusFilter) {
        return false;
      }

      if (dateFilter !== 'all') {
        const paymentDate = new Date(payment.date);
        const now = new Date();
        const daysDiff =
          (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);

        switch (dateFilter) {
          case 'today':
            if (daysDiff > 1) return false;
            break;
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
        }
      }

      return true;
    }) || [];

  const totalAmount = filteredPayments.reduce((sum, payment) => {
    if (payment.status === 'completed') {
      return sum + payment.amount;
    }
    return sum;
  }, 0);

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowDetailModal(true);
  };

  const handleDownloadInvoice = (payment: Payment) => {
    // Simulate invoice download
    const blob = new Blob(['Invoice content'], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${payment.invoice_number}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            Historial de Pagos
          </h2>
          <p className="text-gray-600 mt-1">
            Consulta todos los pagos y transacciones
          </p>
        </div>

        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pagos</p>
              <p className="text-2xl font-bold">{filteredPayments.length}</p>
            </div>
            <Receipt className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-green-600">
                {
                  filteredPayments.filter((p) => p.status === 'completed')
                    .length
                }
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredPayments.filter((p) => p.status === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Monto</p>
              <p className="text-2xl font-bold text-green-600">
                ${totalAmount.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por factura, cliente..."
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter || ''} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="failed">Fallidos</SelectItem>
              <SelectItem value="refunded">Reembolsados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter || ''} onValueChange={setDateFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="w-full">
            <Filter className="w-4 h-4 mr-2" />
            Más filtros
          </Button>
        </div>
      </Card>

      {/* Payments Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Factura</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment, index) => (
                <motion.tr
                  key={payment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {payment.invoice_number}
                      </div>
                      {payment.transaction_id && (
                        <div className="text-xs text-gray-500">
                          ID: {payment.transaction_id}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div>
                      <div className="font-medium">{payment.customer.name}</div>
                      <div className="text-sm text-gray-500">
                        {payment.customer.email}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="max-w-48">
                      <div className="font-medium truncate">
                        {payment.description}
                      </div>
                      {payment.reservation_id && (
                        <div className="text-xs text-gray-500">
                          Reserva: {payment.reservation_id}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {getPaymentMethodDisplay(payment.payment_method)}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {payment.gateway}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">
                      ${payment.amount.toLocaleString()} {payment.currency}
                    </div>
                    {payment.refund_amount && (
                      <div className="text-xs text-red-600">
                        Reembolso: ${payment.refund_amount.toLocaleString()}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge className={getStatusColor(payment.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(payment.status)}
                        {getStatusText(payment.status)}
                      </div>
                    </Badge>
                    {payment.failure_reason && (
                      <div className="text-xs text-red-600 mt-1">
                        {payment.failure_reason}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(payment.date), 'd MMM yyyy', {
                        locale: es,
                      })}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(payment.date), 'HH:mm')}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(payment)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadInvoice(payment)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="p-8 text-center">
            <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Sin pagos
            </h3>
            <p className="text-gray-500">
              No se encontraron pagos que coincidan con los filtros
              seleccionados.
            </p>
          </div>
        )}
      </Card>

      {/* Payment Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Pago</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <PaymentDetail
              payment={selectedPayment}
              onClose={() => setShowDetailModal(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Payment Detail Component
const PaymentDetail = ({
  payment,
  onClose,
}: {
  payment: Payment;
  onClose: () => void;
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Información del Pago</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Factura:</span>
              <span className="font-medium">{payment.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monto:</span>
              <span className="font-medium">
                ${payment.amount.toLocaleString()} {payment.currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estado:</span>
              <Badge className={getStatusColor(payment.status)}>
                {getStatusText(payment.status)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Método:</span>
              <span className="font-medium">
                {getPaymentMethodDisplay(payment.payment_method)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pasarela:</span>
              <span className="font-medium capitalize">{payment.gateway}</span>
            </div>
            {payment.transaction_id && (
              <div className="flex justify-between">
                <span className="text-gray-600">ID Transacción:</span>
                <span className="font-medium font-mono text-xs">
                  {payment.transaction_id}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Información del Cliente</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Nombre:</span>
              <span className="font-medium">{payment.customer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{payment.customer.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha:</span>
              <span className="font-medium">
                {format(
                  new Date(payment.date),
                  "d 'de' MMMM 'de' yyyy, HH:mm",
                  { locale: es }
                )}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:col-span-2">
          <h3 className="font-semibold mb-3">Descripción</h3>
          <p className="text-sm text-gray-600">{payment.description}</p>

          {payment.failure_reason && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <h4 className="font-medium text-red-800 mb-1">
                Motivo del fallo
              </h4>
              <p className="text-sm text-red-600">{payment.failure_reason}</p>
            </div>
          )}

          {payment.refund_amount && payment.refund_date && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
              <h4 className="font-medium text-gray-800 mb-1">
                Información del reembolso
              </h4>
              <div className="text-sm text-gray-600">
                <p>
                  Monto: ${payment.refund_amount.toLocaleString()}{' '}
                  {payment.currency}
                </p>
                <p>
                  Fecha:{' '}
                  {format(
                    new Date(payment.refund_date),
                    "d 'de' MMMM 'de' yyyy",
                    { locale: es }
                  )}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Descargar Factura
        </Button>
      </div>
    </div>
  );
};
