import { defineConfig, devices } from '@playwright/test';

/**
 * PZR4 Playwright Configuration
 * Configuración optimizada para tests funcionales comprehensivos
 */

// Configuración base que puede ser sobrescrita por variables de entorno
const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
const isCI = !!process.env.CI;

export default defineConfig({
  // Directorio de tests
  testDir: './e2e',
  
  // Configuración de paralelización
  fullyParallel: true,
  
  // Fallar en CI si hay tests con .only
  forbidOnly: isCI,
  
  // Reintentos en fallos
  retries: isCI ? 2 : 0,
  
  // Workers (procesos paralelos)
  workers: isCI ? 1 : undefined,
  
  // Timeout global por test
  timeout: isCI ? 60000 : 30000, // 1 minuto en CI, 30s local
  
  // Timeout para expect
  expect: {
    timeout: 10000
  },
  
  // Reportes
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  // Configuración global
  use: {
    // URL base
    baseURL: baseURL,
    
    // Tracing - capturar trace en primer reintento
    trace: 'on-first-retry',
    
    // Screenshots solo en fallos
    screenshot: 'only-on-failure',
    
    // Videos para tests fallidos
    video: 'retain-on-failure',
    
    // Configuración de navegador
    ignoreHTTPSErrors: true,
    
    // Timeout para acciones individuales
    actionTimeout: 10000,
    
    // Timeout para navegación
    navigationTimeout: 15000,
    
    // Configuraciones adicionales
    locale: 'es-MX', // Configurar idioma español México
    timezoneId: 'America/Mexico_City',
    
    // Configuraciones de viewport por defecto
    viewport: { width: 1280, height: 720 },
    
    // User agent personalizado
    userAgent: 'PZR4-E2E-Tests/1.0 (Playwright)',
    
    // Headers adicionales
    extraHTTPHeaders: {
      'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
    }
  },

  // Proyectos - diferentes navegadores y dispositivos
  projects: [
    // Setup de autenticación
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Navegadores Desktop
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Usar estado de autenticación del setup
        storageState: 'e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Dispositivos Móviles
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },

    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        storageState: 'e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Tablets
    {
      name: 'iPad',
      use: { 
        ...devices['iPad'],
        storageState: 'e2e/.auth/user.json'
      },
      dependencies: ['setup']
    },

    // Tests específicos sin autenticación (login, etc.)
    {
      name: 'auth-tests',
      testMatch: /.*auth.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },

    // Tests de performance - solo Chrome
    {
      name: 'performance',
      testMatch: /.*performance.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Servidor web local
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120 * 1000, // 2 minutos para arrancar
    stdout: 'ignore',
    stderr: 'pipe'
  },

  // Configuración de folders de salida
  outputDir: 'test-results/'
});
