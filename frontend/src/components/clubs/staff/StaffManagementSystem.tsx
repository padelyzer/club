'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Shield, 
  Crown,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Settings,
  Key,
  UserCheck,
  UserX
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useClubStaff, useManageClubStaff } from '@/lib/api/hooks/useClubs';
import { useToast } from '@/hooks/use-toast';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: StaffRole;
  status: 'active' | 'inactive' | 'suspended';
  joinDate: string;
  lastActive?: string;
  avatar?: string;
  permissions: Permission[];
  schedule?: WeeklySchedule;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  notes?: string;
}

interface StaffRole {
  id: string;
  name: string;
  level: number; // 1-5, higher = more permissions
  color: string;
  description: string;
  defaultPermissions: string[];
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'general' | 'courts' | 'members' | 'finance' | 'reports' | 'admin';
  level: number; // 1-5
}

interface WeeklySchedule {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
}

interface TimeSlot {
  start: string;
  end: string;
  break?: boolean;
}

interface StaffManagementSystemProps {
  clubId: string;
}

const STAFF_ROLES: StaffRole[] = [
  {
    id: 'owner',
    name: 'Propietario',
    level: 5,
    color: 'purple',
    description: 'Acceso total al sistema',
    defaultPermissions: ['*']
  },
  {
    id: 'manager',
    name: 'Gerente',
    level: 4,
    color: 'blue',
    description: 'Gestión completa del club',
    defaultPermissions: ['manage_staff', 'view_reports', 'manage_courts', 'manage_members']
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    level: 3,
    color: 'green',
    description: 'Supervisión de operaciones diarias',
    defaultPermissions: ['manage_courts', 'view_members', 'create_reports']
  },
  {
    id: 'instructor',
    name: 'Instructor',
    level: 2,
    color: 'amber',
    description: 'Instructor de clases y entrenamientos',
    defaultPermissions: ['manage_classes', 'view_members', 'court_access']
  },
  {
    id: 'receptionist',
    name: 'Recepcionista',
    level: 1,
    color: 'gray',
    description: 'Atención al cliente y operaciones básicas',
    defaultPermissions: ['view_members', 'book_courts', 'basic_reports']
  }
];

const PERMISSIONS: Permission[] = [
  // General
  { id: 'view_dashboard', name: 'Ver Dashboard', description: 'Acceso al panel principal', category: 'general', level: 1 },
  { id: 'system_notifications', name: 'Notificaciones Sistema', description: 'Recibir notificaciones importantes', category: 'general', level: 1 },
  
  // Courts
  { id: 'view_courts', name: 'Ver Canchas', description: 'Ver información de canchas', category: 'courts', level: 1 },
  { id: 'book_courts', name: 'Reservar Canchas', description: 'Crear reservas de canchas', category: 'courts', level: 2 },
  { id: 'manage_courts', name: 'Gestionar Canchas', description: 'Crear, editar y eliminar canchas', category: 'courts', level: 3 },
  { id: 'court_maintenance', name: 'Mantenimiento Canchas', description: 'Marcar canchas en mantenimiento', category: 'courts', level: 2 },
  
  // Members
  { id: 'view_members', name: 'Ver Miembros', description: 'Ver listado de miembros', category: 'members', level: 1 },
  { id: 'manage_members', name: 'Gestionar Miembros', description: 'Crear, editar y eliminar miembros', category: 'members', level: 3 },
  { id: 'member_checkin', name: 'Check-in Miembros', description: 'Registrar entrada de miembros', category: 'members', level: 1 },
  
  // Finance
  { id: 'view_finance', name: 'Ver Finanzas', description: 'Ver información financiera básica', category: 'finance', level: 2 },
  { id: 'manage_payments', name: 'Gestionar Pagos', description: 'Procesar pagos y facturación', category: 'finance', level: 3 },
  { id: 'financial_reports', name: 'Reportes Financieros', description: 'Generar reportes financieros', category: 'finance', level: 4 },
  
  // Reports
  { id: 'basic_reports', name: 'Reportes Básicos', description: 'Generar reportes básicos', category: 'reports', level: 2 },
  { id: 'advanced_reports', name: 'Reportes Avanzados', description: 'Generar reportes detallados', category: 'reports', level: 3 },
  { id: 'export_data', name: 'Exportar Datos', description: 'Exportar información del club', category: 'reports', level: 3 },
  
  // Admin
  { id: 'manage_staff', name: 'Gestionar Personal', description: 'Agregar, editar y eliminar personal', category: 'admin', level: 4 },
  { id: 'system_settings', name: 'Configuración Sistema', description: 'Modificar configuración del club', category: 'admin', level: 5 },
  { id: 'view_audit_log', name: 'Ver Log Auditoría', description: 'Ver historial de cambios', category: 'admin', level: 4 }
];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' }
];

const StaffManagementSystem: React.FC<StaffManagementSystemProps> = ({ clubId }) => {
  const { toast } = useToast();
  const { data: staffData, isLoading } = useClubStaff(clubId);
  const manageStaffMutation = useManageClubStaff();

  const [activeTab, setActiveTab] = useState('staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Mock staff data with the expected structure
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([
    {
      id: '1',
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      email: 'carlos@club.com',
      phone: '+52 55 1234 5678',
      role: STAFF_ROLES[1], // Manager
      status: 'active',
      joinDate: '2024-01-15',
      lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      permissions: PERMISSIONS.filter(p => ['view_dashboard', 'manage_courts', 'view_members', 'basic_reports'].includes(p.id)),
      emergencyContact: {
        name: 'María Rodriguez',
        phone: '+52 55 8765 4321',
        relationship: 'Esposa'
      }
    },
    {
      id: '2',
      firstName: 'Ana',
      lastName: 'Martinez',
      email: 'ana@club.com',
      phone: '+52 55 2345 6789',
      role: STAFF_ROLES[4], // Receptionist
      status: 'active',
      joinDate: '2024-02-10',
      lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      permissions: PERMISSIONS.filter(p => ['view_dashboard', 'view_members', 'book_courts'].includes(p.id))
    },
    {
      id: '3',
      firstName: 'Luis',
      lastName: 'García',
      email: 'luis@club.com',
      role: STAFF_ROLES[3], // Instructor
      status: 'inactive',
      joinDate: '2023-08-20',
      lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      permissions: PERMISSIONS.filter(p => ['view_dashboard', 'view_members', 'court_access'].includes(p.id))
    }
  ]);

  const filteredStaff = staffMembers.filter(staff => {
    const matchesSearch = `${staff.firstName} ${staff.lastName} ${staff.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || staff.role.id === roleFilter;
    const matchesStatus = statusFilter === 'all' || staff.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddStaff = async (staffData: Partial<StaffMember>) => {
    try {
      // In real implementation, this would call the API
      const newStaff: StaffMember = {
        id: `staff-${Date.now()}`,
        firstName: staffData.firstName || '',
        lastName: staffData.lastName || '',
        email: staffData.email || '',
        phone: staffData.phone,
        role: staffData.role || STAFF_ROLES[4],
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        permissions: staffData.permissions || []
      };

      setStaffMembers(prev => [...prev, newStaff]);
      setShowAddStaffModal(false);

      toast({
        title: "Personal Agregado",
        description: `${newStaff.firstName} ${newStaff.lastName} ha sido agregado exitosamente.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error al Agregar Personal",
        description: "No se pudo agregar el miembro del personal. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleEditStaff = async (updatedStaff: StaffMember) => {
    try {
      setStaffMembers(prev => 
        prev.map(staff => staff.id === updatedStaff.id ? updatedStaff : staff)
      );
      setShowEditStaffModal(false);
      setSelectedStaff(null);

      toast({
        title: "Personal Actualizado",
        description: "La información del personal ha sido actualizada.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error al Actualizar",
        description: "No se pudo actualizar la información. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    try {
      setStaffMembers(prev => prev.filter(staff => staff.id !== staffId));
      
      toast({
        title: "Personal Eliminado",
        description: "El miembro del personal ha sido eliminado.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error al Eliminar",
        description: "No se pudo eliminar al miembro del personal.",
        variant: "destructive",
      });
    }
  };

  const toggleStaffStatus = async (staffId: string) => {
    try {
      setStaffMembers(prev => 
        prev.map(staff => {
          if (staff.id === staffId) {
            return {
              ...staff,
              status: staff.status === 'active' ? 'inactive' : 'active'
            };
          }
          return staff;
        })
      );

      toast({
        title: "Estado Actualizado",
        description: "El estado del personal ha sido actualizado.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error al Actualizar Estado",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    }
  };

  const renderStaffOverview = () => {
    const activeStaff = staffMembers.filter(s => s.status === 'active').length;
    const roleDistribution = STAFF_ROLES.map(role => ({
      ...role,
      count: staffMembers.filter(s => s.role.id === role.id).length
    }));

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              title: 'Personal Total',
              value: staffMembers.length.toString(),
              icon: Users,
              color: 'blue'
            },
            {
              title: 'Personal Activo',
              value: activeStaff.toString(),
              icon: UserCheck,
              color: 'green'
            },
            {
              title: 'Personal Inactivo',
              value: (staffMembers.length - activeStaff).toString(),
              icon: UserX,
              color: 'red'
            },
            {
              title: 'Roles Diferentes',
              value: roleDistribution.filter(r => r.count > 0).length.toString(),
              icon: Shield,
              color: 'purple'
            }
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card variant="glass" padding="lg" className="text-center">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${
                  stat.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  stat.color === 'green' ? 'bg-green-100 text-green-600' :
                  stat.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-xs text-gray-600">{stat.title}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar personal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Roles</SelectItem>
                {STAFF_ROLES.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
                <SelectItem value="suspended">Suspendido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => {
                console.log('Exporting staff data');
              }}
            >
              Exportar
            </Button>
            <Button
              onClick={() => setShowAddStaffModal(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Agregar Personal
            </Button>
          </div>
        </div>

        {/* Staff List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredStaff.map((staff) => (
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card variant="glass" padding="lg" className="relative">
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <Badge
                    variant={staff.status === 'active' ? 'default' : 'secondary'}
                    className={
                      staff.status === 'active' ? 'bg-green-100 text-green-800' :
                      staff.status === 'suspended' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-600'
                    }
                  >
                    {staff.status === 'active' ? 'Activo' : 
                     staff.status === 'suspended' ? 'Suspendido' : 'Inactivo'}
                  </Badge>
                </div>

                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={staff.avatar} alt={`${staff.firstName} ${staff.lastName}`} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                      {staff.firstName[0]}{staff.lastName[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {staff.firstName} {staff.lastName}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        className={`text-xs ${
                          staff.role.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                          staff.role.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                          staff.role.color === 'green' ? 'bg-green-100 text-green-800' :
                          staff.role.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {staff.role.id === 'owner' && <Crown className="w-3 h-3 mr-1" />}
                        {staff.role.name}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Desde {new Date(staff.joinDate).toLocaleDateString('es-ES')}</span>
                      </div>
                      {staff.lastActive && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            Activo hace {Math.floor((Date.now() - new Date(staff.lastActive).getTime()) / (1000 * 60 * 60))}h
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-600">
                      {staff.permissions.length} permisos
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setShowPermissionsModal(true);
                      }}
                      leftIcon={<Key className="w-3 h-3" />}
                    >
                      Permisos
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedStaff(staff);
                        setShowEditStaffModal(true);
                      }}
                      leftIcon={<Edit3 className="w-3 h-3" />}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleStaffStatus(staff.id)}
                      leftIcon={staff.status === 'active' ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    >
                      {staff.status === 'active' ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredStaff.length === 0 && (
          <Card variant="glass" padding="lg" className="text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all' 
                ? 'No se encontró personal' 
                : 'Sin personal registrado'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda.'
                : 'Agrega tu primer miembro del personal para comenzar.'}
            </p>
            {!searchQuery && roleFilter === 'all' && statusFilter === 'all' && (
              <Button
                onClick={() => setShowAddStaffModal(true)}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Agregar Primer Personal
              </Button>
            )}
          </Card>
        )}
      </div>
    );
  };

  const renderRolesPermissions = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Roles */}
        <Card variant="glass" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Roles del Personal
          </h3>
          
          <div className="space-y-3">
            {STAFF_ROLES.map((role) => {
              const staffCount = staffMembers.filter(s => s.role.id === role.id).length;
              
              return (
                <div key={role.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        role.color === 'purple' ? 'bg-purple-500' :
                        role.color === 'blue' ? 'bg-blue-500' :
                        role.color === 'green' ? 'bg-green-500' :
                        role.color === 'amber' ? 'bg-amber-500' :
                        'bg-gray-500'
                      }`} />
                      <h4 className="font-medium text-gray-900 flex items-center gap-1">
                        {role.id === 'owner' && <Crown className="w-4 h-4 text-purple-600" />}
                        {role.name}
                      </h4>
                    </div>
                    <Badge variant="secondary">
                      {staffCount} persona{staffCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Nivel {role.level}/5</span>
                    <span className="text-gray-500">
                      {role.defaultPermissions.length === 1 && role.defaultPermissions[0] === '*' 
                        ? 'Todos los permisos'
                        : `${role.defaultPermissions.length} permisos por defecto`
                      }
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Permissions Categories */}
        <Card variant="glass" padding="lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-green-600" />
            Categorías de Permisos
          </h3>
          
          <div className="space-y-3">
            {['general', 'courts', 'members', 'finance', 'reports', 'admin'].map((category) => {
              const categoryPermissions = PERMISSIONS.filter(p => p.category === category);
              const categoryLabels = {
                general: 'General',
                courts: 'Canchas',
                members: 'Miembros',
                finance: 'Finanzas',
                reports: 'Reportes',
                admin: 'Administración'
              };
              
              return (
                <div key={category} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h4>
                    <Badge variant="secondary">
                      {categoryPermissions.length} permisos
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {categoryPermissions.slice(0, 3).map((permission) => (
                      <span 
                        key={permission.id}
                        className="px-2 py-1 bg-white rounded text-xs text-gray-600"
                      >
                        {permission.name}
                      </span>
                    ))}
                    {categoryPermissions.length > 3 && (
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-500">
                        +{categoryPermissions.length - 3} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-48 bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Gestión de Personal
          </h2>
          <p className="text-gray-600">
            Administra el personal del club, roles y permisos
          </p>
        </div>
        
        <Button
          onClick={() => setShowAddStaffModal(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Agregar Personal
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="staff">Personal</TabsTrigger>
          <TabsTrigger value="roles">Roles y Permisos</TabsTrigger>
        </TabsList>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TabsContent value="staff">
            {renderStaffOverview()}
          </TabsContent>

          <TabsContent value="roles">
            {renderRolesPermissions()}
          </TabsContent>
        </motion.div>
      </Tabs>

      {/* Add Staff Modal would go here */}
      {/* Edit Staff Modal would go here */}
      {/* Permissions Modal would go here */}
    </div>
  );
};

export default StaffManagementSystem;