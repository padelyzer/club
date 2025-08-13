'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Loader2,
  Building,
  Store,
  Network,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useAuth } from '@/lib/api/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Organization {
  id: string;
  trade_name: string;
  business_name: string;
  type: 'club' | 'chain' | 'franchise';
  state: string;
  role: string;
}

export const OrganizationSwitcher: React.FC = () => {
  const router = useRouter();
  const { user, currentOrganization, availableOrganizations } = useAuthStore();
  const { switchOrganization } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  // Use organizations from the auth store
  const organizations = availableOrganizations || [];

  const handleSwitchOrganization = async (orgId: string) => {
    if (currentOrganization?.id === orgId) return;

    setIsLoading(true);
    try {
      await switchOrganization(orgId);
      
      // Reload the page to refresh all data with new organization context
      router.refresh();
      window.location.reload();
    } catch (error) {
          } finally {
      setIsLoading(false);
    }
  };

  const getOrganizationIcon = (type: string) => {
    switch (type) {
      case 'club':
        return Building;
      case 'chain':
        return Store;
      case 'franchise':
        return Network;
      default:
        return Building2;
    }
  };

  const getOrganizationBadge = (state: string) => {
    switch (state) {
      case 'trial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Don't show switcher if user has only one organization
  if (organizations.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center space-x-2 px-3 py-2 rounded-lg',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'transition-colors',
            'border border-gray-200 dark:border-gray-700',
            'text-sm font-medium',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {currentOrganization ? (
                <>
                  {React.createElement(getOrganizationIcon(currentOrganization.type), {
                    className: 'h-4 w-4 text-gray-600 dark:text-gray-400',
                  })}
                  <span className="text-gray-900 dark:text-gray-100">
                    {currentOrganization.trade_name}
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      getOrganizationBadge(currentOrganization.state)
                    )}
                  >
                    {currentOrganization.state}
                  </span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100">
                    Select Organization
                  </span>
                </>
              )}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {organizations.map((org) => {
          const Icon = getOrganizationIcon(org.type);
          const isActive = currentOrganization?.id === org.id;

          return (
            <DropdownMenuItem
              key={org.id}
              onClick={() => handleSwitchOrganization(org.id)}
              className={cn(
                'cursor-pointer',
                isActive && 'bg-gray-100 dark:bg-gray-800'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {org.trade_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {org.business_name} • {org.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      getOrganizationBadge(org.state)
                    )}
                  >
                    {org.state}
                  </span>
                  {isActive && (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => router.push('/organizations/new')}
          className="cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};