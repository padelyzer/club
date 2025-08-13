import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Phone,
  Mail,
  Calendar,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  User,
} from 'lucide-react';
import { useClientsStore } from '@/store/clientsStore';
import { ClientCard } from './client-card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ApiClient } from '@/types/client';
import { format } from 'date-fns';
import { useClientMutations } from '@/lib/api/hooks/useClients';

export function ClientsList() {
  const { t } = useTranslation();
  const {
    clients,
    viewMode,
    currentPage,
    pageSize,
    totalClients,
    openForm,
    openDetail,
    setCurrentPage,
  } = useClientsStore();

  const { deleteClient } = useClientMutations();

  const handleEdit = (client: ApiClient) => {
    openForm(client);
  };

  const handleDelete = async (client: ApiClient) => {
    if (
      confirm(
        t('clients.confirmDelete', {
          name: `${client.first_name} ${client.last_name}`,
        })
      )
    ) {
      await deleteClient(client.id);
    }
  };

  const handleView = (client: ApiClient) => {
    openDetail(client);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const totalPages = Math.ceil(totalClients / pageSize);

  if (viewMode === 'grid') {
    return (
      <div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {clients.map((client, index) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <ClientCard
                client={client}
                onEdit={() => handleEdit(client)}
                onDelete={() => handleDelete(client)}
                onView={() => handleView(client)}
              />
            </motion.div>
          ))}
        </div>

        {/* Pagination - Apple style */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <div className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50"
              >
                {t('common.previous')}
              </Button>

              <span className="flex items-center px-3 text-sm text-gray-600 font-medium">
                {t('common.pageOf', { page: currentPage, total: totalPages })}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50"
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view - Apple style
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('clients.name')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('clients.contact')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('clients.status')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('clients.stats')}
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                {t('clients.lastReservation')}
              </th>
              <th className="relative px-6 py-4">
                <span className="sr-only">{t('common.actions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {clients.map((client, index) => (
              <motion.tr
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleView(client)}
              >
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {client.first_name} {client.last_name}
                      </div>
                      {client.document_number && (
                        <div className="text-xs text-gray-500">
                          {client.document_type?.toUpperCase()}: {client.document_number}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-900">
                      <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center mr-2">
                        <Mail className="h-3 w-3 text-gray-500" />
                      </div>
                      {client.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center mr-2">
                        <Phone className="h-3 w-3 text-gray-500" />
                      </div>
                      {client.phone}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium gap-1",
                    client.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  )}>
                    {client.is_active ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      <XCircle className="h-3 w-3" />
                    )}
                    {client.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-900">
                      <div className="w-5 h-5 rounded-md bg-green-100 flex items-center justify-center mr-2">
                        <DollarSign className="h-3 w-3 text-green-600" />
                      </div>
                      {formatCurrency(client.total_spent)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center mr-2">
                        <Calendar className="h-3 w-3 text-blue-600" />
                      </div>
                      {client.total_reservations} {t('clients.reservations')}
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                  {client.last_reservation ? (
                    <span className="font-medium">
                      {format(new Date(client.last_reservation), 'dd/MM/yyyy')}
                    </span>
                  ) : (
                    <span className="text-gray-400">{t('common.never')}</span>
                  )}
                </td>
                <td className="relative whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100">
                        <span className="sr-only">{t('common.openMenu')}</span>
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(client); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('common.view')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(client); }}>
                        <Edit className="mr-2 h-4 w-4" />
                        {t('common.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); handleDelete(client); }}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination - Apple style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="text-sm text-gray-600 font-medium">
            {t('common.showing', {
              from: (currentPage - 1) * pageSize + 1,
              to: Math.min(currentPage * pageSize, totalClients),
              total: totalClients,
            })}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50"
            >
              {t('common.previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 px-3 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg disabled:opacity-50"
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
