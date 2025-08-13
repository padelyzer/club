'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  Clock, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Edit3, 
  Save, 
  Plus, 
  Trash2,
  Sun,
  Moon,
  Weekend,
  Star,
  Settings,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Card } from '@/components/ui/professional/Card';
import { Button } from '@/components/ui/professional/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClubPricing, useUpdateClubPricing } from '@/lib/api/hooks/useClubs';
import { useToast } from '@/hooks/use-toast';

interface Court {
  courtId: string;
  courtName: string;
  basePrice: number;
  dynamicPricingEnabled: boolean;
  peakHoursMultiplier: number;
  weekendMultiplier: number;
  specialPricing: SpecialPricingPeriod[];
}

interface SpecialPricingPeriod {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  multiplier: number;
  daysOfWeek: number[]; // 0-6, Sunday = 0
  active: boolean;
}

interface DynamicPricingDashboardProps {
  clubId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom', name: 'Domingo' },
  { value: 1, label: 'Lun', name: 'Lunes' },
  { value: 2, label: 'Mar', name: 'Martes' },
  { value: 3, label: 'Mié', name: 'Miércoles' },
  { value: 4, label: 'Jue', name: 'Jueves' },
  { value: 5, label: 'Vie', name: 'Viernes' },
  { value: 6, label: 'Sáb', name: 'Sábado' }
];

const PRESET_PERIODS = [
  {
    name: 'Horario Premium (18-21h)',
    startTime: '18:00',
    endTime: '21:00',
    multiplier: 1.3,
    daysOfWeek: [1, 2, 3, 4, 5]
  },
  {
    name: 'Fin de Semana',
    startTime: '08:00',
    endTime: '22:00',
    multiplier: 1.2,
    daysOfWeek: [0, 6]
  },
  {
    name: 'Happy Hour (12-15h)',
    startTime: '12:00',
    endTime: '15:00',
    multiplier: 0.8,
    daysOfWeek: [1, 2, 3, 4, 5]
  }
];

const DynamicPricingDashboard: React.FC<DynamicPricingDashboardProps> = ({ clubId }) => {
  const { toast } = useToast();
  const { data: pricingData, isLoading } = useClubPricing(clubId);
  const updatePricingMutation = useUpdateClubPricing();

  const [selectedCourt, setSelectedCourt] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);
  const [showSpecialPricingModal, setShowSpecialPricingModal] = useState(false);
  const [newSpecialPeriod, setNewSpecialPeriod] = useState<Partial<SpecialPricingPeriod>>({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    multiplier: 1.2,
    daysOfWeek: [1, 2, 3, 4, 5],
    active: true
  });

  const courts: Court[] = useMemo(() => {
    if (!pricingData?.courts) return [];
    return pricingData.courts;
  }, [pricingData]);

  useEffect(() => {
    if (courts.length > 0 && !selectedCourt) {
      setSelectedCourt(courts[0].courtId);
    }
  }, [courts, selectedCourt]);

  const selectedCourtData = courts.find(court => court.courtId === selectedCourt);

  // Calculate pricing preview for a given time
  const calculatePrice = (court: Court, hour: number, isWeekend: boolean) => {
    if (!court.dynamicPricingEnabled) return court.basePrice;

    let price = court.basePrice;
    
    // Apply peak hours multiplier (usually 18-21)
    if (hour >= 18 && hour <= 21) {
      price *= court.peakHoursMultiplier;
    }
    
    // Apply weekend multiplier
    if (isWeekend) {
      price *= court.weekendMultiplier;
    }
    
    // Apply special pricing periods
    court.specialPricing?.forEach(period => {
      if (period.active) {
        const startHour = parseInt(period.startTime.split(':')[0]);
        const endHour = parseInt(period.endTime.split(':')[0]);
        
        if (hour >= startHour && hour < endHour) {
          price *= period.multiplier;
        }
      }
    });
    
    return Math.round(price);
  };

  const handleSaveCourtPricing = async (court: Court) => {
    if (!pricingData) return;

    const updatedCourts = courts.map(c => 
      c.courtId === court.courtId ? court : c
    );

    try {
      await updatePricingMutation.mutateAsync({
        clubId,
        pricingData: {
          ...pricingData,
          courts: updatedCourts
        }
      });

      setEditingCourt(null);
      toast({
        title: "Precios Actualizados",
        description: `Los precios de ${court.courtName} han sido actualizados.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error al Actualizar",
        description: "No se pudieron actualizar los precios. Intenta de nuevo.",
        variant: "destructive",
      });
    }
  };

  const addSpecialPricingPeriod = (courtId: string, period: SpecialPricingPeriod) => {
    if (!selectedCourtData) return;
    
    const updatedCourt = {
      ...selectedCourtData,
      specialPricing: [
        ...selectedCourtData.specialPricing,
        { ...period, id: `special-${Date.now()}` }
      ]
    };
    
    handleSaveCourtPricing(updatedCourt);
    setShowSpecialPricingModal(false);
    setNewSpecialPeriod({
      name: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '18:00',
      multiplier: 1.2,
      daysOfWeek: [1, 2, 3, 4, 5],
      active: true
    });
  };

  const removeSpecialPricingPeriod = (courtId: string, periodId: string) => {
    if (!selectedCourtData) return;
    
    const updatedCourt = {
      ...selectedCourtData,
      specialPricing: selectedCourtData.specialPricing.filter(p => p.id !== periodId)
    };
    
    handleSaveCourtPricing(updatedCourt);
  };

  const renderOverview = () => {
    const totalRevenuePotential = courts.reduce((sum, court) => {
      if (!court.dynamicPricingEnabled) return sum + court.basePrice * 8; // 8 hours average
      
      // Calculate potential revenue with dynamic pricing
      let dailyRevenue = 0;
      for (let hour = 6; hour <= 22; hour++) {
        const weekdayPrice = calculatePrice(court, hour, false);
        const weekendPrice = calculatePrice(court, hour, true);
        dailyRevenue += (weekdayPrice * 5 + weekendPrice * 2) / 7; // Average across week
      }
      return sum + dailyRevenue;
    }, 0);

    const enabledCourts = courts.filter(c => c.dynamicPricingEnabled).length;
    const avgIncrease = courts.length > 0 ? 
      (totalRevenuePotential / courts.length / courts[0]?.basePrice - 1) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              title: 'Canchas con Pricing Dinámico',
              value: `${enabledCourts}/${courts.length}`,
              icon: Target,
              color: 'blue'
            },
            {
              title: 'Potencial de Ingresos Diarios',
              value: `$${Math.round(totalRevenuePotential).toLocaleString()}`,
              icon: DollarSign,
              color: 'green'
            },
            {
              title: 'Incremento Promedio',
              value: `${avgIncrease > 0 ? '+' : ''}${Math.round(avgIncrease)}%`,
              icon: avgIncrease > 0 ? TrendingUp : TrendingDown,
              color: avgIncrease > 0 ? 'green' : 'red'
            },
            {
              title: 'Períodos Especiales Activos',
              value: courts.reduce((sum, c) => sum + (c.specialPricing?.filter(p => p.active).length || 0), 0).toString(),
              icon: Calendar,
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

        {/* Courts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {courts.map((court) => (
            <motion.div
              key={court.courtId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card 
                variant="glass" 
                padding="lg"
                className={`cursor-pointer transition-all duration-200 ${
                  selectedCourt === court.courtId ? 'ring-2 ring-blue-300 bg-blue-50/50' : ''
                }`}
                onClick={() => setSelectedCourt(court.courtId)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-600 rounded-full" />
                    {court.courtName}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      court.dynamicPricingEnabled 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {court.dynamicPricingEnabled ? 'Dinámico' : 'Fijo'}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCourt(court);
                      }}
                      leftIcon={<Edit3 className="w-3 h-3" />}
                    >
                      Editar
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Precio Base</span>
                    <span className="font-semibold text-lg text-gray-900">
                      ${court.basePrice}
                    </span>
                  </div>
                  
                  {court.dynamicPricingEnabled && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Horario Premium</span>
                        <span className="font-semibold text-green-600">
                          ${Math.round(court.basePrice * court.peakHoursMultiplier)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Fin de Semana</span>
                        <span className="font-semibold text-blue-600">
                          ${Math.round(court.basePrice * court.weekendMultiplier)}
                        </span>
                      </div>
                    </>
                  )}
                  
                  {court.specialPricing && court.specialPricing.length > 0 && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Períodos Especiales:</p>
                      <div className="flex flex-wrap gap-1">
                        {court.specialPricing
                          .filter(p => p.active)
                          .slice(0, 2)
                          .map((period) => (
                            <div key={period.id} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                              {period.name}
                            </div>
                          ))
                        }
                        {court.specialPricing.filter(p => p.active).length > 2 && (
                          <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{court.specialPricing.filter(p => p.active).length - 2} más
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderPricingEditor = () => {
    if (!selectedCourtData) return null;

    return (
      <div className="space-y-6">
        {/* Court Header */}
        <Card variant="glass" padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{selectedCourtData.courtName}</h3>
              <p className="text-gray-600">Configuración de precios dinámicos</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={selectedCourtData.dynamicPricingEnabled}
                onCheckedChange={(enabled) => {
                  const updatedCourt = { ...selectedCourtData, dynamicPricingEnabled: enabled };
                  handleSaveCourtPricing(updatedCourt);
                }}
              />
              <span className="text-sm text-gray-700">Pricing Dinámico</span>
            </div>
          </div>

          {/* Base Price */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Precio Base por Hora</Label>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <Input
                  type="number"
                  value={selectedCourtData.basePrice}
                  onChange={(e) => {
                    const updatedCourt = { 
                      ...selectedCourtData, 
                      basePrice: parseFloat(e.target.value) || 0 
                    };
                    handleSaveCourtPricing(updatedCourt);
                  }}
                  className="text-lg font-semibold"
                />
              </div>
            </div>

            {selectedCourtData.dynamicPricingEnabled && (
              <>
                <div className="space-y-2">
                  <Label>Multiplicador Horario Premium</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[selectedCourtData.peakHoursMultiplier]}
                      onValueChange={([value]) => {
                        const updatedCourt = { 
                          ...selectedCourtData, 
                          peakHoursMultiplier: value 
                        };
                        handleSaveCourtPricing(updatedCourt);
                      }}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>0.5x</span>
                      <span className="font-semibold">
                        {selectedCourtData.peakHoursMultiplier.toFixed(1)}x 
                        (${Math.round(selectedCourtData.basePrice * selectedCourtData.peakHoursMultiplier)})
                      </span>
                      <span>2.0x</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Multiplicador Fin de Semana</Label>
                  <div className="space-y-2">
                    <Slider
                      value={[selectedCourtData.weekendMultiplier]}
                      onValueChange={([value]) => {
                        const updatedCourt = { 
                          ...selectedCourtData, 
                          weekendMultiplier: value 
                        };
                        handleSaveCourtPricing(updatedCourt);
                      }}
                      min={0.5}
                      max={2.0}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>0.5x</span>
                      <span className="font-semibold">
                        {selectedCourtData.weekendMultiplier.toFixed(1)}x 
                        (${Math.round(selectedCourtData.basePrice * selectedCourtData.weekendMultiplier)})
                      </span>
                      <span>2.0x</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Price Preview */}
        {selectedCourtData.dynamicPricingEnabled && (
          <Card variant="glass" padding="lg">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Vista Previa de Precios
            </h4>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Weekday Schedule */}
              <div>
                <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-1">
                  <Sun className="w-4 h-4" />
                  Lunes - Viernes
                </h5>
                <div className="space-y-2">
                  {Array.from({ length: 17 }, (_, i) => {
                    const hour = 6 + i;
                    const price = calculatePrice(selectedCourtData, hour, false);
                    const isPreferred = hour >= 18 && hour <= 21;
                    
                    return (
                      <div 
                        key={hour}
                        className={`flex justify-between items-center p-2 rounded ${
                          isPreferred ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}
                      >
                        <span className="text-sm">
                          {hour.toString().padStart(2, '0')}:00
                          {isPreferred && <Star className="w-3 h-3 text-green-600 inline ml-1" />}
                        </span>
                        <span className={`font-semibold ${
                          price > selectedCourtData.basePrice ? 'text-green-600' : 
                          price < selectedCourtData.basePrice ? 'text-blue-600' : 
                          'text-gray-900'
                        }`}>
                          ${price}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weekend Schedule */}
              <div>
                <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-1">
                  <Weekend className="w-4 h-4" />
                  Sábado - Domingo
                </h5>
                <div className="space-y-2">
                  {Array.from({ length: 17 }, (_, i) => {
                    const hour = 6 + i;
                    const price = calculatePrice(selectedCourtData, hour, true);
                    const isPreferred = hour >= 18 && hour <= 21;
                    
                    return (
                      <div 
                        key={hour}
                        className={`flex justify-between items-center p-2 rounded ${
                          isPreferred ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                        }`}
                      >
                        <span className="text-sm">
                          {hour.toString().padStart(2, '0')}:00
                          {isPreferred && <Star className="w-3 h-3 text-blue-600 inline ml-1" />}
                        </span>
                        <span className={`font-semibold ${
                          price > selectedCourtData.basePrice ? 'text-green-600' : 
                          price < selectedCourtData.basePrice ? 'text-blue-600' : 
                          'text-gray-900'
                        }`}>
                          ${price}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Special Pricing Periods */}
        <Card variant="glass" padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Períodos de Precio Especial
            </h4>
            
            <Button
              onClick={() => setShowSpecialPricingModal(true)}
              leftIcon={<Plus className="w-4 h-4" />}
              variant="primary"
              size="sm"
            >
              Agregar Período
            </Button>
          </div>

          {selectedCourtData.specialPricing && selectedCourtData.specialPricing.length > 0 ? (
            <div className="space-y-3">
              {selectedCourtData.specialPricing.map((period) => (
                <div 
                  key={period.id}
                  className={`p-4 rounded-lg border ${
                    period.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900 flex items-center gap-2">
                      {period.active ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                      {period.name}
                    </h5>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={period.active}
                        onCheckedChange={(active) => {
                          const updatedCourt = {
                            ...selectedCourtData,
                            specialPricing: selectedCourtData.specialPricing.map(p =>
                              p.id === period.id ? { ...p, active } : p
                            )
                          };
                          handleSaveCourtPricing(updatedCourt);
                        }}
                        size="sm"
                      />
                      <Button
                        onClick={() => removeSpecialPricingPeriod(selectedCourtData.courtId, period.id!)}
                        variant="secondary"
                        size="sm"
                        leftIcon={<Trash2 className="w-3 h-3 text-red-600" />}
                      >
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Fechas</p>
                      <p className="font-medium">
                        {new Date(period.startDate).toLocaleDateString('es-ES')} - {new Date(period.endDate).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Horario</p>
                      <p className="font-medium">{period.startTime} - {period.endTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Multiplicador</p>
                      <p className="font-medium text-blue-600">
                        {period.multiplier.toFixed(1)}x (${Math.round(selectedCourtData.basePrice * period.multiplier)})
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Días</p>
                      <div className="flex gap-1">
                        {DAYS_OF_WEEK.map(day => (
                          <span
                            key={day.value}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                              period.daysOfWeek.includes(day.value) 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {day.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No hay períodos de precio especial configurados</p>
              <p className="text-sm">Agrega períodos para eventos, temporadas altas, descuentos, etc.</p>
            </div>
          )}
        </Card>
      </div>
    );
  };

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
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
            <DollarSign className="w-6 h-6 text-green-600" />
            Pricing Dinámico
          </h2>
          <p className="text-gray-600">
            Optimiza los ingresos con precios inteligentes basados en demanda
          </p>
        </div>
        
        {courts.length > 0 && (
          <Select value={selectedCourt} onValueChange={setSelectedCourt}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {courts.map((court) => (
                <SelectItem key={court.courtId} value={court.courtId}>
                  {court.courtName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="editor">Editor de Precios</TabsTrigger>
        </TabsList>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TabsContent value="overview">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="editor">
            {renderPricingEditor()}
          </TabsContent>
        </motion.div>
      </Tabs>

      {/* Special Pricing Modal */}
      <AnimatePresence>
        {showSpecialPricingModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Nuevo Período de Precio Especial
              </h3>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre del Período</Label>
                    <Input
                      value={newSpecialPeriod.name || ''}
                      onChange={(e) => setNewSpecialPeriod(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ej: Temporada Alta Navideña"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Multiplicador de Precio</Label>
                    <div className="space-y-2">
                      <Slider
                        value={[newSpecialPeriod.multiplier || 1.2]}
                        onValueChange={([value]) => setNewSpecialPeriod(prev => ({ ...prev, multiplier: value }))}
                        min={0.5}
                        max={3.0}
                        step={0.1}
                        className="w-full"
                      />
                      <div className="text-center text-sm text-gray-600">
                        {(newSpecialPeriod.multiplier || 1.2).toFixed(1)}x
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha de Inicio</Label>
                    <Input
                      type="date"
                      value={newSpecialPeriod.startDate || ''}
                      onChange={(e) => setNewSpecialPeriod(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Fin</Label>
                    <Input
                      type="date"
                      value={newSpecialPeriod.endDate || ''}
                      onChange={(e) => setNewSpecialPeriod(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de Inicio</Label>
                    <Input
                      type="time"
                      value={newSpecialPeriod.startTime || ''}
                      onChange={(e) => setNewSpecialPeriod(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de Fin</Label>
                    <Input
                      type="time"
                      value={newSpecialPeriod.endTime || ''}
                      onChange={(e) => setNewSpecialPeriod(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Días de la Semana</Label>
                  <div className="flex gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        onClick={() => {
                          const currentDays = newSpecialPeriod.daysOfWeek || [];
                          const newDays = currentDays.includes(day.value)
                            ? currentDays.filter(d => d !== day.value)
                            : [...currentDays, day.value];
                          setNewSpecialPeriod(prev => ({ ...prev, daysOfWeek: newDays }));
                        }}
                        className={`w-12 h-12 rounded-lg font-medium text-sm transition-colors ${
                          (newSpecialPeriod.daysOfWeek || []).includes(day.value)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Presets Comunes</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {PRESET_PERIODS.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setNewSpecialPeriod(prev => ({
                            ...prev,
                            name: preset.name,
                            startTime: preset.startTime,
                            endTime: preset.endTime,
                            multiplier: preset.multiplier,
                            daysOfWeek: preset.daysOfWeek
                          }));
                        }}
                        className="p-3 text-left bg-gray-50 hover:bg-blue-50 rounded-lg border hover:border-blue-200 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{preset.name}</div>
                        <div className="text-sm text-gray-600">
                          {preset.startTime} - {preset.endTime}, 
                          Multiplicador: {preset.multiplier}x
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8">
                <Button
                  variant="secondary"
                  onClick={() => setShowSpecialPricingModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (newSpecialPeriod.name && selectedCourtData) {
                      addSpecialPricingPeriod(selectedCourtData.courtId, newSpecialPeriod as SpecialPricingPeriod);
                    }
                  }}
                  disabled={!newSpecialPeriod.name}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Agregar Período
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DynamicPricingDashboard;