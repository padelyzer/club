'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calendar, Users, Trophy, FileText, UserPlus } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { NewReservationModal } from '@/components/modals/NewReservationModal';
import { NewClientModal } from '@/components/modals/NewClientModal';
import { NewTournamentModal } from '@/components/modals/NewTournamentModal';
import { useActiveClubStore } from '@/store/clubs';

type ModalType = 'reservation' | 'partner-reservation' | 'client' | 'tournament' | null;

const quickActions = [
  {
    id: 'reservation',
    icon: Calendar,
    label: 'Nueva Reserva',
    modalType: 'reservation' as ModalType,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  },
  {
    id: 'partner-reservation',
    icon: UserPlus,
    label: 'Reservar con Compañero',
    modalType: 'partner-reservation' as ModalType,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
  },
  {
    id: 'client',
    icon: Users,
    label: 'Agregar Cliente',
    modalType: 'client' as ModalType,
    color:
      'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
  },
  {
    id: 'tournament',
    icon: Trophy,
    label: 'Crear Torneo',
    modalType: 'tournament' as ModalType,
    color:
      'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
  },
  {
    id: 'report',
    icon: FileText,
    label: 'Generar Reporte',
    path: '/es/analytics', // Navigate to analytics page for reports
    color:
      'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
  },
];

export const QuickActions = () => {
  const router = useRouter();
  const params = useParams();
  const activeClub = useActiveClubStore((state) => state.activeClub);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  
  const locale = params.locale as string || 'es';
  const clubSlug = params['club-slug'] as string || activeClub?.slug;

  const handleActionClick = (action: (typeof quickActions)[0]) => {
    if (action.path) {
      // Update path based on context
      let path = action.path;
      if (clubSlug && !action.path.includes('/root')) {
        // Replace /es/ with /{locale}/{club-slug}/
        path = action.path.replace(/^\/[^\/]+\//, `/${locale}/${clubSlug}/`);
      }
      router.push(path);
    } else if (action.modalType) {
      setOpenModal(action.modalType);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Card
              className="p-6 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => handleActionClick(action)}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div className={cn('p-4 rounded-2xl', action.color)}>
                  <action.icon className="w-6 h-6" />
                </div>
                <p className="font-medium text-sm">{action.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Modals */}
      <NewReservationModal
        isOpen={openModal === 'reservation'}
        onClose={() => setOpenModal(null)}
      />
      <NewReservationModal
        isOpen={openModal === 'partner-reservation'}
        onClose={() => setOpenModal(null)}
        startWithPartnerStep={true}
      />
      <NewClientModal
        isOpen={openModal === 'client'}
        onClose={() => setOpenModal(null)}
      />
      <NewTournamentModal
        isOpen={openModal === 'tournament'}
        onClose={() => setOpenModal(null)}
      />
    </>
  );
};
