#!/usr/bin/env python3
"""
Script to temporarily disable problematic signals that are causing authentication failures.

This script:
1. Comments out signal receivers that are failing during user creation
2. Creates backup files for easy restoration
3. Focuses on signals related to User model creation that reference missing fields
"""

import os
import re
import shutil
from datetime import datetime


def backup_signal_files():
    """Create backup of all signal files."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"backup_signals_{timestamp}"
    
    signal_files = [
        "backend/apps/authentication/signals.py",
        "backend/apps/authentication/signals_auto_org.py", 
        "backend/apps/clients/signals.py",
        "backend/apps/clubs/signals.py",
        "backend/apps/finance/signals.py",
        "backend/apps/notifications/signals.py",
    ]
    
    os.makedirs(backup_dir, exist_ok=True)
    
    for file_path in signal_files:
        if os.path.exists(file_path):
            backup_name = file_path.replace("/", "_").replace("backend_apps_", "")
            shutil.copy2(file_path, f"{backup_dir}/{backup_name}")
            print(f"✅ Backed up {file_path}")
    
    print(f"📁 Signals backup created in: {backup_dir}")
    return backup_dir


def disable_user_creation_signals():
    """Disable signals that fail during User model creation."""
    
    # Files and patterns to disable
    files_to_modify = [
        {
            "file": "backend/apps/authentication/signals.py",
            "patterns": [
                r"@receiver\(post_save, sender=User\)",
                r"def create_user_profile\(",
                r"def update_user_profile\(",
            ]
        },
        {
            "file": "backend/apps/authentication/signals_auto_org.py", 
            "patterns": [
                r"@receiver\(post_save, sender=User\)",
                r"def auto_assign_organization\(",
            ]
        },
        {
            "file": "backend/apps/clients/signals.py",
            "patterns": [
                r"@receiver\(post_save, sender=User\)",
                r"def create_client_profile\(",
                r"def update_client_profile\(",
            ]
        }
    ]
    
    for file_info in files_to_modify:
        file_path = file_info["file"]
        if not os.path.exists(file_path):
            print(f"⚠️  File not found: {file_path}")
            continue
            
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Comment out problematic signal receivers
        for pattern in file_info["patterns"]:
            # Find the decorator and function
            matches = list(re.finditer(pattern, content, re.MULTILINE))
            for match in reversed(matches):  # Reverse to maintain positions
                start = match.start()
                
                # Find the line start
                line_start = content.rfind('\n', 0, start) + 1
                
                # Find the end of the function (next function/class or end of file)
                function_end = find_function_end(content, line_start)
                
                # Comment out the entire function block
                function_block = content[line_start:function_end]
                commented_block = comment_out_block(function_block)
                
                content = content[:line_start] + commented_block + content[function_end:]
        
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"✅ Disabled signals in {file_path}")
        else:
            print(f"ℹ️  No changes needed in {file_path}")


def find_function_end(content, function_start):
    """Find the end of a function definition."""
    lines = content[function_start:].split('\n')
    
    # Track indentation
    first_line_indent = len(lines[0]) - len(lines[0].lstrip())
    function_end = function_start
    
    for i, line in enumerate(lines):
        if i == 0:
            continue
            
        # Skip empty lines and comments
        if not line.strip() or line.strip().startswith('#'):
            function_end += len(line) + 1
            continue
            
        # Check if we've reached the end of the function
        current_indent = len(line) - len(line.lstrip())
        
        # If indentation is back to same level or less, function has ended
        if current_indent <= first_line_indent and line.strip():
            break
            
        function_end += len(line) + 1
    
    return function_end


def comment_out_block(block):
    """Comment out a block of code."""
    lines = block.split('\n')
    commented_lines = []
    
    for line in lines:
        if line.strip():  # Don't add # to empty lines
            commented_lines.append(f"# TEMPORARILY DISABLED: {line}")
        else:
            commented_lines.append(line)
    
    return '\n'.join(commented_lines)


def add_signal_bypass_settings():
    """Add settings to bypass problematic signals."""
    settings_file = "backend/config/settings/production.py"
    
    if not os.path.exists(settings_file):
        print(f"⚠️  Settings file not found: {settings_file}")
        return
    
    with open(settings_file, 'r') as f:
        content = f.read()
    
    # Add signal bypass configuration
    bypass_config = '''

# TEMPORARY: Disable problematic signals during User creation
DISABLE_USER_CREATION_SIGNALS = True

# Signal bypass for authentication issues
BYPASS_CLIENT_PROFILE_CREATION = True
BYPASS_AUTO_ORG_ASSIGNMENT = True

'''
    
    if "DISABLE_USER_CREATION_SIGNALS" not in content:
        content += bypass_config
        
        with open(settings_file, 'w') as f:
            f.write(content)
        
        print("✅ Added signal bypass settings to production.py")
    else:
        print("ℹ️  Signal bypass settings already exist")


def create_signal_status_checker():
    """Create a script to check which signals are active."""
    checker_script = '''#!/usr/bin/env python3
"""
Check the status of Django signals.
"""

import os
import sys
import django

# Add backend to path
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')

django.setup()

from django.db.models import signals
from django.contrib.auth import get_user_model

User = get_user_model()

def check_signal_receivers():
    """Check which signals are connected."""
    print("📡 Checking Django signal receivers...")
    print("=" * 50)
    
    # Check post_save signals for User model
    post_save_receivers = signals.post_save._live_receivers(sender=User)
    print(f"User post_save receivers: {len(post_save_receivers)}")
    
    for receiver in post_save_receivers:
        func_name = getattr(receiver, '__name__', 'unknown')
        module = getattr(receiver, '__module__', 'unknown')
        print(f"  - {module}.{func_name}")
    
    print("\\n" + "=" * 50)
    print("✅ Signal check completed")

if __name__ == "__main__":
    check_signal_receivers()
'''
    
    with open("check_signals.py", 'w') as f:
        f.write(checker_script)
    
    print("✅ Created signal status checker: check_signals.py")


def main():
    """Main function to disable problematic signals."""
    print("🚨 Temporarily disabling problematic signals...")
    print("=" * 60)
    
    # Change to project root
    if os.path.exists("backend"):
        os.chdir("backend/..")
    
    # Step 1: Create backup
    backup_dir = backup_signal_files()
    
    # Step 2: Disable problematic signals
    disable_user_creation_signals()
    
    # Step 3: Add bypass settings
    add_signal_bypass_settings()
    
    # Step 4: Create status checker
    create_signal_status_checker()
    
    print("\n" + "=" * 60)
    print("⚠️  SIGNALS TEMPORARILY DISABLED")
    print(f"📁 Backup available in: {backup_dir}")
    print("\n📋 What was disabled:")
    print("1. User creation signals in authentication app")
    print("2. Client profile creation signals") 
    print("3. Auto organization assignment signals")
    print("\n🔄 To restore signals:")
    print("1. Copy files from backup folder")
    print("2. Remove DISABLE_USER_CREATION_SIGNALS from settings")
    print("3. Test authentication endpoints")
    
    print("\n🧪 To test signal status:")
    print("python3 check_signals.py")
    
    return True


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)