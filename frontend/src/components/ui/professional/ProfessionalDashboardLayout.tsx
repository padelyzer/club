'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { professionalDesignSystem } from '@/styles/professional-design-system';

interface ProfessionalDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  className?: string;
}

/**
 * Professional Dashboard Layout Component
 * Provides consistent layout structure with modern design
 */
export const ProfessionalDashboardLayout: React.FC<ProfessionalDashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  headerActions,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}>
      {/* Header Section */}
      {(title || subtitle || headerActions) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 px-4 md:px-6 pt-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {(title || subtitle) && (
              <div>
                {title && (
                  <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-gray-600 text-lg">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            
            {headerActions && (
              <div className="flex items-center gap-3">
                {headerActions}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4 md:px-6 pb-6"
      >
        {children}
      </motion.div>
    </div>
  );
};

/**
 * Professional Stats Grid Component
 * For displaying key metrics with consistent styling
 */
interface ProfessionalStatsGridProps {
  stats: Array<{
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon?: React.ReactNode;
    loading?: boolean;
    color?: string;
  }>;
  columns?: 2 | 3 | 4;
}

export const ProfessionalStatsGrid: React.FC<ProfessionalStatsGridProps> = ({
  stats,
  columns = 4,
}) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
      }}
      className={`grid ${gridCols[columns]} gap-6 mb-8`}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          variants={{
            hidden: { opacity: 0, y: 20, scale: 0.95 },
            visible: { 
              opacity: 1, 
              y: 0,
              scale: 1,
              transition: { duration: 0.5 }
            }
          }}
          whileHover={{ scale: 1.02 }}
        >
          <Card 
            variant="glass" 
            padding="lg"
            className="group transition-all duration-300 hover:shadow-xl hover:shadow-black/10 border-white/20 backdrop-blur-xl relative overflow-hidden"
          >
            {/* Loading Overlay */}
            {stat.loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              {stat.icon && (
                <div className={`p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform ${
                  stat.color || 'bg-gradient-to-br from-[#007AFF] to-[#4299E1]'
                }`}>
                  <div className="w-6 h-6 text-white flex items-center justify-center">
                    {stat.icon}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">
                {stat.value}
              </h3>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {stat.title}
              </p>
              {stat.change && (
                <p className={`text-sm ${
                  stat.changeType === 'positive' 
                    ? 'text-green-600' 
                    : stat.changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}>
                  {stat.change}
                </p>
              )}
            </div>

            {/* Hover Effect Overlay */}
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 bg-gradient-to-br from-[#007AFF]/5 to-purple-500/5 transition-opacity duration-300 pointer-events-none" />
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

/**
 * Professional Quick Actions Component
 * For displaying action buttons with consistent styling
 */
interface ProfessionalQuickActionsProps {
  title?: string;
  actions: Array<{
    title: string;
    description?: string;
    icon?: React.ReactNode;
    onClick: () => void;
    color?: string;
    disabled?: boolean;
  }>;
}

export const ProfessionalQuickActions: React.FC<ProfessionalQuickActionsProps> = ({
  title = "Acciones Rápidas",
  actions,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="mb-8"
    >
      <Card variant="glass" padding="lg" className="backdrop-blur-xl border-white/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#007AFF] to-[#4299E1]">
            <div className="w-5 h-5 text-white flex items-center justify-center">
              ⚡
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled}
              className="h-16 px-4 bg-white/60 hover:bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 transition-all duration-200 flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {action.icon && (
                <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${
                  action.color || 'bg-[#007AFF]'
                }`}>
                  <div className="w-5 h-5 text-white flex items-center justify-center">
                    {action.icon}
                  </div>
                </div>
              )}
              <div className="text-left flex-1">
                <p className="font-semibold text-gray-900">{action.title}</p>
                {action.description && (
                  <p className="text-sm text-gray-600 truncate">{action.description}</p>
                )}
              </div>
              <div className="w-4 h-4 text-gray-400 group-hover:text-[#007AFF] transition-colors">
                →
              </div>
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

/**
 * Professional Content Grid Component
 * For displaying content in a consistent grid layout
 */
interface ProfessionalContentGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
  gap?: 4 | 6 | 8;
}

export const ProfessionalContentGrid: React.FC<ProfessionalContentGridProps> = ({
  children,
  columns = 2,
  gap = 6,
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
  };

  const gapClass = {
    4: 'gap-4',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className={`grid ${gridCols[columns]} ${gapClass[gap]}`}
    >
      {children}
    </motion.div>
  );
};

export default ProfessionalDashboardLayout;