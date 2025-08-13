'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Plus, List, LayoutGrid, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppleStyleReservationsList } from '@/components/reservations/apple-style-reservations-list';
import { AppleCalendar } from '@/components/reservations/apple-calendar';
import { NewReservationModal } from '@/components/reservations/new-reservation-modal';
import { CheckInModal } from '@/components/reservations/check-in-modal';
import { useUIStore } from '@/store/ui';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { Reservation } from '@/types/reservation';

export default function AppleStyleReservationsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyReservations, setDailyReservations] = useState<Reservation[]>([]);
  const [reservationDensity, setReservationDensity] = useState<Record<string, 'none' | 'low' | 'medium' | 'high'>>({});
  const [loading, setLoading] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { openModal } = useUIStore();

  // Load reservations for the selected date
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadDailyReservations = async () => {
      setLoading(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await ReservationsService.list({
          date: dateStr,
          page_size: 100,
        });
        setDailyReservations(response.results);
      } catch (error) {
                setDailyReservations([]);
      } finally {
        setLoading(false);
      }
    };

    loadDailyReservations();
  }, [selectedDate]);

  // Load all reservations for the month to calculate density
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadMonthReservations = async () => {
      try {
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        
        const response = await ReservationsService.list({
          start_date: startOfMonth.toISOString().split('T')[0],
          end_date: endOfMonth.toISOString().split('T')[0],
          page_size: 500,
        });
        
        // Calculate density for each day
        const density: Record<string, 'none' | 'low' | 'medium' | 'high'> = {};
        const reservationsByDay: Record<string, number> = {};
        
        response.results.forEach(reservation => {
          const dateKey = reservation.date;
          reservationsByDay[dateKey] = (reservationsByDay[dateKey] || 0) + 1;
        });
        
        Object.entries(reservationsByDay).forEach(([date, count]) => {
          if (count === 0) density[date] = 'none';
          else if (count <= 3) density[date] = 'low';
          else if (count <= 6) density[date] = 'medium';
          else density[date] = 'high';
        });
        
        setReservationDensity(density);
      } catch (error) {
              }
    };

    loadMonthReservations();
  }, [selectedDate.getMonth(), selectedDate.getFullYear()]);

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowCheckInModal(true);
  };

  const handleCheckIn = async (reservationId: number) => {
    try {
      await ReservationsService.updateStatus(reservationId, 'completed');
      // Reload reservations
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await ReservationsService.list({
        date: dateStr,
        page_size: 100,
      });
      setDailyReservations(response.results);
      setShowCheckInModal(false);
    } catch (error) {
          }
  };

  const handlePayment = async (reservationId: number, paymentData: any) => {
    try {
            await ReservationsService.update(reservationId, {
        payment_status: 'paid',
        payment_method: paymentData.method,
        payment_amount: paymentData.amount,
      });
    } catch (error) {
          }
  };

  // Filter reservations based on search
  const filteredReservations = dailyReservations.filter(reservation => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      reservation.player_name?.toLowerCase().includes(query) ||
      (typeof reservation.court === 'string' ? reservation.court : reservation.court?.name)?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="px-6 py-4">
          {/* Title and Actions Row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Reservas</h1>
              <p className="text-sm text-gray-600 mt-0.5">Gestiona las reservas de canchas</p>
            </div>
            
            <button
              onClick={() => openModal('new-reservation')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Reserva
            </button>
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente o cancha..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* View Toggle and Filter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
                <button
                  onClick={() => setView('list')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    view === 'list' 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <List className="w-4 h-4" />
                  Lista
                </button>
                <button
                  onClick={() => setView('calendar')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    view === 'calendar' 
                      ? "bg-white text-gray-900 shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Calendario
                </button>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                  showFilters
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <Filter className="w-4 h-4" />
                Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 py-3 bg-gray-50 border-t border-gray-200/50"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Filtrar por:</span>
              <button className="px-3 py-1 bg-white rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                Estado
              </button>
              <button className="px-3 py-1 bg-white rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                Cancha
              </button>
              <button className="px-3 py-1 bg-white rounded-lg text-sm border border-gray-200 hover:bg-gray-50">
                Horario
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {view === 'list' && (
            <div className="flex gap-6">
              {/* Calendar Sidebar */}
              <div className="w-80 flex-shrink-0">
                <div className="bg-white rounded-2xl shadow-sm p-4 sticky top-32">
                  <AppleCalendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    reservationDensity={reservationDensity}
                  />
                </div>
              </div>

              {/* Reservations List */}
              <div className="flex-1">
                <AppleStyleReservationsList
                  reservations={filteredReservations}
                  selectedDate={selectedDate}
                  onReservationClick={handleReservationClick}
                  loading={loading}
                />
              </div>
            </div>
          )}
          
          {view === 'calendar' && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <p className="text-gray-600">Vista de calendario en desarrollo...</p>
            </div>
          )}
        </motion.div>
      </div>

      <NewReservationModal />
      <CheckInModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        reservation={selectedReservation}
        onCheckIn={handleCheckIn}
        onPayment={handlePayment}
      />
    </div>
  );
}