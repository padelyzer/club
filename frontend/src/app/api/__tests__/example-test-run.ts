/**
 * Example: How to run and verify BFF route tests
 * 
 * This file demonstrates how to run individual tests
 * and verify the test setup is working correctly.
 */

// Example 1: Run a single test file
// Command: npm test src/app/api/__tests__/dashboard/overview.test.ts -- --verbose

// Example 2: Run tests with coverage
// Command: npm test -- --coverage --collectCoverageFrom="src/app/api/dashboard/**/*.ts"

// Example 3: Run specific test by name
// Command: npm test -- -t "should return 501 when BFF dashboard feature is disabled"

// Example 4: Debug a specific test
// Add this to your test:
/*
describe('Dashboard Overview API Route', () => {
  it('should aggregate dashboard data correctly', async () => {
    // Add debug logging
    console.log('Starting test...');
    
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' },
    });

    // Log mock responses
    console.log('Mock user profile:', djangoMocks.userProfile());
    
    // ... rest of test
  });
});
*/

// Example 5: Test a specific performance scenario
/*
import { PerformanceTracker } from './utils/mock-helpers';

it('should handle 10 concurrent requests', async () => {
  const tracker = new PerformanceTracker();
  
  const requests = Array.from({ length: 10 }, () => 
    createMockRequest({
      headers: { authorization: 'Bearer valid-token' },
      body: { club_id: 'club-1', date: '2024-01-15' }
    })
  );

  tracker.start();
  await Promise.all(requests.map(req => POST(req)));
  tracker.end();

  expect(tracker.getDuration()).toBeLessThan(1000); // All should complete in 1s
});
*/

// Example 6: Verify mock setup
export function verifyMockSetup() {
  console.log('Verifying test environment...');
  
  // Check environment variables
  console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('BFF Dashboard enabled:', process.env.NEXT_PUBLIC_BFF_DASHBOARD);
  console.log('BFF Auth enabled:', process.env.NEXT_PUBLIC_BFF_AUTH);
  console.log('BFF Reservations enabled:', process.env.NEXT_PUBLIC_BFF_RESERVATIONS);
  
  // Check global fetch mock
  console.log('Global fetch is mocked:', typeof global.fetch === 'function');
  
  // Check JWT validator mock
  try {
    const { JWTValidator } = require('@/lib/security/jwt-validator');
    console.log('JWT Validator mocked:', jest.isMockFunction(JWTValidator.isValidTokenFormat));
  } catch (e) {
    console.log('JWT Validator mock check failed:', e);
  }
  
  console.log('✅ Mock setup verification complete');
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyMockSetup();
}