'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Grid, List, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CourtsDataTable, CourtCard, CourtForm } from '@/components/courts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCourts } from '@/lib/api/hooks/useCourts';
import { Court } from '@/types/court';
import { CourtListResponse } from '@/lib/api/services/courts.service';

type ViewMode = 'table' | 'grid';

interface CourtsPageState {
  showForm: boolean;
  editingCourt: Court | null;
  viewMode: ViewMode;
}

export default function CourtsPage() {
  const [state, setState] = useState<CourtsPageState>({
    showForm: false,
    editingCourt: null,
    viewMode: 'table',
  });

  const { data, isLoading } = useCourts() as {
    data: CourtListResponse | undefined;
    isLoading: boolean;
  };

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
      viewMode: prev.viewMode === 'table' ? 'grid' : 'table',
    }));
  };

  return (
    <div className="space-y-4">
      {/* Apple-style Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Canchas
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona las canchas de tu club ({data?.results?.length || 0} canchas)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle - Apple style */}
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <Button
                variant={state.viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setState(prev => ({ ...prev, viewMode: 'table' }))}
                className={`h-8 px-3 rounded-md transition-all ${state.viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={state.viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setState(prev => ({ ...prev, viewMode: 'grid' }))}
                className={`h-8 px-3 rounded-md transition-all ${state.viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Grid className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              onClick={handleCreateCourt}
              className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Cancha
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {state.viewMode === 'table' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <CourtsDataTable
              onEditCourt={handleEditCourt}
              onCreateCourt={handleCreateCourt}
            />
          </div>
        ) : (
          <div>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                <span className="ml-3 text-gray-600 font-medium">Cargando canchas...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {data?.results?.map((court, index) => (
                  <CourtCard
                    key={court.id}
                    court={court}
                    onEdit={handleEditCourt}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Apple-style Court Form Modal */}
      <Dialog open={state.showForm} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="max-w-4xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {state.editingCourt ? 'Editar Cancha' : 'Nueva Cancha'}
            </DialogTitle>
          </DialogHeader>
          <CourtForm
            {...(state.editingCourt && { court: state.editingCourt })}
            clubId="1" // TODO: Get from user context
            onSuccess={handleCloseForm}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
