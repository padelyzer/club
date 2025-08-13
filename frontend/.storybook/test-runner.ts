import { TestRunnerConfig } from '@storybook/test-runner';
import { checkA11y, injectAxe } from 'axe-playwright';

const config: TestRunnerConfig = {
  // Hook que se ejecuta antes de cada test
  async preRender(page) {
    // Inyectar axe para tests de accesibilidad
    await injectAxe(page);
  },
  
  // Hook que se ejecuta después de renderizar cada story
  async postRender(page, context) {
    // Test de accesibilidad
    await checkA11y(page, '#storybook-root', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });

    // Tomar screenshot para visual regression
    const storyName = context.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const componentName = context.title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    
    await page.screenshot({
      path: `./screenshots/${componentName}--${storyName}.png`,
      fullPage: true,
    });
  },
};

export default config;