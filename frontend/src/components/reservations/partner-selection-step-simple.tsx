import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  UserPlus,
  Check,
  X,
  Clock,
  Star,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  ClientProfile,
  PartnerRequest as PartnerRequestType,
  CreateReservationPartner,
} from '@/lib/api/types';
import { 
  useRecentPartners, 
  useSuggestedPartners, 
  usePartnerRequests,
  useCreatePartnerRequest,
  useAcceptPartnerRequest,
} from '@/lib/api/hooks/usePartners';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useClients } from '@/lib/api/hooks/useClients';
import { toast } from '@/lib/toast';

interface PartnerSelectionStepProps {
  date: string;
  startTime: string;
  endTime: string;
  selectedPartners: CreateReservationPartner[];
  onPartnersChange: (partners: CreateReservationPartner[]) => void;
  maxPartners?: number;
  className?: string;
}

export const PartnerSelectionStep: React.FC<PartnerSelectionStepProps> = ({
  date,
  startTime,
  endTime,
  selectedPartners,
  onPartnersChange,
  maxPartners = 3,
  className,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'recent' | 'manual'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Get user's client profile ID
  const userProfileId = user?.client_profile?.id || '';
  
  // API Hooks
  const { data: recentPartnersData, isLoading: isLoadingRecent } = useRecentPartners(userProfileId);
  const { data: clientsData, isLoading: isLoadingClients } = useClients({ 
    search: debouncedSearch,
    page_size: 10 
  });
  const { data: partnerRequestsData } = usePartnerRequests({
    to_player: userProfileId,
    status: 'pending',
  });
  const createPartnerRequestMutation = useCreatePartnerRequest();
  const acceptPartnerRequestMutation = useAcceptPartnerRequest();
  
  const pendingRequests = partnerRequestsData?.results || [];
  const searchResults = clientsData?.results || [];

  const isPartnerSelected = (profileId: string) => {
    return selectedPartners.some(p => p.user_id === profileId);
  };

  const canAddMorePartners = selectedPartners.length < maxPartners;

  const handleTogglePartner = (profile: ClientProfile) => {
    if (isPartnerSelected(profile.id)) {
      // Remove partner
      onPartnersChange(selectedPartners.filter(p => p.user_id !== profile.id));
    } else if (canAddMorePartners) {
      // Add partner
      const newPartner: CreateReservationPartner = {
        user_id: profile.id,
        email: profile.user.email,
        full_name: profile.user.full_name,
        phone: profile.user.phone,
        is_primary: selectedPartners.length === 0,
      };
      onPartnersChange([...selectedPartners, newPartner]);
    }
  };

  const handleAddManualPartner = () => {
    if (!manualEmail || !manualName) return;
    
    if (canAddMorePartners) {
      const newPartner: CreateReservationPartner = {
        email: manualEmail,
        full_name: manualName,
        phone: manualPhone || undefined,
        is_primary: selectedPartners.length === 0,
      };
      onPartnersChange([...selectedPartners, newPartner]);
      
      // Reset form
      setManualEmail('');
      setManualName('');
      setManualPhone('');
      toast.success('Partner agregado');
    }
  };

  const handleRemovePartner = (index: number) => {
    const updatedPartners = selectedPartners.filter((_, i) => i !== index);
    // If we removed the primary partner, make the first one primary
    if (selectedPartners[index].is_primary && updatedPartners.length > 0) {
      updatedPartners[0].is_primary = true;
    }
    onPartnersChange(updatedPartners);
  };

  const handleAcceptRequest = async (request: PartnerRequestType) => {
    try {
      await acceptPartnerRequestMutation.mutateAsync({ 
        id: request.id, 
        message: 'Aceptado para esta reserva' 
      });
      
      // Add as partner
      if (canAddMorePartners) {
        const newPartner: CreateReservationPartner = {
          user_id: request.from_player.id,
          email: request.from_player.user.email,
          full_name: request.from_player.user.full_name,
          phone: request.from_player.user.phone,
          is_primary: selectedPartners.length === 0,
        };
        onPartnersChange([...selectedPartners, newPartner]);
      }
    } catch (error) {
          }
  };

  const renderPartnerCard = (profile: ClientProfile, showStats = false) => {
    const isSelected = isPartnerSelected(profile.id);
    
    return (
      <motion.div
        key={profile.id}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'p-4 rounded-xl border-2 transition-all cursor-pointer',
          isSelected 
            ? 'border-blue-600 bg-blue-50' 
            : 'border-gray-200 bg-white hover:border-gray-300'
        )}
        onClick={() => handleTogglePartner(profile)}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
            {profile.user.full_name.charAt(0)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                {profile.user.full_name}
              </h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {}}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              {profile.level && (
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ 
                    backgroundColor: `${profile.level.color}20`,
                    color: profile.level.color 
                  }}
                >
                  {profile.level.display_name}
                </span>
              )}
              <span className="text-xs text-gray-600">
                Rating: {profile.rating}
              </span>
            </div>
            
            {showStats && profile.stats && (
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span>{profile.stats.matches_played} partidos</span>
                <span>{Math.round(profile.stats.win_rate)}% victorias</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderPendingRequest = (request: PartnerRequestType) => {
    return (
      <div key={request.id} className="p-4 rounded-xl border border-orange-200 bg-orange-50">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
            <Users className="w-6 h-6 text-orange-600" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  {request.from_player.user.full_name}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {request.message || 'Solicitud de compañero'}
                </p>
              </div>
              
              <button
                onClick={() => handleAcceptRequest(request)}
                disabled={!canAddMorePartners}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  canAddMorePartners
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                <Check className="w-4 h-4" />
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Selecciona tus compañeros
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Puedes agregar hasta {maxPartners} jugadores
        </p>
      </div>

      {/* Selected Partners */}
      {selectedPartners.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Jugadores seleccionados
            </h4>
            <span className="text-sm text-gray-500">
              {selectedPartners.length}/{maxPartners}
            </span>
          </div>
          
          <div className="space-y-2">
            {selectedPartners.map((partner, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm">
                    {partner.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{partner.full_name}</p>
                    <p className="text-xs text-gray-500">{partner.email}</p>
                  </div>
                  {partner.is_primary && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      Principal
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemovePartner(index)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            Solicitudes pendientes
          </h4>
          <div className="space-y-3">
            {pendingRequests.map(renderPendingRequest)}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setActiveTab('recent')}
            className={cn(
              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
              activeTab === 'recent'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Recientes
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={cn(
              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
              activeTab === 'search'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Buscar
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={cn(
              'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all',
              activeTab === 'manual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Manual
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'recent' && (
          <div className="space-y-3">
            {isLoadingRecent ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : recentPartnersData && recentPartnersData.length > 0 ? (
              recentPartnersData.map(partner => 
                renderPartnerCard(partner.player, true)
              )
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No tienes compañeros recientes</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar jugadores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3">
              {isLoadingClients ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map(client => {
                  // Skip if no profile
                  if (!client.profile) return null;
                  return renderPartnerCard(client.profile);
                })
              ) : debouncedSearch ? (
                <div className="text-center py-8 text-gray-500">
                  <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No se encontraron jugadores</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {activeTab === 'manual' && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+52 55 1234 5678"
                />
              </div>
            </div>
            
            <button
              onClick={handleAddManualPartner}
              disabled={!manualEmail || !manualName || !canAddMorePartners}
              className={cn(
                "w-full py-2 px-4 rounded-lg font-medium transition-colors",
                manualEmail && manualName && canAddMorePartners
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Agregar jugador
            </button>
          </div>
        )}
      </div>

      {!canAddMorePartners && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Has alcanzado el máximo de {maxPartners} jugadores</span>
        </div>
      )}
    </div>
  );
};