'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  MapPin,
  Clock,
  CreditCard,
  Bell,
  Users,
  Calendar,
  Shield,
  Smartphone,
  Mail,
  Edit,
  Save,
  Building2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/store/auth';
import { useParams } from 'next/navigation';

// Club Settings Configuration Data
const clubSettings = {
  clubInfo: {
    name: 'Demo Club Padelyzer',
    description: 'Club de pádel premium con instalaciones de clase mundial',
    address: {
      street: 'Av. Reforma 123',
      city: 'Ciudad de México',
      state: 'CDMX',
      zipCode: '06600',
      country: 'México',
    },
    contact: {
      phone: '+52 55 1234 5678',
      email: 'info@democlubpadelyzer.com',
      website: 'https://democlubpadelyzer.com',
    },
    socialMedia: {
      facebook: '@democlubpadelyzer',
      instagram: '@democlubpadelyzer',
      twitter: '@democlubpadel',
    },
  },
  clubFeatures: [
    {
      name: 'Online Reservations',
      enabled: true,
      description: 'Reservas online para socios y visitantes',
      icon: Calendar,
    },
    {
      name: 'Mobile App',
      enabled: true,
      description: 'Aplicación móvil del club',
      icon: Smartphone,
    },
    {
      name: 'Tournament Management',
      enabled: true,
      description: 'Gestión de torneos internos',
      icon: Settings,
    },
    {
      name: 'Member Classes',
      enabled: false,
      description: 'Clases y entrenamientos para socios',
      icon: Users,
    },
    {
      name: 'Push Notifications',
      enabled: true,
      description: 'Notificaciones push para la app',
      icon: Bell,
    },
    {
      name: 'Online Payments',
      enabled: true,
      description: 'Pagos online con tarjeta',
      icon: CreditCard,
    },
  ],
  reservationConfig: {
    advanceBookingDays: 14,
    maxReservationsPerUser: 3,
    cancellationHours: 24,
    allowGuestReservations: true,
    requireDeposit: false,
    autoConfirm: true,
  },
  businessHours: {
    monday: { open: '06:00', close: '23:00', closed: false },
    tuesday: { open: '06:00', close: '23:00', closed: false },
    wednesday: { open: '06:00', close: '23:00', closed: false },
    thursday: { open: '06:00', close: '23:00', closed: false },
    friday: { open: '06:00', close: '23:00', closed: false },
    saturday: { open: '07:00', close: '22:00', closed: false },
    sunday: { open: '07:00', close: '22:00', closed: false },
  },
  paymentMethods: [
    { name: 'Credit Card', enabled: true, provider: 'Stripe' },
    { name: 'Debit Card', enabled: true, provider: 'Stripe' },
    { name: 'Cash', enabled: true, provider: 'Manual' },
    { name: 'Bank Transfer', enabled: false, provider: 'Manual' },
  ],
  notifications: {
    reservationConfirmed: true,
    reservationReminder: true,
    reservationCancelled: true,
    tournamentUpdates: true,
    maintenanceAlerts: true,
    promotions: false,
  },
  staff: [
    { name: 'Juan Pérez', role: 'Manager', email: 'juan@club.com', active: true },
    { name: 'María García', role: 'Instructor', email: 'maria@club.com', active: true },
    { name: 'Carlos López', role: 'Maintenance', email: 'carlos@club.com', active: false },
  ],
};

export default function ClubSettingsPage() {
  const { user } = useAuthStore();
  const params = useParams();
  const clubSlug = params['club-slug'] as string;
  const [activeTab, setActiveTab] = useState('general');
  const [isEditing, setIsEditing] = useState(false);

  // Mock access control - in real app, check if user has admin rights for this club
  const hasAccess = true; // TODO: Implement proper club admin check

  const dayNames = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-6 w-6 text-green-600" />
            <span className="text-lg font-semibold text-green-600">Club Settings</span>
          </div>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {clubSettings.clubInfo.name}
              </h1>
              <p className="text-gray-600 mt-1">
                Configure club-specific settings and preferences
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                {isEditing ? 'Cancel' : 'Edit Settings'}
              </Button>
              {isEditing && (
                <Button className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Club Information */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Club Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clubName">Club Name</Label>
                <Input
                  id="clubName"
                  value={clubSettings.clubInfo.name || ''}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={clubSettings.clubInfo.contact.phone || ''}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={clubSettings.clubInfo.description || ''}
                  disabled={!isEditing}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={clubSettings.clubInfo.contact.email || ''}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={clubSettings.clubInfo.contact.website || ''}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Address</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  value={clubSettings.clubInfo.address.street || ''}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={clubSettings.clubInfo.address.city || ''}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={clubSettings.clubInfo.address.zipCode || ''}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={clubSettings.clubInfo.address.state || ''}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Club Features & Business Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Club Features
              </h3>
              <Badge variant="outline">
                {clubSettings.clubFeatures.filter(f => f.enabled).length} Active
              </Badge>
            </div>

            <div className="space-y-4">
              {clubSettings.clubFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Icon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {feature.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <Switch checked={feature.enabled} disabled={!isEditing} />
                  </motion.div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Business Hours
              </h3>
            </div>

            <div className="space-y-3">
              {Object.entries(clubSettings.businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="font-medium text-gray-900 capitalize">
                    {dayNames[day as keyof typeof dayNames]}
                  </span>
                  {hours.closed ? (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      Closed
                    </Badge>
                  ) : (
                    <span className="text-sm text-gray-600">
                      {hours.open} - {hours.close}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Reservation Settings & Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Reservation Settings
              </h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="advanceBooking">Advance Booking (days)</Label>
                  <Input
                    id="advanceBooking"
                    type="number"
                    value={clubSettings.reservationConfig.advanceBookingDays || ''}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxReservations">Max Reservations per User</Label>
                  <Input
                    id="maxReservations"
                    type="number"
                    value={clubSettings.reservationConfig.maxReservationsPerUser || ''}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cancellationHours">Cancellation Hours</Label>
                <Input
                  id="cancellationHours"
                  type="number"
                  value={clubSettings.reservationConfig.cancellationHours || ''}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Allow Guest Reservations</span>
                  <Switch 
                    checked={clubSettings.reservationConfig.allowGuestReservations} 
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Auto-confirm Reservations</span>
                  <Switch 
                    checked={clubSettings.reservationConfig.autoConfirm} 
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Require Deposit</span>
                  <Switch 
                    checked={clubSettings.reservationConfig.requireDeposit} 
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Payment Methods
              </h3>
            </div>

            <div className="space-y-3">
              {clubSettings.paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{method.name}</p>
                    <p className="text-sm text-gray-600">Provider: {method.provider}</p>
                  </div>
                  <Switch checked={method.enabled} disabled={!isEditing} />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Notifications & Staff */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Bell className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Notification Settings
              </h3>
            </div>

            <div className="space-y-3">
              {Object.entries(clubSettings.notifications).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <span className="font-medium text-gray-900 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <Switch checked={enabled} disabled={!isEditing} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Staff Members
              </h3>
            </div>

            <div className="space-y-3">
              {clubSettings.staff.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.role} • {member.email}</p>
                  </div>
                  <Badge variant={member.active ? "default" : "secondary"}>
                    {member.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full mt-4">
              <Users className="h-4 w-4 mr-2" />
              Manage Staff
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}