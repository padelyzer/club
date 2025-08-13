# RESERVATIONS MODULE DEPENDENCIES

**Version**: 1.0.0  
**Last Updated**: 2025-08-08  
**Module**: Reservations (apps.reservations)

## 📋 OVERVIEW

This document maps all dependencies and relationships for the reservations module, which serves as the **CRITICAL CORE** of the Padelyzer system. The reservations module connects clubs, courts, users, payments, and notifications, making it essential for system stability.

## 🎯 CRITICAL IMPORTANCE

The reservations module is **MISSION-CRITICAL** because:
- **Revenue Generation**: All bookings and payments flow through this module
- **User Experience**: Primary interaction point for customers
- **Data Integrity**: Prevents double bookings and maintains business rules
- **System Integration**: Links all other modules together

## 🔗 MODULE RELATIONSHIPS

### 📊 DEPENDENCY HIERARCHY

```
RESERVATIONS MODULE (CORE)
├── ROOT DEPENDENCIES (Required)
│   ├── root.Organization (Multi-tenant isolation)
│   └── auth.User (User management)
├── BUSINESS DEPENDENCIES (Critical)
│   ├── clubs.Club (Business context)
│   ├── clubs.Court (Resource allocation)
│   └── clients.ClientProfile (Customer data)
├── FINANCIAL DEPENDENCIES (Revenue)
│   ├── finance.Payment (Payment processing)
│   └── finance.Invoice (Billing)
├── COMMUNICATION DEPENDENCIES (Optional)
│   ├── notifications.Notification (User communication)
│   └── notifications.Template (Message formatting)
└── COMPETITIVE DEPENDENCIES (Optional)
    ├── tournaments.Tournament (Tournament bookings)
    └── leagues.League (League bookings)
```

## 🏗️ MODEL DEPENDENCIES

### Core Models

#### `Reservation` Model Dependencies

**REQUIRED Foreign Keys:**
- `organization` → `root.Organization` (Multi-tenant isolation)
- `club` → `clubs.Club` (Business unit)
- `court` → `clubs.Court` (Resource)
- `user` → `auth.User` (Customer)
- `created_by` → `auth.User` (Staff member)

**OPTIONAL Foreign Keys:**
- `tournament` → `tournaments.Tournament` (Tournament bookings)
- `league` → `leagues.League` (League bookings)
- `instructor` → `staff.Instructor` (Class bookings)
- `client` → `clients.ClientProfile` (Customer profile)

#### `ReservationPayment` Model Dependencies

**REQUIRED Foreign Keys:**
- `reservation` → `reservations.Reservation` (Payment link)
- `organization` → `root.Organization` (Multi-tenant isolation)

**INTEGRATION Foreign Keys:**
- `payment_method` → `finance.PaymentMethod` (Payment details)
- `invoice` → `finance.Invoice` (Billing reference)

#### `BlockedSlot` Model Dependencies

**REQUIRED Foreign Keys:**
- `club` → `clubs.Club` (Maintenance context)
- `organization` → `root.Organization` (Multi-tenant isolation)

**OPTIONAL Foreign Keys:**
- `court` → `clubs.Court` (Specific court blocking)

### 📈 REVERSE RELATIONSHIPS

Models that depend on reservations:

```python
# Other modules that reference reservations
finance.Payment.reservation → Reservation
finance.Invoice.reservations → Reservation (ManyToMany)
notifications.Notification.reservation → Reservation
analytics.BookingMetric.reservation → Reservation
tournaments.Match.reservation → Reservation
```

## ⚡ CRITICAL PATHS

### 1. **Reservation Creation Path** (CRITICAL)
```
User Request → Club Validation → Court Availability → 
Double Booking Prevention → Price Calculation → 
Payment Processing → Confirmation → Notifications
```

**Dependencies Chain:**
1. `auth.User` (authentication)
2. `clubs.Club` (business rules)
3. `clubs.Court` (resource availability)
4. `reservations.BlockedSlot` (maintenance checks)
5. `finance.Payment` (payment processing)
6. `notifications.Notification` (user communication)

### 2. **Availability Check Path** (HIGH TRAFFIC)
```
Availability Request → Club Hours Check → 
Court Status Check → Existing Reservations Check → 
Blocked Slots Check → Price Calculation → Response
```

**Dependencies Chain:**
1. `clubs.Club` (operating hours)
2. `clubs.Court` (court status)
3. `reservations.Reservation` (existing bookings)
4. `reservations.BlockedSlot` (maintenance)

### 3. **Payment Processing Path** (REVENUE)
```
Reservation Confirmation → Payment Request → 
Payment Gateway → Transaction Recording → 
Invoice Generation → Receipt Delivery
```

**Dependencies Chain:**
1. `reservations.Reservation` (booking context)
2. `finance.PaymentMethod` (payment details)
3. `finance.Payment` (transaction record)
4. `finance.Invoice` (billing)
5. `notifications.Notification` (receipt delivery)

## 🔄 INITIALIZATION ORDER

**CRITICAL:** Modules must be initialized in this exact order:

1. **Core Models** (First)
   - `root.Organization`
   - `auth.User`

2. **Business Models** (Second)
   - `clubs.Club`
   - `clubs.Court`
   - `clients.ClientProfile`

3. **Reservations Models** (Third)
   - `reservations.BlockedSlot`
   - `reservations.Reservation`
   - `reservations.ReservationPayment`

4. **Integration Models** (Last)
   - `finance.Payment`
   - `notifications.Notification`
   - `tournaments.Tournament`

## 🛠️ SERVICES DEPENDENCIES

### ReservationService Dependencies

**Internal Dependencies:**
- `ReservationSafetyMixin` (Safe operations)
- `ReservationCircuitBreaker` (Failure prevention)
- `ReservationIntegrityValidator` (Data validation)

**External Dependencies:**
- `clubs.services.CourtService` (Court operations)
- `finance.services.PaymentService` (Payment processing)
- `notifications.services.NotificationService` (Communications)

### Circuit Breaker Dependencies

**Protected Services:**
- Database operations (Core)
- Payment gateway (External)
- Notification service (External)
- Email service (External)
- SMS service (External)

## 📊 DATABASE QUERIES

### High-Frequency Queries (Performance Critical)

```sql
-- Availability Check (Most frequent)
SELECT * FROM reservations_reservation 
WHERE court_id = %s 
  AND datetime_start < %s 
  AND datetime_end > %s 
  AND status IN ('confirmed', 'pending');

-- Court Listing (High frequency)
SELECT * FROM clubs_court 
WHERE club_id = %s 
  AND is_active = true;

-- User Reservations (High frequency)
SELECT * FROM reservations_reservation 
WHERE user_id = %s 
  AND datetime_start >= %s 
ORDER BY datetime_start;
```

### Critical Queries (Must Never Fail)

```sql
-- Double Booking Prevention (CRITICAL)
SELECT COUNT(*) FROM reservations_reservation 
WHERE court_id = %s 
  AND datetime_start < %s 
  AND datetime_end > %s 
  AND status IN ('confirmed', 'pending')
  AND id != %s;

-- Payment Verification (REVENUE CRITICAL)
SELECT payment_status, total_amount 
FROM reservations_reservation 
WHERE id = %s;
```

## 🚨 FAILURE POINTS

### High-Risk Dependencies

1. **Database Connection** (CRITICAL)
   - **Impact**: Complete system failure
   - **Mitigation**: Connection pooling, failover DB
   - **Monitoring**: Health checks every 30s

2. **Payment Gateway** (REVENUE CRITICAL)
   - **Impact**: Revenue loss, customer frustration
   - **Mitigation**: Circuit breaker, retry logic, fallback payment
   - **Monitoring**: Transaction success rate < 95%

3. **Court Availability** (USER EXPERIENCE)
   - **Impact**: Double bookings, customer complaints
   - **Mitigation**: Pessimistic locking, validation
   - **Monitoring**: Booking conflicts

### Medium-Risk Dependencies

1. **Notification Service** (COMMUNICATION)
   - **Impact**: Poor communication, missed appointments
   - **Mitigation**: Queue system, retry mechanism
   - **Monitoring**: Delivery success rate < 90%

2. **Club Configuration** (BUSINESS RULES)
   - **Impact**: Incorrect pricing, wrong hours
   - **Mitigation**: Default values, validation
   - **Monitoring**: Configuration changes

## 🔧 MITIGATION STRATEGIES

### Circuit Breakers

**Availability Circuit Breaker:**
- Threshold: 3 failures
- Timeout: 15 seconds
- Recovery: 30 seconds

**Payment Circuit Breaker:**
- Threshold: 3 failures  
- Timeout: 60 seconds
- Recovery: 2 minutes

**Notification Circuit Breaker:**
- Threshold: 10 failures
- Timeout: 30 seconds
- Recovery: 1 minute

### Fallback Mechanisms

1. **Payment Fallback**: Create reservation with pending payment
2. **Notification Fallback**: Queue for later delivery
3. **Pricing Fallback**: Use default rates
4. **Availability Fallback**: Conservative blocking

### Data Integrity

1. **Database Constraints**: Foreign key constraints
2. **Application Validation**: Multi-level validation
3. **Transaction Management**: Atomic operations
4. **Audit Trail**: Complete change logging

## 📈 MONITORING REQUIREMENTS

### Key Metrics

1. **Availability Response Time** < 500ms (95th percentile)
2. **Reservation Creation Time** < 2 seconds (95th percentile)
3. **Payment Success Rate** > 99%
4. **Double Booking Rate** = 0%
5. **System Uptime** > 99.9%

### Alerts

**CRITICAL Alerts:**
- Double booking detected
- Payment gateway failure
- Database connection lost
- Circuit breaker opened

**WARNING Alerts:**
- High response times
- Low payment success rate
- High error rates
- Resource exhaustion

## 🧪 TESTING DEPENDENCIES

### Test Data Requirements

1. **Organizations**: Minimum 2 for multi-tenant testing
2. **Clubs**: Minimum 3 with different configurations
3. **Courts**: Minimum 10 with various features
4. **Users**: Minimum 20 with different roles
5. **Reservations**: Historical data for analytics

### Test Scenarios

1. **Concurrency Tests**: Multiple simultaneous bookings
2. **Failure Tests**: Database failures, payment failures
3. **Load Tests**: High-volume reservation creation
4. **Integration Tests**: End-to-end workflows

## 📚 CONFIGURATION DEPENDENCIES

### Required Settings

```python
# Database
DATABASE_CONNECTION_TIMEOUT = 30
DATABASE_MAX_CONNECTIONS = 100

# Circuit Breakers
AVAILABILITY_CIRCUIT_THRESHOLD = 3
PAYMENT_CIRCUIT_THRESHOLD = 3
NOTIFICATION_CIRCUIT_THRESHOLD = 10

# Business Rules
MIN_ADVANCE_BOOKING_HOURS = 1
MAX_ADVANCE_BOOKING_DAYS = 90
DEFAULT_RESERVATION_DURATION = 60  # minutes

# Performance
AVAILABILITY_CACHE_TIMEOUT = 300  # 5 minutes
RESERVATION_QUERY_TIMEOUT = 30     # seconds
```

### Environment Variables

- `PAYMENT_GATEWAY_URL`: Payment service endpoint
- `NOTIFICATION_SERVICE_URL`: Notification service endpoint
- `DATABASE_URL`: Primary database connection
- `REDIS_URL`: Cache and session storage
- `EMAIL_SERVICE_API_KEY`: Email service credentials

## 🚀 DEPLOYMENT DEPENDENCIES

### Infrastructure Requirements

1. **Database**: PostgreSQL 12+ with connection pooling
2. **Cache**: Redis 6+ for session and query caching
3. **Queue**: Celery with Redis/RabbitMQ for async tasks
4. **Monitoring**: Application performance monitoring
5. **Logging**: Centralized log aggregation

### Service Dependencies

1. **Payment Gateway**: Stripe/PayPal integration
2. **Email Service**: SendGrid/Mailgun for notifications
3. **SMS Service**: Twilio for SMS notifications
4. **File Storage**: S3/CloudFlare for receipts/invoices

## 🔄 MAINTENANCE PROCEDURES

### Regular Maintenance

1. **Weekly**: Review circuit breaker statistics
2. **Monthly**: Analyze dependency performance
3. **Quarterly**: Update dependency documentation
4. **Annually**: Complete dependency audit

### Emergency Procedures

1. **Database Failure**: Switch to read replica
2. **Payment Failure**: Activate manual processing
3. **High Load**: Enable degraded mode
4. **Security Incident**: Isolate affected components

---

## 📞 SUPPORT CONTACTS

**Critical Issues:**
- Database: DBA Team
- Payments: Finance Team  
- Security: Security Team

**For dependency updates or questions, consult this document first, then contact the development team.**

**⚠️ WARNING: Changes to dependencies can cascade through the entire system. Always test thoroughly in staging environment.**