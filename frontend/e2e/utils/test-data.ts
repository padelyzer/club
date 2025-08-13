// Test data configuration for PZR4 functional tests
export const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'Admin123!'
  },
  clubAdmin: {
    email: 'clubadmin@test.com', 
    password: 'ClubAdmin123!'
  },
  user: {
    email: 'user@test.com',
    password: 'User123!'
  },
  manager: {
    email: 'manager@test.com',
    password: 'Manager123!'
  }
};

export const testConfig = {
  baseUrl: 'http://localhost:3001',
  timeout: 30000,
  retries: 2,
  workers: 1
};

export const testData = {
  clubs: [
    {
      name: 'Test Paddle Club',
      address: '123 Test Street, Test City',
      phone: '+1234567890',
      email: 'club@test.com'
    }
  ],
  clients: [
    {
      name: 'John Doe',
      email: 'john@test.com',
      phone: '+1234567890',
      level: 'intermediate'
    },
    {
      name: 'Jane Smith',
      email: 'jane@test.com', 
      phone: '+0987654321',
      level: 'advanced'
    }
  ],
  courts: [
    {
      name: 'Court 1',
      type: 'indoor',
      status: 'active'
    },
    {
      name: 'Court 2', 
      type: 'outdoor',
      status: 'active'
    }
  ],
  reservations: [
    {
      court: 'Court 1',
      date: '2025-08-10',
      time: '18:00',
      duration: 90,
      players: 4
    }
  ]
};

// Test selectors - central place for all selectors
export const selectors = {
  navigation: {
    dashboard: '[data-testid="nav-dashboard"], a[href*="dashboard"]',
    clients: '[data-testid="nav-clients"], a[href*="clients"]',
    reservations: '[data-testid="nav-reservations"], a[href*="reservations"]',
    analytics: '[data-testid="nav-analytics"], a[href*="analytics"]',
    clubs: '[data-testid="nav-clubs"], a[href*="clubs"]'
  },
  forms: {
    loginEmail: 'input[name="email"], input[type="email"]',
    loginPassword: 'input[name="password"], input[type="password"]',
    submitButton: 'button[type="submit"], [data-testid="submit-button"]'
  },
  common: {
    loadingSpinner: '[data-testid="loading"], .loading, .spinner',
    errorMessage: '[data-testid="error"], .error-message, .alert-error',
    successMessage: '[data-testid="success"], .success-message, .alert-success',
    modal: '[data-testid="modal"], .modal, [role="dialog"]',
    closeButton: '[data-testid="close"], .close, [aria-label="close"]'
  },
  dashboard: {
    welcomeMessage: '[data-testid="welcome"], h1, h2',
    statsCards: '[data-testid="stats"], .stats, .metric',
    quickActions: '[data-testid="quick-actions"], .quick-actions'
  },
  clients: {
    addButton: '[data-testid="add-client"], [data-testid="add-button"]',
    table: '[data-testid="clients-table"], table',
    searchInput: '[data-testid="search"], input[placeholder*="search"]',
    filterButton: '[data-testid="filter"], .filter-button'
  }
};

export const urls = {
  login: '/login',
  dashboard: '/dashboard', 
  clients: '/clients',
  reservations: '/reservations',
  analytics: '/analytics',
  clubs: '/clubs',
  profile: '/profile'
};
