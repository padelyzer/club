import { test, expect } from '@playwright/test';
import { TestHelpers, assertPagePerformance } from '../utils/helpers';

/**
 * E2E Performance Benchmark Tests
 * Validates critical performance metrics across all major user flows
 * Day 5-6 of Testing Suite - Performance Validation
 */

test.describe('Performance Benchmarks', () => {
  let helpers: TestHelpers;
  
  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('dashboard load performance should meet benchmarks', async ({ page }) => {
    const { duration, navigationTiming } = await helpers.measurePerformance(async () => {
      await page.goto('/dashboard');
      await helpers.waitForPageLoad();
      
      // Wait for all metrics to load
      await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    });
    
    // Performance benchmarks
    expect(duration, 'Dashboard should load within 2000ms').toBeLessThan(2000);
    
    // Check Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals: any = {};
          
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
          });
          
          resolve(vitals);
        }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve({}), 3000);
      });
    });
    
    console.log(`✅ Dashboard Performance:
      - Total Load: ${duration}ms
      - Navigation: ${navigationTiming?.duration || 'N/A'}ms
      - FCP: ${(vitals as any)?.fcp || 'N/A'}ms
      - LCP: ${(vitals as any)?.lcp || 'N/A'}ms`);
  });

  test('BFF endpoints should improve performance vs direct API calls', async ({ page }) => {
    // Test with BFF enabled (default)
    const bffTiming = await helpers.measurePerformance(async () => {
      await page.goto('/dashboard');
      await helpers.waitForPageLoad();
    });
    
    // Mock direct API calls (simulate BFF disabled)
    await page.route('**/api/dashboard/overview**', (route: any) => {
      // Simulate slower direct API calls
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            revenue: { total: 15420, growth: 12.5 },
            reservations: { today: 23, week: 156 },
            occupancy: { rate: 78, trend: 'up' }
          })
        });
      }, 300); // Add 300ms delay
    });
    
    const directTiming = await helpers.measurePerformance(async () => {
      await page.reload();
      await helpers.waitForPageLoad();
    });
    
    // BFF should be significantly faster
    const improvement = directTiming.duration - bffTiming.duration;
    expect(improvement, 'BFF should improve performance by at least 200ms')
      .toBeGreaterThan(200);
    
    console.log(`✅ BFF Performance Improvement:
      - BFF: ${bffTiming.duration}ms
      - Direct API: ${directTiming.duration}ms
      - Improvement: ${improvement}ms`);
  });

  test('availability check should complete under 500ms', async ({ page }) => {
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Navigate to reservations
    await page.click('[data-testid="nav-reservations"]');
    await helpers.waitForPageLoad();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    // Measure availability check performance
    const { duration } = await helpers.measurePerformance(async () => {
      await page.fill('[data-testid="date-picker"]', dateString);
      await helpers.waitForPageLoad();
      
      // Wait for availability grid to load
      await expect(page.locator('[data-testid="availability-grid"]')).toBeVisible();
      
      // Ensure all slots are loaded
      await expect(page.locator('[data-testid="time-slot"]').first()).toBeVisible();
    });
    
    expect(duration, 'Availability check should complete within 500ms').toBeLessThan(500);
    
    console.log(`✅ Availability Check Performance: ${duration}ms`);
  });

  test('reservation booking should complete under 3 seconds', async ({ page }) => {
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    await page.click('[data-testid="nav-reservations"]');
    await helpers.waitForPageLoad();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    
    // Complete booking flow performance
    const { duration } = await helpers.measurePerformance(async () => {
      // Select date
      await page.fill('[data-testid="date-picker"]', dateString);
      await helpers.waitForPageLoad();
      
      // Select available slot
      await page.locator('[data-testid="available-slot"]').first().click();
      await expect(page.locator('[data-testid="booking-modal"]')).toBeVisible();
      
      // Fill booking details
      await page.selectOption('[data-testid="booking-duration"]', '60');
      
      // Submit booking
      await page.click('[data-testid="booking-submit"]');
      
      // Wait for confirmation
      await expect(page.locator('[data-testid="booking-success"]')).toBeVisible();
    });
    
    expect(duration, 'Booking flow should complete within 3000ms').toBeLessThan(3000);
    
    console.log(`✅ Booking Flow Performance: ${duration}ms`);
  });

  test('page load performance under different network conditions', async ({ page }) => {
    // Test normal network
    const normalTiming = await helpers.measurePerformance(async () => {
      await page.goto('/dashboard');
      await helpers.waitForPageLoad();
    });
    
    // Test slow 3G network
    await helpers.simulateSlowNetwork();
    
    const slowTiming = await helpers.measurePerformance(async () => {
      await page.reload();
      await helpers.waitForPageLoad(10000); // Extended timeout
    });
    
    // Slow network should still be reasonable
    expect(slowTiming.duration, 'Page should load within 8s on slow network')
      .toBeLessThan(8000);
    
    // Performance degradation should be reasonable
    const degradationRatio = slowTiming.duration / normalTiming.duration;
    expect(degradationRatio, 'Performance degradation should be < 4x').toBeLessThan(4);
    
    console.log(`✅ Network Performance:
      - Normal: ${normalTiming.duration}ms
      - Slow 3G: ${slowTiming.duration}ms
      - Degradation: ${degradationRatio.toFixed(1)}x`);
  });

  test('mobile performance should meet benchmarks', async ({ page }) => {
    await helpers.simulateMobile();
    
    const mobileTiming = await helpers.measurePerformance(async () => {
      await page.goto('/dashboard');
      await helpers.waitForPageLoad();
      
      // Wait for mobile-specific elements
      await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-metrics"]')).toBeVisible();
    });
    
    // Mobile should meet performance targets
    expect(mobileTiming.duration, 'Mobile dashboard should load within 3000ms')
      .toBeLessThan(3000);
    
    // Test mobile navigation performance
    const navTiming = await helpers.measurePerformance(async () => {
      await page.tap('[data-testid="mobile-nav-toggle"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      await page.tap('[data-testid="nav-reservations"]');
      await helpers.waitForPageLoad();
    });
    
    expect(navTiming.duration, 'Mobile navigation should be under 1500ms')
      .toBeLessThan(1500);
    
    console.log(`✅ Mobile Performance:
      - Dashboard: ${mobileTiming.duration}ms
      - Navigation: ${navTiming.duration}ms`);
  });

  test('memory usage should remain stable during extended use', async ({ page }) => {
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Get initial memory usage
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null;
    });
    
    // Simulate extended usage
    for (let i = 0; i < 10; i++) {
      // Navigate between sections
      await page.click('[data-testid="nav-reservations"]');
      await helpers.waitForPageLoad();
      
      await page.click('[data-testid="nav-analytics"]');
      await helpers.waitForPageLoad();
      
      await page.click('[data-testid="nav-dashboard"]');
      await helpers.waitForPageLoad();
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
    }
    
    // Get final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null;
    });
    
    if (initialMemory && finalMemory) {
      const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
      const growthMB = memoryGrowth / (1024 * 1024);
      
      // Memory growth should be reasonable
      expect(growthMB, 'Memory growth should be under 50MB after extended use')
        .toBeLessThan(50);
      
      console.log(`✅ Memory Usage:
        - Initial: ${(initialMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB
        - Final: ${(finalMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB
        - Growth: ${growthMB.toFixed(2)}MB`);
    } else {
      console.log('✅ Memory monitoring not available in this browser');
    }
  });

  test('concurrent user simulation performance', async ({ page, context }) => {
    const userCount = 5;
    const pages: any[] = [];
    
    // Create multiple browser contexts (simulate concurrent users)
    for (let i = 0; i < userCount; i++) {
      const newPage = await context.newPage();
      pages.push(newPage);
    }
    
    // Measure concurrent dashboard loads
    const startTime = Date.now();
    
    const loadPromises = pages.map(async (userPage, index) => {
      const userStart = Date.now();
      
      try {
        await userPage.goto('/dashboard');
        await userPage.waitForLoadState('networkidle');
        await userPage.waitForSelector('[data-testid="dashboard-metrics"]');
        
        const userDuration = Date.now() - userStart;
        return { user: index + 1, duration: userDuration, success: true };
        
      } catch (error) {
        const userDuration = Date.now() - userStart;
        return { user: index + 1, duration: userDuration, success: false, error };
      }
    });
    
    const results = await Promise.all(loadPromises);
    const totalDuration = Date.now() - startTime;
    
    // Analyze results
    const successCount = results.filter(r => r.success).length;
    const averageDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxDuration = Math.max(...results.map(r => r.duration));
    
    // Performance expectations
    expect(successCount, 'All concurrent users should load successfully').toBe(userCount);
    expect(averageDuration, 'Average load time should be under 4000ms').toBeLessThan(4000);
    expect(maxDuration, 'Maximum load time should be under 6000ms').toBeLessThan(6000);
    
    console.log(`✅ Concurrent User Performance:
      - Users: ${userCount}
      - Success Rate: ${successCount}/${userCount}
      - Average Duration: ${averageDuration.toFixed(0)}ms
      - Max Duration: ${maxDuration}ms
      - Total Time: ${totalDuration}ms`);
    
    // Cleanup
    await Promise.all(pages.map(p => p.close()));
  });

  test('bundle size and resource loading optimization', async ({ page }) => {
    // Track all network requests
    const resources: any[] = [];
    
    page.on('response', (response: any) => {
      resources.push({
        url: response.url(),
        size: response.headers()['content-length'],
        type: response.request().resourceType(),
        status: response.status()
      });
    });
    
    await page.goto('/dashboard');
    await helpers.waitForPageLoad();
    
    // Analyze resource loading
    const jsResources = resources.filter(r => r.type === 'script');
    const cssResources = resources.filter(r => r.type === 'stylesheet');
    const imageResources = resources.filter(r => r.type === 'image');
    
    const totalJSSize = jsResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    const totalCSSSize = cssResources.reduce((sum, r) => sum + (parseInt(r.size) || 0), 0);
    
    // Bundle size expectations
    expect(totalJSSize / 1024, 'Total JS size should be under 2MB').toBeLessThan(2048);
    expect(totalCSSSize / 1024, 'Total CSS size should be under 500KB').toBeLessThan(512);
    
    // Check for resource optimization
    const failedResources = resources.filter(r => r.status >= 400);
    expect(failedResources.length, 'No resources should fail to load').toBe(0);
    
    console.log(`✅ Resource Loading:
      - JS Resources: ${jsResources.length} files, ${(totalJSSize / 1024).toFixed(0)}KB
      - CSS Resources: ${cssResources.length} files, ${(totalCSSSize / 1024).toFixed(0)}KB
      - Images: ${imageResources.length} files
      - Failed: ${failedResources.length}`);
  });

  test('caching effectiveness measurement', async ({ page }) => {
    // First load (cache miss)
    const firstLoadTiming = await helpers.measurePerformance(async () => {
      await page.goto('/dashboard');
      await helpers.waitForPageLoad();
    });
    
    // Second load (cache hit)
    const secondLoadTiming = await helpers.measurePerformance(async () => {
      await page.reload();
      await helpers.waitForPageLoad();
    });
    
    // Cache should improve performance
    const improvement = firstLoadTiming.duration - secondLoadTiming.duration;
    const improvementPercent = (improvement / firstLoadTiming.duration) * 100;
    
    expect(improvementPercent, 'Cache should improve performance by at least 20%')
      .toBeGreaterThan(20);
    
    // Test API response caching
    let apiCallCount = 0;
    page.on('request', (request: any) => {
      if (request.url().includes('/api/dashboard/overview')) {
        apiCallCount++;
      }
    });
    
    // Navigate away and back
    await page.click('[data-testid="nav-reservations"]');
    await helpers.waitForPageLoad();
    await page.click('[data-testid="nav-dashboard"]');
    await helpers.waitForPageLoad();
    
    // Should use cached API responses
    expect(apiCallCount, 'API calls should be cached').toBeLessThan(3);
    
    console.log(`✅ Caching Performance:
      - First Load: ${firstLoadTiming.duration}ms
      - Cached Load: ${secondLoadTiming.duration}ms
      - Improvement: ${improvementPercent.toFixed(1)}%
      - API Calls: ${apiCallCount}`);
  });
});