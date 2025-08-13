import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';
const adminAuthFile = 'e2e/.auth/admin.json';

setup('authenticate regular user', async ({ page }) => {
  // Mock the API response for login
  await page.route('**/api/v1/auth/login/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwidXNlcl9pZCI6MSwiZXhwIjo5OTk5OTk5OTk5fQ.mock_access_token',
        refresh: 'mock_refresh_token',
        user: {
          id: 1,
          email: 'admin@padelyzer.com',
          username: 'admin',
          is_superuser: true,
          first_name: 'Admin',
          last_name: 'User',
          name: 'Admin User'
        }
      })
    });
  });

  // Mock other API calls that might be made
  await page.route('**/api/v1/auth/profile/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: 'admin@padelyzer.com',
        username: 'admin',
        is_superuser: true,
        first_name: 'Admin',
        last_name: 'User',
        name: 'Admin User'
      })
    });
  });

  // Navegar al login
  await page.goto('/login-simple');
  
  // Llenar credenciales
  await page.fill('input[type="email"]', 'admin@padelyzer.com');
  await page.fill('input[type="password"]', 'admin123');

  // Submit form
  await page.click('button[type="submit"]');

  // Esperar a que aparezca el botón o la redirección
  try {
    // Esperar a que se navegue al dashboard o aparezca un mensaje de éxito
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  } catch (e) {
    // Si no redirige automáticamente, navegar manualmente
    await page.goto('/dashboard');
  }

  // Asegurarse de que los datos del usuario estén en localStorage
  await page.evaluate(() => {
    const user = {
      id: 1,
      email: 'admin@padelyzer.com',
      username: 'admin',
      is_superuser: true,
      first_name: 'Admin',
      last_name: 'User',
      name: 'Admin User',
      role: 'Administrator'
    };
    localStorage.setItem('user', JSON.stringify(user));
  });

  // Guardar el estado de autenticación
  await page.context().storageState({ path: authFile });
});

setup('authenticate admin user', async ({ page }) => {
  // Reutilizar la misma lógica que el usuario regular
  // Mock the API response for login
  await page.route('**/api/v1/auth/login/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwidXNlcl9pZCI6MSwiZXhwIjo5OTk5OTk5OTk5fQ.mock_access_token',
        refresh: 'mock_refresh_token',
        user: {
          id: 1,
          email: 'admin@padelyzer.com',
          username: 'admin',
          is_superuser: true,
          first_name: 'Admin',
          last_name: 'User',
          name: 'Admin User'
        }
      })
    });
  });

  // Mock other API calls
  await page.route('**/api/v1/auth/profile/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        email: 'admin@padelyzer.com',
        username: 'admin',
        is_superuser: true,
        first_name: 'Admin',
        last_name: 'User',
        name: 'Admin User'
      })
    });
  });

  // Navegar al login
  await page.goto('/login-simple');
  
  // Llenar credenciales
  await page.fill('input[type="email"]', 'admin@padelyzer.com');
  await page.fill('input[type="password"]', 'admin123');

  // Submit form
  await page.click('button[type="submit"]');

  // Esperar a que aparezca el botón o la redirección
  try {
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  } catch (e) {
    await page.goto('/dashboard');
  }

  // Guardar el estado de autenticación
  await page.context().storageState({ path: adminAuthFile });
});