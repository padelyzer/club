// Test data centralizada para todo el sistema Padelyzer

export const TestData = {
  // Datos de autenticación
  auth: {
    admin: {
      email: 'admin@padelyzer.com',
      password: 'admin123',
      user: {
        id: 1,
        email: 'admin@padelyzer.com',
        username: 'admin',
        is_superuser: true,
        first_name: 'Admin',
        last_name: 'User'
      }
    },
    manager: {
      email: 'manager@padelyzer.com',
      password: 'manager123',
      user: {
        id: 2,
        email: 'manager@padelyzer.com',
        username: 'manager',
        is_superuser: false,
        first_name: 'Manager',
        last_name: 'User'
      }
    }
  },

  // Datos de clubes
  clubs: {
    valid: {
      name: 'Club Padel Madrid Centro',
      description: 'Club de padel premium en el centro de Madrid',
      city: 'Madrid',
      address: 'Calle Gran Vía 123',
      phone: '+34915123456',
      email: 'info@clubmadrid.com',
      website: 'https://clubmadrid.com',
      postal_code: '28013'
    },
    secondary: {
      name: 'Club Padel Barcelona',
      description: 'Club de padel junto al mar en Barcelona',
      city: 'Barcelona',
      address: 'Passeig Marítim 45',
      phone: '+34935987654',
      email: 'info@clubbcn.com'
    },
    update: {
      name: 'Club Padel Madrid Centro - Premium',
      description: 'Club renovado con nuevas instalaciones',
      phone: '+34915123457'
    },
    invalid: {
      name: '',
      description: '',
      email: 'invalid-email',
      phone: '123'
    }
  },

  // Datos de clientes
  clients: {
    registered: {
      user: {
        first_name: 'Juan',
        last_name: 'García',
        email: 'juan.garcia@example.com'
      },
      phone_number: '+34666123456',
      birth_date: '1985-03-15',
      rating: 4.5,
      level: { name: 'Intermedio' },
      membership_type: 'Premium',
      emergency_contact: '+34666123457'
    },
    secondary: {
      user: {
        first_name: 'Ana',
        last_name: 'Martín',
        email: 'ana.martin@example.com'
      },
      phone_number: '+34666987654',
      rating: 3.8,
      level: { name: 'Avanzado' },
      membership_type: 'Basic'
    },
    newClient: {
      first_name: 'María',
      last_name: 'López',
      email: 'maria.lopez@example.com',
      phone_number: '+34666789012',
      birth_date: '1990-05-15',
      level: 'Principiante'
    },
    visitor: {
      name: 'Carlos Visitante',
      phone: '+34666555444',
      email: 'carlos.visitante@example.com'
    },
    invalid: {
      first_name: '',
      last_name: '',
      email: 'invalid-email',
      phone_number: '123'
    }
  },

  // Datos de canchas
  courts: {
    covered: {
      name: 'Cancha 1 - Cubierta',
      type: 'covered',
      status: 'active',
      hourly_rate: 35.00,
      lighting: true,
      surface: 'artificial_grass'
    },
    outdoor: {
      name: 'Cancha 2 - Exterior',
      type: 'outdoor', 
      status: 'active',
      hourly_rate: 25.00,
      lighting: true,
      surface: 'artificial_grass'
    },
    premium: {
      name: 'Cancha Premium',
      type: 'covered',
      status: 'active',
      hourly_rate: 50.00,
      lighting: true,
      surface: 'synthetic',
      has_air_conditioning: true
    },
    maintenance: {
      name: 'Cancha en Mantenimiento',
      type: 'outdoor',
      status: 'maintenance',
      hourly_rate: 30.00
    }
  },

  // Datos de reservas
  reservations: {
    valid: {
      date: '2024-08-15',
      time_slot: '10:00-11:30',
      duration: 90,
      price: 45.00,
      notes: 'Reserva para partida amistosa',
      players_count: 4
    },
    visitor: {
      date: '2024-08-16',
      time_slot: '14:00-15:30',
      duration: 90,
      price: 37.50,
      players_count: 2
    },
    weekend: {
      date: '2024-08-17', // Sábado
      time_slot: '18:00-19:30',
      duration: 90,
      price: 55.00,
      players_count: 4
    }
  },

  // Datos de horarios
  timeSlots: [
    { time: '08:00-09:30', available: true, price: 30.00, peak_hours: false },
    { time: '10:00-11:30', available: true, price: 35.00, peak_hours: false },
    { time: '12:00-13:30', available: false, price: 40.00, peak_hours: true },
    { time: '14:00-15:30', available: true, price: 45.00, peak_hours: true },
    { time: '16:00-17:30', available: true, price: 45.00, peak_hours: true },
    { time: '18:00-19:30', available: false, price: 50.00, peak_hours: true },
    { time: '20:00-21:30', available: true, price: 55.00, peak_hours: true },
    { time: '22:00-23:30', available: true, price: 40.00, peak_hours: false }
  ],

  // Datos de torneos
  tournaments: {
    upcoming: {
      name: 'Torneo de Verano 2024',
      description: 'Torneo abierto para todas las categorías',
      start_date: '2024-09-01',
      end_date: '2024-09-15',
      registration_deadline: '2024-08-25',
      category: 'Open',
      max_participants: 32,
      entry_fee: 25.00,
      prize_pool: 500.00
    },
    category_based: {
      name: 'Torneo Intermedio',
      description: 'Torneo para jugadores de nivel intermedio',
      start_date: '2024-09-20',
      end_date: '2024-09-25',
      category: 'Intermediate',
      max_participants: 16,
      entry_fee: 20.00
    }
  },

  // Datos de clases
  classes: {
    group: {
      name: 'Clase Grupal Principiantes',
      description: 'Clase para aprender los fundamentos del padel',
      instructor: 'Carlos Instructor',
      max_students: 8,
      duration: 60,
      price: 15.00,
      level: 'Beginner',
      schedule: 'Monday 18:00-19:00'
    },
    private: {
      name: 'Clase Particular',
      description: 'Clase personalizada uno a uno',
      instructor: 'Ana Instructora',
      max_students: 1,
      duration: 60,
      price: 45.00,
      level: 'All levels'
    }
  },

  // Datos financieros
  finance: {
    income: {
      amount: 1250.00,
      description: 'Ingresos por reservas',
      category: 'reservations',
      date: '2024-08-10',
      payment_method: 'card'
    },
    expense: {
      amount: 300.00,
      description: 'Mantenimiento de canchas',
      category: 'maintenance', 
      date: '2024-08-10',
      payment_method: 'bank_transfer'
    },
    membership: {
      amount: 50.00,
      description: 'Cuota mensual Premium',
      category: 'membership',
      recurring: true,
      billing_cycle: 'monthly'
    }
  },

  // Datos de pagos
  payments: {
    card: {
      method: 'credit_card',
      card_number: '4111111111111111',
      expiry_month: '12',
      expiry_year: '2025',
      cvv: '123',
      holder_name: 'Juan Garcia'
    },
    cash: {
      method: 'cash',
      amount: 45.00,
      received_amount: 50.00,
      change: 5.00
    },
    transfer: {
      method: 'bank_transfer',
      account_number: 'ES1234567890123456789012',
      reference: 'RES123456'
    }
  },

  // Datos de analíticas
  analytics: {
    occupancy: {
      date: '2024-08-10',
      total_slots: 56,
      booked_slots: 42,
      occupancy_rate: 75.0,
      revenue: 1680.00
    },
    client_stats: {
      total_clients: 150,
      active_clients: 120,
      new_clients_month: 15,
      retention_rate: 85.5
    },
    financial_summary: {
      monthly_revenue: 12500.00,
      monthly_expenses: 3200.00,
      net_profit: 9300.00,
      profit_margin: 74.4
    }
  }
};

// Utilidades para generar datos dinámicos
export const DataGenerators = {
  // Generar fechas futuras
  futureDate: (daysFromNow: number = 7): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0];
  },

  // Generar teléfono aleatorio
  randomPhone: (): string => {
    const number = Math.floor(Math.random() * 900000000) + 100000000;
    return `+34${number}`;
  },

  // Generar email aleatorio
  randomEmail: (prefix: string = 'test'): string => {
    const timestamp = Date.now();
    return `${prefix}.${timestamp}@example.com`;
  },

  // Generar código de confirmación
  confirmationCode: (): string => {
    return 'RES' + Math.random().toString(36).substr(2, 6).toUpperCase();
  },

  // Generar ID único
  uniqueId: (prefix: string = 'test'): string => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
};

// Constantes del sistema
export const SystemConstants = {
  urls: {
    base: 'http://localhost:3001',
    api: 'http://localhost:8000/api/v1',
    login: '/login-simple',
    dashboard: '/dashboard',
    clubs: '/clubs',
    reservations: '/demo-reservas',
    clients: '/clients',
    tournaments: '/tournaments',
    classes: '/classes',
    finance: '/finance',
    analytics: '/analytics'
  },
  
  timeouts: {
    default: 10000,
    api: 15000,
    navigation: 20000,
    authentication: 30000
  },
  
  retries: {
    default: 2,
    api: 3,
    flaky: 5
  },

  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
    large: { width: 1920, height: 1080 }
  }
};

// Datos de prueba para edge cases
export const EdgeCases = {
  specialCharacters: {
    name: 'José María O\'Connor-López',
    email: 'jose.maria+test@domain-test.co.uk',
    phone: '+34 666 123 456',
    address: 'Calle Ñuñez, 123 - 3º A'
  },
  
  longTexts: {
    clubName: 'Club de Padel Extremadamente Largo Con Muchas Palabras Para Probar Los Límites Del Sistema',
    description: 'Esta es una descripción muy larga '.repeat(20)
  },
  
  boundaries: {
    maxParticipants: 999,
    minPrice: 0.01,
    maxPrice: 999.99,
    futureDate: DataGenerators.futureDate(365), // 1 año en el futuro
    pastDate: '2020-01-01'
  }
};
