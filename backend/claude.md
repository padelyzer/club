# 🔧 Backend Development - Claude Assistant

## 🚨 CRITICAL: NO DUPLICATE MODULES

### ⛔ BEFORE Creating ANY File
```bash
# CHECK if module exists
ls backend/apps/

# EXISTING MODULES - DO NOT DUPLICATE:
# ✅ authentication - USE THIS
# ✅ clubs - USE THIS  
# ✅ reservations - USE THIS
# ✅ clients - USE THIS
# ✅ finance - USE THIS
# ✅ classes - IMPLEMENT HERE
# ✅ tournaments - IMPLEMENT HERE
# ✅ leagues - IMPLEMENT HERE
# ✅ bi - IMPLEMENT HERE
# ✅ notifications - IMPLEMENT HERE

# FORBIDDEN: authentication-v2, clubs-new, reservations-test, etc.
```

### 📁 Backend Structure
```
backend/
├── apps/
│   ├── authentication/    ✅ Complete - DO NOT DUPLICATE
│   ├── clubs/             ✅ Complete - DO NOT DUPLICATE
│   ├── reservations/      ✅ Complete - DO NOT DUPLICATE
│   ├── clients/           ✅ Complete - DO NOT DUPLICATE
│   ├── finance/           ⚠️ 60% - ADD WEBHOOKS HERE
│   ├── classes/           📝 20% - IMPLEMENT HERE
│   ├── tournaments/       📝 30% - IMPLEMENT HERE
│   ├── leagues/           📝 10% - IMPLEMENT HERE
│   ├── bi/               📝 10% - IMPLEMENT HERE
│   └── notifications/     ⚠️ 40% - ADD SMS HERE
├── config/               # Django settings - DO NOT DUPLICATE
├── core/                 # Shared utilities - USE THESE
├── tests/               # Test suites - ADD TESTS HERE
└── requirements/        # Dependencies - ONE FILE
```

## 🎯 Current Backend Priorities

### This Week (Critical 🔴)
1. **Complete Stripe Webhooks**
   - Location: `apps/finance/webhooks.py` ← MODIFY THIS FILE
   - DO NOT create finance-v2 or finance-webhooks app
   - Notion Ref: Finance Module Requirements
   - Status: Handler structure exists, needs implementation

2. **Notification System**
   - Location: `apps/notifications/` ← USE EXISTING
   - DO NOT create notifications-sms or notifications-v2
   - Implement SMS with Twilio IN EXISTING MODULE
   - Add WhatsApp notifications IN SAME MODULE
   - Create notification preferences model IN SAME MODULE

3. **Classes Module**
   - Location: `apps/classes/` ← ALREADY EXISTS
   - DO NOT create classes-v2, classes-new, etc.
   - Create ViewSets IN apps/classes/views.py
   - Add serializers IN apps/classes/serializers.py
   - Implement scheduling logic IN SAME MODULE

## 🏗️ Django Patterns to Follow

### Model Pattern (USE EXISTING FILES)
```python
# apps/[module]/models.py ← MODIFY EXISTING FILE
class MyModel(BaseModel):  # Always extend BaseModel from core
    """
    Model description.
    Check Notion for fields specification.
    """
    # Fields based on Notion requirements
    
    class Meta:
        db_table = 'app_modelname'  # Consistent naming
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['field1', 'field2']),
        ]

# DO NOT CREATE models_v2.py or alternative_models.py
```

### ViewSet Pattern (USE EXISTING FILES)
```python
# apps/[module]/views.py ← MODIFY EXISTING FILE
class MyViewSet(viewsets.ModelViewSet):
    """
    ViewSet description.
    Notion ref: [Link to Notion spec]
    """
    queryset = MyModel.objects.select_related('relation').prefetch_related('many_relation')
    serializer_class = MySerializer
    permission_classes = [IsAuthenticated, IsClubOwner]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    filterset_class = MyFilter
    
    def get_queryset(self):
        # Always filter by user's club
        return super().get_queryset().filter(club=self.request.user.club)

# DO NOT CREATE views_optimized.py or views_v2.py
```

### Serializer Pattern (USE EXISTING FILES)
```python
# apps/[module]/serializers.py ← MODIFY EXISTING FILE
class MySerializer(serializers.ModelSerializer):
    """
    Check Notion for field validations and business rules.
    """
    # Add computed fields if needed
    
    class Meta:
        model = MyModel
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        # Business logic validation from Notion
        return data

# DO NOT CREATE serializers_new.py or alternative_serializers.py
```

## 📋 Database Optimization Checklist

### For Every Query (OPTIMIZE IN PLACE):
- [ ] Use `select_related()` for ForeignKey
- [ ] Use `prefetch_related()` for ManyToMany
- [ ] Add database indexes for filtered fields
- [ ] Use `only()` or `defer()` for large models
- [ ] Implement pagination for list views
- [ ] Cache expensive calculations

### Example Optimized Query:
```python
# MODIFY EXISTING QUERIES, DON'T CREATE NEW VIEWS
reservations = Reservation.objects\
    .select_related('court', 'user', 'club')\
    .prefetch_related('participants')\
    .filter(club=request.user.club)\
    .only('id', 'date', 'time', 'status')\
    [:100]  # Limit results
```

## 🔐 Security Patterns

### Permission Classes (USE EXISTING FROM CORE)
```python
# Import from core.permissions - DO NOT DUPLICATE
from core.permissions import (
    IsAuthenticated,      # User must be logged in
    IsClubMember,        # User belongs to a club
    IsClubOwner,         # User owns the club
    IsClubStaff,         # User is staff in club
)

# DO NOT CREATE new permission classes if similar exists
```

### Data Validation (IN SERIALIZERS)
```python
# Always validate in existing serializer
def validate_email(self, value):
    if not value.endswith('@padelyzer.com'):
        raise serializers.ValidationError("Invalid email domain")
    return value.lower()
```

## 🧪 Testing Requirements

### For Every Feature (ADD TO EXISTING TEST FILES):
```python
# apps/[module]/tests.py or tests/test_[module].py
# DO NOT CREATE test_v2.py or test_alternative.py

class MyFeatureTestCase(TestCase):
    """Tests for [Feature Name] - Notion ref: [link]"""
    
    def setUp(self):
        # Create test data according to Notion specs
        pass
    
    def test_happy_path(self):
        """Test successful case from Notion flow"""
        pass
    
    def test_edge_cases(self):
        """Test edge cases defined in Notion"""
        pass
    
    def test_permissions(self):
        """Test permission matrix from Notion"""
        pass
```

## 🔄 Stripe Integration Status

### Completed ✅ (IN apps/finance/)
- Customer creation
- Payment method attachment
- Basic charge creation

### Pending 📝 (ADD TO EXISTING FILES)
- [ ] Webhook handlers in `apps/finance/webhooks.py`:
  - payment_intent.succeeded
  - payment_intent.failed
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
  
### Implementation Guide:
```python
# apps/finance/webhooks.py ← MODIFY THIS FILE ONLY
@csrf_exempt
def stripe_webhook(request):
    """
    Handle Stripe webhooks.
    Notion ref: Payment Flow Documentation
    """
    # 1. Verify signature
    # 2. Parse event
    # 3. Handle based on type
    # 4. Update our database
    # 5. Send notifications
    # 6. Return 200 OK

# DO NOT CREATE webhooks_v2.py or alternative_webhooks.py
```

## 📊 Performance Monitoring

### Add Logging (TO EXISTING FILES):
```python
import logging
logger = logging.getLogger(__name__)

# In existing views - DO NOT CREATE new logging views
logger.info(f"User {user.id} accessed {endpoint}")
logger.error(f"Payment failed for reservation {reservation.id}")
```

## 🔗 API Documentation

### Every Endpoint Needs (IN EXISTING VIEWS):
```python
# MODIFY existing ViewSet docstrings
class MyViewSet(viewsets.ModelViewSet):
    """
    API endpoint for [Feature].
    
    Notion Reference: [link to Notion]
    
    list:
    Return all items for the current club.
    
    create:
    Create a new item. Requires club owner permission.
    
    retrieve:
    Get a specific item by ID.
    
    update:
    Update an item. Requires club owner permission.
    
    destroy:
    Delete an item. Requires club owner permission.
    """
```

## 🐛 Common Issues & Solutions

### Issue: Slow queries
```python
# Solution: OPTIMIZE EXISTING QUERY, don't create new view
# MODIFY the slow query in place
queryset = Model.objects.select_related('related').prefetch_related('many')
```

### Issue: Permission errors
```python
# Solution: FIX IN EXISTING get_queryset
def get_queryset(self):
    return super().get_queryset().filter(club=self.request.user.club)
```

### Issue: Stripe webhook failing
```python
# Solution: FIX IN EXISTING webhook handler
@transaction.atomic
def handle_webhook(event):
    # Use event.id as idempotency key
    if PaymentEvent.objects.filter(stripe_event_id=event.id).exists():
        return  # Already processed
```

## 📝 Quick Backend Tasks

### Create New Module (ONLY IF NOT EXISTS):
```bash
# FIRST CHECK if module exists
ls apps/

# If truly new (not a variation):
python manage.py startapp module_name
mv module_name apps/
# Add to INSTALLED_APPS
# Create models based on Notion
```

### Run Specific Tests:
```bash
# Test existing modules
python manage.py test apps.module_name.tests.TestClassName.test_method_name
```

### Check Code Quality:
```bash
# Check existing code
flake8 apps/module_name/
black apps/module_name/
isort apps/module_name/
```

## 🔍 Debugging Commands

```bash
# Django shell - debug existing models
python manage.py shell_plus

# Check migrations - don't create duplicates
python manage.py showmigrations

# SQL queries for existing views
python manage.py debugsqlshell
```

## ⛔ FORBIDDEN ACTIONS - IMMEDIATE REJECTION

1. **Creating duplicate apps**: finance-v2, clubs-new, etc.
2. **Alternative model files**: models_optimized.py, models_v2.py
3. **Duplicate view files**: views_new.py, views_refactored.py
4. **Test versions**: serializers_test.py, urls_backup.py
5. **Copying instead of modifying**: Making copies to test
6. **New permission classes**: When similar exists in core
7. **Duplicate utilities**: When exists in core/utils
8. **Alternative URL patterns**: urls_v2.py, urls_new.py
9. **Backup files**: *.backup, *.old, *.copy
10. **Test migrations**: Never create test migrations

## 📚 File Naming Conventions

### ✅ CORRECT:
```
apps/classes/models.py
apps/classes/views.py
apps/classes/serializers.py
apps/classes/tests.py
```

### ❌ WRONG:
```
apps/classes-v2/
apps/classes/models_new.py
apps/classes/views_optimized.py
apps/classes/serializers_backup.py
```

## 🔄 Before Every Change

### Checklist:
```bash
# 1. Check if file exists
find . -name "*[feature]*"

# 2. Check for duplicates
ls apps/ | grep [module]

# 3. Verify Notion requirements
# Check Notion for exact requirements

# 4. Modify existing file
# NEVER create alternative version

# 5. Test changes
python manage.py test apps.[module]

# 6. Clean up any test files
find . -name "*test*" -o -name "*backup*" | grep -v tests.py
```

---

**REMEMBER**:
- Check Notion for requirements
- MODIFY existing files
- NEVER create duplicates
- If unsure, ASK where to put code
- Clean up test files immediately

**Main Context**: See `/Users/ja/PZR4/claude.md`
**Backend Root**: `/Users/ja/PZR4/backend`
