# BFF Light E2E Testing Suite

Comprehensive end-to-end testing framework for validating BFF (Backend for Frontend) endpoints in the Padelyzer project.

## Overview

This testing suite validates that our **BFF Light stack** is production-ready by testing:

- ✅ **Performance Targets**: Dashboard < 400ms, Auth < 300ms, Availability < 200ms
- ✅ **Multi-Tenant Security**: Zero cross-organization data leaks
- ✅ **Feature Flag Fallbacks**: Graceful degradation when BFF disabled
- ✅ **Data Consistency**: BFF responses match individual API calls
- ✅ **Complete Workflows**: End-to-end user scenarios

## BFF Stack Architecture

### 3 Core BFF Endpoints

1. **`/api/dashboard/overview`** - Dashboard aggregated data (67% improvement: 1.2s → <400ms)
2. **`/api/auth/context`** - Multi-tenant auth context (62% improvement: 800ms → <300ms)
3. **`/api/reservations/availability`** - Bulk availability (67% improvement: 600ms → <200ms)

### Feature Flag Control

```typescript
export const BFF_FEATURES = {
  auth: process.env.NEXT_PUBLIC_BFF_AUTH === 'true',
  dashboard: process.env.NEXT_PUBLIC_BFF_DASHBOARD === 'true', 
  reservations: process.env.NEXT_PUBLIC_BFF_RESERVATIONS === 'true'
};
```

## Test Suite Structure

```
tests/
├── e2e/
│   ├── setup/
│   │   ├── jest.e2e.config.js       # Jest configuration for E2E
│   │   ├── test-setup.ts            # Global test utilities
│   │   └── performance-reporter.js  # Custom performance reporter
│   ├── bff-dashboard.test.ts        # Dashboard BFF tests
│   ├── bff-auth-context.test.ts     # Auth context BFF tests
│   ├── bff-availability.test.ts     # Availability BFF tests
│   └── bff-fallback.test.ts         # Feature flag fallback tests
├── integration/
│   └── bff-complete-workflow.test.ts # Complete workflow tests
└── README-BFF-E2E-Testing.md       # This file
```

## Quick Start

### Installation

Ensure you have the required dependencies:

```bash
npm install --save-dev jest @types/jest supertest ts-jest jsonwebtoken
```

### Environment Setup

Set environment variables for testing:

```bash
export NODE_ENV=test
export NEXT_PUBLIC_API_URL=http://localhost:9200/api/v1
export NEXT_PUBLIC_BFF_AUTH=true
export NEXT_PUBLIC_BFF_DASHBOARD=true
export NEXT_PUBLIC_BFF_RESERVATIONS=true
```

### Running Tests

```bash
# Run all BFF tests
npm run test:bff

# Run specific BFF endpoint tests
npm run test:bff:dashboard     # Dashboard performance tests
npm run test:bff:auth          # Auth context security tests
npm run test:bff:availability  # Availability integration tests
npm run test:bff:fallback      # Feature flag fallback tests

# Run complete workflow tests
npm run test:integration

# Run with performance monitoring
npm run test:performance

# Automated test runner with summary
./scripts/run-bff-tests.sh
```

## Test Categories

### 1. Dashboard BFF Tests (`bff-dashboard.test.ts`)

**Performance Target**: < 400ms (67% improvement)

```typescript
describe('Dashboard BFF Performance Tests', () => {
  test('BFF dashboard loads under 400ms target', async () => {
    const { duration } = await PerformanceTimer.measureAsync(async () => {
      return request(global.testBaseUrl)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    expect(duration).toBeLessThan(400);
  });
});
```

**Validates**:
- Performance under 400ms
- Data consistency with individual API calls
- Cache behavior (5-minute cache)
- Graceful fallback on service failures
- Multi-tenant club access validation

### 2. Auth Context BFF Tests (`bff-auth-context.test.ts`)

**Performance Target**: < 300ms (62% improvement)

```typescript
describe('Auth Context BFF Multi-Tenant Security Tests', () => {
  test('Organization A user cannot see Organization B data', async () => {
    // Test complete data isolation between organizations
    expect(responseA.body.organization.trade_name).toBe(orgA.trade_name);
    expect(responseA.body.clubs.map(c => c.id)).not.toContain(clubB1.id);
  });
});
```

**Validates**:
- Performance under 300ms
- Complete multi-tenant data isolation
- JWT token validation (invalid, expired, malformed)
- Cache effectiveness (5-minute cache)
- Organization switching scenarios

### 3. Availability BFF Tests (`bff-availability.test.ts`)

**Performance Target**: < 200ms (67% improvement)

```typescript
describe('Reservations Availability BFF Integration Tests', () => {
  test('BFF matches individual API call data structure', async () => {
    // Validates 4 API calls → 1 BFF call with same functionality
    expect(response.body.courts[0]).toHaveProperty('slots');
    expect(slot.price).toHaveProperty('amount');
    expect(slot.conflicts).toBeInstanceOf(Array);
  });
});
```

**Validates**:
- Performance under 200ms (4 API calls → 1 BFF call)
- Data parity with individual Django endpoints
- Conflict detection with existing reservations
- Pricing rules and promotions application
- Multi-tenant club access control

### 4. Feature Flag Fallback Tests (`bff-fallback.test.ts`)

```typescript
describe('BFF Feature Flag Fallback Scenarios', () => {
  test('Dashboard BFF disabled returns appropriate error', async () => {
    process.env.NEXT_PUBLIC_BFF_DASHBOARD = 'false';
    
    const response = await request(global.testBaseUrl)
      .get('/api/dashboard/overview')
      .expect(501);
      
    expect(response.body).toEqual({
      error: 'Dashboard BFF not enabled',
      useDirectCall: true
    });
  });
});
```

**Validates**:
- Graceful fallback when BFF disabled
- Mixed feature flag states work independently
- Instant rollback scenarios (emergency disable)
- Progressive rollout scenarios
- Zero downtime switching

### 5. Complete Workflow Tests (`bff-complete-workflow.test.ts`)

```typescript
describe('BFF Complete Workflow Integration', () => {
  test('Complete dashboard loading workflow for multi-club admin', async () => {
    // Step 1: Load auth context
    // Step 2: Load dashboard data
    // Step 3: Load availability data
    // Validate total workflow < 900ms
  });
});
```

**Validates**:
- Complete user workflows (auth → dashboard → availability)
- Cross-organization data isolation during concurrent requests
- Staff vs admin access differences
- Performance under concurrent load
- Error recovery workflows

## Performance Monitoring

### Custom Performance Reporter

The test suite includes a custom Jest reporter that tracks performance metrics:

```javascript
class BFFPerformanceReporter {
  constructor() {
    this.benchmarks = {
      dashboard: 400,    // ms - 67% improvement target
      auth: 300,         // ms - 62% improvement target  
      availability: 200  // ms - 67% improvement target
    };
  }
}
```

### Performance Output Example

```
📈 BFF Performance Report
==================================================

🎯 DASHBOARD BFF:
   Average: 285.3ms
   Target:  400ms
   Status:  ✅ PASSED
   Improvement: +28.7%
   Success Rate: 5/5 (100.0%)

🎯 AUTH BFF:
   Average: 198.7ms
   Target:  300ms
   Status:  ✅ PASSED
   Improvement: +33.8%
   Success Rate: 3/3 (100.0%)

🚀 Production Readiness Assessment
========================================
Status: ✅ READY FOR PRODUCTION
```

## Test Data Management

### Test Data Factory

Provides consistent test data generation:

```typescript
// Create test organizations, clubs, users
const org = TestDataFactory.createOrganization();
const club = TestDataFactory.createClub({ organization_id: org.id });
const user = TestDataFactory.createUser({
  organization_id: org.id,
  club_memberships: [
    TestDataFactory.createClubMembership(club, { role: 'admin' })
  ]
});
```

### JWT Token Management

```typescript
// Generate valid tokens
const token = TestAuthUtils.generateToken(user);

// Generate expired tokens for testing
const expiredToken = TestAuthUtils.generateExpiredToken(user);

// Generate invalid tokens
const invalidToken = TestAuthUtils.generateInvalidToken();
```

### Mock Django API Responses

```typescript
// Consistent mock responses
const userResponse = MockDjangoAPI.mockUserResponse(user);
const orgResponse = MockDjangoAPI.mockOrganizationResponse(organization);
const analyticsResponse = MockDjangoAPI.mockAnalyticsResponse();
```

## Security Testing

### Multi-Tenant Isolation

Tests validate complete data isolation between organizations:

```typescript
test('Organization A user cannot see Organization B data', async () => {
  // User from Org A
  const responseA = await request('/api/auth/context')
    .set('Authorization', `Bearer ${tokenA}`);
    
  // User from Org B  
  const responseB = await request('/api/auth/context')
    .set('Authorization', `Bearer ${tokenB}`);
    
  // Validate no cross-organization data
  expect(responseA.body.clubs.map(c => c.id))
    .not.toContain(clubFromOrgB.id);
});
```

### Authentication Testing

- JWT token format validation
- Expired token rejection
- Missing authorization header handling
- Malformed authorization header rejection

## Error Scenarios

### Service Failure Testing

```typescript
test('BFF handles individual service failures gracefully', async () => {
  // Mock services to fail
  global.fetch
    .mockResolvedValueOnce(successResponse)  // User service works
    .mockRejectedValueOnce(new Error('Analytics down'))  // Analytics fails
    .mockResolvedValueOnce(successResponse); // Other services work
    
  const response = await request('/api/dashboard/overview');
  
  // Should return 200 with fallback data
  expect(response.body.monthlyRevenue).toBe(0);  // Fallback value
  expect(response.body.topClients).toEqual([]); // Other data works
});
```

## CI/CD Integration

### Environment Variables

Set in your CI/CD pipeline:

```bash
NODE_ENV=test
NEXT_PUBLIC_API_URL=http://localhost:9200/api/v1
NEXT_PUBLIC_BFF_AUTH=true
NEXT_PUBLIC_BFF_DASHBOARD=true
NEXT_PUBLIC_BFF_RESERVATIONS=true
```

### Test Script for CI

```bash
#!/bin/bash
# In CI/CD pipeline
npm install
npm run build
npm run test:bff
npm run test:integration

# Check performance targets
if npm run test:performance; then
  echo "✅ All performance targets met"
  exit 0
else
  echo "❌ Performance targets not met"
  exit 1
fi
```

## Troubleshooting

### Common Issues

1. **Test server not starting**
   ```bash
   # Check port availability
   lsof -ti:3001
   # Kill existing processes if needed
   kill -9 $(lsof -ti:3001)
   ```

2. **Mock fetch not working**
   ```typescript
   // Ensure fetch is mocked before each test
   beforeEach(() => {
     jest.clearAllMocks();
     global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
   });
   ```

3. **Performance tests failing**
   ```bash
   # Check system load
   top
   # Run tests with verbose output
   npm run test:performance -- --verbose
   ```

4. **JWT token issues**
   ```typescript
   // Ensure JWT_SECRET matches between test and validation
   const JWT_SECRET = 'test-jwt-secret-for-bff-testing';
   ```

### Debug Output

Enable verbose logging:

```bash
DEBUG=* npm run test:bff
```

### Test Coverage

Generate coverage reports:

```bash
npm run test:e2e -- --coverage
```

## Best Practices

### Writing BFF Tests

1. **Always measure performance**
   ```typescript
   const { result, duration } = await PerformanceTimer.measureAsync(async () => {
     return request('/api/endpoint');
   });
   expect(duration).toBeLessThan(TARGET_MS);
   ```

2. **Test multi-tenant scenarios**
   ```typescript
   // Always test cross-organization isolation
   expect(userAResponse.body).not.toContainDataFrom(organizationB);
   ```

3. **Validate fallback behavior**
   ```typescript
   // Mock service failures
   global.fetch.mockRejectedValueOnce(new Error('Service down'));
   // Expect graceful fallback
   expect(response.body).toHaveProperty('fallbackValue');
   ```

4. **Test feature flag scenarios**
   ```typescript
   // Test both enabled and disabled states
   process.env.NEXT_PUBLIC_BFF_FEATURE = 'false';
   await request('/api/endpoint').expect(501);
   ```

### Maintenance

- **Update benchmarks** when infrastructure changes
- **Review test data** to match production scenarios  
- **Monitor performance trends** over time
- **Update mocks** when Django APIs change

## Success Criteria

### Performance ✅

- [ ] Dashboard < 400ms (67% improvement)
- [ ] Auth Context < 300ms (62% improvement) 
- [ ] Availability < 200ms (67% improvement)
- [ ] Cache hit rate > 80%

### Functionality ✅

- [ ] Data parity BFF vs Direct calls
- [ ] Zero breaking changes
- [ ] Graceful fallbacks work
- [ ] Feature flags control behavior

### Security ✅

- [ ] Multi-tenant isolation verified
- [ ] No cross-organization data leaks
- [ ] Proper permission enforcement
- [ ] JWT handling secure

### Reliability ✅

- [ ] Error scenarios handled gracefully
- [ ] Concurrent user support
- [ ] Cache invalidation working
- [ ] Database performance stable

## Production Deployment

Once all tests pass:

```bash
# Final validation
./scripts/run-bff-tests.sh

# Deploy with feature flags
export NEXT_PUBLIC_BFF_AUTH=true
export NEXT_PUBLIC_BFF_DASHBOARD=true  
export NEXT_PUBLIC_BFF_RESERVATIONS=true

# Monitor performance in production
# Rollback if needed by setting flags to false
```

The BFF Light stack is production-ready when all tests pass! 🚀