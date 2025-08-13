import { useState, useEffect } from 'react';
import { Control, Controller } from 'react-hook-form';
import { Search, User, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useDebounce } from '@/hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { ClientsService } from '@/lib/api/services/clients.service';
import { Client } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientSearchProps {
  control: Control<any>;
  error?: string;
}

export const ClientSearch = ({ control, error }: ClientSearchProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', 'search', debouncedSearchTerm],
    queryFn: () =>
      ClientsService.list({ search: debouncedSearchTerm, page_size: 10 }),
    enabled: debouncedSearchTerm.length > 2,
  });

  useEffect(() => {
    if (debouncedSearchTerm.length > 2 && clients?.results?.length) {
      setShowResults(true);
    }
  }, [debouncedSearchTerm, clients]);

  return (
    <Controller
      name="client_id"
      control={control}
      render={({ field }) => (
        <div className="relative">
          <label className="block text-sm font-medium mb-2">Cliente</label>

          {field.value ? (
            <SelectedClient
              clientId={field.value}
              onClear={() => {
                field.onChange('');
                setSearchTerm('');
              }}
            />
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar cliente por nombre, email o teléfono..."
                  value={searchTerm || ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setShowResults(true)}
                  className={cn('pl-10', error && 'border-red-500')}
                />
              </div>

              <AnimatePresence>
                {showResults && debouncedSearchTerm.length > 2 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 w-full mt-2"
                  >
                    <Card className="shadow-lg max-h-64 overflow-y-auto">
                      {isLoading ? (
                        <div className="p-4 text-center text-gray-500">
                          Buscando...
                        </div>
                      ) : clients?.results?.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No se encontraron clientes
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                          {clients?.results?.map((client) => (
                            <li
                              key={client.id}
                              className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                              onClick={() => {
                                field.onChange(client.id);
                                setShowResults(false);
                                setSearchTerm(
                                  `${client.first_name} ${client.last_name}`
                                );
                              }}
                            >
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {client.first_name} {client.last_name}
                                  </p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {client.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {client.phone}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
      )}
    />
  );
};

interface SelectedClientProps {
  clientId: string;
  onClear: () => void;
}

const SelectedClient = ({ clientId, onClear }: SelectedClientProps) => {
  const { data: client } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => ClientsService.get(clientId),
    enabled: !!clientId,
  });

  if (!client) return null;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium">
              {client.first_name} {client.last_name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {client.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ✕
        </button>
      </div>
    </Card>
  );
};
