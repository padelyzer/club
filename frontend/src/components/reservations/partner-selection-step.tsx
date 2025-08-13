import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  UserPlus,
  Check,
  X,
  Clock,
  Calendar,
  Star,
  Mail,
  Phone,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import { 
  ClientProfile,
  PartnerRequest as PartnerRequestType,
  CreateReservationPartner,
} from '@/lib/api/types';
import { useClientsStore } from '@/store/clientsStore';
import { 
  checkPartnerAvailability, 
  getPartnerAvailabilityStatus,
  formatAlternativeTimeSlot 
} from '@/lib/utils/partner-availability';
import { 
  useRecentPartners, 
  useSuggestedPartners, 
  usePartnerRequests,
  useCreatePartnerRequest 
} from '@/lib/api/hooks/usePartners';
import { useAuth } from '@/lib/api/hooks/useAuth';

interface PartnerSelectionStepProps {
  date: string;
  startTime: string;
  endTime: string;
  selectedPartners: CreateReservationPartner[];
  onPartnersChange: (partners: CreateReservationPartner[]) => void;
  maxPartners?: number;
  className?: string;
}

export const PartnerSelectionStep = ({
  date,
  startTime,
  endTime,
  selectedPartners,
  onPartnersChange,
  maxPartners = 3,
  className,
}: PartnerSelectionStepProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'recent' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  // Get user's client profile ID
  const userProfileId = user?.client_profile?.id || '';
  
  // API Hooks
  const { data: recentPartnersData, isLoading: isLoadingRecent } = useRecentPartners(userProfileId);
  const { data: suggestedPartnersData, isLoading: isLoadingSuggested } = useSuggestedPartners(
    userProfileId, 
    date
  );
  const { data: partnerRequestsData, isLoading: isLoadingRequests } = usePartnerRequests({
    to_player: userProfileId,
    status: 'pending',
  });
  const createPartnerRequestMutation = useCreatePartnerRequest();
  
  // Transform API data to match UI expectations
  const recentPartners = React.useMemo(() => {
    if (!recentPartnersData) return [];
    return recentPartnersData.map(partner => ({
      id: partner.player.id,
      profile: partner.player,
      stats: {
        matches_together: partner.matches_together,
        win_rate: partner.win_rate,
        last_match_date: partner.last_match_date,
      },
      availability: {
        next_available: ['Tomorrow 18:00', 'Friday 19:00'],
        regular_schedule: ['Mon-Wed 18:00-20:00', 'Weekends 10:00-12:00'],
      },
      compatibility_score: 0.85,
      mutual_connections: 5,
      is_favorite: true,
      is_blocked: false,
      last_played_together: '2024-01-15',
    },
  ];

  const mockPendingRequests: PartnerRequest[] = [
    {
      id: '1',
      sender: {
        id: '2',
        full_name: 'María García',
        avatar_url: null,
        level_name: 'Advanced',
        rating: 4.1,
      },
      receiver: {
        id: 'current-user',
        full_name: 'Current User',
        avatar_url: null,
        level_name: 'Intermediate',
        rating: 3.5,
      },
      message: 'Looking for a partner for doubles match this weekend',
      proposed_date: date,
      proposed_time: startTime,
      match_type: 'casual',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const isPartnerSelected = (userId: string) => {
    return selectedPartners.some(p => p.user_id === userId);
  };

  const canAddMorePartners = selectedPartners.length < maxPartners;

  const handleTogglePartner = (partner: PartnerMatch) => {
    if (isPartnerSelected(partner.id)) {
      // Remove partner
      onPartnersChange(selectedPartners.filter(p => p.user_id !== partner.id));
    } else if (canAddMorePartners) {
      // Add partner
      const newPartner: CreateReservationPartner = {
        user_id: partner.id,
        email: partner.user.email || '',
        full_name: partner.user.full_name,
        phone: partner.user.phone,
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

  const handleSetPrimary = (index: number) => {
    const updatedPartners = selectedPartners.map((partner, i) => ({
      ...partner,
      is_primary: i === index,
    }));
    onPartnersChange(updatedPartners);
  };

  const renderPartnerCard = (partner: PartnerMatch, showActions = true) => {
    const isSelected = isPartnerSelected(partner.id);
    
    return (
      <Card 
        key={partner.id}
        className={cn(
          'p-4 transition-all cursor-pointer',
          isSelected && 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/10'
        )}
        onClick={() => showActions && handleTogglePartner(partner)}
      >
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={partner.user.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              {partner.user.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">
                {partner.user.full_name}
              </h4>
              {showActions && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleTogglePartner(partner)}
                  disabled={!isSelected && !canAddMorePartners}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">
                {partner.level.name}
              </Badge>
              <span className="text-xs text-gray-600">
                {partner.rating} rating
              </span>
              {partner.is_favorite && (
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
              )}
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>{partner.stats.matches_played} matches</span>
              <span>{Math.round(partner.stats.win_rate * 100)}% win rate</span>
              {partner.last_played_together && (
                <span>Last played: {new Date(partner.last_played_together).toLocaleDateString()}</span>
              )}
            </div>
            
            {/* Availability check for the selected date/time */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs">
                <Clock className="h-3 w-3 text-green-600" />
                <span className="text-green-600">Available at this time</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderPendingRequest = (request: PartnerRequest) => {
    const isFromCurrentUser = request.receiver.id === 'current-user';
    const otherUser = isFromCurrentUser ? request.sender : request.receiver;
    
    return (
      <Card key={request.id} className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={otherUser.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
              {otherUser.full_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {otherUser.full_name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Badge variant="secondary" className="text-xs">
                    {otherUser.level_name}
                  </Badge>
                  <span>{otherUser.rating} rating</span>
                </div>
              </div>
              
              {request.proposed_date === date && request.proposed_time === startTime && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20">
                  Same time!
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{request.message}</p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(request.proposed_date!).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {request.proposed_time}
              </span>
            </div>
            
            {isFromCurrentUser && (
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    // Accept and add as partner
                    const newPartner: CreateReservationPartner = {
                      user_id: otherUser.id,
                      email: '', // Would come from actual user data
                      full_name: otherUser.full_name,
                      is_primary: selectedPartners.length === 0,
                    };
                    onPartnersChange([...selectedPartners, newPartner]);
                  }}
                  disabled={!canAddMorePartners}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Accept & Add
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('reservations.selectPartners')}
        </h3>
        <p className="text-sm text-gray-600">
          {t('reservations.selectPartnersDescription', { max: maxPartners })}
        </p>
      </div>

      {/* Selected Partners */}
      {selectedPartners.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            {t('reservations.selectedPartners')} ({selectedPartners.length}/{maxPartners})
          </Label>
          <div className="space-y-2">
            {selectedPartners.map((partner, index) => (
              <Card key={index} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {partner.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{partner.full_name}</p>
                      <p className="text-xs text-gray-500">{partner.email}</p>
                    </div>
                    {partner.is_primary && (
                      <Badge variant="default" className="text-xs">
                        {t('reservations.primaryPlayer')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!partner.is_primary && selectedPartners.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(index)}
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePartner(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Partner Selection Tabs */}
      <Tabs value={activeTab || ''} onValueChange={setActiveTab as any}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="search">
            <Search className="mr-2 h-4 w-4" />
            {t('reservations.searchPlayers')}
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="mr-2 h-4 w-4" />
            {t('reservations.recentPartners')}
          </TabsTrigger>
          <TabsTrigger value="manual">
            <UserPlus className="mr-2 h-4 w-4" />
            {t('reservations.addManually')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t('reservations.searchPlayersPlaceholder')}
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Pending Requests */}
          {mockPendingRequests.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {t('reservations.pendingRequests')}
                </Badge>
                <span className="text-xs text-gray-500">
                  {t('reservations.matchingTimeSlot')}
                </span>
              </div>
              <div className="space-y-3">
                {mockPendingRequests.map(renderPendingRequest)}
              </div>
            </div>
          )}

          {/* Search Results */}
          <div className="space-y-3">
            {debouncedSearch && (
              <p className="text-sm text-gray-600">
                {t('reservations.searchingFor', { query: debouncedSearch })}
              </p>
            )}
            {/* Would show actual search results here */}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-4 space-y-3">
          {mockRecentPartners.length > 0 ? (
            mockRecentPartners.map((partner) => renderPartnerCard(partner))
          ) : (
            <Card className="p-6 text-center">
              <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                {t('reservations.noRecentPartners')}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manual-name">{t('common.fullName')} *</Label>
                  <Input
                    id="manual-name"
                    value={manualName || ''}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder={t('common.fullNamePlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="manual-email">{t('common.email')} *</Label>
                  <Input
                    id="manual-email"
                    type="email"
                    value={manualEmail || ''}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder={t('common.emailPlaceholder')}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="manual-phone">{t('common.phone')}</Label>
                  <Input
                    id="manual-phone"
                    value={manualPhone || ''}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder={t('common.phonePlaceholder')}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <AlertCircle className="h-4 w-4" />
                <span>{t('reservations.manualPartnerNote')}</span>
              </div>
              
              <Button
                onClick={handleAddManualPartner}
                disabled={!manualEmail || !manualName || !canAddMorePartners}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {t('reservations.addPartner')}
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {!canAddMorePartners && (
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/10 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>{t('reservations.maxPartnersReached', { max: maxPartners })}</span>
        </div>
      )}
    </div>
  );
};