'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Navigation,
  Maximize2,
  Minimize2,
  Building2,
  Target,
  Users,
  Activity
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';

interface Location {
  id: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  isMainLocation: boolean;
  status: 'active' | 'inactive' | 'maintenance';
  totalCourts: number;
  activeCourts: number;
  totalMembers: number;
  occupancyRate: number;
}

interface MapViewProps {
  locations: Location[];
  activeLocationId: string;
  onLocationSelect: (locationId: string) => void;
}

// Mock map component since we don't have react-leaflet installed
const MockMapContainer: React.FC<{
  locations: Location[];
  activeLocationId: string;
  onLocationSelect: (locationId: string) => void;
  isFullscreen: boolean;
}> = ({ locations, activeLocationId, onLocationSelect, isFullscreen }) => {
  const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 }); // Default to NYC

  // Calculate center from locations with coordinates
  const mapCenter = useMemo(() => {
    const locationsWithCoords = locations.filter(loc => loc.latitude && loc.longitude);
    if (locationsWithCoords.length === 0) return center;

    const avgLat = locationsWithCoords.reduce((sum, loc) => sum + (loc.latitude || 0), 0) / locationsWithCoords.length;
    const avgLng = locationsWithCoords.reduce((sum, loc) => sum + (loc.longitude || 0), 0) / locationsWithCoords.length;

    return { lat: avgLat, lng: avgLng };
  }, [locations, center]);

  return (
    <div className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-xl overflow-hidden">
      {/* Map Placeholder */}
      <div className={`relative ${isFullscreen ? 'h-[80vh]' : 'h-96'} flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100`}>
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Center Indicator */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-blue-600 rounded-full shadow-lg animate-pulse" />
        </div>

        {/* Location Markers */}
        {locations.map((location, index) => {
          const angle = (index / locations.length) * 2 * Math.PI;
          const radius = isFullscreen ? 120 : 80;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <motion.button
              key={location.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 group ${
                activeLocationId === location.id ? 'z-20' : 'z-10'
              }`}
              style={{
                left: '50%',
                top: '50%',
                transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`
              }}
              onClick={() => onLocationSelect(location.id)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Marker */}
              <div className={`relative ${activeLocationId === location.id ? 'z-20' : 'z-10'}`}>
                <div className={`
                  w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-all duration-200
                  ${activeLocationId === location.id 
                    ? 'bg-blue-600 text-white ring-4 ring-blue-200 scale-110' 
                    : location.status === 'active' ? 'bg-green-500 text-white hover:bg-green-600'
                    : location.status === 'maintenance' ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-gray-400 text-white hover:bg-gray-500'
                  }
                `}>
                  <Building2 className="w-5 h-5" />
                </div>
                
                {/* Pulse effect for active location */}
                {activeLocationId === location.id && (
                  <div className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-30" />
                )}
              </div>

              {/* Tooltip */}
              <div className={`
                absolute top-full left-1/2 transform -translate-x-1/2 mt-2
                bg-white rounded-lg shadow-xl p-3 min-w-48
                opacity-0 group-hover:opacity-100 transition-all duration-200
                pointer-events-none border border-gray-200
                ${activeLocationId === location.id ? 'opacity-100' : ''}
              `}>
                <div className="text-left">
                  <h4 className="font-semibold text-gray-900 mb-1 flex items-center gap-1">
                    {location.name}
                    {location.isMainLocation && (
                      <span className="text-xs text-amber-600">★</span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">{location.address}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-green-600" />
                      <span>{location.activeCourts}/{location.totalCourts}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-blue-600" />
                      <span>{location.totalMembers}</span>
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                      <Activity className="w-3 h-3 text-purple-600" />
                      <span>{location.occupancyRate}% ocupación</span>
                    </div>
                  </div>
                </div>
                
                {/* Tooltip arrow */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t border-gray-200 rotate-45" />
              </div>
            </motion.button>
          );
        })}

        {/* Map Controls */}
        <div className="absolute top-4 left-4 space-y-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Navigation className="w-4 h-4" />}
            onClick={() => {
              // Center map on locations
              console.log('Centering map on locations');
            }}
          >
            Centrar
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
          <h5 className="font-semibold text-gray-900 mb-2 text-sm">Estado</h5>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Activa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
              <span>Mantenimiento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <span>Inactiva</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              <span>Seleccionada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MapView: React.FC<MapViewProps> = ({ locations, activeLocationId, onLocationSelect }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const locationsWithCoords = locations.filter(loc => loc.latitude && loc.longitude);
  const locationsWithoutCoords = locations.filter(loc => !loc.latitude || !loc.longitude);

  return (
    <div className="space-y-6">
      {/* Map Container */}
      <Card variant="glass" padding="none" className={`relative ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
        <div className="relative">
          {/* Map Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Mapa de Ubicaciones
              </h3>
              <p className="text-sm text-gray-600">
                {locationsWithCoords.length} de {locations.length} ubicaciones con coordenadas
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                leftIcon={isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              >
                {isFullscreen ? 'Minimizar' : 'Pantalla Completa'}
              </Button>
            </div>
          </div>

          {/* Map Content */}
          <MockMapContainer
            locations={locationsWithCoords}
            activeLocationId={activeLocationId}
            onLocationSelect={onLocationSelect}
            isFullscreen={isFullscreen}
          />
        </div>

        {/* Fullscreen overlay */}
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsFullscreen(false)}
          />
        )}
      </Card>

      {/* Locations without coordinates */}
      {locationsWithoutCoords.length > 0 && (
        <Card variant="glass" padding="lg">
          <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-600" />
            Ubicaciones sin Coordenadas
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Estas ubicaciones no aparecen en el mapa porque no tienen coordenadas GPS configuradas.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {locationsWithoutCoords.map((location) => (
              <motion.button
                key={location.id}
                onClick={() => onLocationSelect(location.id)}
                className={`
                  p-4 rounded-xl text-left transition-all duration-200 border-2
                  ${activeLocationId === location.id
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-medium text-gray-900 flex items-center gap-1">
                    {location.name}
                    {location.isMainLocation && <span className="text-amber-600 text-xs">★</span>}
                  </h5>
                  <div className={`w-2 h-2 rounded-full ${
                    location.status === 'active' ? 'bg-green-400' :
                    location.status === 'maintenance' ? 'bg-amber-400' :
                    'bg-gray-400'
                  }`} />
                </div>
                <p className="text-sm text-gray-600 mb-3">{location.address}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {location.activeCourts}/{location.totalCourts}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {location.totalMembers}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    {location.occupancyRate}%
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Tip:</strong> Agrega coordenadas GPS para mostrar estas ubicaciones en el mapa.
              Puedes obtenerlas desde Google Maps o configurarlas en la sección de configuración de cada ubicación.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MapView;