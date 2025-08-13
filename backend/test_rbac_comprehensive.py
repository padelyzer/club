#!/usr/bin/env python3
"""
Pruebas exhaustivas de RBAC y multi-tenant para Padelyzer.
Este script valida que los roles y permisos funcionen correctamente
y que el aislamiento entre organizaciones sea efectivo.
"""

import os
import sys
import django
import json
from decimal import Decimal
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

# Import models
from apps.root.models import Organization
from apps.authentication.models import OrganizationMembership
from apps.clubs.models import Club, Court
from apps.clients.models import ClientProfile
from apps.reservations.models import Reservation

User = get_user_model()

class RBACTestSuite:
    """Comprehensive RBAC test suite."""
    
    def __init__(self):
        self.results = {
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'failures': [],
            'summary': {}
        }
        self.setup_test_data()
    
    def setup_test_data(self):
        """Create test organizations, users, and data."""
        print("🔧 Setting up test data...")
        
        # Create organizations
        self.org_a, created = Organization.objects.get_or_create(
            rfc="RBAC123456AAA",
            defaults={
                "business_name": "RBAC Org A S.A. de C.V.",
                "trade_name": "RBAC Organization A",
                "primary_email": "rbac@orga.com",
                "primary_phone": "+521234567890",
                "legal_representative": "RBAC Admin A"
            }
        )
        
        self.org_b, created = Organization.objects.get_or_create(
            rfc="RBAC123456BBB",
            defaults={
                "business_name": "RBAC Org B S.A. de C.V.",
                "trade_name": "RBAC Organization B", 
                "primary_email": "rbac@orgb.com",
                "primary_phone": "+521234567891",
                "legal_representative": "RBAC Admin B"
            }
        )
        
        # Create users with different roles in Org A
        self.superuser, created = User.objects.get_or_create(
            email="rbac_super@padelyzer.com",
            defaults={
                "username": "rbac_superuser",
                "is_superuser": True,
                "is_staff": True
            }
        )
        if created:
            self.superuser.set_password("testpass123")
            self.superuser.save()
        
        self.org_admin_a = User.objects.create_user(
            username="orgadmin_a",
            email="admin@orga.com",
            password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.org_admin_a,
            organization=self.org_a,
            role="org_admin"
        )
        
        self.billing_a = User.objects.create_user(
            username="billing_a",
            email="billing@orga.com", 
            password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.billing_a,
            organization=self.org_a,
            role="billing"
        )
        
        self.support_a = User.objects.create_user(
            username="support_a",
            email="support@orga.com",
            password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.support_a,
            organization=self.org_a,
            role="support"
        )
        
        # Create users in Org B
        self.org_admin_b = User.objects.create_user(
            username="orgadmin_b",
            email="admin@orgb.com",
            password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.org_admin_b,
            organization=self.org_b,
            role="org_admin"
        )
        
        self.billing_b = User.objects.create_user(
            username="billing_b",
            email="billing@orgb.com",
            password="TEST_PASSWORD"
        )
        OrganizationMembership.objects.create(
            user=self.billing_b,
            organization=self.org_b,
            role="billing"
        )
        
        # Create clubs
        self.club_a = Club.objects.create(
            name="Club A",
            slug="club-a",
            email="info@cluba.com",
            phone="+521234567890",
            organization=self.org_a
        )
        
        self.club_b = Club.objects.create(
            name="Club B",
            slug="club-b", 
            email="info@clubb.com",
            phone="+521234567891",
            organization=self.org_b
        )
        
        # Create courts
        self.court_a = Court.objects.create(
            club=self.club_a,
            name="Court A1",
            number=1,
            surface_type="glass",
            organization=self.org_a
        )
        
        self.court_b = Court.objects.create(
            club=self.club_b,
            name="Court B1",
            number=1,
            surface_type="glass",
            organization=self.org_b
        )
        
        print("✅ Test data setup complete")
    
    def run_test(self, test_name, test_func):
        """Run a single test and record results."""
        self.results['tests_run'] += 1
        try:
            test_func()
            self.results['tests_passed'] += 1
            print(f"✅ {test_name}")
            return True
        except Exception as e:
            self.results['tests_failed'] += 1
            self.results['failures'].append({
                'test': test_name,
                'error': str(e)
            })
            print(f"❌ {test_name}: {str(e)}")
            return False
    
    def test_superuser_access(self):
        """Test that superuser can access all resources."""
        client = APIClient()
        client.force_authenticate(user=self.superuser)
        
        # Should see all clubs
        response = client.get('/api/v1/clubs/')
        if response.status_code != 200:
            raise Exception(f"Superuser can't access clubs: {response.status_code}")
        
        clubs = response.data['results']
        if len(clubs) != 2:
            raise Exception(f"Superuser should see 2 clubs, got {len(clubs)}")
        
        club_names = {club['name'] for club in clubs}
        if club_names != {'Club A', 'Club B'}:
            raise Exception(f"Superuser should see both clubs, got {club_names}")
    
    def test_org_admin_isolation(self):
        """Test that org admins can only see their organization's data."""
        # Test Org A admin
        client_a = APIClient()
        client_a.force_authenticate(user=self.org_admin_a)
        
        response = client_a.get('/api/v1/clubs/')
        if response.status_code != 200:
            raise Exception(f"Org A admin can't access clubs: {response.status_code}")
        
        clubs = response.data['results']
        if len(clubs) != 1:
            raise Exception(f"Org A admin should see 1 club, got {len(clubs)}")
        
        if clubs[0]['name'] != 'Club A':
            raise Exception(f"Org A admin should see Club A, got {clubs[0]['name']}")
        
        # Test Org B admin
        client_b = APIClient()
        client_b.force_authenticate(user=self.org_admin_b)
        
        response = client_b.get('/api/v1/clubs/')
        if response.status_code != 200:
            raise Exception(f"Org B admin can't access clubs: {response.status_code}")
        
        clubs = response.data['results']
        if len(clubs) != 1:
            raise Exception(f"Org B admin should see 1 club, got {len(clubs)}")
        
        if clubs[0]['name'] != 'Club B':
            raise Exception(f"Org B admin should see Club B, got {clubs[0]['name']}")
    
    def test_cross_organization_access_denied(self):
        """Test that users cannot access other organization's resources."""
        client_a = APIClient()
        client_a.force_authenticate(user=self.org_admin_a)
        
        # Try to access Club B directly by ID
        response = client_a.get(f'/api/v1/clubs/{self.club_b.slug}/')
        if response.status_code != 404:
            raise Exception(f"Should not be able to access other org's club, got {response.status_code}")
    
    def test_billing_role_permissions(self):
        """Test that billing role has limited permissions."""
        client = APIClient()
        client.force_authenticate(user=self.billing_a)
        
        # Should be able to view clubs (read-only)
        response = client.get('/api/v1/clubs/')
        if response.status_code != 200:
            raise Exception(f"Billing user should view clubs: {response.status_code}")
        
        # Should NOT be able to create clubs
        response = client.post('/api/v1/clubs/', data={
            'name': 'New Club',
            'slug': 'new-club',
            'email': 'new@club.com',
            'phone': '+521234567899'
        })
        if response.status_code == 201:
            raise Exception("Billing user should not be able to create clubs")
    
    def test_support_role_permissions(self):
        """Test that support role has very limited permissions."""
        client = APIClient()
        client.force_authenticate(user=self.support_a)
        
        # Should be able to view clubs
        response = client.get('/api/v1/clubs/')
        if response.status_code != 200:
            raise Exception(f"Support user should view clubs: {response.status_code}")
        
        # Should NOT be able to create or modify anything
        response = client.post('/api/v1/clubs/', data={
            'name': 'New Club',
            'slug': 'new-club-support',
            'email': 'support@club.com',
            'phone': '+521234567898'
        })
        if response.status_code == 201:
            raise Exception("Support user should not be able to create clubs")
    
    def test_reservation_isolation(self):
        """Test that reservations are properly isolated by organization."""
        # Create reservations
        reservation_a = Reservation.objects.create(
            club=self.club_a,
            court=self.court_a,
            date=datetime.now().date(),
            start_time=datetime.now().time(),
            end_time=(datetime.now() + timedelta(hours=1)).time(),
            created_by=self.org_admin_a,
            organization=self.org_a,
            status='confirmed'
        )
        
        reservation_b = Reservation.objects.create(
            club=self.club_b,
            court=self.court_b,
            date=datetime.now().date(),
            start_time=datetime.now().time(),
            end_time=(datetime.now() + timedelta(hours=1)).time(),
            created_by=self.org_admin_b,
            organization=self.org_b,
            status='confirmed'
        )
        
        # Test Org A user can only see their reservations
        client_a = APIClient()
        client_a.force_authenticate(user=self.org_admin_a)
        
        response = client_a.get('/api/v1/reservations/')
        if response.status_code != 200:
            raise Exception(f"Can't access reservations: {response.status_code}")
        
        reservations = response.data['results']
        if len(reservations) != 1:
            raise Exception(f"Should see 1 reservation, got {len(reservations)}")
        
        if reservations[0]['id'] != str(reservation_a.id):
            raise Exception("Should see only own organization's reservation")
        
        # Test Org B user
        client_b = APIClient()
        client_b.force_authenticate(user=self.org_admin_b)
        
        response = client_b.get('/api/v1/reservations/')
        reservations = response.data['results']
        if len(reservations) != 1:
            raise Exception(f"Should see 1 reservation, got {len(reservations)}")
        
        if reservations[0]['id'] != str(reservation_b.id):
            raise Exception("Should see only own organization's reservation")
    
    def test_authentication_required(self):
        """Test that unauthenticated users cannot access protected endpoints."""
        client = APIClient()
        
        endpoints = [
            '/api/v1/clubs/',
            '/api/v1/reservations/',
            '/api/v1/clients/',
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            if response.status_code != 401:
                raise Exception(f"Endpoint {endpoint} should require authentication, got {response.status_code}")
    
    def test_jwt_token_validation(self):
        """Test JWT token validation and blacklisting."""
        # Login and get token
        client = APIClient()
        response = client.post('/api/v1/auth/login/', {
            'email': 'admin@orga.com',
            'password': 'TEST_PASSWORD'
        })
        
        if response.status_code != 200:
            raise Exception(f"Login failed: {response.status_code}")
        
        access_token = response.data['access']
        
        # Use token to access protected endpoint
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = client.get('/api/v1/clubs/')
        if response.status_code != 200:
            raise Exception(f"Token authentication failed: {response.status_code}")
        
        # Logout to blacklist token
        response = client.post('/api/v1/auth/logout/')
        if response.status_code != 200:
            raise Exception(f"Logout failed: {response.status_code}")
        
        # Try to use blacklisted token
        response = client.get('/api/v1/clubs/')
        if response.status_code != 401:
            raise Exception(f"Blacklisted token should be rejected, got {response.status_code}")
    
    def run_all_tests(self):
        """Run all RBAC tests."""
        print("🧪 Starting comprehensive RBAC test suite...")
        print("=" * 60)
        
        tests = [
            ("Superuser Access", self.test_superuser_access),
            ("Organization Admin Isolation", self.test_org_admin_isolation),
            ("Cross-Organization Access Denied", self.test_cross_organization_access_denied),
            ("Billing Role Permissions", self.test_billing_role_permissions),
            ("Support Role Permissions", self.test_support_role_permissions),
            ("Reservation Isolation", self.test_reservation_isolation),
            ("Authentication Required", self.test_authentication_required),
            ("JWT Token Validation", self.test_jwt_token_validation),
        ]
        
        for test_name, test_func in tests:
            self.run_test(test_name, test_func)
        
        self.print_results()
    
    def print_results(self):
        """Print comprehensive test results."""
        print("\n" + "=" * 60)
        print("🧪 RBAC TEST RESULTS")
        print("=" * 60)
        
        print(f"Tests run: {self.results['tests_run']}")
        print(f"✅ Passed: {self.results['tests_passed']}")
        print(f"❌ Failed: {self.results['tests_failed']}")
        
        if self.results['failures']:
            print(f"\n❌ FAILURES:")
            for failure in self.results['failures']:
                print(f"  • {failure['test']}: {failure['error']}")
        
        success_rate = (self.results['tests_passed'] / self.results['tests_run']) * 100
        print(f"\n📊 Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 90:
            print("🎉 RBAC SYSTEM STATUS: EXCELLENT ✅")
        elif success_rate >= 75:
            print("⚠️ RBAC SYSTEM STATUS: GOOD - Needs attention")
        else:
            print("🚨 RBAC SYSTEM STATUS: CRITICAL - Immediate action required")
        
        print("=" * 60)
        
        # Save results to file
        with open('rbac_test_results.json', 'w') as f:
            json.dump(self.results, f, indent=2)
        
        print("📄 Detailed results saved to: rbac_test_results.json")

if __name__ == "__main__":
    suite = RBACTestSuite()
    suite.run_all_tests()