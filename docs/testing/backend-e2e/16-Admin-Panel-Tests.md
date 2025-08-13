# 🛠️ Admin Panel Tests

## 📋 Resumen

Esta guía detalla los tests E2E para el panel de administración, cubriendo gestión de usuarios, configuración del sistema, moderación de contenido y herramientas administrativas.

## 🎯 Objetivos de Testing

### Cobertura Target: 95%
- **Unit Tests**: 60% - Lógica de permisos y validaciones
- **Integration Tests**: 25% - APIs administrativas
- **E2E Tests**: 15% - Flujos completos de administración

### Componentes a Cubrir
- ✅ User Management (CRUD, Roles, Permissions)
- ✅ System Configuration
- ✅ Content Moderation
- ✅ Audit Logs
- ✅ Reports & Analytics
- ✅ Bulk Operations
- ✅ System Health Monitoring
- ✅ Data Import/Export

## 🧪 Unit Tests

### 1. Permission System Tests
```python
# backend/tests/unit/admin/test_permissions.py
from django.test import TestCase
from django.contrib.auth.models import Permission
from apps.admin.permissions import AdminPermissionChecker, RoleManager
from apps.admin.models import AdminRole, AdminPermission
from tests.factories import UserFactory, ClubFactory

class AdminPermissionTest(TestCase):
    """Test admin permission system"""
    
    def setUp(self):
        self.permission_checker = AdminPermissionChecker()
        self.role_manager = RoleManager()
        
    def test_role_hierarchy(self):
        """Test role hierarchy and inheritance"""
        # Create role hierarchy
        super_admin = AdminRole.objects.create(
            name='Super Admin',
            level=1,
            permissions=['*']  # All permissions
        )
        
        club_admin = AdminRole.objects.create(
            name='Club Admin',
            level=2,
            parent=super_admin,
            permissions=['club.*', 'users.view', 'users.edit']
        )
        
        staff = AdminRole.objects.create(
            name='Staff',
            level=3,
            parent=club_admin,
            permissions=['reservations.*', 'users.view']
        )
        
        # Test permission inheritance
        self.assertTrue(
            self.role_manager.has_permission(super_admin, 'club.delete')
        )
        self.assertTrue(
            self.role_manager.has_permission(club_admin, 'club.edit')
        )
        self.assertFalse(
            self.role_manager.has_permission(staff, 'club.delete')
        )
        
    def test_context_based_permissions(self):
        """Test permissions with context"""
        user = UserFactory()
        club1 = ClubFactory()
        club2 = ClubFactory()
        
        # User is admin of club1 only
        user.admin_roles.create(
            role=AdminRole.objects.get(name='Club Admin'),
            club=club1
        )
        
        # Check permissions
        self.assertTrue(
            self.permission_checker.can_edit_club(user, club1)
        )
        self.assertFalse(
            self.permission_checker.can_edit_club(user, club2)
        )
        
    def test_permission_wildcards(self):
        """Test wildcard permission patterns"""
        role = AdminRole.objects.create(
            name='Test Role',
            permissions=[
                'users.*',           # All user permissions
                'clubs.view',        # Only view clubs
                'reports.revenue.*'  # All revenue report permissions
            ]
        )
        
        # Test wildcards
        self.assertTrue(self.role_manager.has_permission(role, 'users.create'))
        self.assertTrue(self.role_manager.has_permission(role, 'users.delete'))
        self.assertTrue(self.role_manager.has_permission(role, 'clubs.view'))
        self.assertFalse(self.role_manager.has_permission(role, 'clubs.edit'))
        self.assertTrue(self.role_manager.has_permission(role, 'reports.revenue.export'))

class AdminActionValidatorTest(TestCase):
    """Test admin action validation"""
    
    def setUp(self):
        self.validator = AdminActionValidator()
        
    def test_bulk_action_limits(self):
        """Test bulk action limits"""
        # Test selection limits
        items = list(range(1001))  # 1001 items
        
        with self.assertRaises(ValidationError) as context:
            self.validator.validate_bulk_action(
                action='delete',
                items=items,
                max_items=1000
            )
        
        self.assertIn('Maximum 1000 items', str(context.exception))
        
    def test_dangerous_action_confirmation(self):
        """Test dangerous actions require confirmation"""
        dangerous_actions = ['delete', 'permanent_delete', 'reset_passwords']
        
        for action in dangerous_actions:
            result = self.validator.requires_confirmation(action)
            self.assertTrue(result)
            
        # Safe actions don't require confirmation
        safe_actions = ['export', 'view', 'archive']
        for action in safe_actions:
            result = self.validator.requires_confirmation(action)
            self.assertFalse(result)
```

### 2. Audit System Tests
```python
# backend/tests/unit/admin/test_audit.py
from django.test import TestCase
from apps.admin.audit import AuditLogger, AuditAnalyzer
from apps.admin.models import AuditLog

class AuditLoggerTest(TestCase):
    """Test audit logging functionality"""
    
    def setUp(self):
        self.logger = AuditLogger()
        self.user = UserFactory()
        
    def test_log_admin_action(self):
        """Test logging admin actions"""
        # Log action
        log_entry = self.logger.log_action(
            user=self.user,
            action='user.delete',
            target_model='User',
            target_id=123,
            changes={
                'status': {'old': 'active', 'new': 'deleted'}
            },
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0...'
        )
        
        self.assertIsNotNone(log_entry)
        self.assertEqual(log_entry.user, self.user)
        self.assertEqual(log_entry.action, 'user.delete')
        self.assertEqual(log_entry.target_id, '123')
        
    def test_sensitive_data_masking(self):
        """Test sensitive data is masked in logs"""
        # Log with sensitive data
        log_entry = self.logger.log_action(
            user=self.user,
            action='user.update',
            target_model='User',
            target_id=1,
            changes={
                'password': {'old': 'oldpass123', 'new': 'newpass456'},
                'email': {'old': 'old@test.com', 'new': 'new@test.com'},
                'credit_card': {'old': '1234567890123456', 'new': '9876543210987654'}
            }
        )
        
        # Password should be masked
        self.assertEqual(
            log_entry.changes['password']['old'],
            '***'
        )
        self.assertEqual(
            log_entry.changes['password']['new'],
            '***'
        )
        
        # Credit card should be partially masked
        self.assertIn('****', log_entry.changes['credit_card']['new'])
        
        # Email should not be masked
        self.assertEqual(
            log_entry.changes['email']['new'],
            'new@test.com'
        )
        
    def test_audit_trail_integrity(self):
        """Test audit trail cannot be modified"""
        log_entry = self.logger.log_action(
            user=self.user,
            action='test.action',
            target_model='Test',
            target_id=1
        )
        
        # Try to modify
        with self.assertRaises(Exception):
            log_entry.action = 'modified.action'
            log_entry.save()
            
        # Verify checksum validation
        log_entry.checksum = 'invalid'
        self.assertFalse(log_entry.verify_integrity())

class AuditAnalyzerTest(TestCase):
    """Test audit log analysis"""
    
    def setUp(self):
        self.analyzer = AuditAnalyzer()
        self.create_test_logs()
        
    def create_test_logs(self):
        """Create test audit logs"""
        users = UserFactory.create_batch(3)
        
        # Create various admin actions
        for i in range(100):
            AuditLog.objects.create(
                user=users[i % 3],
                action=random.choice([
                    'user.create', 'user.update', 'user.delete',
                    'club.update', 'reservation.cancel'
                ]),
                timestamp=timezone.now() - timedelta(hours=i)
            )
            
    def test_detect_suspicious_patterns(self):
        """Test detection of suspicious activity"""
        # Create suspicious pattern (many deletes in short time)
        user = UserFactory()
        for i in range(20):
            AuditLog.objects.create(
                user=user,
                action='user.delete',
                timestamp=timezone.now() - timedelta(minutes=i)
            )
            
        suspicious = self.analyzer.detect_suspicious_activity(
            time_window=timedelta(hours=1)
        )
        
        self.assertGreater(len(suspicious), 0)
        self.assertEqual(suspicious[0]['user'], user)
        self.assertEqual(suspicious[0]['pattern'], 'mass_deletion')
        
    def test_admin_activity_summary(self):
        """Test admin activity summarization"""
        summary = self.analyzer.get_activity_summary(
            start_date=timezone.now() - timedelta(days=7),
            end_date=timezone.now()
        )
        
        self.assertIn('total_actions', summary)
        self.assertIn('actions_by_type', summary)
        self.assertIn('most_active_admins', summary)
        self.assertIn('peak_hours', summary)
```

### 3. Configuration Management Tests
```python
# backend/tests/unit/admin/test_configuration.py
from django.test import TestCase
from apps.admin.config import ConfigManager, ConfigValidator
from apps.admin.models import SystemConfig

class ConfigurationManagementTest(TestCase):
    """Test system configuration management"""
    
    def setUp(self):
        self.config_manager = ConfigManager()
        self.validator = ConfigValidator()
        
    def test_config_validation(self):
        """Test configuration validation"""
        # Valid config
        valid_config = {
            'reservation': {
                'advance_days': 30,
                'min_duration': 60,
                'max_duration': 180,
                'cancellation_hours': 24
            },
            'payment': {
                'currency': 'EUR',
                'tax_rate': 21.0,
                'processing_fee': 2.5
            }
        }
        
        errors = self.validator.validate(valid_config)
        self.assertEqual(len(errors), 0)
        
        # Invalid config
        invalid_config = {
            'reservation': {
                'advance_days': -1,  # Negative not allowed
                'min_duration': 180,
                'max_duration': 60   # Max less than min
            }
        }
        
        errors = self.validator.validate(invalid_config)
        self.assertGreater(len(errors), 0)
        
    def test_config_versioning(self):
        """Test configuration version control"""
        # Create initial config
        config_v1 = self.config_manager.create_config(
            key='reservation_settings',
            value={'advance_days': 30},
            user=UserFactory()
        )
        
        # Update config
        config_v2 = self.config_manager.update_config(
            key='reservation_settings',
            value={'advance_days': 45},
            user=UserFactory()
        )
        
        # Check versions
        versions = self.config_manager.get_config_history('reservation_settings')
        self.assertEqual(len(versions), 2)
        self.assertEqual(versions[0].value['advance_days'], 30)
        self.assertEqual(versions[1].value['advance_days'], 45)
        
        # Rollback
        rolled_back = self.config_manager.rollback_config(
            'reservation_settings',
            version=1
        )
        self.assertEqual(rolled_back.value['advance_days'], 30)
        
    def test_config_dependencies(self):
        """Test configuration dependencies"""
        # Define dependencies
        self.validator.add_dependency(
            'payment.stripe_enabled',
            requires=['payment.stripe_public_key', 'payment.stripe_secret_key']
        )
        
        # Test missing dependencies
        config = {
            'payment': {
                'stripe_enabled': True
                # Missing required keys
            }
        }
        
        errors = self.validator.validate(config)
        self.assertIn('stripe_public_key is required', str(errors))
```

## 🔌 Integration Tests

### 1. Admin API Tests
```python
# backend/tests/integration/admin/test_admin_api.py
from rest_framework.test import APITestCase
from rest_framework import status

class AdminAPITest(APITestCase):
    """Test admin API endpoints"""
    
    def setUp(self):
        self.super_admin = UserFactory(is_superuser=True)
        self.club_admin = UserFactory()
        self.club = ClubFactory()
        
        # Assign club admin role
        self.club_admin.admin_roles.create(
            role=AdminRole.objects.create(name='Club Admin'),
            club=self.club
        )
        
    def test_user_management_api(self):
        """Test user management endpoints"""
        self.client.force_authenticate(user=self.super_admin)
        
        # Create user
        response = self.client.post(
            '/api/v1/admin/users/',
            {
                'email': 'newuser@test.com',
                'first_name': 'New',
                'last_name': 'User',
                'role': 'staff',
                'club_id': self.club.id
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user_id = response.data['id']
        
        # Update user
        response = self.client.patch(
            f'/api/v1/admin/users/{user_id}/',
            {'is_active': False}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify audit log created
        audit_response = self.client.get(
            '/api/v1/admin/audit-logs/',
            {'target_id': user_id}
        )
        
        self.assertEqual(len(audit_response.data['results']), 2)
        
    def test_bulk_operations_api(self):
        """Test bulk operations"""
        self.client.force_authenticate(user=self.super_admin)
        
        # Create test users
        users = UserFactory.create_batch(5, is_active=True)
        user_ids = [u.id for u in users]
        
        # Bulk deactivate
        response = self.client.post(
            '/api/v1/admin/users/bulk-action/',
            {
                'action': 'deactivate',
                'ids': user_ids,
                'confirm': True
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['affected'], 5)
        
        # Verify all deactivated
        for user in User.objects.filter(id__in=user_ids):
            self.assertFalse(user.is_active)
            
    def test_system_configuration_api(self):
        """Test system configuration endpoints"""
        self.client.force_authenticate(user=self.super_admin)
        
        # Get current config
        response = self.client.get('/api/v1/admin/config/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Update config
        response = self.client.put(
            '/api/v1/admin/config/reservation/',
            {
                'advance_days': 45,
                'min_duration': 30,
                'max_duration': 240,
                'cancellation_hours': 48
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify config updated
        config = SystemConfig.objects.get(key='reservation')
        self.assertEqual(config.value['advance_days'], 45)
        
    def test_admin_dashboard_metrics(self):
        """Test admin dashboard metrics API"""
        self.client.force_authenticate(user=self.club_admin)
        
        # Create test data
        ReservationFactory.create_batch(10, club=self.club, status='confirmed')
        ReservationFactory.create_batch(5, club=self.club, status='cancelled')
        PaymentFactory.create_batch(8, club=self.club, amount=50)
        
        response = self.client.get(
            f'/api/v1/admin/clubs/{self.club.id}/dashboard/'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data['reservations']['total'], 15)
        self.assertEqual(data['reservations']['confirmed'], 10)
        self.assertEqual(data['revenue']['total'], 400)
```

### 2. Content Moderation Tests
```python
# backend/tests/integration/admin/test_moderation.py
class ContentModerationAPITest(APITestCase):
    """Test content moderation features"""
    
    def setUp(self):
        self.moderator = UserFactory()
        self.moderator.admin_roles.create(
            role=AdminRole.objects.create(
                name='Moderator',
                permissions=['moderation.*']
            )
        )
        
    def test_review_queue_api(self):
        """Test moderation review queue"""
        # Create flagged content
        for i in range(10):
            ReviewFactory(
                content="Test review " + ("spam" * i),
                flags=['spam'] if i > 5 else [],
                status='pending'
            )
            
        self.client.force_authenticate(user=self.moderator)
        
        # Get review queue
        response = self.client.get(
            '/api/v1/admin/moderation/queue/',
            {'status': 'pending', 'has_flags': 'true'}
        )
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 4)  # Flagged items
        
    def test_moderation_actions(self):
        """Test moderation action workflow"""
        review = ReviewFactory(
            content="Inappropriate content here",
            flags=['inappropriate'],
            status='pending'
        )
        
        self.client.force_authenticate(user=self.moderator)
        
        # Take moderation action
        response = self.client.post(
            f'/api/v1/admin/moderation/reviews/{review.id}/moderate/',
            {
                'action': 'remove',
                'reason': 'Violates community guidelines',
                'notify_user': True
            }
        )
        
        self.assertEqual(response.status_code, 200)
        
        # Verify review updated
        review.refresh_from_db()
        self.assertEqual(review.status, 'removed')
        self.assertEqual(review.moderated_by, self.moderator)
        
        # Check notification sent
        notification = Notification.objects.filter(
            user=review.user,
            type='content_removed'
        ).first()
        self.assertIsNotNone(notification)
        
    def test_automated_moderation(self):
        """Test automated content moderation"""
        # Content with prohibited words
        response = self.client.post(
            '/api/v1/reviews/',
            {
                'club_id': ClubFactory().id,
                'rating': 1,
                'content': 'This place sucks! Total scam and fraud!'
            }
        )
        
        # Should be auto-flagged
        review = Review.objects.get(id=response.data['id'])
        self.assertIn('profanity', review.flags)
        self.assertIn('negative_sentiment', review.flags)
        self.assertEqual(review.status, 'pending_review')
```

## 🔄 E2E Flow Tests

### 1. Complete Admin Workflow
```python
# backend/tests/e2e/admin/test_admin_workflow.py
from django.test import TestCase, override_settings
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

class AdminPanelE2ETest(TestCase):
    """Test complete admin panel workflow"""
    
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.driver = webdriver.Chrome()
        cls.wait = WebDriverWait(cls.driver, 10)
        
    def test_complete_admin_workflow(self):
        """Test full admin workflow from login to actions"""
        # Step 1: Admin login
        self.driver.get(f"{self.live_server_url}/admin/login")
        
        self.driver.find_element(By.ID, "email").send_keys("admin@test.com")
        self.driver.find_element(By.ID, "password").send_keys("admin123")
        self.driver.find_element(By.ID, "submit").click()
        
        # Verify dashboard loaded
        self.wait.until(
            EC.presence_of_element_located((By.CLASS_NAME, "admin-dashboard"))
        )
        
        # Step 2: Navigate to user management
        self.driver.find_element(By.LINK_TEXT, "Users").click()
        
        # Step 3: Search for user
        search_box = self.driver.find_element(By.ID, "user-search")
        search_box.send_keys("john.doe@example.com")
        search_box.submit()
        
        # Wait for results
        self.wait.until(
            EC.presence_of_element_located((By.CLASS_NAME, "user-row"))
        )
        
        # Step 4: Edit user
        self.driver.find_element(By.CLASS_NAME, "edit-user-btn").click()
        
        # Change user status
        status_select = self.driver.find_element(By.ID, "user-status")
        status_select.select_by_value("suspended")
        
        # Add admin note
        note_field = self.driver.find_element(By.ID, "admin-note")
        note_field.send_keys("Suspended due to payment issues")
        
        # Save changes
        self.driver.find_element(By.ID, "save-user").click()
        
        # Verify success message
        self.wait.until(
            EC.text_to_be_present_in_element(
                (By.CLASS_NAME, "alert-success"),
                "User updated successfully"
            )
        )
        
        # Step 5: Check audit log
        self.driver.find_element(By.LINK_TEXT, "Audit Log").click()
        
        # Verify action logged
        latest_log = self.driver.find_element(By.CSS_SELECTOR, ".audit-log-row:first-child")
        self.assertIn("user.update", latest_log.text)
        self.assertIn("john.doe@example.com", latest_log.text)
```

### 2. Multi-Club Management Flow
```python
# backend/tests/e2e/admin/test_multi_club_flow.py
class MultiClubAdminE2ETest(TestCase):
    """Test multi-club administration workflow"""
    
    def test_multi_club_admin_workflow(self):
        """Test admin managing multiple clubs"""
        # Create admin with access to multiple clubs
        admin = UserFactory()
        clubs = ClubFactory.create_batch(3)
        
        for club in clubs:
            admin.admin_roles.create(
                role=AdminRole.objects.get(name='Club Admin'),
                club=club
            )
            
        self.client.force_authenticate(user=admin)
        
        # Step 1: Get club selector
        response = self.client.get('/api/v1/admin/my-clubs/')
        self.assertEqual(len(response.data), 3)
        
        # Step 2: Switch between clubs
        for club in clubs:
            # Select club context
            self.client.post(
                '/api/v1/admin/set-active-club/',
                {'club_id': club.id}
            )
            
            # Get club-specific data
            dashboard_response = self.client.get('/api/v1/admin/dashboard/')
            
            # Verify data is club-specific
            self.assertEqual(
                dashboard_response.data['club']['id'],
                club.id
            )
            
            # Perform club-specific action
            court = CourtFactory(club=club)
            update_response = self.client.patch(
                f'/api/v1/admin/courts/{court.id}/',
                {'price_per_hour': 35}
            )
            
            self.assertEqual(update_response.status_code, 200)
            
        # Step 3: Generate comparative report
        report_response = self.client.post(
            '/api/v1/admin/reports/multi-club-comparison/',
            {
                'club_ids': [c.id for c in clubs],
                'metrics': ['revenue', 'occupancy', 'users'],
                'period': 'last_30_days'
            }
        )
        
        self.assertEqual(report_response.status_code, 200)
        
        report = report_response.data
        self.assertEqual(len(report['clubs']), 3)
        for club_report in report['clubs']:
            self.assertIn('revenue', club_report)
            self.assertIn('occupancy', club_report)
            self.assertIn('users', club_report)
```

### 3. System Health Monitoring Flow
```python
# backend/tests/e2e/admin/test_system_monitoring.py
class SystemMonitoringE2ETest(TestCase):
    """Test system health monitoring workflow"""
    
    def test_system_health_monitoring_flow(self):
        """Test complete system monitoring workflow"""
        super_admin = UserFactory(is_superuser=True)
        self.client.force_authenticate(user=super_admin)
        
        # Step 1: Check system status
        response = self.client.get('/api/v1/admin/system/health/')
        
        self.assertEqual(response.status_code, 200)
        
        health = response.data
        self.assertIn('database', health)
        self.assertIn('cache', health)
        self.assertIn('storage', health)
        self.assertIn('celery', health)
        
        # Step 2: Get performance metrics
        metrics_response = self.client.get(
            '/api/v1/admin/system/metrics/',
            {'period': 'last_hour'}
        )
        
        metrics = metrics_response.data
        self.assertIn('response_time', metrics)
        self.assertIn('error_rate', metrics)
        self.assertIn('active_users', metrics)
        
        # Step 3: Check for alerts
        alerts_response = self.client.get('/api/v1/admin/system/alerts/')
        
        # Step 4: Run diagnostics
        diagnostics_response = self.client.post(
            '/api/v1/admin/system/diagnostics/',
            {'tests': ['database', 'cache', 'email', 'storage']}
        )
        
        self.assertEqual(diagnostics_response.status_code, 202)
        task_id = diagnostics_response.data['task_id']
        
        # Poll for results
        for _ in range(10):
            result_response = self.client.get(
                f'/api/v1/admin/system/diagnostics/{task_id}/'
            )
            
            if result_response.data['status'] == 'completed':
                results = result_response.data['results']
                for test in ['database', 'cache', 'email', 'storage']:
                    self.assertIn(test, results)
                    self.assertIn('status', results[test])
                break
                
            time.sleep(1)
            
        # Step 5: Schedule maintenance mode
        maintenance_response = self.client.post(
            '/api/v1/admin/system/maintenance/',
            {
                'start_time': (timezone.now() + timedelta(hours=2)).isoformat(),
                'duration_minutes': 30,
                'message': 'Scheduled maintenance for system updates',
                'affected_services': ['reservations', 'payments']
            }
        )
        
        self.assertEqual(maintenance_response.status_code, 201)
```

## 🔒 Security Tests

### Admin Security Tests
```python
# backend/tests/security/admin/test_security.py
class AdminSecurityTest(TestCase):
    """Test admin panel security"""
    
    def test_permission_escalation_prevention(self):
        """Test prevention of permission escalation"""
        # Club admin tries to give themselves super admin
        club_admin = UserFactory()
        club_admin.admin_roles.create(
            role=AdminRole.objects.get(name='Club Admin'),
            club=ClubFactory()
        )
        
        self.client.force_authenticate(user=club_admin)
        
        # Try to update own permissions
        response = self.client.patch(
            f'/api/v1/admin/users/{club_admin.id}/',
            {'is_superuser': True}
        )
        
        self.assertEqual(response.status_code, 403)
        
        # Try to assign higher role
        response = self.client.post(
            f'/api/v1/admin/users/{club_admin.id}/roles/',
            {'role': 'super_admin'}
        )
        
        self.assertEqual(response.status_code, 403)
        
    def test_audit_log_tampering_prevention(self):
        """Test audit logs cannot be tampered with"""
        admin = UserFactory(is_superuser=True)
        self.client.force_authenticate(user=admin)
        
        # Try to delete audit log
        log = AuditLog.objects.create(
            user=admin,
            action='test.action',
            target_model='Test',
            target_id=1
        )
        
        response = self.client.delete(f'/api/v1/admin/audit-logs/{log.id}/')
        self.assertEqual(response.status_code, 403)
        
        # Try to update audit log
        response = self.client.patch(
            f'/api/v1/admin/audit-logs/{log.id}/',
            {'action': 'modified.action'}
        )
        self.assertEqual(response.status_code, 403)
        
    def test_session_security(self):
        """Test admin session security"""
        admin = UserFactory(is_superuser=True)
        
        # Login
        response = self.client.post(
            '/api/v1/admin/auth/login/',
            {
                'email': admin.email,
                'password': 'testpass123',
                'admin_panel': True
            }
        )
        
        token = response.data['admin_token']
        
        # Verify admin token has shorter expiry
        from rest_framework_simplejwt.tokens import AccessToken
        token_obj = AccessToken(token)
        expiry = datetime.fromtimestamp(token_obj['exp'])
        
        # Admin tokens should expire in 2 hours max
        self.assertLess(
            (expiry - datetime.now()).total_seconds(),
            7200  # 2 hours
        )
        
        # Test IP validation
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Request from different IP should fail
        response = self.client.get(
            '/api/v1/admin/dashboard/',
            HTTP_X_FORWARDED_FOR='192.168.1.100'
        )
        
        self.assertEqual(response.status_code, 403)
```

## 📊 Performance Tests

### Admin Performance Tests
```python
# backend/tests/performance/admin/test_performance.py
class AdminPerformanceTest(TestCase):
    """Test admin panel performance"""
    
    def test_user_list_performance_with_large_dataset(self):
        """Test user list performance with many users"""
        # Create 10,000 users
        users = []
        for i in range(10000):
            users.append(
                User(
                    email=f'user{i}@test.com',
                    username=f'user{i}',
                    first_name=f'First{i}',
                    last_name=f'Last{i}'
                )
            )
        User.objects.bulk_create(users, batch_size=1000)
        
        admin = UserFactory(is_superuser=True)
        self.client.force_authenticate(user=admin)
        
        # Test paginated list performance
        start = time.time()
        
        response = self.client.get(
            '/api/v1/admin/users/',
            {
                'page': 1,
                'page_size': 50,
                'ordering': '-created_at'
            }
        )
        
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 1.0)  # Should load within 1 second
        self.assertEqual(len(response.data['results']), 50)
        
    def test_audit_log_query_performance(self):
        """Test audit log queries with large dataset"""
        # Create many audit logs
        logs = []
        users = UserFactory.create_batch(10)
        
        for i in range(50000):
            logs.append(
                AuditLog(
                    user=users[i % 10],
                    action=random.choice([
                        'user.create', 'user.update', 'user.delete',
                        'reservation.create', 'payment.process'
                    ]),
                    target_model='User',
                    target_id=str(random.randint(1, 1000)),
                    timestamp=timezone.now() - timedelta(hours=i)
                )
            )
            
        AuditLog.objects.bulk_create(logs, batch_size=5000)
        
        admin = UserFactory(is_superuser=True)
        self.client.force_authenticate(user=admin)
        
        # Test filtered query performance
        start = time.time()
        
        response = self.client.get(
            '/api/v1/admin/audit-logs/',
            {
                'action': 'user.update',
                'date_from': (timezone.now() - timedelta(days=7)).date(),
                'page_size': 100
            }
        )
        
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 2.0)  # Should complete within 2 seconds
        
    def test_bulk_operation_performance(self):
        """Test bulk operation performance"""
        # Create users to update
        users = UserFactory.create_batch(1000, is_active=True)
        user_ids = [u.id for u in users]
        
        admin = UserFactory(is_superuser=True)
        self.client.force_authenticate(user=admin)
        
        # Test bulk update performance
        start = time.time()
        
        response = self.client.post(
            '/api/v1/admin/users/bulk-action/',
            {
                'action': 'deactivate',
                'ids': user_ids,
                'confirm': True
            }
        )
        
        duration = time.time() - start
        
        self.assertEqual(response.status_code, 200)
        self.assertLess(duration, 5.0)  # Should complete within 5 seconds
        self.assertEqual(response.data['affected'], 1000)
```

## 🎯 Test Execution Commands

### Run All Admin Tests
```bash
# Unit tests only
pytest tests/unit/admin/ -v

# Integration tests
pytest tests/integration/admin/ -v

# E2E tests
pytest tests/e2e/admin/ -v

# All admin tests
pytest tests/ -k admin -v

# With coverage
pytest tests/ -k admin --cov=apps.admin --cov-report=html
```

### Run Specific Test Categories
```bash
# Permission tests
pytest tests/ -k "permission" -v

# Audit tests
pytest tests/ -k "audit" -v

# Moderation tests
pytest tests/ -k "moderation" -v

# Security tests
pytest tests/security/admin/ -v
```

---

**Siguiente**: [API Documentation Tests](17-API-Documentation-Tests.md) →