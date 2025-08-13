#!/usr/bin/env node

/**
 * Wrap console logs in NODE_ENV checks
 */

const fs = require('fs');
const path = require('path');

// Critical files that need immediate attention
const CRITICAL_FILES = [
  'src/lib/api/websocket.ts',
  'src/lib/api/offline-queue.ts',
  'src/store/notifications.ts',
  'src/store/analyticsStore.ts',
  'src/store/profileStore.ts',
  'src/lib/auth/token-rotation-manager.ts',
  'src/app/api/reservations/availability/route.ts',
  'src/app/api/dashboard/overview/route.ts',
  'src/app/api/mobile/quick-book/route.ts',
  'src/app/api/direct-login/route.ts',
];

function wrapConsoleInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Find all console statements that aren't already wrapped
    const lines = content.split('\n');
    const modifiedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Check if line has console statement
      if (
        trimmedLine.match(/^console\.(log|error|warn|debug|info)/) &&
        !trimmedLine.startsWith('//') &&
        !lines[i-1]?.includes('process.env.NODE_ENV')
      ) {
        // Get the indentation
        const indent = line.match(/^\s*/)[0];
        
        // Wrap in NODE_ENV check
        modifiedLines.push(`${indent}if (process.env.NODE_ENV === 'development') {`);
        modifiedLines.push(`  ${line}`);
        modifiedLines.push(`${indent}}`);
      } else {
        modifiedLines.push(line);
      }
    }
    
    content = modifiedLines.join('\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔧 Wrapping console logs in NODE_ENV checks...\n');

let wrapped = 0;

CRITICAL_FILES.forEach(file => {
  if (fs.existsSync(file)) {
    if (wrapConsoleInFile(file)) {
      console.log(`✅ Wrapped: ${file}`);
      wrapped++;
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log(`\n✨ Wrapped console logs in ${wrapped} files!`);