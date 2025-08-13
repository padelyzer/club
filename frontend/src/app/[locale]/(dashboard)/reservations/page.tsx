'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, List, Filter, Plus, ChevronDown, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarView } from '@/components/reservations/calendar-view';
import { TimelineView } from '@/components/reservations/timeline-view';
import { ReservationsList } from '@/components/reservations/reservations-list';
import { ReservationFilters } from '@/components/reservations/reservation-filters';
import { NewReservationModal } from '@/components/reservations/new-reservation-modal';
import { BulkReservationModal } from '@/components/reservations/bulk-reservation-modal';
import { useReservationStore } from '@/store/reservations';
import { useUIStore } from '@/store/ui';

export default function ReservationsPage() {
  const [view, setView] = useState<'timeline' | 'calendar' | 'list'>(
    'timeline'
  );
  const [isMobile, setIsMobile] = useState(false);
  const selectedDate = new Date();
  const { openModal } = useUIStore();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reservas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona las reservas de las pistas
          </p>
        </div>

        <div className="flex gap-2">
          {/* Mobile Quick Book Button */}
          {isMobile && (
            <Button 
              size="lg" 
              variant="default"
              onClick={() => openModal('new-reservation')}
              className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-lg"
            >
              <Zap className="w-5 h-5 mr-2" />
              Reservar Ahora
            </Button>
          )}
          
          {/* Regular Dropdown for Desktop/Advanced Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="lg" 
                className="w-full md:w-auto"
                variant={isMobile ? "outline" : "default"}
              >
                <Plus className="w-5 h-5 mr-2" />
                {isMobile ? "Más" : "Nueva Reserva"}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {!isMobile && (
                <>
                  <DropdownMenuItem onClick={() => openModal('new-reservation')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Reserva Individual
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => openModal('bulk-reservation')}>
                <Users className="w-4 h-4 mr-2" />
                Creación Masiva
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ReservationFilters />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('timeline')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Timeline
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('calendar')}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendario
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            <List className="w-4 h-4 mr-2" />
            Lista
          </Button>
        </div>

        <motion.div
          key={view}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {view === 'timeline' && <TimelineView date={selectedDate} />}
          {view === 'calendar' && <CalendarView />}
          {view === 'list' && <ReservationsList />}
        </motion.div>
      </div>

      <NewReservationModal />
      <BulkReservationModal />
      
      {/* Mobile Floating Action Button */}
      {isMobile && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => openModal('new-reservation')}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-full shadow-xl flex items-center justify-center hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-500/50"
          aria-label="Reservar rápido"
        >
          <Zap className="w-7 h-7" />
        </motion.button>
      )}
    </div>
  );
}
