#!/usr/bin/env node

/**
 * Clean console logs from API route handlers
 */

const fs = require('fs');
const path = require('path');

const API_FILES = [
  'src/app/api/auth/context/route.ts',
  'src/app/api/auth/refresh/route.ts',
  'src/app/api/auth/logout/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/auth/profile/route.ts',
  'src/app/api/auth/login/route.ts',
];

function cleanApiFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // Replace console.log with proper logging for API routes
    content = content.replace(/console\.log\((.*?)\);/g, (match, args) => {
      if (args.includes('cache hit') || args.includes('successfully')) {
        // Keep important operational logs but only in development
        return `if (process.env.NODE_ENV === 'development') console.log(${args});`;
      }
      return '// ' + match;
    });
    
    // Always comment out console.error in production
    content = content.replace(/console\.error\((.*?)\);/g, (match, args) => {
      // Wrap errors in development check
      return `if (process.env.NODE_ENV === 'development') console.error(${args});`;
    });
    
    // Comment out console.debug
    content = content.replace(/console\.debug\((.*?)\);/g, '// console.debug($1);');
    
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

console.log('🧹 Cleaning console logs from API routes...\n');

let cleaned = 0;

API_FILES.forEach(file => {
  if (cleanApiFile(file)) {
    console.log(`✅ Cleaned: ${file}`);
    cleaned++;
  }
});

console.log(`\n✨ Cleaned ${cleaned} API files!`);