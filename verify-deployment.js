#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Tests all major components and APIs
 */

const https = require('https');
const { performance } = require('perf_hooks');

const BASE_URL = 'https://backend-io1y.onrender.com/api/v1';
const FRONTEND_URL = 'http://localhost:3000';

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.cyan}🚀 ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.magenta}📋 ${msg}${colors.reset}`)
};

// Make HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const req = https.request(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 10000,
      ...options
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: jsonData,
            responseTime,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            responseTime,
            headers: res.headers
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Test functions
async function testHealthEndpoint() {
  log.step('Testing Backend Health Endpoint...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/health/`);
    
    if (response.status === 200) {
      const health = response.data;
      log.success(`Backend is running (${response.responseTime}ms)`);
      log.info(`Status: ${health.status}`);
      log.info(`Environment: ${health.environment}`);
      log.info(`Database: ${health.checks.database ? '✅' : '❌'}`);
      log.info(`Cache: ${health.checks.cache ? '✅' : '❌'}`);
      log.info(`Redis: ${health.checks.redis ? '✅' : '❌ (Optional)'}`);
      
      if (health.status === 'degraded') {
        log.warning('Backend is running in degraded mode (Redis not configured)');
      }
      
      return true;
    } else {
      log.error(`Health check failed with status ${response.status}`);
      return false;
    }
  } catch (error) {
    log.error(`Health check failed: ${error.message}`);
    return false;
  }
}

async function testAPIEndpoints() {
  log.step('Testing API Endpoints...');
  
  const endpoints = [
    { path: '/clubs/', name: 'Clubs API', authRequired: true },
    { path: '/courts/', name: 'Courts API', authRequired: true },
    { path: '/reservations/', name: 'Reservations API', authRequired: true },
    { path: '/auth/login/', name: 'Authentication API', authRequired: false },
    { path: '/health/', name: 'Health Check', authRequired: false }
  ];
  
  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint.path}`);
      
      if (endpoint.authRequired && response.status === 401) {
        log.success(`${endpoint.name}: Protected endpoint working (${response.responseTime}ms)`);
        successCount++;
      } else if (!endpoint.authRequired && (response.status === 200 || response.status === 405)) {
        log.success(`${endpoint.name}: Available (${response.responseTime}ms)`);
        successCount++;
      } else {
        log.warning(`${endpoint.name}: Unexpected status ${response.status}`);
      }
    } catch (error) {
      log.error(`${endpoint.name}: Failed - ${error.message}`);
    }
  }
  
  log.info(`API Endpoints: ${successCount}/${endpoints.length} working`);
  return successCount === endpoints.length;
}

async function testClubsModuleEndpoints() {
  log.step('Testing Advanced Clubs Module Endpoints...');
  
  // These should return 401 (authentication required) which means they're working
  const clubEndpoints = [
    '/clubs/user-clubs/',
    '/clubs/user-clubs/summary/',
    '/clubs/courts/',
    '/clubs/schedules/',
    '/clubs/court-special-pricing/'
  ];
  
  let workingEndpoints = 0;
  
  for (const endpoint of clubEndpoints) {
    try {
      const response = await makeRequest(`${BASE_URL}${endpoint}`);
      
      if (response.status === 401) {
        log.success(`${endpoint}: Endpoint available and protected (${response.responseTime}ms)`);
        workingEndpoints++;
      } else {
        log.warning(`${endpoint}: Unexpected status ${response.status}`);
      }
    } catch (error) {
      log.error(`${endpoint}: Failed - ${error.message}`);
    }
  }
  
  log.info(`Advanced Club Endpoints: ${workingEndpoints}/${clubEndpoints.length} working`);
  return workingEndpoints > 0;
}

async function testDatabaseConnection() {
  log.step('Testing Database Connection...');
  
  try {
    const response = await makeRequest(`${BASE_URL}/health/`);
    
    if (response.status === 200) {
      const health = response.data;
      
      if (health.checks && health.checks.database) {
        log.success('Database connection: Working');
        log.info(`Database vendor: ${health.details?.database?.vendor || 'Unknown'}`);
        return true;
      } else {
        log.error('Database connection: Failed');
        return false;
      }
    }
  } catch (error) {
    log.error(`Database check failed: ${error.message}`);
    return false;
  }
}

async function testPerformance() {
  log.step('Testing Performance Metrics...');
  
  const tests = [];
  const testCount = 5;
  
  for (let i = 0; i < testCount; i++) {
    try {
      const response = await makeRequest(`${BASE_URL}/health/`);
      tests.push(response.responseTime);
    } catch (error) {
      log.warning(`Performance test ${i + 1} failed: ${error.message}`);
    }
  }
  
  if (tests.length > 0) {
    const avgResponseTime = Math.round(tests.reduce((a, b) => a + b, 0) / tests.length);
    const minTime = Math.min(...tests);
    const maxTime = Math.max(...tests);
    
    log.info(`Average response time: ${avgResponseTime}ms`);
    log.info(`Min response time: ${minTime}ms`);
    log.info(`Max response time: ${maxTime}ms`);
    
    if (avgResponseTime < 1000) {
      log.success('Performance: Excellent (< 1s)');
      return true;
    } else if (avgResponseTime < 3000) {
      log.warning('Performance: Acceptable (< 3s)');
      return true;
    } else {
      log.error('Performance: Poor (> 3s)');
      return false;
    }
  } else {
    log.error('Performance tests failed');
    return false;
  }
}

async function generateDeploymentReport() {
  log.header('DEPLOYMENT VERIFICATION REPORT');
  console.log('=====================================\n');
  
  const results = {
    health: false,
    api: false,
    clubs: false,
    database: false,
    performance: false,
    timestamp: new Date().toISOString()
  };
  
  // Run all tests
  results.health = await testHealthEndpoint();
  console.log();
  
  results.api = await testAPIEndpoints();
  console.log();
  
  results.clubs = await testClubsModuleEndpoints();
  console.log();
  
  results.database = await testDatabaseConnection();
  console.log();
  
  results.performance = await testPerformance();
  console.log();
  
  // Generate summary
  log.header('DEPLOYMENT SUMMARY');
  console.log('==================\n');
  
  const totalTests = Object.keys(results).length - 1; // exclude timestamp
  const passedTests = Object.values(results).filter(r => r === true).length;
  
  log.info(`Backend URL: ${BASE_URL}`);
  log.info(`Frontend URL: ${FRONTEND_URL}`);
  log.info(`Tests Passed: ${passedTests}/${totalTests}`);
  
  if (results.health) log.success('✅ Backend Health: Working');
  else log.error('❌ Backend Health: Failed');
  
  if (results.api) log.success('✅ Core APIs: Working');
  else log.error('❌ Core APIs: Failed');
  
  if (results.clubs) log.success('✅ Clubs Module: Working');
  else log.error('❌ Clubs Module: Failed');
  
  if (results.database) log.success('✅ Database: Connected');
  else log.error('❌ Database: Failed');
  
  if (results.performance) log.success('✅ Performance: Good');
  else log.error('❌ Performance: Poor');
  
  console.log();
  
  if (passedTests === totalTests) {
    log.success('🎉 ALL SYSTEMS OPERATIONAL!');
    log.info('The Padelyzer system is ready for production use.');
  } else if (passedTests >= totalTests * 0.8) {
    log.warning('⚠️  SYSTEM MOSTLY OPERATIONAL');
    log.info('Most features are working. Address failing tests when possible.');
  } else {
    log.error('🚨 SYSTEM NEEDS ATTENTION');
    log.info('Multiple critical issues detected. Please resolve before production use.');
  }
  
  console.log();
  log.header('NEXT STEPS');
  console.log('===========\n');
  
  if (!results.performance) {
    log.warning('Consider setting up PostgreSQL and Redis for better performance');
  }
  
  log.info('1. Run database migrations for full functionality');
  log.info('2. Set up PostgreSQL for production database');
  log.info('3. Configure Redis for improved caching (optional)');
  log.info('4. Deploy frontend to production hosting');
  log.info('5. Test the complete user flows in the frontend');
  
  console.log('\n' + '='.repeat(50));
  log.info(`Report generated at: ${results.timestamp}`);
  
  return results;
}

// Main execution
if (require.main === module) {
  generateDeploymentReport()
    .then(results => {
      const totalTests = Object.keys(results).length - 1;
      const passedTests = Object.values(results).filter(r => r === true).length;
      
      process.exit(passedTests === totalTests ? 0 : 1);
    })
    .catch(error => {
      log.error(`Deployment verification failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { generateDeploymentReport };