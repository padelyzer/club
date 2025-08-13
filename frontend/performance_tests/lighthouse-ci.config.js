/**
 * Lighthouse CI Configuration
 * Automated performance testing for Padelyzer frontend
 */

module.exports = {
  ci: {
    collect: {
      // Run tests on local or CI environment
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard-produccion',
        'http://localhost:3000/reservations',
        'http://localhost:3000/clubs',
        'http://localhost:3000/tournaments',
        'http://localhost:3000/login-simple',
      ],
      numberOfRuns: 5, // Average of 5 runs for consistency
      
      // Browser settings
      settings: {
        preset: 'desktop',
        throttlingMethod: 'simulate',
        throttling: {
          cpuSlowdownMultiplier: 4,
          rttMs: 40,
          throughputKbps: 10240, // 10 Mbps
        },
        skipAudits: ['uses-http2'], // Skip in dev environment
      },
      
      // Puppeteer settings for authenticated pages
      puppeteerScript: './performance_tests/auth-setup.js',
      puppeteerLaunchOptions: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    },
    
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance metrics
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        
        // Resource optimization
        'uses-optimized-images': 'error',
        'uses-text-compression': 'error',
        'uses-responsive-images': 'error',
        'efficient-animated-content': 'error',
        
        // JavaScript performance
        'unused-javascript': ['warn', { maxLength: 2 }],
        'render-blocking-resources': ['warn', { maxLength: 2 }],
        'unminified-javascript': 'error',
        'modern-image-formats': 'warn',
        
        // Accessibility
        'color-contrast': 'error',
        'heading-order': 'error',
        'image-alt': 'error',
        'meta-viewport': 'error',
        
        // Mobile specific
        'viewport': 'error',
        'tap-targets': 'error',
        
        // Bundle size checks
        'resource-summary:script:size': ['error', { maxNumericValue: 300000 }], // 300KB JS
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }], // 100KB CSS
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }], // 500KB images
        'resource-summary:total:size': ['error', { maxNumericValue: 1000000 }], // 1MB total
      },
    },
    
    upload: {
      // Store results for tracking
      target: 'temporary-public-storage',
      
      // Or use Lighthouse CI server
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: process.env.LHCI_TOKEN,
    },
    
    // Different settings for different pages
    settings: {
      preset: 'desktop',
      
      // Mobile preset override for specific URLs
      overrides: {
        'http://localhost:3000/': {
          preset: 'mobile',
        },
        'http://localhost:3000/reservations': {
          preset: 'mobile',
        },
      },
    },
  },
  
  // Performance budgets
  budgets: [
    {
      path: '/*',
      resourceSizes: [
        {
          resourceType: 'script',
          budget: 300,
        },
        {
          resourceType: 'stylesheet',
          budget: 100,
        },
        {
          resourceType: 'image',
          budget: 500,
        },
        {
          resourceType: 'total',
          budget: 1000,
        },
      ],
      resourceCounts: [
        {
          resourceType: 'third-party',
          budget: 10,
        },
      ],
    },
  ],
};