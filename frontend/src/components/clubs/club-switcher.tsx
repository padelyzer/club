'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { Check, ChevronsUpDown, Building2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuthStore } from '@/store/auth';
import { useActiveClubStore } from '@/store/clubs';
import { useClubs } from '@/lib/api/hooks/useClubs';

export function ClubSwitcher() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale as string;
  const currentClubSlug = params['club-slug'] as string;
  
  const { user } = useAuthStore();
  const activeClub = useActiveClubStore((state) => state.activeClub);
  const setActiveClub = useActiveClubStore((state) => state.setActiveClub);
  // Only fetch clubs if user exists and needs club switching
  // For regular users with one organization membership, no need to fetch clubs list
  const shouldFetchClubs = user && (
    user.is_superuser || 
    (user as any)?.organization_memberships?.length > 1 ||
    (user as any)?.organization_memberships?.some((m: any) => m.role === 'org_admin')
  );
  const { clubs, isLoading, error } = useClubs({}, { enabled: shouldFetchClubs });

  // Handle clubs API errors
  useEffect(() => {
    if (error) {
      // In production, could send to error tracking service
    }
  }, [error]);

  // Get available clubs from user organization memberships or all clubs for superadmin
  const availableClubs = user?.is_superuser 
    ? clubs?.results || []
    : clubs?.results || [];

  const handleSelectClub = (clubSlug: string) => {
    const selectedClub = availableClubs.find(c => c.slug === clubSlug);
    if (selectedClub) {
      setActiveClub(selectedClub);
      
      const pathSegments = pathname.split('/');
      
      if (currentClubSlug) {
        // Already in club context - replace club slug
        pathSegments[2] = clubSlug;
        router.push(pathSegments.join('/'));
      } else {
        // In dashboard/generic context - map to equivalent club page
        const contextMap: Record<string, string> = {
          'dashboard': '',
          'analytics': '/analytics',
          'reservations': '/reservations',
          'clients': '/clients',
          'courts': '/courts',
          'finance': '/finance',
          'leagues': '/leagues',
          'tournaments': '/tournaments',
          'maintenance': '/maintenance',
          'classes': '/classes',
          'settings': '/settings',
        };
        
        // Get current page from path (e.g., 'dashboard' from '/es/dashboard')
        const currentPage = pathSegments[2] || 'dashboard';
        const clubPath = contextMap[currentPage] ?? '';
        
        // Navigate to the equivalent page in club context
        router.push(`/${locale}/${clubSlug}${clubPath}`);
      }
    }
    setOpen(false);
  };

  const handleCreateClub = () => {
    router.push(`/${locale}/clubs`);
    setOpen(false);
  };

  // Don't show switcher in ROOT context or if user has no clubs
  const isRootContext = pathname.includes('/root');
  const canSwitchClubs = availableClubs.length > 1 || user?.is_superuser;
  
  // Early return for cases where switcher is not needed
  if (isRootContext || 
      !user || 
      (!shouldFetchClubs && !(user as any)?.organization_memberships?.length) ||
      (!canSwitchClubs && !shouldFetchClubs)) {
    return null;
  }

  const displayClub = activeClub || availableClubs[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[250px] justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {displayClub?.name || 'Seleccionar club'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Buscar club..." />
          <CommandEmpty>No se encontraron clubes.</CommandEmpty>
          <CommandGroup>
            {availableClubs.map((club) => (
              <CommandItem
                key={club.id}
                value={club.slug || ''}
                onSelect={() => handleSelectClub(club.slug)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    activeClub?.id === club.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1 truncate">
                  <div className="font-medium truncate">{club.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {club.address?.city || 'Sin ubicación'}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          
          {/* Option to manage clubs */}
          {(user?.is_superuser || user?.organization_memberships?.some(m => m.role === 'org_admin')) && (
            <CommandGroup>
              <CommandItem onSelect={handleCreateClub}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Gestionar clubes</span>
              </CommandItem>
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}