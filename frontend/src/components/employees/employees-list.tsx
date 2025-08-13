'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Calendar,
  Mail,
  Phone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { EmptyState } from '@/components/ui/states/empty-state';
import { DataTable } from '@/components/ui/data-table';
import { EmployeeForm } from './employee-form';
import {
  useEmployees,
  useDeleteEmployee,
  useActivateEmployee,
  useDeactivateEmployee,
} from '@/lib/api/hooks/useEmployees';
import { Employee, EmployeeFilters } from '@/types/employee';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface EmployeesListProps {
  clubId: string;
}

export function EmployeesList({ clubId }: EmployeesListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [filters, setFilters] = useState<EmployeeFilters>({
    page: 1,
    page_size: 10,
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const { data, isLoading, error } = useEmployees(clubId, filters);
  const deleteEmployee = useDeleteEmployee(clubId);
  const activateEmployee = useActivateEmployee(clubId);
  const deactivateEmployee = useDeactivateEmployee(clubId);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'instructor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'receptionist':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'manager':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (
      window.confirm(
        t('employees.confirmDelete', {
          name: `${employee.first_name} ${employee.last_name}`,
        })
      )
    ) {
      await deleteEmployee.mutateAsync(employee.id);
    }
  };

  const handleToggleStatus = async (employee: Employee) => {
    if (employee.is_active) {
      await deactivateEmployee.mutateAsync(employee.id);
    } else {
      await activateEmployee.mutateAsync(employee.id);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
  };

  const columns = [
    {
      header: t('employees.name'),
      cell: (employee: Employee) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium">
              {employee.first_name[0]}
              {employee.last_name[0]}
            </span>
          </div>
          <div>
            <p className="font-medium">
              {employee.first_name} {employee.last_name}
            </p>
            <p className="text-sm text-muted-foreground">
              {employee.employee_code}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: t('employees.role'),
      cell: (employee: Employee) => (
        <Badge className={getRoleBadgeColor(employee.role)}>
          {t(`employees.roles.${employee.role}`)}
        </Badge>
      ),
    },
    {
      header: t('employees.contact'),
      cell: (employee: Employee) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <Mail className="w-3 h-3" />
            {employee.email}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="w-3 h-3" />
            {employee.phone}
          </div>
        </div>
      ),
    },
    {
      header: t('employees.hireDate'),
      cell: (employee: Employee) => (
        <div className="flex items-center gap-1 text-sm">
          <Calendar className="w-3 h-3" />
          {format(new Date(employee.hire_date), "d 'de' MMMM, yyyy", {
            locale: es,
          })}
        </div>
      ),
    },
    {
      header: t('employees.status'),
      cell: (employee: Employee) => (
        <Badge variant={employee.is_active ? 'success' : 'secondary'}>
          {employee.is_active ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    {
      header: t('common.actions'),
      cell: (employee: Employee) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(`/clubs/${clubId}/employees/${employee.id}`)
            }
          >
            <Calendar className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(employee)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(employee)}
          >
            {employee.is_active ? (
              <UserX className="w-4 h-4" />
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(employee)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={t('employees.errorLoading')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            {t('employees.title')}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t('employees.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            {t('common.import')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {t('common.export')}
          </Button>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                {t('employees.addEmployee')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee
                    ? t('employees.editEmployee')
                    : t('employees.newEmployee')}
                </DialogTitle>
              </DialogHeader>
              <EmployeeForm
                clubId={clubId}
                employee={editingEmployee}
                onClose={handleCloseModal}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('employees.searchPlaceholder')}
                value={filters.search || ''}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="pl-10"
              />
            </div>
            <Select
              value={filters.role || 'all'}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  role: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('employees.allRoles')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('employees.allRoles')}</SelectItem>
                <SelectItem value="instructor">
                  {t('employees.roles.instructor')}
                </SelectItem>
                <SelectItem value="receptionist">
                  {t('employees.roles.receptionist')}
                </SelectItem>
                <SelectItem value="maintenance">
                  {t('employees.roles.maintenance')}
                </SelectItem>
                <SelectItem value="manager">
                  {t('employees.roles.manager')}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={
                filters.is_active === undefined
                  ? 'all'
                  : filters.is_active.toString()
               || ''}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  is_active: value === 'all' ? undefined : value === 'true',
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t('employees.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('employees.allStatuses')}
                </SelectItem>
                <SelectItem value="true">{t('common.active')}</SelectItem>
                <SelectItem value="false">{t('common.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      {data && data.results.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                data={data.results}
                pagination={{
                  page: filters.page || 1,
                  pageSize: filters.page_size || 10,
                  total: data.count,
                  onPageChange: (page) => setFilters({ ...filters, page }),
                }}
              />
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <EmptyState
          icon={Users as any}
          title={t('employees.noEmployees')}
          description={t('employees.noEmployeesDescription')}
          action={{
            label: t('employees.addFirstEmployee'),
            onClick: () => setShowAddModal(true),
          }}
        />
      )}
    </div>
  );
}
