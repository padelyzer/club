#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixFile(filePath, fixes) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const fix of fixes) {
      if (content.includes(fix.search)) {
        content = content.replace(fix.search, fix.replace);
        modified = true;
        console.log(`✅ Applied fix: ${fix.description}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.log(`❌ Error processing ${filePath}: ${error.message}`);
    return false;
  }
}

// Look for specific patterns in files to understand structure
function analyzeFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`\nAnalyzing ${path.basename(filePath)}:`);
  
  // Find component/function declaration
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^export (default )?function|^function|^const .* = \(|^export const .* = \(/)) {
      console.log(`  Component definition at line ${i + 1}: ${lines[i].trim()}`);
      break;
    }
  }
  
  // Look for problematic patterns
  for (let i = 0; i < lines.length; i++) {
    // Check for incomplete statements
    if (lines[i].includes(":', {'") && !lines[i].includes('console.')) {
      console.log(`  Possible incomplete console.log at line ${i + 1}`);
    }
    
    // Check for object declarations with comments
    if (lines[i].includes('// ') && lines[i - 1] && lines[i - 1].includes('{')) {
      console.log(`  Object with commented properties at line ${i + 1}`);
    }
    
    // Check for return statements
    if (lines[i].trim() === 'return (') {
      console.log(`  Return statement at line ${i + 1}`);
      if (i > 0 && lines[i - 1].trim() === '}') {
        console.log(`    Previous line closes a block`);
      }
    }
  }
}

// Analyze problematic files first
const filesToAnalyze = [
  './src/components/auth/enterprise-2fa-admin.tsx',
  './src/components/auth/session-security.tsx',
  './src/components/clients/client-detail.tsx',
  './src/components/clients/export-modal.tsx',
  './src/components/reservations/apple-booking-flow.tsx'
];

console.log('🔍 Analyzing files for issues...\n');
filesToAnalyze.forEach(analyzeFile);

// Manual fixes based on analysis
console.log('\n🔧 Applying targeted fixes...\n');

// Fix export-modal.tsx setState issue
const exportModalPath = './src/components/clients/export-modal.tsx';
if (fs.existsSync(exportModalPath)) {
  let content = fs.readFileSync(exportModalPath, 'utf8');
  
  // Fix the setState with spread operator
  const stateFixPattern = /setState\(\(prev\) => \{\s*\.\.\.prev,/g;
  if (content.match(stateFixPattern)) {
    content = content.replace(stateFixPattern, 'setState((prev) => ({\n        ...prev,');
    console.log('✅ Fixed setState spread operator syntax in export-modal.tsx');
  }
  
  // Fix any return object syntax
  content = content.replace(/=> \{\s*\.\.\.prev/g, '=> ({\n        ...prev');
  
  fs.writeFileSync(exportModalPath, content, 'utf8');
}

// Fix apple-booking-flow.tsx console.log issue
const appleBookingPath = './src/components/reservations/apple-booking-flow.tsx';
if (fs.existsSync(appleBookingPath)) {
  let content = fs.readFileSync(appleBookingPath, 'utf8');
  
  // Look for incomplete console.log statements
  const incompleteLogPattern = /\s+:', \{'/g;
  if (content.match(incompleteLogPattern)) {
    // Find the context and fix it
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(":', {'")) {
        // This is likely part of a console.log
        lines[i] = "          console.log('AppleBookingFlow: Checking canProceed', {";
        console.log('✅ Fixed incomplete console.log in apple-booking-flow.tsx');
      }
    }
    content = lines.join('\n');
  }
  
  fs.writeFileSync(appleBookingPath, content, 'utf8');
}

console.log('\n✨ Comprehensive fix complete!');