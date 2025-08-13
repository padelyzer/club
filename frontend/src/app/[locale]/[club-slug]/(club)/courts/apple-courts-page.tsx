'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus,
  Search,
  Home,
  MapPin,
  Filter,
  Grid3X3,
  List,
  Zap,
  Flame,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useCourts } from '@/lib/api/hooks/useCourts';
import { Court } from '@/types/court';
import { AppleCourtForm } from '@/components/courts/apple-court-form';
import { AppleCourtCard } from '@/components/courts/apple-court-card';

type ViewMode = 'grid' | 'list';

interface CourtsPageState {
  showForm: boolean;
  editingCourt: Court | null;
  viewMode: ViewMode;
  searchQuery: string;
  filterStatus: 'all' | 'available' | 'maintenance' | 'inactive';
}

export default function AppleCourtsPage() {
  const [state, setState] = useState<CourtsPageState>({
    showForm: false,
    editingCourt: null,
    viewMode: 'grid',
    searchQuery: '',
    filterStatus: 'all',
  });

  const { data, isLoading } = useCourts();
  const courts = (data as any)?.results || [];

  // Filter courts based on search and status
  const filteredCourts = // eslint-disable-next-line react-hooks/exhaustive-deps
 useMemo(() => {
    return courts.filter((court: Court) => {
      const matchesSearch = court.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
                          court.surface_type_display?.toLowerCase().includes(state.searchQuery.toLowerCase());
      
      const matchesFilter = state.filterStatus === 'all' ||
                          (state.filterStatus === 'available' && court.is_active && !court.is_maintenance) ||
                          (state.filterStatus === 'maintenance' && court.is_maintenance) ||
                          (state.filterStatus === 'inactive' && !court.is_active);
      
      return matchesSearch && matchesFilter;
    });
  }, [courts, state.searchQuery, state.filterStatus]);

  // Calculate statistics
  const stats = // eslint-disable-next-line react-hooks/exhaustive-deps
 useMemo(() => {
    const total = courts.length;
    const available = courts.filter((c: Court) => c.is_active && !c.is_maintenance).length;
    const maintenance = courts.filter((c: Court) => c.is_maintenance).length;
    const withLighting = courts.filter((c: Court) => c.has_lighting).length;
    
    return { total, available, maintenance, withLighting };
  }, [courts]);

  const handleCreateCourt = () => {
    setState(prev => ({
      ...prev,
      showForm: true,
      editingCourt: null,
    }));
  };

  const handleEditCourt = (court: Court) => {
    setState(prev => ({
      ...prev,
      showForm: true,
      editingCourt: court,
    }));
  };

  const handleCloseForm = () => {
    setState(prev => ({
      ...prev,
      showForm: false,
      editingCourt: null,
    }));
  };

  const toggleViewMode = () => {
    setState(prev => ({
      ...prev,
      viewMode: prev.viewMode === 'grid' ? 'list' : 'grid',
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Apple-style Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 backdrop-blur-xl bg-white/90">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Canchas
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                  Gestiona las instalaciones de tu club
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleViewMode}
                className="rounded-xl"
              >
                {state.viewMode === 'grid' ? (
                  <List className="w-4 h-4" />
                ) : (
                  <Grid3X3 className="w-4 h-4" />
                )}
              </Button>
              
              <Button
                onClick={handleCreateCourt}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cancha
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="search"
                placeholder="Buscar canchas..."
                value={state.searchQuery}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="pl-10 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'available', 'maintenance', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setState(prev => ({ ...prev, filterStatus: status }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    state.filterStatus === status
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' && 'Todas'}
                  {status === 'available' && 'Disponibles'}
                  {status === 'maintenance' && 'Mantenimiento'}
                  {status === 'inactive' && 'Inactivas'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total Canchas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Home className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl p-4 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Disponibles</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{stats.available}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-4 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">En Mantenimiento</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{stats.maintenance}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-4 border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Con Iluminación</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{stats.withLighting}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Courts Grid/List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredCourts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron canchas
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {state.searchQuery ? 'Intenta con otros términos de búsqueda' : 'Comienza agregando tu primera cancha'}
            </p>
            {!state.searchQuery && (
              <Button
                onClick={handleCreateCourt}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Primera Cancha
              </Button>
            )}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {state.viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredCourts.map((court: Court, index: number) => (
                  <AppleCourtCard
                    key={court.id}
                    court={court}
                    onEdit={handleEditCourt}
                    index={index}
                  />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                {filteredCourts.map((court: Court, index: number) => (
                  <motion.div
                    key={court.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                          court.is_maintenance ? 'from-orange-500 to-orange-600' :
                          !court.is_active ? 'from-gray-400 to-gray-500' :
                          'from-green-500 to-green-600'
                        } flex items-center justify-center`}>
                          <Home className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{court.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {court.surface_type_display}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              ${parseFloat(court.price_per_hour).toFixed(0)}/hora
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {court.has_lighting && (
                          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Zap className="w-4 h-4 text-blue-600" />
                          </div>
                        )}
                        {court.has_heating && (
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                            <Flame className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCourt(court)}
                          className="rounded-lg"
                        >
                          Editar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Court Form Modal */}
      <Dialog open={state.showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {state.editingCourt ? 'Editar Cancha' : 'Nueva Cancha'}
            </DialogTitle>
          </DialogHeader>
          <AppleCourtForm
            {...(state.editingCourt && { court: state.editingCourt })}
            clubId="1"
            onSuccess={handleCloseForm}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}