'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Building2, TrendingUp } from 'lucide-react';

export default function ClubPage() {
  const params = useParams();
  const clubSlug = params['club-slug'] as string;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Club Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Club: {clubSlug}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reservas Hoy</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
              <p className="text-2xl font-bold text-gray-900">256</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Canchas</p>
              <p className="text-2xl font-bold text-gray-900">6</p>
            </div>
            <Building2 className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ingresos Mes</p>
              <p className="text-2xl font-bold text-gray-900">$45,320</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Reservas</h3>
          <p className="text-gray-600 mb-4">Gestiona las reservas del club</p>
          <Button className="w-full">
            Ver Reservas
          </Button>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Clientes</h3>
          <p className="text-gray-600 mb-4">Administra los clientes y visitantes</p>
          <Button className="w-full">
            Ver Clientes
          </Button>
        </Card>
        
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Canchas</h3>
          <p className="text-gray-600 mb-4">Configura las canchas y horarios</p>
          <Button className="w-full">
            Ver Canchas
          </Button>
        </Card>
      </div>
    </div>
  );
}