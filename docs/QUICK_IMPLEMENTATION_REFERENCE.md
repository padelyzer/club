# 🚀 Padelyzer Quick Implementation Reference

## 💰 Payment Processing (Stripe)

### Process a Payment
```python
from apps.finance.services import PaymentService

payment = PaymentService.create_payment(
    amount=Decimal('100.00'),
    payment_type='reservation',
    payment_method='card',
    organization=org,
    club=club,
    user=user,
    metadata={'reservation_id': str(reservation.id)}
)
```

### Process a Refund
```python
refund = payment.refund(
    amount=Decimal('50.00'),
    reason='Customer request',
    user=admin_user
)
```

---

## 📱 Send Notifications

### SMS Notification
```python
from apps.notifications.services import NotificationService

service = NotificationService()
service.send_notification(
    user=user,
    notification_type='reservation_confirmation',
    context={'reservation': reservation},
    channels=['sms']
)
```

### WhatsApp Notification
```python
service.send_notification(
    user=user,
    notification_type='payment_received',
    context={'amount': '100.00'},
    channels=['whatsapp']
)
```

---

## 📚 Classes Management

### Create Class Schedule
```python
from apps.classes.models import ClassSchedule

schedule = ClassSchedule.objects.create(
    organization=org,
    club=club,
    name="Padel para Principiantes",
    class_type=class_type,
    level=beginner_level,
    instructor=instructor,
    start_date=date.today(),
    start_time=time(10, 0),
    duration_minutes=60,
    recurrence="weekly",
    recurrence_days=[1, 3, 5],  # Mon, Wed, Fri
    max_participants=4,
    price=Decimal('50.00')
)

# Generate sessions
sessions_created = schedule.generate_sessions()
```

### Enroll Student
```python
from apps.classes.models import ClassEnrollment

enrollment = ClassEnrollment.objects.create(
    session=session,
    student=student_profile,
    status='enrolled' if not session.is_full else 'waitlisted',
    paid=True,
    payment_method='card'
)
```

---

## 🏆 Tournament Management

### Create Tournament
```python
from apps.tournaments.models import Tournament
from apps.tournaments.services import TournamentBracketGenerator

tournament = Tournament.objects.create(
    organization=org,
    club=club,
    name="Summer Padel Championship",
    format="elimination",
    category=category,
    start_date=date.today() + timedelta(days=7),
    max_teams=16,
    registration_fee=Decimal('100.00')
)

# Generate bracket when ready
generator = TournamentBracketGenerator(tournament)
generator.generate()
```

### Update Match Score
```python
match.record_set_score(6, 4)  # Team 1 wins first set 6-4
match.record_set_score(3, 6)  # Team 2 wins second set 6-3
match.record_set_score(6, 2)  # Team 1 wins third set 6-2
match.determine_winner()       # Automatically sets winner
```

---

## 🔒 Financial Safety Operations

### Safe Financial Transaction
```python
from apps.finance.mixins import FinancialSafetyMixin

mixin = FinancialSafetyMixin()
result = mixin.execute_financial_transaction(
    amount=Decimal('100.00'),
    transaction_type='payment',
    user=user,
    idempotency_key='unique_key_123'
)
# Guaranteed: Atomic, auditable, idempotent, fraud-checked
```

### Check System Health
```python
from apps.finance.health import get_financial_health_status

health = get_financial_health_status()
if health['overall_status'] != 'healthy':
    # Alert administrators
    pass
```

---

## 📊 Database Queries (Optimized)

### Optimized Reservation Query
```python
reservations = Reservation.objects.select_related(
    'club', 'court', 'created_by'
).prefetch_related(
    'split_payments'
).filter(
    club=club,
    date__gte=today
).annotate(
    total_paid=Sum('payments__amount')
)
```

### Optimized Class Session Query
```python
sessions = ClassSession.objects.select_related(
    'schedule__class_type',
    'schedule__level',
    'instructor__user',
    'court'
).prefetch_related(
    'enrollments__student__user'
).filter(
    scheduled_datetime__date=target_date
)
```

---

## 🚨 Emergency Procedures

### Financial System Lockdown
```python
from apps.finance.health import financial_health_monitor
financial_health_monitor.emergency_lockdown()
```

### Payment State Recovery
```python
from apps.finance.CRITICAL_PATHS import emergency_payment_state_recovery
recovery_log = emergency_payment_state_recovery()
```

---

## 🔍 Common API Endpoints

### Classes
- `GET /api/classes/sessions/available/` - Find available classes
- `POST /api/classes/enrollments/` - Enroll in a class
- `GET /api/classes/calendar/monthly/` - Monthly calendar view
- `GET /api/classes/history/my_classes/` - Student's class history

### Tournaments
- `GET /api/tournaments/` - List tournaments
- `POST /api/tournaments/{id}/registrations/` - Register for tournament
- `GET /api/tournaments/{id}/standings/` - Get tournament standings
- `GET /api/tournaments/{id}/bracket/` - View tournament bracket

### Payments
- `POST /api/finance/payments/` - Create payment
- `POST /api/finance/payments/{id}/refund/` - Process refund
- `GET /api/finance/payments/my_payments/` - User's payment history

### Notifications
- `GET /api/notifications/preferences/` - Get notification preferences
- `PUT /api/notifications/preferences/` - Update preferences
- `GET /api/notifications/` - Get user's notifications
- `PUT /api/notifications/{id}/mark_read/` - Mark as read

---

## 🛠️ Testing Commands

### Run All Tests
```bash
python manage.py test
```

### Run Module Tests
```bash
python manage.py test apps.finance
python manage.py test apps.classes
python manage.py test apps.tournaments
```

### Run Financial Integrity Tests
```bash
python manage.py test apps.finance.tests.test_financial_integrity --verbosity=2
```

---

## 📝 Notes

- All monetary amounts use `Decimal` type for precision
- All datetime operations use `timezone.now()` for consistency
- Multi-tenant filtering is automatic in ViewSets
- Payment operations are idempotent by design
- Notifications respect user preferences automatically