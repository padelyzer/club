// e2e/performance/performance.spec.ts
// ⚡ TESTS DE PERFORMANCE Y MÉTRICAS

import { test, expect } from '@playwright/test';
import { TestHelpers, ModuleTestRunner } from '../utils/test-framework';
import { testUsers, urls } from '../utils/test-data';

test.describe('Performance Tests - Core Metrics', () => {
  let helpers: TestHelpers;
  let testRunner: ModuleTestRunner;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    testRunner = new ModuleTestRunner(page, 'Performance');
  });

  test('Page Load Performance - Critical Pages', async ({ page }) => {
    // Test login page performance (no auth needed)
    await testRunner.runFunctionTest('login_page_performance', async () => {
      const startTime = Date.now();
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // 3 seconds for login
    }, 'Login page loads under 3 seconds');

    // Test home/landing page if available
    await testRunner.runFunctionTest('home_page_performance', async () => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(4000); // 4 seconds for home
    }, 'Home page loads under 4 seconds');

    console.log(testRunner.generateReport());
  });

  test('Web Vitals and Core Metrics', async ({ page }) => {
    await page.goto('/login');

    await testRunner.runFunctionTest('core_web_vitals', async () => {
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: any = {};
            
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
            });
            
            // Add navigation timing
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navigation) {
              vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
              vitals.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
            }
            
            resolve(vitals);
          });
          
          observer.observe({ entryTypes: ['paint', 'navigation'] });
          
          // Fallback timeout
          setTimeout(() => {
            resolve({
              fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
              domContentLoaded: 0,
              loadComplete: 0
            });
          }, 5000);
        });
      });

      console.log('Web Vitals:', vitals);
      
      // Assertions
      if (vitals.fcp) {
        expect(vitals.fcp).toBeLessThan(2000); // FCP under 2 seconds
      }
      
      expect(vitals).toBeTruthy();
    }, 'Core Web Vitals within thresholds');

    await testRunner.runFunctionTest('resource_loading', async () => {
      const resources = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        return {
          totalResources: resources.length,
          scripts: resources.filter(r => r.name.includes('.js')).length,
          stylesheets: resources.filter(r => r.name.includes('.css')).length,
          images: resources.filter(r => r.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)).length,
          slowResources: resources.filter(r => r.duration > 1000).length
        };
      });

      console.log('Resource loading stats:', resources);
      
      expect(resources.totalResources).toBeGreaterThan(0);
      expect(resources.slowResources).toBeLessThan(5); // Less than 5 slow resources
    }, 'Resource loading is efficient');

    console.log(testRunner.generateReport());
  });

  test('Network and Bundle Analysis', async ({ page }) => {
    // Listen to network requests
    const requests: any[] = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    await testRunner.runFunctionTest('network_requests', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      const scriptRequests = requests.filter(r => r.resourceType === 'script');
      const stylesheetRequests = requests.filter(r => r.resourceType === 'stylesheet');
      const imageRequests = requests.filter(r => r.resourceType === 'image');
      
      console.log(`Network requests: ${requests.length} total`);
      console.log(`Scripts: ${scriptRequests.length}, Stylesheets: ${stylesheetRequests.length}, Images: ${imageRequests.length}`);
      
      // Reasonable limits for a modern web app
      expect(requests.length).toBeLessThan(100); // Total requests
      expect(scriptRequests.length).toBeLessThan(20); // Script files
      expect(stylesheetRequests.length).toBeLessThan(10); // CSS files
    }, 'Network requests are within reasonable limits');

    await testRunner.runFunctionTest('no_4xx_5xx_errors', async () => {
      const responses: any[] = [];
      page.on('response', response => {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      });

      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const errors = responses.filter(r => r.status >= 400);
      
      if (errors.length > 0) {
        console.log('Network errors found:', errors);
      }
      
      expect(errors.length).toBe(0);
    }, 'No HTTP 4xx/5xx errors');

    console.log(testRunner.generateReport());
  });

  test('JavaScript Performance', async ({ page }) => {
    await page.goto('/login');

    await testRunner.runFunctionTest('no_console_errors', async () => {
      const errors = await helpers.checkForJavaScriptErrors();
      expect(errors.length).toBe(0);
    }, 'No JavaScript console errors');

    await testRunner.runFunctionTest('memory_usage', async () => {
      const memoryInfo = await page.evaluate(() => {
        // @ts-ignore - performance.memory might not be available in all browsers
        if (performance.memory) {
          return {
            // @ts-ignore
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            // @ts-ignore
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            // @ts-ignore
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          };
        }
        return null;
      });

      if (memoryInfo) {
        console.log('Memory usage:', memoryInfo);
        
        // Memory usage should be reasonable (less than 50MB for initial page)
        const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        expect(usedMB).toBeLessThan(50);
      } else {
        console.log('Memory API not available');
      }
    }, 'JavaScript memory usage is reasonable');

    await testRunner.runFunctionTest('dom_size', async () => {
      const domStats = await page.evaluate(() => {
        return {
          elementCount: document.getElementsByTagName('*').length,
          bodyInnerHTML: document.body?.innerHTML?.length || 0
        };
      });

      console.log('DOM stats:', domStats);
      
      // Reasonable DOM size limits
      expect(domStats.elementCount).toBeLessThan(2000); // Less than 2000 DOM elements
      expect(domStats.bodyInnerHTML).toBeGreaterThan(0); // Has content
    }, 'DOM size is reasonable');

    console.log(testRunner.generateReport());
  });

  test('User Experience Metrics', async ({ page }) => {
    await testRunner.runFunctionTest('time_to_interactive', async () => {
      const startTime = Date.now();
      await page.goto('/login');
      
      // Wait for the page to be interactive
      await page.waitForLoadState('domcontentloaded');
      await page.waitForSelector('input, button', { timeout: 5000 });
      
      const timeToInteractive = Date.now() - startTime;
      
      console.log(`Time to Interactive: ${timeToInteractive}ms`);
      expect(timeToInteractive).toBeLessThan(3000); // 3 seconds
    }, 'Time to Interactive under 3 seconds');

    await testRunner.runFunctionTest('form_responsiveness', async () => {
      await page.goto('/login');
      
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      if (await emailInput.count() > 0) {
        const startTime = Date.now();
        await emailInput.fill('test@example.com');
        const responseTime = Date.now() - startTime;
        
        console.log(`Form input response time: ${responseTime}ms`);
        expect(responseTime).toBeLessThan(100); // Should be near-instantaneous
      }
    }, 'Form inputs are responsive');

    await testRunner.runFunctionTest('navigation_responsiveness', async () => {
      await page.goto('/');
      
      const links = page.locator('a[href]:visible').first();
      if (await links.count() > 0) {
        const startTime = Date.now();
        await links.click();
        await page.waitForLoadState('domcontentloaded');
        const navigationTime = Date.now() - startTime;
        
        console.log(`Navigation time: ${navigationTime}ms`);
        expect(navigationTime).toBeLessThan(2000); // 2 seconds for navigation
      }
    }, 'Navigation is responsive');

    console.log(testRunner.generateReport());
  });
});
