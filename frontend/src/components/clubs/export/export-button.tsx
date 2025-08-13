'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, FileText, Table, FileSpreadsheet, 
  Code, ChevronDown, CheckCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClubUI } from '@/types/club-unified';
import { CustomList } from '@/lib/stores/favorites-store';
import { ExportModal } from './export-modal';
import DataExporter, { ExportFormat } from '@/lib/export/data-exporter';

/**
 * Export Button Component
 * Quick export with dropdown and full modal options
 */

interface ExportButtonProps {
  clubs: ClubUI[];
  favorites?: string[];
  customLists?: CustomList[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'minimal';
  showLabel?: boolean;
  quickFormats?: ExportFormat[];
}

const quickExportFormats: Array<{
  format: ExportFormat;
  name: string;
  icon: any;
  description: string;
}> = [
  {
    format: 'json',
    name: 'JSON',
    icon: Code,
    description: 'Datos estructurados'
  },
  {
    format: 'csv',
    name: 'CSV',
    icon: Table,
    description: 'Para Excel'
  },
  {
    format: 'pdf',
    name: 'PDF',
    icon: FileText,
    description: 'Documento'
  }
];

export const ExportButton: React.FC<ExportButtonProps> = ({
  clubs,
  favorites = [],
  customLists = [],
  className,
  size = 'md',
  variant = 'primary',
  showLabel = true,
  quickFormats = ['json', 'csv']
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [exportSuccess, setExportSuccess] = useState<ExportFormat | null>(null);

  const exporter = DataExporter.getInstance();

  const sizes = {
    sm: { button: 'px-3 py-1.5 text-sm', icon: 'w-4 h-4' },
    md: { button: 'px-4 py-2 text-sm', icon: 'w-5 h-5' },
    lg: { button: 'px-6 py-3 text-base', icon: 'w-6 h-6' }
  };

  const variants = {
    primary: 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:shadow-lg shadow-green-500/25',
    secondary: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700',
    minimal: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
  };

  // Quick export function
  const handleQuickExport = async (format: ExportFormat) => {
    setIsExporting(format);
    setShowDropdown(false);
    
    try {
      const exportData = {
        clubs,
        favorites,
        customLists,
        metadata: {
          exportDate: new Date(),
          totalClubs: clubs.length,
          totalFavorites: favorites.length,
          totalLists: customLists.length,
          exportedBy: 'Padelyzer User',
          version: '1.0.0'
        }
      };

      const options = {
        format,
        includeMetadata: true,
        includeStats: true,
        includeImages: false
      };

      const blob = await exporter.exportData(exportData, options);
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `padelyzer-clubes-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(format);
      setTimeout(() => setExportSuccess(null), 2000);
    } catch (error) {
      // Handle export error silently in production
    } finally {
      setIsExporting(null);
    }
  };

  const filteredQuickFormats = quickExportFormats.filter(f => 
    quickFormats.includes(f.format)
  );

  return (
    <>
      <div className={cn("relative", className)}>
        {/* Main Button */}
        <div className="flex">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className={cn(
              "rounded-l-xl font-medium transition-all duration-200 flex items-center gap-2",
              sizes[size].button,
              variants[variant],
              !showLabel && "rounded-xl"
            )}
          >
            {isExporting ? (
              <Loader2 className={cn(sizes[size].icon, "animate-spin")} />
            ) : exportSuccess ? (
              <CheckCircle className={cn(sizes[size].icon, "text-green-400")} />
            ) : (
              <Download className={sizes[size].icon} />
            )}
            
            {showLabel && (
              <span>
                {isExporting ? 'Exportando...' : 
                 exportSuccess ? '¡Listo!' : 
                 'Exportar'}
              </span>
            )}
          </motion.button>

          {/* Dropdown Toggle */}
          {quickFormats.length > 0 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowDropdown(!showDropdown)}
              className={cn(
                "border-l border-white/20 rounded-r-xl font-medium transition-all duration-200 flex items-center justify-center",
                "px-2",
                sizes[size].button.includes('py-1.5') ? 'py-1.5' : 
                sizes[size].button.includes('py-2') ? 'py-2' : 'py-3',
                variants[variant]
              )}
            >
              <ChevronDown className={cn(
                sizes[size].icon,
                showDropdown && "rotate-180",
                "transition-transform duration-200"
              )} />
            </motion.button>
          )}
        </div>

        {/* Quick Export Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              
              {/* Dropdown Menu */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute top-full mt-2 right-0 z-50 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-3">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Exportación Rápida
                  </div>
                  
                  <div className="space-y-1">
                    {filteredQuickFormats.map(format => {
                      const Icon = format.icon;
                      const isCurrentlyExporting = isExporting === format.format;
                      const isCurrentlySuccess = exportSuccess === format.format;
                      
                      return (
                        <motion.button
                          key={format.format}
                          whileHover={{ x: 2 }}
                          onClick={() => handleQuickExport(format.format)}
                          disabled={isCurrentlyExporting}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200",
                            isCurrentlyExporting
                              ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                              : isCurrentlySuccess
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                              : "hover:bg-gray-100 dark:hover:bg-gray-700"
                          )}
                        >
                          {isCurrentlyExporting ? (
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          ) : isCurrentlySuccess ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                          
                          <div>
                            <div className="font-medium text-sm">
                              {isCurrentlyExporting ? 'Exportando...' :
                               isCurrentlySuccess ? '¡Completado!' :
                               format.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {format.description}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        setShowModal(true);
                      }}
                      className="w-full flex items-center gap-2 p-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Más opciones...
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Full Export Modal */}
      <AnimatePresence>
        {showModal && (
          <ExportModal
            clubs={clubs}
            favorites={favorites}
            customLists={customLists}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

/**
 * Simple Export Button
 * Basic export button without dropdown
 */
interface SimpleExportButtonProps {
  clubs: ClubUI[];
  format?: ExportFormat;
  className?: string;
  children?: React.ReactNode;
}

export const SimpleExportButton: React.FC<SimpleExportButtonProps> = ({
  clubs,
  format = 'json',
  className,
  children
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const exporter = DataExporter.getInstance();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const exportData = {
        clubs,
        favorites: [],
        customLists: [],
        metadata: {
          exportDate: new Date(),
          totalClubs: clubs.length,
          totalFavorites: 0,
          totalLists: 0,
          exportedBy: 'Padelyzer User',
          version: '1.0.0'
        }
      };

      const options = {
        format,
        includeMetadata: true,
        includeStats: true,
        includeImages: false
      };

      const blob = await exporter.exportData(exportData, options);
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `padelyzer-clubes-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2000);
    } catch (error) {
      // Handle export error silently in production
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleExport}
      disabled={isExporting}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-200",
        isExporting
          ? "bg-gray-400 text-white cursor-not-allowed"
          : exportSuccess
          ? "bg-green-500 text-white"
          : "bg-indigo-600 text-white hover:bg-indigo-700",
        className
      )}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : exportSuccess ? (
        <CheckCircle className="w-4 h-4" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      
      {children || (
        <span>
          {isExporting ? 'Exportando...' : 
           exportSuccess ? '¡Listo!' : 
           'Exportar'}
        </span>
      )}
    </motion.button>
  );
};