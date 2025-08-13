#!/usr/bin/env python3
"""
Clean hardcoded passwords from test files
Replace with environment variables or test fixtures
"""

import os
import re
from pathlib import Path
import json

class TestPasswordCleaner:
    def __init__(self):
        self.root_dir = Path.cwd()
        self.test_password = "TEST_PASSWORD_PLACEHOLDER"
        self.cleaned_files = []
        self.skipped_files = []
        
    def clean_test_files(self):
        """Clean hardcoded passwords from test files."""
        print("🧹 Cleaning hardcoded passwords from test files...")
        
        # Patterns to match hardcoded passwords
        password_patterns = [
            # Python test files
            (r'"password"\s*:\s*"[^"]+?"', '"password": "TEST_PASSWORD"'),
            (r"'password'\s*:\s*'[^']+?'", "'password': 'TEST_PASSWORD'"),
            (r'password\s*=\s*"[^"]+?"', 'password="TEST_PASSWORD"'),
            (r"password\s*=\s*'[^']+?'", "password='TEST_PASSWORD'"),
            
            # Specific test passwords to replace
            (r'"test123456"', '"TEST_PASSWORD"'),
            (r"'test123456'", "'TEST_PASSWORD'"),
            (r'"password123"', '"TEST_PASSWORD"'),
            (r"'password123'", "'TEST_PASSWORD'"),
        ]
        
        # Find all test files
        test_files = []
        for pattern in ['test_*.py', '*_test.py', 'test*.py', '*tests.py']:
            test_files.extend(self.root_dir.rglob(pattern))
            
        # Add specific test directories
        test_dirs = ['tests', 'test', '__tests__', 'qa']
        for test_dir in test_dirs:
            if (self.root_dir / test_dir).exists():
                test_files.extend((self.root_dir / test_dir).rglob('*.py'))
                
        # Process each test file
        for test_file in test_files:
            if any(skip in str(test_file) for skip in ['node_modules', '__pycache__', '.git', 'venv']):
                continue
                
            try:
                content = test_file.read_text(encoding='utf-8')
                original_content = content
                modified = False
                
                # Apply all password patterns
                for pattern, replacement in password_patterns:
                    new_content, count = re.subn(pattern, replacement, content, flags=re.IGNORECASE)
                    if count > 0:
                        content = new_content
                        modified = True
                        
                if modified:
                    test_file.write_text(content, encoding='utf-8')
                    self.cleaned_files.append(str(test_file.relative_to(self.root_dir)))
                    print(f"  ✅ Cleaned: {test_file.name}")
                    
            except Exception as e:
                self.skipped_files.append((str(test_file), str(e)))
                
        return len(self.cleaned_files)
        
    def create_test_env_template(self):
        """Create environment template for test passwords."""
        print("\n📝 Creating test environment template...")
        
        test_env_content = """# Test Environment Variables
# Use these for running tests instead of hardcoding passwords

# Test Credentials (NEVER use in production)
TEST_USER_EMAIL=test@padelyzer.com
TEST_USER_PASSWORD=test_password_from_env
TEST_ADMIN_EMAIL=admin@padelyzer.com
TEST_ADMIN_PASSWORD=admin_password_from_env

# Test API Keys (use fake values)
TEST_STRIPE_KEY=sk_test_fake_key_for_testing
TEST_API_KEY=test_api_key_fake

# Test Database (if using separate test DB)
TEST_DATABASE_URL=postgres://test:test@localhost:5432/padelyzer_test
"""
        
        test_env_path = self.root_dir / "backend/.env.test"
        test_env_path.write_text(test_env_content)
        print(f"  ✅ Created: {test_env_path}")
        
    def create_conftest_fixture(self):
        """Create pytest fixture for test credentials."""
        print("\n🔧 Creating pytest fixture for test credentials...")
        
        conftest_content = '''"""
Pytest fixtures for test credentials
Use these instead of hardcoding passwords in tests
"""
import os
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def test_password():
    """Get test password from environment or use default."""
    return os.environ.get('TEST_USER_PASSWORD', 'test_password_fixture')

@pytest.fixture
def test_user_credentials():
    """Get test user credentials."""
    return {
        'email': os.environ.get('TEST_USER_EMAIL', 'test@padelyzer.com'),
        'password': os.environ.get('TEST_USER_PASSWORD', 'test_password_fixture')
    }

@pytest.fixture
def test_admin_credentials():
    """Get test admin credentials."""
    return {
        'email': os.environ.get('TEST_ADMIN_EMAIL', 'admin@padelyzer.com'),
        'password': os.environ.get('TEST_ADMIN_PASSWORD', 'admin_password_fixture')
    }

@pytest.fixture
def test_user(db, test_user_credentials):
    """Create a test user."""
    user = User.objects.create_user(
        email=test_user_credentials['email'],
        password=test_user_credentials['password'],
        first_name='Test',
        last_name='User'
    )
    return user

@pytest.fixture
def authenticated_client(client, test_user, test_user_credentials):
    """Get an authenticated test client."""
    client.login(
        email=test_user_credentials['email'],
        password=test_user_credentials['password']
    )
    return client
'''
        
        # Create conftest in backend tests directory
        tests_dir = self.root_dir / "backend/tests"
        tests_dir.mkdir(exist_ok=True)
        
        conftest_path = tests_dir / "conftest.py"
        if not conftest_path.exists():
            conftest_path.write_text(conftest_content)
            print(f"  ✅ Created: {conftest_path}")
        else:
            print(f"  ⚠️  Conftest already exists: {conftest_path}")
            
    def update_example_tests(self):
        """Update example test to show best practices."""
        print("\n📚 Creating example test with secure practices...")
        
        example_test = '''"""
Example test showing secure password handling
"""
import pytest
from django.urls import reverse

class TestAuthSecure:
    """Test authentication with secure password handling."""
    
    def test_login_with_fixture(self, client, test_user_credentials):
        """Test login using fixture credentials."""
        response = client.post(reverse('auth:login'), {
            'email': test_user_credentials['email'],
            'password': test_user_credentials['password']
        })
        assert response.status_code == 200
        
    def test_login_with_env_var(self, client, test_user):
        """Test login using environment variables."""
        import os
        response = client.post(reverse('auth:login'), {
            'email': test_user.email,
            'password': os.environ.get('TEST_USER_PASSWORD', 'fallback_password')
        })
        assert response.status_code == 200
        
    def test_authenticated_request(self, authenticated_client):
        """Test authenticated request using fixture."""
        response = authenticated_client.get(reverse('auth:profile'))
        assert response.status_code == 200
'''
        
        example_path = self.root_dir / "backend/tests/test_auth_secure_example.py"
        example_path.write_text(example_test)
        print(f"  ✅ Created: {example_path}")
        
    def generate_report(self):
        """Generate cleanup report."""
        print("\n📊 CLEANUP REPORT")
        print("=" * 50)
        
        print(f"\n✅ Files cleaned: {len(self.cleaned_files)}")
        if self.cleaned_files:
            print("\nCleaned files:")
            for file in self.cleaned_files[:10]:  # Show first 10
                print(f"  • {file}")
            if len(self.cleaned_files) > 10:
                print(f"  ... and {len(self.cleaned_files) - 10} more")
                
        if self.skipped_files:
            print(f"\n⚠️  Files skipped: {len(self.skipped_files)}")
            for file, error in self.skipped_files[:5]:
                print(f"  • {file}: {error}")
                
        # Save detailed report
        report = {
            "timestamp": datetime.now().isoformat(),
            "cleaned_files": self.cleaned_files,
            "skipped_files": self.skipped_files,
            "total_cleaned": len(self.cleaned_files),
            "total_skipped": len(self.skipped_files)
        }
        
        report_path = self.root_dir / "test_password_cleanup_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n💾 Detailed report saved to: {report_path}")
        
        print("\n🎯 NEXT STEPS:")
        print("1. Update your tests to use the new fixtures")
        print("2. Set TEST_USER_PASSWORD in your test environment")
        print("3. Run your test suite to ensure everything works")
        print("4. Never hardcode passwords in tests again!")
        
    def run(self):
        """Run the complete cleanup process."""
        print("🔐 STARTING TEST PASSWORD CLEANUP")
        print("=" * 50)
        
        # Clean test files
        cleaned_count = self.clean_test_files()
        
        # Create supporting files
        self.create_test_env_template()
        self.create_conftest_fixture()
        self.update_example_tests()
        
        # Generate report
        self.generate_report()
        
        print("\n✅ Test password cleanup completed!")
        print(f"   Total files cleaned: {cleaned_count}")
        
        return cleaned_count

from datetime import datetime

if __name__ == "__main__":
    cleaner = TestPasswordCleaner()
    cleaner.run()