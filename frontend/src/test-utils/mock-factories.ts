import { faker } from '@faker-js/faker';

// Dashboard mock factory
export const createMockDashboardData = (overrides = {}) => ({
  monthlyRevenue: faker.number.int({ min: 10000, max: 50000 }),
  todayReservations: faker.number.int({ min: 10, max: 50 }),
  weeklyGrowth: faker.number.float({ min: -20, max: 30, precision: 0.1 }),
  occupancyRate: faker.number.int({ min: 50, max: 95 }),
  activeMembers: faker.number.int({ min: 100, max: 500 }),
  pendingPayments: faker.number.int({ min: 0, max: 20 }),
  upcomingClasses: faker.number.int({ min: 0, max: 15 }),
  maintenanceTasks: faker.number.int({ min: 0, max: 10 }),
  recentActivity: Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    type: faker.helpers.arrayElement(['reservation', 'payment', 'member', 'class']),
    message: faker.lorem.sentence(),
    time: `${faker.number.int({ min: 1, max: 60 })} min ago`
  })),
  courtUtilization: {
    labels: Array.from({ length: 4 }, (_, i) => `Court ${i + 1}`),
    data: Array.from({ length: 4 }, () => faker.number.int({ min: 50, max: 95 }))
  },
  revenueChart: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    data: Array.from({ length: 7 }, () => faker.number.int({ min: 1000, max: 5000 }))
  },
  ...overrides
});

// Auth context mock factory
export const createMockAuthContext = (overrides = {}) => ({
  user: {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    role: faker.helpers.arrayElement(['admin', 'manager', 'staff', 'member']),
    avatar: faker.image.avatar()
  },
  organizations: Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    role: faker.helpers.arrayElement(['admin', 'manager', 'member'])
  })),
  currentOrganization: {
    id: faker.string.uuid(),
    name: faker.company.name(),
    subscription: {
      plan: faker.helpers.arrayElement(['free', 'basic', 'pro', 'enterprise']),
      status: faker.helpers.arrayElement(['active', 'trial', 'past_due']),
      trialEndsAt: faker.date.future().toISOString()
    }
  },
  clubs: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
    id: faker.string.uuid(),
    name: faker.company.name(),
    role: faker.helpers.arrayElement(['admin', 'manager', 'staff'])
  })),
  currentClub: {
    id: faker.string.uuid(),
    name: faker.company.name(),
    settings: {
      timeZone: faker.helpers.arrayElement(['UTC', 'America/New_York', 'Europe/London']),
      currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
      language: faker.helpers.arrayElement(['en', 'es', 'fr'])
    }
  },
  permissions: [
    'clubs:read',
    'clubs:write',
    'reservations:read',
    'reservations:write',
    'analytics:read',
    'finance:read',
    'members:read',
    'members:write'
  ],
  ...overrides
});

// Availability mock factory
export const createMockAvailability = (overrides = {}) => {
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date.toISOString().split('T')[0];
  });

  return {
    dates,
    courts: Array.from({ length: faker.number.int({ min: 2, max: 6 }) }, (_, i) => ({
      id: `court${i + 1}`,
      name: `Court ${i + 1}`,
      type: faker.helpers.arrayElement(['indoor', 'outdoor', 'covered']),
      availableSlots: Array.from({ length: faker.number.int({ min: 8, max: 14 }) }, (_, j) => {
        const hour = 8 + j;
        return {
          start: `${hour.toString().padStart(2, '0')}:00`,
          end: `${(hour + 1).toString().padStart(2, '0')}:00`,
          price: faker.number.int({ min: 20, max: 50 }),
          isAvailable: faker.datatype.boolean({ probability: 0.7 }),
          duration: 60
        };
      })
    })),
    summary: {
      totalAvailable: faker.number.int({ min: 20, max: 80 }),
      totalSlots: faker.number.int({ min: 40, max: 100 }),
      averagePrice: faker.number.float({ min: 25, max: 45, precision: 0.01 })
    },
    ...overrides
  };
};

// Club mock factory
export const createMockClub = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  slug: faker.helpers.slugify(faker.company.name()).toLowerCase(),
  description: faker.lorem.paragraph(),
  logo: faker.image.url(),
  address: {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    zip: faker.location.zipCode(),
    country: faker.location.country()
  },
  contact: {
    phone: faker.phone.number(),
    email: faker.internet.email(),
    website: faker.internet.url()
  },
  settings: {
    timeZone: faker.helpers.arrayElement(['UTC', 'America/New_York', 'Europe/Madrid']),
    currency: faker.helpers.arrayElement(['USD', 'EUR', 'GBP']),
    language: faker.helpers.arrayElement(['en', 'es', 'fr']),
    reservationDuration: faker.helpers.arrayElement([30, 60, 90, 120]),
    cancellationPolicy: faker.number.int({ min: 1, max: 48 })
  },
  features: {
    onlineBooking: true,
    membershipManagement: true,
    classScheduling: faker.datatype.boolean(),
    tournamentManagement: faker.datatype.boolean(),
    financialReporting: faker.datatype.boolean()
  },
  statistics: {
    totalMembers: faker.number.int({ min: 50, max: 500 }),
    totalCourts: faker.number.int({ min: 2, max: 12 }),
    monthlyRevenue: faker.number.int({ min: 5000, max: 50000 }),
    occupancyRate: faker.number.float({ min: 40, max: 90, precision: 0.1 })
  },
  ...overrides
});

// Reservation mock factory
export const createMockReservation = (overrides = {}) => ({
  id: faker.string.uuid(),
  courtId: faker.string.uuid(),
  courtName: `Court ${faker.number.int({ min: 1, max: 8 })}`,
  date: faker.date.future().toISOString().split('T')[0],
  startTime: faker.helpers.arrayElement(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']),
  endTime: faker.helpers.arrayElement(['10:00', '11:00', '12:00', '15:00', '16:00', '17:00']),
  duration: faker.helpers.arrayElement([60, 90, 120]),
  price: faker.number.int({ min: 20, max: 80 }),
  status: faker.helpers.arrayElement(['confirmed', 'pending', 'cancelled', 'completed']),
  client: {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    phone: faker.phone.number()
  },
  players: Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, () => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email()
  })),
  notes: faker.datatype.boolean() ? faker.lorem.sentence() : null,
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  ...overrides
});

// Error response factory
export const createMockErrorResponse = (status = 500, message = 'Internal Server Error') => ({
  ok: false,
  status,
  json: async () => ({
    error: message,
    details: faker.lorem.sentence()
  })
});

// Success response factory
export const createMockSuccessResponse = (data: any) => ({
  ok: true,
  status: 200,
  json: async () => data,
  headers: new Headers({
    'content-type': 'application/json'
  })
});

// WebSocket message factory
export const createMockWebSocketMessage = (type: string, payload: any) => ({
  type,
  payload,
  timestamp: new Date().toISOString(),
  id: faker.string.uuid()
});

// Performance metrics factory
export const createMockPerformanceMetrics = () => ({
  pageLoadTime: faker.number.int({ min: 100, max: 1000 }),
  apiResponseTime: faker.number.int({ min: 50, max: 500 }),
  renderTime: faker.number.int({ min: 10, max: 200 }),
  interactionTime: faker.number.int({ min: 5, max: 100 })
});