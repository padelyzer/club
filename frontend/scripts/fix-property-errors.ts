#!/usr/bin/env node

/**
 * Script to help fix TS2339 errors (property does not exist)
 * This script analyzes the errors and provides suggestions for fixes
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

interface PropertyError {
  file: string;
  line: number;
  column: number;
  property: string;
  type: string;
  message: string;
  context?: string;
}

function getPropertyErrors(): PropertyError[] {
  try {
    execSync('npx tsc --noEmit --project tsconfig.strict.json 2>&1', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return [];
  } catch (error: any) {
    const output = error.stdout || error.output?.[1] || '';
    const lines = output.split('\n');
    const propertyErrors: PropertyError[] = [];

    lines.forEach((line: string) => {
      // Match TS2339: Property 'X' does not exist on type 'Y'
      const match = line.match(/(.+?)\((\d+),(\d+)\): error TS2339: Property '(.+?)' does not exist on type '(.+?)'\./);
      if (match && match[1] && match[2] && match[3] && match[4] && match[5]) {
        propertyErrors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          property: match[4],
          type: match[5],
          message: line
        });
      }
    });

    return propertyErrors;
  }
}

function getLineContext(file: string, lineNumber: number): string {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const lineIndex = lineNumber - 1;
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      return lines[lineIndex]?.trim() || '';
    }
  } catch (error) {
    // Ignore
  }
  return '';
}

function analyzeError(error: PropertyError): { suggestion: string; category: string } {
  error.context = getLineContext(error.file, error.line);
  
  // Categorize common patterns
  if (error.type.includes('Window & typeof globalThis')) {
    return {
      category: 'Window/Global',
      suggestion: `Add type declaration: declare global { interface Window { ${error.property}: any; } }`
    };
  }
  
  if (error.type.includes('HTMLElement')) {
    return {
      category: 'DOM Element',
      suggestion: `Use type assertion: (element as HTMLInputElement).${error.property}`
    };
  }
  
  if (error.type.includes('{}') || error.type === 'object') {
    return {
      category: 'Missing Type',
      suggestion: 'Define proper interface or type for this object'
    };
  }
  
  if (error.type.includes('any[]')) {
    return {
      category: 'Array Type',
      suggestion: 'Define proper type for array elements'
    };
  }
  
  if (error.context?.includes('response') || error.context?.includes('error')) {
    return {
      category: 'API Response',
      suggestion: 'Define API response/error interfaces'
    };
  }
  
  if (error.context?.includes('club_memberships')) {
    return {
      category: 'User Type',
      suggestion: 'Update User interface to include club_memberships property'
    };
  }
  
  return {
    category: 'Other',
    suggestion: 'Check type definition and add missing property'
  };
}

function groupErrorsByCategory(errors: PropertyError[]): Map<string, PropertyError[]> {
  const groups = new Map<string, PropertyError[]>();
  
  errors.forEach(error => {
    const { category } = analyzeError(error);
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(error);
  });
  
  return groups;
}

function main() {
  console.log(`${colors.blue}TypeScript Strict Mode - Analyzing Property Errors (TS2339)${colors.reset}\n`);

  const propertyErrors = getPropertyErrors();
  console.log(`Found ${colors.yellow}${propertyErrors.length}${colors.reset} property errors\n`);

  if (propertyErrors.length === 0) {
    console.log(`${colors.green}✅ No property errors found!${colors.reset}`);
    return;
  }

  // Group errors by category
  const errorGroups = groupErrorsByCategory(propertyErrors);
  
  // Display summary
  console.log(`${colors.cyan}Error Summary by Category:${colors.reset}`);
  for (const [category, errors] of Array.from(errorGroups.entries())) {
    console.log(`  ${colors.magenta}${category}${colors.reset}: ${errors.length} errors`);
  }
  console.log();

  // Show detailed analysis for each category
  for (const [category, errors] of Array.from(errorGroups.entries())) {
    console.log(`\n${colors.cyan}=== ${category} ===${colors.reset}`);
    
    // Show first few examples
    const examples = errors.slice(0, 3);
    examples.forEach((error: PropertyError) => {
      const { suggestion } = analyzeError(error);
      const relPath = path.relative(process.cwd(), error.file);
      
      console.log(`\n${colors.blue}${relPath}:${error.line}${colors.reset}`);
      console.log(`  Property: ${colors.yellow}${error.property}${colors.reset} on type ${colors.yellow}${error.type}${colors.reset}`);
      if (error.context) {
        console.log(`  Context: ${colors.gray}${error.context}${colors.reset}`);
      }
      console.log(`  ${colors.green}Suggestion: ${suggestion}${colors.reset}`);
    });
    
    if (errors.length > 3) {
      console.log(`  ${colors.gray}... and ${errors.length - 3} more${colors.reset}`);
    }
  }

  // Generate fix recommendations
  console.log(`\n${colors.cyan}Recommended Fixes:${colors.reset}\n`);
  
  if (errorGroups.has('User Type')) {
    console.log(`1. ${colors.yellow}Update User interface:${colors.reset}`);
    console.log(`   Add missing properties like club_memberships to the User type`);
  }
  
  if (errorGroups.has('API Response')) {
    console.log(`2. ${colors.yellow}Define API interfaces:${colors.reset}`);
    console.log(`   Create proper TypeScript interfaces for all API responses`);
  }
  
  if (errorGroups.has('Missing Type')) {
    console.log(`3. ${colors.yellow}Replace 'any' and '{}' types:${colors.reset}`);
    console.log(`   Define specific interfaces for objects instead of using generic types`);
  }
  
  if (errorGroups.has('DOM Element')) {
    console.log(`4. ${colors.yellow}Use proper DOM type assertions:${colors.reset}`);
    console.log(`   Cast HTML elements to specific types (HTMLInputElement, etc.)`);
  }

  // Show most common missing properties
  const propertyCount = new Map<string, number>();
  propertyErrors.forEach(error => {
    const key = `${error.property} (on ${error.type})`;
    propertyCount.set(key, (propertyCount.get(key) || 0) + 1);
  });
  
  const sortedProperties = Array.from(propertyCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  console.log(`\n${colors.cyan}Most Common Missing Properties:${colors.reset}`);
  sortedProperties.forEach(([prop, count]) => {
    console.log(`  ${colors.yellow}${prop}${colors.reset}: ${count} occurrences`);
  });
}

// Run the script
main();