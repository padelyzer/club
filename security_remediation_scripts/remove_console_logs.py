#!/usr/bin/env python3
"""
Remove console.log statements from production code
"""

import os
import re
from pathlib import Path

def remove_console_logs():
    root_dir = Path.cwd()
    frontend_src = root_dir / "frontend/src"
    
    count_removed = 0
    files_modified = []
    
    print("🧹 Removing console.logs from frontend code...")
    
    # File extensions to process
    extensions = ['.js', '.jsx', '.ts', '.tsx']
    
    for ext in extensions:
        for file_path in frontend_src.rglob(f'*{ext}'):
            # Skip test files and node_modules
            if any(skip in str(file_path) for skip in ['__tests__', '__test__', '.test.', '.spec.', 'node_modules']):
                continue
                
            try:
                content = file_path.read_text(encoding='utf-8')
                original_content = content
                
                # Remove console.* statements
                # Pattern matches console.log, console.error, console.warn, etc.
                pattern = r'console\.\w+\([^)]*\);?\n?'
                content, num_replacements = re.subn(pattern, '', content)
                
                if num_replacements > 0:
                    file_path.write_text(content, encoding='utf-8')
                    count_removed += num_replacements
                    files_modified.append(file_path.name)
                    print(f"  ✅ Removed {num_replacements} console statements from {file_path.name}")
                    
            except Exception as e:
                print(f"  ❌ Error processing {file_path.name}: {e}")
                
    print(f"\n📊 Summary:")
    print(f"  Total console.logs removed: {count_removed}")
    print(f"  Files modified: {len(files_modified)}")
    
    return count_removed, files_modified

if __name__ == "__main__":
    remove_console_logs()