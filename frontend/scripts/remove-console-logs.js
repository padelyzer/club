#!/usr/bin/env node

/**
 * Simple script to remove or comment out console logs for production
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const REMOVE_LOGS = process.env.REMOVE_LOGS === 'true'; // If true, removes logs. If false, comments them out
const DRY_RUN = process.env.DRY_RUN === 'true'; // If true, just shows what would be changed

// Patterns to find console statements
const CONSOLE_PATTERNS = [
  /console\.log\(/g,
  /console\.error\(/g,
  /console\.warn\(/g,
  /console\.debug\(/g,
  /console\.info\(/g,
];

// Files to process first (critical for production)
const CRITICAL_FILES = [
  'src/lib/api/services/auth.service.ts',
  'src/lib/api/stable-client.ts',
  'src/lib/api/hooks/useAuth.ts',
  'src/app/api/auth/*.ts',
  'src/components/providers/auth-provider.tsx',
  'src/store/auth.ts',
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Skip test files
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return { file: filePath, changed: false, count: 0 };
    }

    let changeCount = 0;

    // Process each console pattern
    CONSOLE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        changeCount += matches.length;
        
        if (REMOVE_LOGS) {
          // Remove the entire console statement line
          content = content.replace(/.*console\.(log|error|warn|debug|info)\(.*\);?\s*\n/g, '');
        } else {
          // Comment out console statements
          content = content.replace(/(\s*)console\.(log|error|warn|debug|info)\(/g, '$1// console.$2(');
        }
      }
    });

    if (changeCount > 0 && !DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }

    return {
      file: filePath,
      changed: content !== originalContent,
      count: changeCount,
    };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return { file: filePath, changed: false, count: 0, error: error.message };
  }
}

function main() {
  console.log('🧹 Removing console logs from production code...\n');
  console.log(`Mode: ${REMOVE_LOGS ? 'REMOVE' : 'COMMENT OUT'}`);
  console.log(`Dry run: ${DRY_RUN ? 'YES' : 'NO'}\n`);

  // Get all TypeScript/JavaScript files
  const allFiles = glob.sync('src/**/*.{ts,tsx,js,jsx}', {
    ignore: [
      '**/node_modules/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/dist/**',
      '**/.next/**',
    ],
  });

  // Process critical files first
  const criticalGlobs = CRITICAL_FILES.map(pattern => 
    glob.sync(pattern, { ignore: ['**/*.test.*', '**/*.spec.*'] })
  ).flat();

  const uniqueCriticalFiles = [...new Set(criticalGlobs)];
  
  console.log(`📋 Processing ${uniqueCriticalFiles.length} critical files first...\n`);

  let totalCount = 0;
  let filesChanged = 0;

  // Process critical files
  uniqueCriticalFiles.forEach(file => {
    const result = processFile(file);
    if (result.changed) {
      filesChanged++;
      totalCount += result.count;
      console.log(`✅ ${file} (${result.count} console statements)`);
    }
  });

  console.log('\n📊 Summary:');
  console.log(`- Critical files processed: ${uniqueCriticalFiles.length}`);
  console.log(`- Files changed: ${filesChanged}`);
  console.log(`- Console statements handled: ${totalCount}`);

  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. No files were actually modified.');
    console.log('Run without DRY_RUN=true to apply changes.');
  } else if (filesChanged > 0) {
    console.log('\n✨ Console logs have been handled in critical files!');
    console.log('Run tests to ensure everything still works correctly.');
  }

  // Show remaining files with console logs
  const remainingFiles = allFiles.filter(f => !uniqueCriticalFiles.includes(f));
  let remainingCount = 0;
  
  remainingFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    CONSOLE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        remainingCount += matches.length;
      }
    });
  });

  if (remainingCount > 0) {
    console.log(`\n📌 ${remainingCount} console statements remain in ${remainingFiles.length} non-critical files.`);
  }
}

// Run the script
main();