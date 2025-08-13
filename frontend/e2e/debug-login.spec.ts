import { test, expect } from '@playwright/test';

test.describe('Debug Login Process', () => {
  test('debug login step by step', async ({ page }) => {
    // Habilitar logs de consola
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', exception => console.log('PAGE ERROR:', exception.message));

    console.log('1. Navegando a login-simple...');
    await page.goto('/login-simple');
    
    console.log('2. Esperando a que la página cargue...');
    await page.waitForLoadState('networkidle');
    
    console.log('3. Verificando que los elementos existen...');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('4. Llenando email...');
    await page.fill('input[type="email"]', 'admin@padelyzer.com');
    
    console.log('5. Llenando password...');
    await page.fill('input[type="password"]', 'admin123');
    
    console.log('6. Haciendo click en submit...');
    await page.click('button[type="submit"]');
    
    console.log('7. Esperando respuesta... (5 segundos)');
    await page.waitForTimeout(5000);
    
    console.log('8. URL actual:', page.url());
    
    // Verificar si hay errores en la página
    const errorElement = page.locator('[style*="color: #c00"], [style*="color:#c00"]');
    if (await errorElement.isVisible()) {
      const errorText = await errorElement.textContent();
      console.log('9. Error encontrado:', errorText);
    } else {
      console.log('9. No se encontraron errores visibles');
    }
    
    // Verificar el estado del botón
    const submitButton = page.locator('button[type="submit"]');
    const buttonText = await submitButton.textContent();
    console.log('10. Texto del botón:', buttonText);
    
    // Intentar navegar manualmente al dashboard
    console.log('11. Intentando navegar manualmente al dashboard...');
    await page.goto('/dashboard');
    await page.waitForTimeout(3000);
    console.log('12. URL después de ir al dashboard:', page.url());
    
    // Capturar screenshot para debug
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    console.log('13. Screenshot guardado como debug-screenshot.png');
  });
});
