'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Filter, Plus, List, LayoutGrid, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppleReservationsList } from '@/components/reservations/apple-reservations-list';
import { AppleCalendarView } from '@/components/reservations/apple-calendar-view';
import { NewReservationModal } from '@/components/reservations/new-reservation-modal';
import { CheckInModal } from '@/components/reservations/check-in-modal';
import { MinimalCalendar } from '@/components/reservations/minimal-calendar';
import { useUIStore } from '@/store/ui';
import { ReservationsService } from '@/lib/api/services/reservations.service';
import { Reservation } from '@/types/reservation';

export default function ReservationsPage() {
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyReservations, setDailyReservations] = useState<Reservation[]>([]);
  const [monthlyReservations, setMonthlyReservations] = useState<Reservation[]>([]);
  const [reservationDensity, setReservationDensity] = useState<Record<string, 'none' | 'low' | 'medium' | 'high'>>({});
  const [loading, setLoading] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { openModal } = useUIStore();

  // Load reservations for the selected date (for list view)
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadDailyReservations = async () => {
      if (view !== 'list') return;
      
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
  }, [selectedDate, view]);

  // Load reservations for the current month/week (for calendar view)
  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadPeriodReservations = async () => {
      if (view !== 'calendar') return;
      
      setLoading(true);
      try {
        // Load a broader range for calendar view
        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        
        // Extend range to include week context
        const startDate = new Date(startOfMonth);
        startDate.setDate(startDate.getDate() - 7);
        const endDate = new Date(endOfMonth);
        endDate.setDate(endDate.getDate() + 7);
        
        const response = await ReservationsService.list({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          page_size: 1000,
        });
        
        setMonthlyReservations(response.results);
      } catch (error) {
                setMonthlyReservations([]);
      } finally {
        setLoading(false);
      }
    };

    loadPeriodReservations();
  }, [selectedDate, view]);

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
      await ReservationsService.checkIn(reservationId);
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
      await ReservationsService.registerPayment(reservationId, {
        payment_method: paymentData.method,
        payment_amount: paymentData.amount,
      });
      // Reload reservations to show updated payment status
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await ReservationsService.list({
        date: dateStr,
        page_size: 100,
      });
      setDailyReservations(response.results);
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
    <div className="min-h-screen bg-gray-50/50">
      {/* Apple-style Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">

            {/* Left side - Title and Search */}
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Reservas</h1>
              
              {/* Apple-style Search */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar cliente o cancha"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-gray-100 rounded-xl text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all w-80"
                />
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
              {/* Apple-style view toggle */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
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

              <div className="h-6 w-px bg-gray-200" />

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  showFilters
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                )}
              >
                <Filter className="w-4 h-4" />
              </button>
              
              <div className="h-6 w-px bg-gray-200" />
              
              <button
                onClick={() => openModal('new-reservation')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nueva Reserva
              </button>
            </div>
          </div>
        </div>

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
              {/* Calendar Sidebar - Apple Style */}
              <div className="w-80 flex-shrink-0">
                <div className="sticky top-24">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <MinimalCalendar
                      selectedDate={selectedDate}
                      onDateSelect={setSelectedDate}
                      reservationDensity={reservationDensity}
                    />
                  </div>
                </div>
              </div>

              {/* Reservations List */}
              <div className="flex-1">
                <AppleReservationsList
                  reservations={filteredReservations}
                  selectedDate={selectedDate}
                  onReservationClick={handleReservationClick}
                  loading={loading}
                />
              </div>
            </div>
          )}
          
          {view === 'calendar' && (
            <AppleCalendarView
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              reservations={monthlyReservations}
              onReservationClick={handleReservationClick}
              loading={loading}
            />
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
