#!/usr/bin/env node

const fs = require('fs');

const filePath = './src/components/reservations/apple-booking-flow.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix object properties that are not properly formatted
const objectFixes = [
  // Fix BookingData interface
  {
    search: `  };
playerCount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';`,
    replace: `  };
  playerCount: number;
  paymentMethod: 'cash' | 'card' | 'transfer';`
  },
  // Fix AppleBookingFlowProps interface
  {
    search: `interface AppleBookingFlowProps {
  clubId?: string; // Optional, will use active club if not provided
onSuccess: (reservation: any) => void;
  onCancel: () => void;`,
    replace: `interface AppleBookingFlowProps {
  clubId?: string; // Optional, will use active club if not provided
  onSuccess: (reservation: any) => void;
  onCancel: () => void;`
  },
  // Fix switch statement default cases
  {
    search: `    case 'mixed': return '🔄';
default: return '🎾';`,
    replace: `    case 'mixed': return '🔄';
    default: return '🎾';`
  },
  {
    search: `        return true;
default: return false;`,
    replace: `        return true;
      default: return false;`
  },
  // Fix the reservationData object
  {
    search: `      const reservationData = {
club: clubId
court: bookingData.court!.id
        date: format(bookingData.date!, 'yyyy-MM-dd'),
start_time: bookingData.startTime
        end_time: format(endTime, 'HH:mm'),
client: bookingData.clientType === 'registered' ? bookingData.client?.id : undefined
visitor_name: bookingData.clientType === 'visitor' ? bookingData.visitorData.name : undefined
visitor_email: bookingData.clientType === 'visitor' ? bookingData.visitorData.email : undefined
visitor_phone: bookingData.clientType === 'visitor' ? bookingData.visitorData.phone : undefined
players_count: bookingData.playerCount
notes: bookingData.notes
status: 'confirmed'
      };`,
    replace: `      const reservationData = {
        club: clubId,
        court: bookingData.court!.id,
        date: format(bookingData.date!, 'yyyy-MM-dd'),
        start_time: bookingData.startTime,
        end_time: format(endTime, 'HH:mm'),
        client: bookingData.clientType === 'registered' ? bookingData.client?.id : undefined,
        visitor_name: bookingData.clientType === 'visitor' ? bookingData.visitorData.name : undefined,
        visitor_email: bookingData.clientType === 'visitor' ? bookingData.visitorData.email : undefined,
        visitor_phone: bookingData.clientType === 'visitor' ? bookingData.visitorData.phone : undefined,
        players_count: bookingData.playerCount,
        notes: bookingData.notes,
        status: 'confirmed'
      };`
  },
  // Fix debug logging object
  {
    search: `    if (process.env.NODE_ENV === 'development') {
       : null,
isLoading: isLoadingAvailability
hasData: !!availabilityData
courtsCount: availabilityData?.courts?.length || 0
        availabilityData,

    }`,
    replace: `    if (process.env.NODE_ENV === 'development') {
      console.log('AppleBookingFlow: Availability data', {
        clubId,
        selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        isLoading: isLoadingAvailability,
        hasData: !!availabilityData,
        courtsCount: availabilityData?.courts?.length || 0,
        availabilityData
      });
    }`
  },
  // Fix the options object in useAvailability
  {
    search: `    {
includePricing: true
includeConflicts: false
    }`,
    replace: `    {
      includePricing: true,
      includeConflicts: false
    }`
  }
];

// Apply fixes
for (const fix of objectFixes) {
  if (content.includes(fix.search)) {
    content = content.replace(fix.search, fix.replace);
    console.log('✅ Applied fix');
  } else {
    console.log('⚠️  Pattern not found:', fix.search.split('\n')[0] + '...');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Fixed all object syntax issues in apple-booking-flow.tsx');