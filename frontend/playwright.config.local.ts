import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// Configuración local que reutiliza el servidor existente
export default defineConfig({
  ...baseConfig,
  // Desactivar webServer para usar el servidor existente
  webServer: undefined,
  // URL base del servidor local
  use: {
    ...baseConfig.use,
    baseURL: 'http://localhost:3000',
  }
});