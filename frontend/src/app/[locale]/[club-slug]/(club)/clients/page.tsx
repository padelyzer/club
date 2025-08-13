'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, Upload, Grid3X3, List } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClientsStore } from '@/store/clientsStore';
import { useClients } from '@/lib/api/hooks/useClients';
import { ClientsList } from '@/components/clients/clients-list';
import { ClientFilters } from '@/components/clients/client-filters';
import { ClientForm } from '@/components/clients/client-form';
import { ClientDetail } from '@/components/clients/client-detail';
import { ImportClientsModal } from '@/components/clients/import-clients-modal';
import { ExportClientsModal } from '@/components/clients/export-clients-modal';
import { Button } from '@/components/ui/professional/Button';
import { ProfessionalDashboardLayout } from '@/components/ui/professional/ProfessionalDashboardLayout';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ClientsPage() {
  const { t } = useTranslation();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const {
    filters,
    currentPage,
    pageSize,
    viewMode,
    isFormOpen,
    isDetailOpen,
    editingClient,
    selectedClient,
    setClients,
    setViewMode,
    openForm,
    closeForm,
    closeDetail,
    setLoading,
    setError,
  } = useClientsStore();

  // Fetch clients data
  const { clients, isLoading, error, refresh } = useClients({
    ...filters,
    page: currentPage,
    page_size: pageSize,
  });

  // Update store with fetched data
  useEffect(() => {
    if (clients) {
      setClients(clients.results, clients.count);
    }
  }, [clients, setClients]);

  // Update loading state
  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  // Update error state
  useEffect(() => {
    setError(error?.message || null);
  }, [error, setError]);

  // Handle export
  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  // Handle import
  const handleImport = () => {
    setIsImportModalOpen(true);
  };

  if (isLoading && !clients) return <LoadingState fullScreen />;
  if (error && !clients) return <ErrorState onRetry={refresh} />;

  const hasClients = clients && clients.results.length > 0;
  const showEmptyState =
    !hasClients && !filters.search && Object.keys(filters).length === 0;

  const headerActions = (
    <>
      {/* View Mode Toggle */}
      <div className="flex rounded-lg border border-gray-200/50">
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="rounded-r-none"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('grid')}
          className="rounded-l-none"
        >
          <Grid3X3 className="h-4 w-4" />
        </Button>
      </div>

      {/* Action Buttons */}
      <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" />} onClick={handleImport}>
        {t('clients.import')}
      </Button>

      <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />} onClick={handleExport}>
        {t('clients.export')}
      </Button>

      <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => openForm()}>
        {t('clients.addNew')}
      </Button>
    </>
  );

  return (
    <ProfessionalDashboardLayout
      title={t('clients.title')}
      subtitle={`${t('clients.subtitle', { count: clients?.count || 0 })}`}
      headerActions={headerActions}
    >
      {/* Filters */}
      <ClientFilters />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {showEmptyState ? (
          <EmptyState
            title={t('clients.empty.title')}
            description={t('clients.empty.description')}
            action={{
              label: t('clients.empty.action'),
              onClick: () => openForm()
            }}
          />
        ) : (
          <ClientsList />
        )}
      </motion.div>

      {/* Modals */}
      {isFormOpen && (
        <ClientForm
          client={editingClient}
          onClose={closeForm}
          onSuccess={() => {
            closeForm();
            refresh();
          }}
        />
      )}

      {isDetailOpen && selectedClient && (
        <ClientDetail client={selectedClient} onClose={closeDetail} />
      )}

      {/* Import/Export Modals */}
      <ImportClientsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          setIsImportModalOpen(false);
          refresh();
        }}
      />

      <ExportClientsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </ProfessionalDashboardLayout>
  );
}
