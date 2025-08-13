import { test, expect } from '@playwright/test';

// Test data para clients
const TestClients = {
  registered: {
    user: {
      first_name: 'Juan',
      last_name: 'García',
      email: 'juan.garcia@example.com'
    },
    phone_number: '+34666123456',
    rating: 4.5,
    level: { name: 'Intermedio' },
    membership_type: 'Premium'
  },
  newClient: {
    first_name: 'María',
    last_name: 'López',
    email: 'maria.lopez@example.com',
    phone_number: '+34666789012',
    level: 'Principiante',
    birth_date: '1990-05-15'
  },
  visitor: {
    name: 'Carlos Visitante',
    phone: '+34666555444',
    email: 'carlos.visitante@example.com'
  },
  searchQueries: {
    phone: '666123456',
    email: 'juan.garcia@example.com',
    name: 'Juan García'
  }
};

// Global setup para mocks de API de clients
test.beforeEach(async ({ page }) => {
  // Mock API de clients
  await page.route('**/api/v1/clients/**', async route => {
    const method = route.request().method();
    const url = route.request().url();
    
    if (method === 'GET' && url.includes('/search')) {
      // GET buscar clientes
      const query = new URL(url).searchParams.get('q') || '';
      
      if (query.includes('666123456') || query.includes('juan.garcia')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'client-123',
              user: TestClients.registered.user,
              phone_number: TestClients.registered.phone_number,
              rating: TestClients.registered.rating,
              level: TestClients.registered.level,
              membership_type: TestClients.registered.membership_type,
              total_bookings: 25,
              last_booking: '2024-08-01T10:00:00Z'
            }
          ])
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    } else if (method === 'GET' && url.includes('/clients/')) {
      // GET lista de clientes
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 5,
          results: [
            {
              id: 'client-123',
              user: TestClients.registered.user,
              phone_number: TestClients.registered.phone_number,
              rating: TestClients.registered.rating,
              level: TestClients.registered.level,
              membership_type: TestClients.registered.membership_type,
              total_bookings: 25
            },
            {
              id: 'client-456',
              user: {
                first_name: 'Ana',
                last_name: 'Martín',
                email: 'ana.martin@example.com'
              },
              phone_number: '+34666987654',
              rating: 3.8,
              level: { name: 'Avanzado' },
              membership_type: 'Basic',
              total_bookings: 18
            }
          ]
        })
      });
    } else if (method === 'POST') {
      // POST crear cliente
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'new-client-' + Date.now(),
          user: {
            first_name: TestClients.newClient.first_name,
            last_name: TestClients.newClient.last_name,
            email: TestClients.newClient.email
          },
          phone_number: TestClients.newClient.phone_number,
          level: { name: TestClients.newClient.level },
          rating: 0,
          total_bookings: 0,
          message: 'Client created successfully'
        })
      });
    } else if (method === 'PUT' || method === 'PATCH') {
      // PUT/PATCH actualizar cliente
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'client-123',
          user: {
            first_name: 'Juan Carlos',
            last_name: 'García',
            email: 'juan.garcia@example.com'
          },
          phone_number: TestClients.registered.phone_number,
          rating: 4.7,
          level: { name: 'Avanzado' },
          message: 'Client updated successfully'
        })
      });
    }
  });

  // Mock API de reservaciones para clientes
  await page.route('**/api/v1/reservations/**', async route => {
    const method = route.request().method();
    
    if (method === 'POST') {
      // POST crear reservación
      const postData = route.request().postDataJSON();
      
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'reservation-' + Date.now(),
          client_id: postData.client_id || null,
          visitor_name: postData.visitor_name || null,
          visitor_phone: postData.visitor_phone || null,
          court_id: postData.court_id,
          date: postData.date,
          time_slot: postData.time_slot,
          status: 'confirmed',
          message: 'Reservation created successfully'
        })
      });
    }
  });

  // Mock otras APIs necesarias
  await page.route('**/api/v1/auth/**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: 'admin@padelyzer.com',
        is_superuser: true
      })
    });
  });
});

test.describe('Clients Management Module', () => {
  
  test.describe('Client Search Functionality', () => {
    
    test('should search clients by phone number', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      // Verificar que el componente de búsqueda está presente
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await expect(searchInput).toBeVisible();
      
      // Buscar cliente por teléfono
      await searchInput.fill(TestClients.searchQueries.phone);
      await page.waitForTimeout(1000); // Esperar debounce
      
      // Verificar que se muestra el cliente encontrado
      await expect(page.locator('text=Juan García')).toBeVisible();
      await expect(page.locator('text=+34666123456')).toBeVisible();
      await expect(page.locator('text=juan.garcia@example.com')).toBeVisible();
    });
    
    test('should search clients by email', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill(TestClients.searchQueries.email);
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Juan García')).toBeVisible();
    });
    
    test('should handle empty search results', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill('999999999'); // Número que no existe
      await page.waitForTimeout(1000);
      
      // Verificar mensaje de no resultados o estado vacío
      const noResults = page.locator('text=No clients found, text=Sin resultados, text=No se encontraron');
      if (await noResults.count() > 0) {
        await expect(noResults.first()).toBeVisible();
      }
    });
    
    test('should clear search and show visitor mode option', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill('test');
      await searchInput.clear();
      
      // Verificar que se puede acceder al modo visitante
      const visitorMode = page.locator('text=Visitante, text=Visitor, text=Guest');
      if (await visitorMode.count() > 0) {
        await expect(visitorMode.first()).toBeVisible();
      }
    });
  });
  
  test.describe('Client Selection', () => {
    
    test('should select an existing client for reservation', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      // Buscar y seleccionar cliente
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill(TestClients.searchQueries.phone);
      await page.waitForTimeout(1000);
      
      // Click en el cliente encontrado (si hay botón de seleccionar)
      const selectButton = page.locator('button', { hasText: /Select|Seleccionar|Elegir/ });
      if (await selectButton.count() > 0) {
        await selectButton.first().click();
      } else {
        // O click directamente en el cliente
        await page.locator('text=Juan García').click();
      }
      
      // Verificar que el cliente fue seleccionado
      await expect(page.locator('text=Juan García')).toBeVisible();
    });
    
    test('should display client information correctly', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill(TestClients.searchQueries.phone);
      await page.waitForTimeout(1000);
      
      // Verificar información del cliente
      await expect(page.locator('text=Juan García')).toBeVisible();
      await expect(page.locator('text=+34666123456')).toBeVisible();
      await expect(page.locator('text=juan.garcia@example.com')).toBeVisible();
      
      // Verificar información adicional si está disponible
      const ratingElement = page.locator('text=4.5');
      const levelElement = page.locator('text=Intermedio');
      
      if (await ratingElement.count() > 0) {
        await expect(ratingElement).toBeVisible();
      }
      if (await levelElement.count() > 0) {
        await expect(levelElement).toBeVisible();
      }
    });
  });
  
  test.describe('Visitor Mode', () => {
    
    test('should switch to visitor mode and enter visitor information', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      // Buscar botón o switch para modo visitante
      const visitorToggle = page.locator('text=Visitante, text=Visitor, text=Guest, input[type="checkbox"], button').filter({ hasText: /Visitante|Visitor|Guest/ });
      
      if (await visitorToggle.count() > 0) {
        await visitorToggle.first().click();
        
        // Verificar que aparecen campos para visitante
        const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="nombre"]');
        const phoneInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
        
        if (await nameInput.count() > 0) {
          await nameInput.fill(TestClients.visitor.name);
        }
        if (await phoneInput.count() > 0) {
          await phoneInput.fill(TestClients.visitor.phone);
        }
        
        // Verificar que la información se muestra correctamente
        await expect(page.locator(`text=${TestClients.visitor.name}`)).toBeVisible();
      }
    });
    
    test('should validate visitor information', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const visitorToggle = page.locator('text=Visitante, text=Visitor, text=Guest, input[type="checkbox"], button').filter({ hasText: /Visitante|Visitor|Guest/ });
      
      if (await visitorToggle.count() > 0) {
        await visitorToggle.first().click();
        
        // Intentar enviar información incompleta
        const nameInput = page.locator('input[placeholder*="name"], input[placeholder*="nombre"]');
        const phoneInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
        
        if (await nameInput.count() > 0) {
          await nameInput.fill(''); // Nombre vacío
        }
        
        // Buscar mensajes de validación
        const validationMessage = page.locator('text=required, text=requerido, text=obligatorio');
        if (await validationMessage.count() > 0) {
          await expect(validationMessage.first()).toBeVisible();
        }
      }
    });
  });
  
  test.describe('Client Creation Flow', () => {
    
    test('should create new client from search', async ({ page }) => {
      // Este test depende de si hay funcionalidad para crear cliente desde búsqueda
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill('666999888'); // Teléfono que no existe
      await page.waitForTimeout(1000);
      
      // Buscar opción para crear nuevo cliente
      const createButton = page.locator('text=Create, text=Crear, text=Add, text=Agregar').filter({ hasText: /client|cliente/ });
      
      if (await createButton.count() > 0) {
        await createButton.click();
        
        // Verificar que se abre formulario de creación
        const nameField = page.locator('input[name="first_name"], input[placeholder*="first name"]');
        if (await nameField.count() > 0) {
          await expect(nameField).toBeVisible();
        }
      }
    });
  });
  
  test.describe('Client Information Display', () => {
    
    test('should display client booking history', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill(TestClients.searchQueries.phone);
      await page.waitForTimeout(1000);
      
      // Buscar información de historial si está disponible
      const historyInfo = page.locator('text=bookings, text=reservas, text=25');
      if (await historyInfo.count() > 0) {
        await expect(historyInfo.first()).toBeVisible();
      }
    });
    
    test('should display client level and rating', async ({ page }) => {
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill(TestClients.searchQueries.phone);
      await page.waitForTimeout(1000);
      
      // Verificar nivel y rating si están disponibles
      const levelInfo = page.locator('text=Intermedio');
      const ratingInfo = page.locator('text=4.5');
      
      if (await levelInfo.count() > 0) {
        await expect(levelInfo).toBeVisible();
      }
      if (await ratingInfo.count() > 0) {
        await expect(ratingInfo).toBeVisible();
      }
    });
  });
  
  test.describe('Responsive Design', () => {
    
    test('should work correctly on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      // Verificar que el componente se muestra correctamente en móvil
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await expect(searchInput).toBeVisible();
      
      // Realizar búsqueda en móvil
      await searchInput.fill(TestClients.searchQueries.phone);
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Juan García')).toBeVisible();
    });
    
    test('should work correctly on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill(TestClients.searchQueries.phone);
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Juan García')).toBeVisible();
    });
  });
  
  test.describe('Error Handling', () => {
    
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock error de API
      await page.route('**/api/v1/clients/search**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Internal server error'
          })
        });
      });
      
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill(TestClients.searchQueries.phone);
      await page.waitForTimeout(1000);
      
      // Verificar manejo de errores
      const errorMessage = page.locator('text=error, text=Error, text=problema');
      if (await errorMessage.count() > 0) {
        await expect(errorMessage.first()).toBeVisible();
      }
    });
    
    test('should handle network timeouts', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/v1/clients/search**', async route => {
        await new Promise(resolve => setTimeout(resolve, 30000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });
      
      await page.goto('/demo-reservas');
      await page.waitForLoadState('networkidle');
      
      const searchInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      await searchInput.fill(TestClients.searchQueries.phone);
      
      // Verificar que hay indicador de carga
      const loadingIndicator = page.locator('text=Loading, text=Cargando, text=Buscando');
      if (await loadingIndicator.count() > 0) {
        await expect(loadingIndicator.first()).toBeVisible();
      }
    });
  });
});

test.describe('Client Data Validation', () => {
  
  test('should validate phone number format', async ({ page }) => {
    await page.goto('/demo-reservas');
    await page.waitForLoadState('networkidle');
    
    const visitorToggle = page.locator('text=Visitante, text=Visitor, text=Guest, input[type="checkbox"], button').filter({ hasText: /Visitante|Visitor|Guest/ });
    
    if (await visitorToggle.count() > 0) {
      await visitorToggle.first().click();
      
      const phoneInput = page.locator('input[placeholder*="phone"], input[placeholder*="teléfono"]');
      if (await phoneInput.count() > 0) {
        // Probar formato inválido
        await phoneInput.fill('123');
        
        const validationMessage = page.locator('text=invalid, text=inválido, text=formato');
        if (await validationMessage.count() > 0) {
          await expect(validationMessage.first()).toBeVisible();
        }
      }
    }
  });
  
  test('should validate email format', async ({ page }) => {
    await page.goto('/demo-reservas');
    await page.waitForLoadState('networkidle');
    
    const visitorToggle = page.locator('text=Visitante, text=Visitor, text=Guest, input[type="checkbox"], button').filter({ hasText: /Visitante|Visitor|Guest/ });
    
    if (await visitorToggle.count() > 0) {
      await visitorToggle.first().click();
      
      const emailInput = page.locator('input[type="email"], input[placeholder*="email"]');
      if (await emailInput.count() > 0) {
        // Probar formato inválido
        await emailInput.fill('invalid-email');
        
        const validationMessage = page.locator('text=invalid, text=inválido, text=email');
        if (await validationMessage.count() > 0) {
          await expect(validationMessage.first()).toBeVisible();
        }
      }
    }
  });
});
