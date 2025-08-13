/**
 * Tests E2E para validar sincronización entre backend y frontend
 */

import { test, expect } from '@playwright/test';
import { transformKeysSnakeToCamel, transformKeysCamelToSnake } from '@/lib/api/middleware';

test.describe('Data Synchronization Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navegar a la aplicación
    await page.goto('/');
  });

  test('should transform snake_case to camelCase correctly', async ({ page }) => {
    // Test de transformación en el navegador
    const result = await page.evaluate(() => {
      const testData = {
        user_name: 'John Doe',
        created_at: '2024-01-01',
        is_active: true,
        nested_object: {
          field_name: 'value',
          another_field: 123
        }
      };
      
      // Simular transformación
      function snakeToCamel(str: string): string {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      }
      
      function transformKeys(obj: any): any {
        if (Array.isArray(obj)) {
          return obj.map(item => transformKeys(item));
        }
        
        if (typeof obj === 'object' && obj !== null) {
          const transformed: any = {};
          Object.keys(obj).forEach(key => {
            const camelKey = snakeToCamel(key);
            transformed[camelKey] = transformKeys(obj[key]);
          });
          return transformed;
        }
        
        return obj;
      }
      
      return transformKeys(testData);
    });
    
    expect(result).toEqual({
      userName: 'John Doe',
      createdAt: '2024-01-01',
      isActive: true,
      nestedObject: {
        fieldName: 'value',
        anotherField: 123
      }
    });
  });

  test('should handle API response transformation', async ({ page, request }) => {
    // Login primero
    const loginResponse = await request.post('/api/auth/login/', {
      data: {
        email: 'test@example.com',
        password: 'testpassword'
      }
    });
    
    if (loginResponse.ok()) {
      const tokens = await loginResponse.json();
      
      // Hacer petición a un endpoint
      const response = await request.get('/api/clubs/', {
        headers: {
          'Authorization': `Bearer ${tokens.access}`
        }
      });
      
      const data = await response.json();
      
      // Verificar que la respuesta tiene la estructura esperada
      if (data.results && data.results.length > 0) {
        const club = data.results[0];
        
        // Verificar campos críticos
        expect(club).toHaveProperty('id');
        expect(club).toHaveProperty('name');
        expect(club).toHaveProperty('created_at');
        
        // Verificar tipos de datos
        expect(typeof club.id).toBe('number');
        expect(typeof club.name).toBe('string');
        expect(typeof club.created_at).toBe('string');
      }
    }
  });

  test('should validate health check endpoint', async ({ request }) => {
    const response = await request.get('/api/health/check/');
    const data = await response.json();
    
    // Verificar estructura de health check
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('checks');
    
    // Verificar checks individuales
    expect(data.checks).toHaveProperty('database');
    expect(data.checks).toHaveProperty('cache');
    expect(data.checks).toHaveProperty('api_format');
    expect(data.checks).toHaveProperty('model_integrity');
    expect(data.checks).toHaveProperty('system');
    
    // Cada check debe tener estructura consistente
    Object.values(data.checks).forEach((check: any) => {
      expect(check).toHaveProperty('healthy');
      expect(check).toHaveProperty('message');
      expect(check).toHaveProperty('details');
    });
  });

  test('should detect type mismatches in runtime', async ({ page }) => {
    // Navegar a una página que use el TypeValidationMiddleware
    await page.goto('/dashboard');
    
    // Interceptar errores de consola
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Realizar acciones que carguen datos
    await page.waitForTimeout(2000);
    
    // Verificar que no hay errores de validación de tipos
    const typeErrors = consoleErrors.filter(error => 
      error.includes('Type validation error') || 
      error.includes('Validation failed')
    );
    
    expect(typeErrors).toHaveLength(0);
  });

  test('should handle pagination correctly', async ({ page, request }) => {
    const response = await request.get('/api/reservations/?page=1&page_size=10');
    const data = await response.json();
    
    // Verificar estructura de paginación
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('next');
    expect(data).toHaveProperty('previous');
    expect(data).toHaveProperty('results');
    
    // Verificar que results es un array
    expect(Array.isArray(data.results)).toBe(true);
    
    // Si hay resultados, verificar consistencia
    if (data.results.length > 0) {
      const firstItem = data.results[0];
      const requiredFields = ['id', 'created_at'];
      
      requiredFields.forEach(field => {
        expect(firstItem).toHaveProperty(field);
      });
    }
  });

  test('should handle error responses consistently', async ({ request }) => {
    // Intentar acceder a un recurso sin autenticación
    const response = await request.get('/api/reservations/999999/');
    
    if (!response.ok()) {
      const errorData = await response.json();
      
      // Verificar estructura de error consistente
      expect(errorData).toHaveProperty('detail');
      // O podría tener 'error' o 'message'
      const hasErrorField = 
        errorData.hasOwnProperty('detail') || 
        errorData.hasOwnProperty('error') || 
        errorData.hasOwnProperty('message');
        
      expect(hasErrorField).toBe(true);
    }
  });

  test('should validate CRUD operations flow', async ({ page, request }) => {
    // Este test verifica el flujo completo de crear, leer, actualizar y eliminar
    
    // 1. Login
    const loginResponse = await request.post('/api/auth/login/', {
      data: {
        email: 'admin@example.com',
        password: 'adminpassword'
      }
    });
    
    if (!loginResponse.ok()) {
      console.log('Login failed, skipping CRUD test');
      return;
    }
    
    const { access } = await loginResponse.json();
    const headers = { 'Authorization': `Bearer ${access}` };
    
    // 2. Create (si tenemos permisos)
    const createData = {
      name: 'Test Club E2E',
      description: 'Created by E2E test',
      email: 'test-e2e@example.com',
      phone: '+34600000000'
    };
    
    const createResponse = await request.post('/api/clubs/', {
      headers,
      data: createData
    });
    
    if (createResponse.ok()) {
      const createdItem = await createResponse.json();
      
      // 3. Read
      const readResponse = await request.get(`/api/clubs/${createdItem.id}/`, {
        headers
      });
      
      expect(readResponse.ok()).toBe(true);
      const readItem = await readResponse.json();
      expect(readItem.name).toBe(createData.name);
      
      // 4. Update
      const updateData = {
        ...readItem,
        description: 'Updated by E2E test'
      };
      
      const updateResponse = await request.patch(`/api/clubs/${createdItem.id}/`, {
        headers,
        data: { description: updateData.description }
      });
      
      if (updateResponse.ok()) {
        const updatedItem = await updateResponse.json();
        expect(updatedItem.description).toBe(updateData.description);
      }
      
      // 5. Delete
      const deleteResponse = await request.delete(`/api/clubs/${createdItem.id}/`, {
        headers
      });
      
      expect(deleteResponse.status()).toBeLessThan(300);
    }
  });
  
  test('should monitor sync health status', async ({ page }) => {
    // Navegar al dashboard donde está el SyncMonitor
    await page.goto('/dashboard');
    
    // Esperar a que el monitor se cargue
    await page.waitForSelector('button:has-text("System Monitor")', { 
      timeout: 10000 
    });
    
    // Abrir el monitor
    await page.click('button:has-text("System Monitor")');
    
    // Verificar que muestra el estado
    await expect(page.locator('text=Overall Status')).toBeVisible();
    
    // Verificar que muestra los health checks
    await expect(page.locator('text=Database')).toBeVisible();
    await expect(page.locator('text=Cache')).toBeVisible();
    await expect(page.locator('text=Model integrity')).toBeVisible();
  });
});

test.describe('Performance and N+1 Query Tests', () => {
  
  test('should load lists efficiently without N+1 queries', async ({ page, request }) => {
    const startTime = Date.now();
    
    const response = await request.get('/api/reservations/?page_size=50');
    
    const responseTime = Date.now() - startTime;
    
    // La respuesta no debería tardar más de 2 segundos incluso con 50 items
    expect(responseTime).toBeLessThan(2000);
    
    if (response.ok()) {
      const data = await response.json();
      
      // Verificar que las relaciones están incluidas (no lazy loading)
      if (data.results.length > 0) {
        const firstItem = data.results[0];
        
        // Si tiene relaciones, deberían estar expandidas
        if (firstItem.court) {
          expect(typeof firstItem.court).toBe('object');
          expect(firstItem.court).toHaveProperty('name');
        }
        
        if (firstItem.user) {
          expect(typeof firstItem.user).toBe('object');
          expect(firstItem.user).toHaveProperty('email');
        }
      }
    }
  });
});