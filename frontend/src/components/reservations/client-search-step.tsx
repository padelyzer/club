'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  UserPlus,
  Check,
  X,
  Loader
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface Client {
  id: string;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  phone_number: string;
  rating: number;
  level?: {
    name: string;
  };
}

interface ClientSearchStepProps {
  onClientSelect: (client: Client | null) => void;
  onVisitorInfo: (visitorData: { name: string; phone: string; email?: string }) => void;
  selectedClient?: Client | null;
  visitorData?: { name: string; phone: string; email?: string };
}

export const ClientSearchStep: React.FC<ClientSearchStepProps> = ({
  onClientSelect,
  onVisitorInfo,
  selectedClient,
  visitorData,
}) => {
  const [searchMode, setSearchMode] = useState<'client' | 'visitor'>('client');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    name: visitorData?.name || '',
    phone: visitorData?.phone || '',
    email: visitorData?.email || '',
  });

  // Search clients by phone
  const searchClients = async (phone: string) => {
    if (phone.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/v1/clients/client-profiles/search_by_phone/?phone=${encodeURIComponent(phone)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
            setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phoneSearch && searchMode === 'client') {
        searchClients(phoneSearch);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [phoneSearch, searchMode]);

  const handleClientSelection = (client: Client) => {
    onClientSelect(client);
    setSearchResults([]);
  };

  const handleVisitorFormChange = (field: string, value: string) => {
    const newData = { ...visitorForm, [field]: value };
    setVisitorForm(newData);
    
    // Auto-call onVisitorInfo when we have minimum required data
    if (newData.name && newData.phone) {
      onVisitorInfo(newData);
    }
  };

  const clearSelection = () => {
    onClientSelect(null);
    onVisitorInfo({ name: '', phone: '', email: '' });
    setVisitorForm({ name: '', phone: '', email: '' });
    setPhoneSearch('');
    setSearchResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setSearchMode('client')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            searchMode === 'client'
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <Search className="w-4 h-4" />
          Cliente Existente
        </button>
        <button
          onClick={() => setSearchMode('visitor')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
            searchMode === 'visitor'
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          <UserPlus className="w-4 h-4" />
          Visitante
        </button>
      </div>

      <AnimatePresence mode="wait">
        {searchMode === 'client' && (
          <motion.div
            key="client-search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Search Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Buscar cliente por teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Ingresa número de teléfono..."
                  value={phoneSearch}
                  onChange={(e) => setPhoneSearch(e.target.value)}
                  className="pl-10"
                />
                {isSearching && (
                  <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Resultados encontrados:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((client) => (
                    <Card
                      key={client.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md p-4",
                        selectedClient?.id === client.id && "ring-2 ring-[#007AFF] bg-blue-50"
                      )}
                      onClick={() => handleClientSelection(client)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {client.user.first_name} {client.user.last_name}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client.phone_number}
                              </span>
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {client.user.email}
                              </span>
                            </div>
                          </div>
                        </div>
                        {selectedClient?.id === client.id && (
                          <div className="flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-600" />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                clearSelection();
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Client Display */}
            {selectedClient && (
              <Card className="bg-green-50 border-green-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">
                        Cliente seleccionado: {selectedClient.user.first_name} {selectedClient.user.last_name}
                      </p>
                      <p className="text-sm text-green-700">
                        {selectedClient.phone_number} • {selectedClient.user.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearSelection}
                  >
                    Cambiar
                  </Button>
                </div>
              </Card>
            )}

            {phoneSearch && searchResults.length === 0 && !isSearching && (
              <Card className="text-center p-4">
                <p className="text-gray-600">
                  No se encontraron clientes con ese teléfono.
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSearchMode('visitor')}
                  className="mt-2"
                >
                  Crear como visitante
                </Button>
              </Card>
            )}
          </motion.div>
        )}

        {searchMode === 'visitor' && (
          <motion.div
            key="visitor-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Datos del visitante</h3>
              <p className="text-sm text-gray-600">
                Ingresa los datos básicos para la reserva. El visitante no será registrado en el sistema.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <Input
                    type="text"
                    placeholder="Juan Pérez"
                    value={visitorForm.name}
                    onChange={(e) => handleVisitorFormChange('name', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono *
                  </label>
                  <Input
                    type="tel"
                    placeholder="+1234567890"
                    value={visitorForm.phone}
                    onChange={(e) => handleVisitorFormChange('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (opcional)
                </label>
                <Input
                  type="email"
                  placeholder="juan@example.com"
                  value={visitorForm.email}
                  onChange={(e) => handleVisitorFormChange('email', e.target.value)}
                />
              </div>

              {visitorForm.name && visitorForm.phone && (
                <Card className="bg-blue-50 border-blue-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900">
                        Visitante: {visitorForm.name}
                      </p>
                      <p className="text-sm text-blue-700">
                        {visitorForm.phone} {visitorForm.email && `• ${visitorForm.email}`}
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};