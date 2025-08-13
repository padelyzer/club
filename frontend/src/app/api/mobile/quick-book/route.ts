import { NextRequest, NextResponse } from 'next/server';
import { CourtsService } from '@/lib/api/services/courts.service';
import { ReservationsService } from '@/lib/api/services/reservations.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clubId = searchParams.get('clubId');
    const date = searchParams.get('date');

    if (!clubId || !date) {
      return NextResponse.json(
        { error: 'clubId and date are required' },
        { status: 400 }
      );
    }

    // Parallel fetch: courts, availability, and current reservations
    const [courtsResponse, availabilityResponse, reservationsResponse] = await Promise.all([
      CourtsService.list({ club: clubId }),
      ReservationsService.checkAvailability({
        date,
        club_id: clubId,
      }),
      ReservationsService.list({
        date,
        club: clubId,
      })
    ]);

    // Mobile-optimized data structure
    const mobileData = {
      courts: courtsResponse.map(court => ({
        id: court.id,
        name: court.name,
        price: court.hourly_rate,
        type: court.court_type,
        surface: court.surface,
        isActive: court.is_active,
        // Pre-calculate popular time slots for mobile
        popularSlots: getPopularTimeSlots(court.id, date),
      })),
      availability: {
        date,
        quickSlots: getQuickBookingSlots(availabilityResponse, 4), // Top 4 popular slots
        allSlots: availabilityResponse,
        conflicts: reservationsResponse.results,
      },
      pricing: {
        currency: 'USD',
        durations: [
          { minutes: 60, label: '1h' },
          { minutes: 90, label: '1.5h' },
          { minutes: 120, label: '2h' },
        ],
      },
      meta: {
        timestamp: new Date().toISOString(),
        optimizedForMobile: true,
        apiVersion: '2.0',
      }
    };

    return NextResponse.json(mobileData);

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
          }
    return NextResponse.json(
      { error: 'Failed to fetch booking data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clubId, 
      courtId, 
      date, 
      startTime, 
      duration, 
      playerName, 
      playerEmail, 
      playerPhone,
      playerCount = 4 
    } = body;

    // Mobile-optimized validation
    if (!clubId || !courtId || !date || !startTime || !duration || !playerName || !playerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields for mobile booking' },
        { status: 400 }
      );
    }

    // Calculate end time based on duration
    const endTime = calculateEndTime(startTime, duration);

    // Single API call for mobile booking with conflict check
    const reservation = await ReservationsService.create({
      club: clubId,
      court: courtId,
      date,
      start_time: startTime,
      end_time: endTime,
      player_name: playerName,
      player_email: playerEmail,
      player_phone: playerPhone,
      player_count: playerCount,
      booking_source: 'mobile_app',
      notes: `Mobile booking - ${duration}min duration`,
    });

    // Mobile-optimized response
    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        confirmationCode: reservation.confirmation_code,
        date,
        startTime,
        endTime,
        duration: `${duration}min`,
        court: reservation.court.name,
        price: reservation.total_price,
        playerName,
        playerEmail,
      },
      nextActions: {
        calendar: `/reservations/${reservation.id}`,
        share: `${process.env.NEXT_PUBLIC_BASE_URL}/booking/${reservation.confirmation_code}`,
        addToCalendar: generateCalendarUrl(reservation),
      }
    });

  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
          }
    
    // Mobile-friendly error messages
    const errorMessage = error.message?.includes('conflict') 
      ? 'Este horario ya no está disponible. Por favor selecciona otro.'
      : error.message?.includes('payment')
      ? 'Error en el pago. Intenta nuevamente.'
      : 'Error al crear la reserva. Verifica los datos e intenta nuevamente.';

    return NextResponse.json(
      { 
        error: errorMessage,
        code: error.code || 'BOOKING_ERROR',
        retryable: !error.message?.includes('payment')
      },
      { status: 400 }
    );
  }
}

// Helper functions for mobile optimization
function getPopularTimeSlots(courtId: string, date: string) {
  // Return most popular booking times for this court
  // This would typically come from analytics data
  return [
    '09:00', '10:30', '18:00', '19:30'
  ];
}

function getQuickBookingSlots(availabilityData: any, count: number) {
  // Extract the most available and popular slots for quick mobile booking
  if (!availabilityData?.availability) return [];
  
  const allSlots = availabilityData.availability
    .flatMap((court: any) => 
      court.slots
        .filter((slot: any) => slot.is_available)
        .map((slot: any) => ({
          courtId: court.court.id,
          courtName: court.court.name,
          startTime: slot.start_time,
          price: slot.price,
          popularity: getTimeSlotPopularity(slot.start_time), // Synthetic popularity score
        }))
    )
    .sort((a: any, b: any) => b.popularity - a.popularity)
    .slice(0, count);

  return allSlots;
}

function getTimeSlotPopularity(time: string): number {
  // Synthetic popularity scoring for mobile optimization
  const hour = parseInt(time.split(':')[0]);
  
  // Peak hours: 18:00-21:00 (most popular)
  if (hour >= 18 && hour <= 21) return 100;
  // Morning hours: 09:00-12:00 (popular)
  if (hour >= 9 && hour <= 12) return 80;
  // Afternoon: 15:00-17:00 (medium)
  if (hour >= 15 && hour <= 17) return 60;
  // Early evening: 21:00-22:00 (medium)
  if (hour >= 21 && hour <= 22) return 50;
  // Other times (less popular)
  return 30;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

function generateCalendarUrl(reservation: any): string {
  const startDate = new Date(`${reservation.date}T${reservation.start_time}`);
  const endDate = new Date(`${reservation.date}T${reservation.end_time}`);
  
  const title = encodeURIComponent(`Padel - ${reservation.court.name}`);
  const details = encodeURIComponent(`Reserva de padel\nPista: ${reservation.court.name}\nJugador: ${reservation.player_name}`);
  
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${details}`;
}