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
  User,
} from 'lucide-react';
import { ApiClient } from '@/types/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ClientCardProps {
  client: ApiClient;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ClientCard({
  client,
  onView,
  onEdit,
  onDelete,
}: ClientCardProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount);
  };

  const initials =
    `${client.first_name[0]}${client.last_name[0]}`.toUpperCase();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onView}
      className="group relative cursor-pointer"
    >
      <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md border border-gray-100 transition-all duration-200">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                {client.first_name} {client.last_name}
              </h3>
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1",
                client.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              )}>
                {client.is_active ? t('common.active') : t('common.inactive')}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100 rounded-lg hover:bg-gray-100"
              >
                <span className="sr-only">{t('common.openMenu')}</span>
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                {t('common.view')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-danger-600 focus:text-danger-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contact Info */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center mr-3">
              <Mail className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <span className="text-sm text-gray-600 truncate">
              {client.email}
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center mr-3">
              <Phone className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <span className="text-sm text-gray-600">
              {client.phone}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-center mb-1">
              <div className="w-5 h-5 rounded-md bg-green-100 flex items-center justify-center mr-2">
                <DollarSign className="h-3 w-3 text-green-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {t('clients.totalSpent')}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatCurrency(client.total_spent)}
            </div>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <div className="flex items-center mb-1">
              <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center mr-2">
                <Calendar className="h-3 w-3 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {t('clients.reservations')}
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {client.total_reservations}
            </div>
          </div>
        </div>

        {/* Last Reservation */}
        {client.last_reservation && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500 font-medium">
              {t('clients.lastReservation')}
            </span>
            <div className="mt-1 text-sm font-medium text-gray-900">
              {format(new Date(client.last_reservation), 'dd/MM/yyyy')}
            </div>
          </div>
        )}

        {/* Membership Badge */}
        {client.membership && (
          <div className="absolute right-3 top-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              {client.membership.name}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
