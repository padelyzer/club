'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Download, Upload, Grid3X3, List, Users, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClientsStore } from '@/store/clientsStore';
import { 
  useClients, 
  usePartnerSearch, 
  usePartnerRecommendations,
  usePartnerMutations,
  usePartnerRequests 
} from '@/lib/api/hooks/useClients';
import { ClientsList } from '@/components/clients/clients-list';
import { ClientFilters } from '@/components/clients/client-filters';
import { ClientForm } from '@/components/clients/client-form';
import { ClientDetail } from '@/components/clients/client-detail';
import { ImportClientsModal } from '@/components/clients/import-clients-modal';
import { ExportClientsModal } from '@/components/clients/export-clients-modal';
import { PartnerSearch } from '@/components/clients/partner-search';
import { PartnerRequestModal } from '@/components/clients/partner-request-modal';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/states/loading-state';
import { ErrorState } from '@/components/ui/states/error-state';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/layout/Modal';
import { PartnerSearchFilters, PartnerMatch } from '@/types/client';

export default function ClientsPage() {
  const { t } = useTranslation();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPartnerSearchOpen, setIsPartnerSearchOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerMatch | null>(null);
  const [partnerSearchFilters, setPartnerSearchFilters] = useState<PartnerSearchFilters>({
    page: 1,
    page_size: 20,
  });

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

  // Partner matching hooks
  const { partners, isLoading: isSearchLoading } = usePartnerSearch(
    partnerSearchFilters,
    isPartnerSearchOpen
  );
  
  const { recommendations } = usePartnerRecommendations();
  const { requests: partnerRequests } = usePartnerRequests('received');
  const { sendPartnerRequest } = usePartnerMutations();

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

  // Partner search handlers
  const handlePartnerSearch = useCallback((filters: PartnerSearchFilters) => {
    setPartnerSearchFilters(filters);
  }, []);

  const handleSelectPartner = useCallback((partner: PartnerMatch) => {
    setSelectedPartner(partner);
  }, []);

  const handleSendPartnerRequest = useCallback(async (partner: PartnerMatch) => {
    setSelectedPartner(partner);
  }, []);

  const handleSendRequest = useCallback(async (requestData: any) => {
    if (!selectedPartner) return;
    
    try {
      await sendPartnerRequest(selectedPartner.id, {
        message: requestData.message,
      });
      setSelectedPartner(null);
      refresh();
    } catch (error) {
          }
  }, [selectedPartner, sendPartnerRequest, refresh]);

  if (isLoading && !clients) return <LoadingState fullScreen />;
  if (error && !clients) return <ErrorState onRetry={refresh} />;

  const hasClients = clients && clients.results.length > 0;
  const showEmptyState =
    !hasClients && !filters.search && Object.keys(filters).length === 0;

  return (
    <div className="space-y-4">
      {/* Modern Apple-style Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {t('clients.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('clients.subtitle', { count: clients?.count || 0 })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle - Apple style */}
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`h-8 px-3 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 px-3 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Partner Search Button - Apple style */}
            <Button 
              variant="outline" 
              onClick={() => setIsPartnerSearchOpen(true)}
              className="relative h-10 px-4 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            >
              <Users className="mr-2 h-4 w-4" />
              {t('clients.findPartners')}
              {partnerRequests.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-red-500 text-white text-xs font-medium">
                  {partnerRequests.length}
                </Badge>
              )}
            </Button>

            {/* Action Buttons - Apple style */}
            <Button 
              variant="outline" 
              onClick={handleImport}
              className="h-10 px-4 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('clients.import')}
            </Button>

            <Button 
              variant="outline" 
              onClick={handleExport}
              className="h-10 px-4 bg-white border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
            >
              <Download className="mr-2 h-4 w-4" />
              {t('clients.export')}
            </Button>

            <Button 
              onClick={() => openForm()} 
              className="h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('clients.addNew')}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters - Apple style container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <ClientFilters />
      </div>

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

      {/* Partner Search Modal */}
      <Modal
        isOpen={isPartnerSearchOpen}
        onClose={() => setIsPartnerSearchOpen(false)}
        title={t('clients.findPartners')}
        size="xl" as any
      >
        <PartnerSearch
          onSearch={handlePartnerSearch}
          onSelectPlayer={handleSelectPartner}
          onSendRequest={handleSendPartnerRequest}
          results={partners?.results || []}
          recommendations={recommendations || []}
          loading={isSearchLoading}
        />
      </Modal>

      {/* Partner Request Modal */}
      {selectedPartner && (
        <PartnerRequestModal
          isOpen={!!selectedPartner}
          onClose={() => setSelectedPartner(null)}
          onSend={handleSendRequest}
          player={selectedPartner}
        />
      )}
    </div>
  );
}
