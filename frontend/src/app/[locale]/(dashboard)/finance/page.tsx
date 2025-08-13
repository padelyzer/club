'use client';

import { motion } from 'framer-motion';
import {
  Plus,
  DollarSign,
  CreditCard,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Mock data for financial information
const mockFinanceData = {
  revenue: {
    total: 28450,
    monthly: 12340,
    growth: 15.3,
  },
  expenses: {
    total: 8920,
    monthly: 3890,
    growth: -8.2,
  },
  transactions: [
    {
      id: 1,
      type: 'income',
      description: 'Reserva Pista Central - Juan Pérez',
      amount: 45,
      date: '2025-07-28',
      status: 'completed',
      method: 'Tarjeta',
    },
    {
      id: 2,
      type: 'income',
      description: 'Clase Particular - Ana García',
      amount: 60,
      date: '2025-07-28',
      status: 'completed',
      method: 'Efectivo',
    },
    {
      id: 3,
      type: 'expense',
      description: 'Mantenimiento equipos',
      amount: 150,
      date: '2025-07-27',
      status: 'completed',
      method: 'Transferencia',
    },
    {
      id: 4,
      type: 'income',
      description: 'Inscripción Torneo',
      amount: 120,
      date: '2025-07-27',
      status: 'pending',
      method: 'Tarjeta',
    },
  ],
  invoices: [
    {
      id: 'INV-001',
      client: 'Club Deportivo Norte',
      amount: 850,
      dueDate: '2025-08-15',
      status: 'pending',
    },
    {
      id: 'INV-002',
      client: 'Organización Torneos SA',
      amount: 1200,
      dueDate: '2025-08-20',
      status: 'paid',
    },
  ],
};

const statusConfig = {
  completed: {
    label: 'Completado',
    color:
      'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  },
  pending: {
    label: 'Pendiente',
    color:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  },
  paid: {
    label: 'Pagado',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  },
  overdue: {
    label: 'Vencido',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  },
};

const FinancePage = () => {
  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Finanzas
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona los ingresos y gastos del club
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reportes
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nueva Transacción
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ingresos Totales
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                €{mockFinanceData.revenue.total.toLocaleString()}
              </p>
              <div className="flex items-center mt-2">
                <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-600">
                  +{mockFinanceData.revenue.growth}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Gastos Totales
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                €{mockFinanceData.expenses.total.toLocaleString()}
              </p>
              <div className="flex items-center mt-2">
                <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm text-red-600">
                  {mockFinanceData.expenses.growth}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Balance Neto
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                €
                {(
                  mockFinanceData.revenue.total - mockFinanceData.expenses.total
                ).toLocaleString()}
              </p>
              <div className="flex items-center mt-2">
                <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                <span className="text-sm text-blue-600">Positivo</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Transacciones Recientes
            </h3>
            <Button variant="outline" size="sm">
              Ver Todas
            </Button>
          </div>

          <div className="space-y-4">
            {mockFinanceData.transactions.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`p-2 rounded-lg ${transaction.type === 'income' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}
                  >
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {transaction.description}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(transaction.date).toLocaleDateString()} •{' '}
                      {transaction.method}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}€
                    {transaction.amount}
                  </p>
                  <Badge
                    className={
                      statusConfig[
                        transaction.status as keyof typeof statusConfig
                      ].color
                    }
                  >
                    {
                      statusConfig[
                        transaction.status as keyof typeof statusConfig
                      ].label
                    }
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Invoices */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Facturas Recientes
            </h3>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Factura
            </Button>
          </div>

          <div className="space-y-4">
            {mockFinanceData.invoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                    <FileText className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {invoice.id}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.client}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Vence: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    €{invoice.amount}
                  </p>
                  <Badge
                    className={
                      statusConfig[invoice.status as keyof typeof statusConfig]
                        .color
                    }
                  >
                    {
                      statusConfig[invoice.status as keyof typeof statusConfig]
                        .label
                    }
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Empty State (shown when no data) */}
      {mockFinanceData.transactions.length === 0 && (
        <Card className="p-12 text-center">
          <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No hay transacciones registradas
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comienza registrando la primera transacción financiera.
          </p>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Registrar Primera Transacción
          </Button>
        </Card>
      )}
    </div>
  );
};

export default FinancePage;
