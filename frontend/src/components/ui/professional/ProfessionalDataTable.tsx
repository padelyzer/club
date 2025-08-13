'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { ProfessionalSelect } from './ProfessionalForm';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';

// Column Definition
export interface DataTableColumn<T = any> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (value: any, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

// Table Row Actions
export interface DataTableAction<T = any> {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'destructive';
  onClick: (row: T, index: number) => void;
  disabled?: (row: T, index: number) => boolean;
  hidden?: (row: T, index: number) => boolean;
}

// Pagination Info
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
  totalRows: number;
}

// Professional Data Table Props
interface ProfessionalDataTableProps<T = any> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  actions?: DataTableAction<T>[];
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectedRowsChange?: (rows: T[]) => void;
  emptyMessage?: string;
  className?: string;
}

/**
 * Professional Data Table Component
 * Modern, feature-rich data table with sorting, filtering, pagination, and actions
 */
export function ProfessionalDataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  onPaginationChange,
  actions = [],
  searchable = true,
  filterable = true,
  exportable = true,
  selectable = false,
  selectedRows = [],
  onSelectedRowsChange,
  emptyMessage = 'No hay datos disponibles',
  className,
}: ProfessionalDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  // Filtered and sorted data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchTerm) {
      result = result.filter((row) =>
        columns.some((column) => {
          const value = column.accessorKey ? row[column.accessorKey] : '';
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnId, filterValue]) => {
      if (filterValue) {
        const column = columns.find(col => col.id === columnId);
        if (column?.accessorKey) {
          result = result.filter((row) => {
            const value = String(row[column.accessorKey!]);
            return value.toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const column = columns.find(col => col.id === sortConfig.key);
        if (!column?.accessorKey) return 0;

        const aValue = a[column.accessorKey];
        const bValue = b[column.accessorKey];

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, columnFilters, columns]);

  // Handle sorting
  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable) return;

    setSortConfig(prev => {
      if (prev?.key === columnId) {
        return prev.direction === 'asc' 
          ? { key: columnId, direction: 'desc' }
          : null;
      }
      return { key: columnId, direction: 'asc' };
    });
  };

  // Handle row selection
  const handleRowSelect = (row: T, checked: boolean) => {
    if (!selectable) return;

    const newSelection = checked
      ? [...selectedRows, row]
      : selectedRows.filter(selectedRow => selectedRow !== row);
    
    onSelectedRowsChange?.(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!selectable) return;
    
    onSelectedRowsChange?.(checked ? processedData : []);
  };

  const isRowSelected = (row: T) => selectedRows.includes(row);
  const isAllSelected = selectedRows.length === processedData.length && processedData.length > 0;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < processedData.length;

  // Export functionality
  const handleExport = () => {
    const csvContent = [
      columns.map(col => col.header).join(','),
      ...processedData.map(row =>
        columns.map(col => {
          const value = col.accessorKey ? row[col.accessorKey] : '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Pagination
  const totalPages = pagination ? Math.ceil(pagination.totalRows / pagination.pageSize) : 1;
  const currentPage = pagination ? pagination.pageIndex + 1 : 1;

  const handlePageChange = (newPage: number) => {
    if (!pagination || !onPaginationChange) return;
    
    onPaginationChange({
      ...pagination,
      pageIndex: newPage - 1,
    });
  };

  const handlePageSizeChange = (newPageSize: string) => {
    if (!pagination || !onPaginationChange) return;
    
    onPaginationChange({
      ...pagination,
      pageIndex: 0,
      pageSize: parseInt(newPageSize),
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Table Header - Search, Filters, Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2">
          {searchable && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          )}
          
          {filterable && (
            <Button
              variant="outline"
              leftIcon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtros
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {exportable && (
            <Button
              variant="outline"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              Exportar
            </Button>
          )}
          
          {selectedRows.length > 0 && (
            <div className="px-3 py-2 bg-[#007AFF]/10 text-[#007AFF] rounded-lg text-sm font-medium">
              {selectedRows.length} seleccionados
            </div>
          )}
        </div>
      </div>

      {/* Column Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card variant="subtle" padding="default">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {columns
                  .filter(col => col.filterable)
                  .map((column) => (
                    <div key={column.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {column.header}
                      </label>
                      <Input
                        placeholder={`Filtrar por ${column.header.toLowerCase()}...`}
                        value={columnFilters[column.id] || ''}
                        onChange={(e) => setColumnFilters(prev => ({
                          ...prev,
                          [column.id]: e.target.value
                        }))}
                      />
                    </div>
                  ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <Card variant="default" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {selectable && (
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 text-[#007AFF] bg-white border-gray-300 rounded focus:ring-[#007AFF] focus:ring-2"
                    />
                  </th>
                )}
                
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      column.sortable && 'cursor-pointer hover:bg-gray-100 user-select-none',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.className
                    )}
                    style={{
                      width: column.width,
                      minWidth: column.minWidth,
                      maxWidth: column.maxWidth,
                    }}
                    onClick={() => column.sortable && handleSort(column.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.header}</span>
                      {column.sortable && (
                        <div className="flex flex-col">
                          {sortConfig?.key === column.id ? (
                            sortConfig.direction === 'asc' ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )
                          ) : (
                            <ArrowUpDown className="w-4 h-4 opacity-50" />
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
                
                {actions.length > 0 && (
                  <th className="w-20 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="px-4 py-8">
                    <div className="flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin mr-3" />
                      <span className="text-gray-500">Cargando...</span>
                    </div>
                  </td>
                </tr>
              ) : processedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (selectable ? 1 : 0) + (actions.length > 0 ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                processedData.map((row, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'hover:bg-gray-50 transition-colors',
                      isRowSelected(row) && 'bg-[#007AFF]/5'
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isRowSelected(row)}
                          onChange={(e) => handleRowSelect(row, e.target.checked)}
                          className="w-4 h-4 text-[#007AFF] bg-white border-gray-300 rounded focus:ring-[#007AFF] focus:ring-2"
                        />
                      </td>
                    )}
                    
                    {columns.map((column) => {
                      const value = column.accessorKey ? row[column.accessorKey] : '';
                      const cellContent = column.cell ? column.cell(value, row, index) : String(value);
                      
                      return (
                        <td
                          key={column.id}
                          className={cn(
                            'px-4 py-3 text-sm text-gray-900',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right',
                            column.className
                          )}
                        >
                          {cellContent}
                        </td>
                      );
                    })}
                    
                    {actions.length > 0 && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {actions
                            .filter(action => !action.hidden?.(row, index))
                            .slice(0, 2) // Show first 2 actions directly
                            .map((action) => (
                              <Button
                                key={action.id}
                                variant={
                                  action.variant === 'destructive' ? 'destructive' : 
                                  action.variant === 'primary' ? 'primary' : 'ghost'
                                }
                                size="icon"
                                onClick={() => action.onClick(row, index)}
                                disabled={action.disabled?.(row, index)}
                                className="h-8 w-8"
                              >
                                {action.icon}
                              </Button>
                            ))}
                          
                          {actions.filter(action => !action.hidden?.(row, index)).length > 2 && (
                            <TableRowActions row={row} index={index} actions={actions.slice(2)} />
                          )}
                        </div>
                      </td>
                    )}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Mostrar</span>
            <ProfessionalSelect
              options={[
                { value: '10', label: '10' },
                { value: '25', label: '25' },
                { value: '50', label: '50' },
                { value: '100', label: '100' },
              ]}
              value={String(pagination.pageSize)}
              onChange={handlePageSizeChange}
              className="w-20"
            />
            <span>de {pagination.totalRows} resultados</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8 h-8"
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Table Row Actions Dropdown
interface TableRowActionsProps<T = any> {
  row: T;
  index: number;
  actions: DataTableAction<T>[];
}

function TableRowActions<T>({ row, index, actions }: TableRowActionsProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8"
      >
        <MoreHorizontal className="w-4 h-4" />
      </Button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute top-full right-0 mt-1 z-20"
          >
            <Card variant="elevated" padding="sm" className="shadow-xl border-white/20 min-w-48">
              <div className="space-y-1">
                {actions
                  .filter(action => !action.hidden?.(row, index))
                  .map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onClick(row, index);
                        setIsOpen(false);
                      }}
                      disabled={action.disabled?.(row, index)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        action.variant === 'destructive'
                          ? 'hover:bg-red-50 text-red-600'
                          : 'hover:bg-gray-50 text-gray-700'
                      )}
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </button>
                  ))}
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}

export default ProfessionalDataTable;