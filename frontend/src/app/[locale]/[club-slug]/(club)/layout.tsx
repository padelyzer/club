'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfessionalSidebar } from '@/components/ui/professional/ProfessionalSidebar';
import { ProfessionalTopNavigation } from '@/components/ui/professional/ProfessionalTopNavigation';
import { ClubsService } from '@/lib/api/services/clubs.service';
import { useAuthStore } from '@/store/auth';
import { ErrorState } from '@/components/ui/states/error-state';
import { ClubSwitcher } from '@/components/clubs/club-switcher';
import { LanguageSelector } from '@/components/layout/LanguageSelector';
import { useActiveClubStore } from '@/store/clubs/activeClubStore';
import { Card } from '@/components/ui/professional/Card';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  Users,
  Target,
  Clock,
  Sparkles,
  AlertCircle,
  Wifi,
  Shield
} from 'lucide-react';

export default function ClubLayout({
  children,
  params,
}: {
// children: React.ReactNode;
  params: { 'club-slug': string; locale: string };
}) {
  const { user, isLoading: authLoading } = useAuthStore();
  const { activeClub, setActiveClub } = useActiveClubStore();
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clubSlug = params['club-slug'];

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, [setMounted, true]);

  useEffect(() => {
    if (!mounted) return;
    
    const loadClub = async () => {
      if (!clubSlug) return;
      
      // Wait for auth to be loaded
      if (authLoading) {
        return;
      }
      
      // Wait for user to be loaded
      if (!user) {
        window.location.href = `/${params.locale}/login`;
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Get club by slug
        const response = await ClubsService.getBySlug(clubSlug);
        
        // Debug logging (only in development)
        if (process.env.NODE_ENV === 'development') {
          // Club access debug info
        }
        
        // Verify user has access to this club through multiple methods
        const hasAccess = user?.is_superuser || 
          // Check organization memberships (backend format)
          (user as any)?.organization_memberships?.some((m: any) => {
            return m.organization === response.organization;
          }) ||
          // Check club memberships (frontend format)
          (user as any)?.club_memberships?.some((m: any) => {
            return m.organization === response.organization;
          }) ||
          // Check if user's assigned club matches this club'
          (user as any)?.club?.id === response.id ||
          // Club owner by matching email
          response.email === user?.email;
        
        if (process.env.NODE_ENV === 'development') {
      // Development mode
    }
        
        if (!hasAccess) {
          throw new Error('No tienes acceso a este club');
        }
        
        // Set as active club
        setActiveClub(response);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el club');
      } finally {
        setLoading(false);
      }
    };

    loadClub();
  }, [clubSlug, user, setActiveClub, authLoading, params.locale, mounted]);

  // Don't render until mounted to avoid hydration errors
  if (!mounted || loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <motion.div 
            className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#4299E1] flex items-center justify-center shadow-2xl"
            animate={{ scale: [1, 1.1, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Building2 className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Accediendo al Club
          </h2>
          <p className="text-gray-600">
            Verificando acceso y cargando información...
          </p>
        </div>
      </div>
    );
  }

  if (error || !activeClub) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card variant="glass" padding="lg" className="max-w-md text-center backdrop-blur-xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Error al Acceder al Club
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "No se pudo encontrar el club o no tienes permisos para acceder."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#007AFF] text-white rounded-lg hover:bg-[#0056CC] transition-colors"
          >
            Reintentar
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Professional Sidebar */}
      <div className="flex-shrink-0">
        <ProfessionalSidebar 
          clubSlug={clubSlug}
          user={{
            name: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Usuario',
// email: user?.email
// role: user?.is_superuser ? 'Super Admin': 'Administrador'
          }}
        />
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Professional Top Navigation */}
        <ProfessionalTopNavigation
          clubName={activeClub.name}
          clubInfo={{
// city: activeClub.location?.city
// phone: activeClub.phone
// email: activeClub.email
// status: activeClub.is_active ? 'active' : 'inactive'
// members: activeClub.total_members || 0
// courts: activeClub.courts?.length || 0
// occupancy: activeClub.average_occupancy || 0
          }}
          user={{
            name: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.email || 'Usuario',
// email: user?.email
// role: user?.is_superuser ? 'Super Admin': 'Administrador'
          }}
          onSettingsClick={() => window.location.href = `/es/${clubSlug}/settings`}
          onProfileClick={() => window.location.href = `/es/${clubSlug}/profile`}
          onLogout={() => {
            // Handle logout
            localStorage.removeItem('token');
            window.location.href = `/es/login`;
          }}
        />
        
        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}