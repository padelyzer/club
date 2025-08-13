'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, TrendingUp, Users, Star, MapPin, 
  Zap, Shield, X, Plus, ArrowRight, Target,
  Trophy, Clock, DollarSign, Activity, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClubUI } from '@/types/club-unified';

/**
 * Club Comparison Dashboard
 * Advanced multi-club comparison with visual analytics
 */

interface ClubComparisonDashboardProps {
  availableClubs: ClubUI[];
  initialClubs?: ClubUI[];
  maxComparisons?: number;
  onClose?: () => void;
  className?: string;
}

interface ComparisonMetric {
  key: string;
  label: string;
  icon: any;
  format: (value: any) => string;
  getValue: (club: ClubUI) => number | string;
  type: 'number' | 'rating' | 'percentage' | 'currency' | 'growth';
  category: 'stats' | 'features' | 'location' | 'quality';
}

const comparisonMetrics: ComparisonMetric[] = [
  // Stats Category
  {
    key: 'members',
    label: 'Total Miembros',
    icon: Users,
    format: (value) => value.toLocaleString(),
    getValue: (club) => club.stats.members.total,
    type: 'number',
    category: 'stats'
  },
  {
    key: 'active_members',
    label: 'Miembros Activos',
    icon: Activity,
    format: (value) => value.toLocaleString(),
    getValue: (club) => club.stats.members.active,
    type: 'number',
    category: 'stats'
  },
  {
    key: 'growth',
    label: 'Crecimiento',
    icon: TrendingUp,
    format: (value) => `+${value}%`,
    getValue: (club) => club.stats.members.growth,
    type: 'growth',
    category: 'stats'
  },
  {
    key: 'occupancy',
    label: 'Ocupación Promedio',
    icon: BarChart3,
    format: (value) => `${value}%`,
    getValue: (club) => club.stats.occupancy.average,
    type: 'percentage',
    category: 'stats'
  },
  {
    key: 'revenue',
    label: 'Ingresos Mensuales',
    icon: DollarSign,
    format: (value) => `€${value.toLocaleString()}`,
    getValue: (club) => club.stats.revenue.monthly,
    type: 'currency',
    category: 'stats'
  },
  
  // Quality Category
  {
    key: 'rating',
    label: 'Valoración',
    icon: Star,
    format: (value) => `${value}/5`,
    getValue: (club) => club.stats.rating.value,
    type: 'rating',
    category: 'quality'
  },
  {
    key: 'rating_count',
    label: 'Número de Reviews',
    icon: Trophy,
    format: (value) => value.toLocaleString(),
    getValue: (club) => club.stats.rating.count,
    type: 'number',
    category: 'quality'
  },
  
  // Features Category
  {
    key: 'features_count',
    label: 'Instalaciones',
    icon: Zap,
    format: (value) => `${value} servicios`,
    getValue: (club) => club.features.length,
    type: 'number',
    category: 'features'
  },
  {
    key: 'services_count',
    label: 'Servicios Activos',
    icon: Target,
    format: (value) => `${value} disponibles`,
    getValue: (club) => club.services.filter(s => s.available).length,
    type: 'number',
    category: 'features'
  }
];

const tierScores = {
  basic: 1,
  premium: 2,
  elite: 3
};

export const ClubComparisonDashboard: React.FC<ClubComparisonDashboardProps> = ({
  availableClubs,
  initialClubs = [],
  maxComparisons = 4,
  onClose,
  className
}) => {
  const [selectedClubs, setSelectedClubs] = useState<ClubUI[]>(initialClubs);
  const [activeCategory, setActiveCategory] = useState<'all' | 'stats' | 'features' | 'location' | 'quality'>('all');
  const [showAddClub, setShowAddClub] = useState(false);

  // Filter metrics by category
  const filteredMetrics = useMemo(() => {
    if (activeCategory === 'all') return comparisonMetrics;
    return comparisonMetrics.filter(metric => metric.category === activeCategory);
  }, [activeCategory]);

  // Calculate comparison insights
  const insights = useMemo(() => {
    if (selectedClubs.length < 2) return null;

    const insights = [];
    
    // Best in each category
    comparisonMetrics.forEach(metric => {
      const values = selectedClubs.map(club => ({
        club,
        value: metric.getValue(club) as number
      }));
      
      const best = values.reduce((prev, curr) => 
        curr.value > prev.value ? curr : prev
      );
      
      insights.push({
        metric: metric.label,
        club: best.club,
        value: metric.format(best.value),
        icon: metric.icon
      });
    });

    return insights;
  }, [selectedClubs]);

  const addClub = (club: ClubUI) => {
    if (selectedClubs.length < maxComparisons && !selectedClubs.find(c => c.id === club.id)) {
      setSelectedClubs([...selectedClubs, club]);
      setShowAddClub(false);
    }
  };

  const removeClub = (clubId: string) => {
    setSelectedClubs(selectedClubs.filter(c => c.id !== clubId));
  };

  const getMetricColor = (value: number, metric: ComparisonMetric, allValues: number[]) => {
    const max = Math.max(...allValues);
    const min = Math.min(...allValues);
    const normalized = max === min ? 1 : (value - min) / (max - min);
    
    if (normalized >= 0.8) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (normalized >= 0.6) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    if (normalized >= 0.4) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn("fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4", className)}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="w-full max-w-7xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Comparación de Clubes
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Analiza y compara hasta {maxComparisons} clubes simultáneamente
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-88px)]">
          {/* Sidebar */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {/* Category Filters */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Categorías
              </h3>
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'Todas', icon: Sparkles },
                  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
                  { id: 'quality', label: 'Calidad', icon: Star },
                  { id: 'features', label: 'Servicios', icon: Zap },
                ].map(category => (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id as any)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-200",
                      activeCategory === category.id
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    <category.icon className="w-4 h-4" />
                    {category.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Clubs */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Clubes Seleccionados ({selectedClubs.length}/{maxComparisons})
                </h3>
                {selectedClubs.length < maxComparisons && (
                  <button
                    onClick={() => setShowAddClub(true)}
                    className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {selectedClubs.map((club, index) => (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      index === 0 ? "bg-blue-500" :
                      index === 1 ? "bg-green-500" :
                      index === 2 ? "bg-purple-500" : "bg-orange-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {club.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {club.location.city}
                      </div>
                    </div>
                    <button
                      onClick={() => removeClub(club.id)}
                      className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center hover:scale-105 transition-transform"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                ))}
              </div>

              {selectedClubs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Selecciona clubes para comparar</p>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {selectedClubs.length >= 2 ? (
              <div className="p-6 space-y-8">
                {/* Comparison Table */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <th className="text-left p-4 font-semibold text-gray-900 dark:text-white">
                            Métrica
                          </th>
                          {selectedClubs.map((club, index) => (
                            <th key={club.id} className="text-center p-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className={cn(
                                  "w-3 h-3 rounded-full",
                                  index === 0 ? "bg-blue-500" :
                                  index === 1 ? "bg-green-500" :
                                  index === 2 ? "bg-purple-500" : "bg-orange-500"
                                )} />
                                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                                  {club.name}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {club.location.city}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMetrics.map((metric) => {
                          const values = selectedClubs.map(club => metric.getValue(club) as number);
                          const maxValue = Math.max(...values);
                          
                          return (
                            <tr key={metric.key} className="border-t border-gray-100 dark:border-gray-700">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <metric.icon className="w-5 h-5 text-gray-400" />
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {metric.label}
                                  </span>
                                </div>
                              </td>
                              {selectedClubs.map((club, index) => {
                                const value = metric.getValue(club) as number;
                                const isMax = value === maxValue && values.some(v => v !== maxValue);
                                
                                return (
                                  <td key={club.id} className="text-center p-4">
                                    <div className={cn(
                                      "inline-flex items-center gap-2 px-3 py-2 rounded-xl font-semibold",
                                      isMax 
                                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                        : getMetricColor(value, metric, values)
                                    )}>
                                      {isMax && <Trophy className="w-4 h-4" />}
                                      {metric.format(value)}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Insights */}
                {insights && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      Insights de Comparación
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {insights.slice(0, 6).map((insight, index) => (
                        <motion.div
                          key={insight.metric}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.1 }}
                          className="bg-white dark:bg-gray-800 rounded-xl p-4"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <insight.icon className="w-5 h-5 text-indigo-600" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              Mejor en {insight.metric}
                            </span>
                          </div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {insight.club.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {insight.value}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Selecciona al menos 2 clubes
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Añade clubes a la comparación para ver un análisis detallado de sus métricas y características.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Club Modal */}
        <AnimatePresence>
          {showAddClub && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
              onClick={() => setShowAddClub(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Añadir Club a la Comparación
                  </h3>
                </div>
                <div className="max-h-96 overflow-y-auto p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableClubs
                      .filter(club => !selectedClubs.find(c => c.id === club.id))
                      .map(club => (
                        <motion.button
                          key={club.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => addClub(club)}
                          className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                        >
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold",
                            club.tier === 'elite' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' :
                            club.tier === 'premium' ? 'bg-gradient-to-br from-purple-500 to-pink-600' :
                            'bg-gradient-to-br from-gray-500 to-gray-600'
                          )}>
                            {club.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {club.name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {club.location.city}
                              <Star className="w-4 h-4 text-yellow-500 ml-2" />
                              {club.stats.rating.value}
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </motion.button>
                      ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};