/**
 * Bundle optimization and analysis for Next.js
 * Identifies and fixes performance issues in the frontend build
 */

const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

/**
 * Next.js configuration for optimal performance
 */
const performanceConfig = {
  // Enable SWC minification for faster builds
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['padelyzer.com', 'cdn.padelyzer.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
  
  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
    
    // Enable React strict mode
    reactStrictMode: true,
    
    // Styled components optimization
    styledComponents: true,
  },
  
  // Experimental features for performance
  experimental: {
    // Enable concurrent features
    concurrentFeatures: true,
    
    // Optimize CSS
    optimizeCss: true,
    
    // Module federation for micro-frontends
    moduleFederation: false,
    
    // Optimize package imports
    optimizePackageImports: [
      'lodash',
      'date-fns',
      '@mui/material',
      '@mui/icons-material',
      'framer-motion',
    ],
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer, webpack }) => {
    // Production optimizations
    if (!dev) {
      // Replace React with Preact in production (smaller bundle)
      // config.resolve.alias = {
      //   ...config.resolve.alias,
      //   'react': 'preact/compat',
      //   'react-dom': 'preact/compat',
      // };
      
      // Optimize bundle splitting
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common components
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // UI components
            ui: {
              name: 'ui',
              test: /components\/ui/,
              chunks: 'all',
              priority: 30,
            },
            // Separate large libraries
            lodash: {
              name: 'lodash',
              test: /[\\/]node_modules[\\/]lodash/,
              chunks: 'all',
              priority: 40,
            },
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)/,
              chunks: 'all',
              priority: 40,
            },
          },
        },
        
        // Use aggressive minification
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
                pure_funcs: ['console.log'],
              },
              mangle: {
                safari10: true,
              },
              format: {
                comments: false,
              },
            },
            extractComments: false,
          }),
        ],
      };
      
      // Add compression plugin
      config.plugins.push(
        new CompressionPlugin({
          test: /\.(js|css|html|svg)$/,
          algorithm: 'gzip',
          threshold: 8192,
          minRatio: 0.8,
        })
      );
      
      // Add bundle analyzer in analyze mode
      if (process.env.ANALYZE === 'true') {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './analyze/bundle-report.html',
            openAnalyzer: false,
            generateStatsFile: true,
            statsFilename: './analyze/bundle-stats.json',
          })
        );
      }
    }
    
    // Module replacements for smaller bundles
    config.resolve.alias = {
      ...config.resolve.alias,
      // Use smaller moment locale
      'moment': 'moment/min/moment.min.js',
      // Use production React
      'react': dev ? 'react' : 'react/cjs/react.production.min.js',
      'react-dom': dev ? 'react-dom' : 'react-dom/cjs/react-dom.production.min.js',
    };
    
    // Ignore unnecessary files
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      })
    );
    
    return config;
  },
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate',
          },
        ],
      },
    ];
  },
  
  // Redirects for performance
  async redirects() {
    return [
      // Redirect old routes to new optimized ones
      {
        source: '/dashboard',
        destination: '/dashboard-produccion',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/login-simple',
        permanent: true,
      },
    ];
  },
  
  // API route configuration
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '8mb',
  },
  
  // Environment variables for performance
  env: {
    NEXT_PUBLIC_API_CACHE_TIME: '300', // 5 minutes
    NEXT_PUBLIC_IMAGE_OPTIMIZATION: 'true',
    NEXT_PUBLIC_LAZY_LOAD_IMAGES: 'true',
  },
};

// Performance monitoring utilities
const performanceUtils = {
  /**
   * Measure bundle sizes
   */
  analyzeBundleSize: () => {
    const fs = require('fs');
    const buildDir = '.next';
    
    if (!fs.existsSync(buildDir)) {
      console.error('Build directory not found. Run `npm run build` first.');
      return;
    }
    
    const getDirectorySize = (dir) => {
      let size = 0;
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          size += getDirectorySize(filePath);
        } else {
          size += stat.size;
        }
      });
      
      return size;
    };
    
    const formatBytes = (bytes) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };
    
    const totalSize = getDirectorySize(buildDir);
    const staticSize = getDirectorySize(path.join(buildDir, 'static'));
    
    console.log('\n📊 Bundle Size Analysis:');
    console.log('------------------------');
    console.log(`Total build size: ${formatBytes(totalSize)}`);
    console.log(`Static assets: ${formatBytes(staticSize)}`);
    
    // Check against budgets
    const budgets = {
      total: 5 * 1024 * 1024, // 5MB
      static: 2 * 1024 * 1024, // 2MB
    };
    
    if (totalSize > budgets.total) {
      console.warn(`⚠️  Total size exceeds budget (${formatBytes(budgets.total)})`);
    }
    if (staticSize > budgets.static) {
      console.warn(`⚠️  Static size exceeds budget (${formatBytes(budgets.static)})`);
    }
  },
  
  /**
   * Generate performance report
   */
  generateReport: async () => {
    const lighthouse = require('lighthouse');
    const chromeLauncher = require('chrome-launcher');
    
    const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
    const options = {
      logLevel: 'info',
      output: 'html',
      port: chrome.port,
    };
    
    const runnerResult = await lighthouse('http://localhost:3000', options);
    
    // Extract metrics
    const { lhr } = runnerResult;
    const metrics = {
      performance: lhr.categories.performance.score * 100,
      accessibility: lhr.categories.accessibility.score * 100,
      bestPractices: lhr.categories['best-practices'].score * 100,
      seo: lhr.categories.seo.score * 100,
      fcp: lhr.audits['first-contentful-paint'].numericValue,
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      tti: lhr.audits['interactive'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
    };
    
    console.log('\n🎯 Performance Metrics:');
    console.log('----------------------');
    console.log(`Performance Score: ${metrics.performance}/100`);
    console.log(`First Contentful Paint: ${metrics.fcp}ms`);
    console.log(`Largest Contentful Paint: ${metrics.lcp}ms`);
    console.log(`Time to Interactive: ${metrics.tti}ms`);
    console.log(`Cumulative Layout Shift: ${metrics.cls}`);
    
    await chrome.kill();
    
    return metrics;
  },
};

module.exports = {
  performanceConfig,
  performanceUtils,
};