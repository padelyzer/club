#!/usr/bin/env node

/**
 * Script to fix TS2322 errors (type assignment errors)
 * This script analyzes type mismatches and provides fixes
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
};

interface TypeAssignmentError {
  file: string;
  line: number;
  column: number;
  message: string;
  actualType?: string;
  expectedType?: string;
  context?: string;
}

function getTypeAssignmentErrors(): TypeAssignmentError[] {
  try {
    execSync('npx tsc --noEmit --project tsconfig.strict.json 2>&1', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return [];
  } catch (error: any) {
    const output = error.stdout || error.output?.[1] || '';
    const lines = output.split('\n');
    const errors: TypeAssignmentError[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match TS2322: Type 'X' is not assignable to type 'Y'
      const match = line.match(/(.+?)\((\d+),(\d+)\): error TS2322: Type '(.+?)' is not assignable to type '(.+?)'\./);
      if (match && match[1] && match[2] && match[3]) {
        const error: TypeAssignmentError = {
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          message: line,
          actualType: match[4],
          expectedType: match[5]
        };
        
        // Try to get more context from following lines
        if (i + 1 < lines.length && lines[i + 1].includes('Type')) {
          error.message += '\n' + lines[i + 1];
        }
        
        errors.push(error);
      }
    }

    return errors;
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

function analyzeTypeError(error: TypeAssignmentError): { suggestion: string; autoFix: boolean } {
  error.context = getLineContext(error.file, error.line);
  
  // Common patterns
  if (error.actualType?.includes('undefined') && !error.expectedType?.includes('undefined')) {
    return {
      suggestion: 'Add undefined check or use optional chaining',
      autoFix: false
    };
  }
  
  if (error.actualType === 'any' && error.expectedType !== 'any') {
    return {
      suggestion: `Cast to ${error.expectedType} or define proper type`,
      autoFix: true
    };
  }
  
  if (error.actualType?.includes('string') && error.expectedType?.includes('number')) {
    return {
      suggestion: 'Use parseInt() or Number() to convert',
      autoFix: true
    };
  }
  
  if (error.actualType?.includes('number') && error.expectedType?.includes('string')) {
    return {
      suggestion: 'Use toString() or String() to convert',
      autoFix: true
    };
  }
  
  if (error.message.includes('missing the following properties')) {
    return {
      suggestion: 'Add missing properties or use partial type',
      autoFix: false
    };
  }
  
  if (error.actualType?.includes('null') && !error.expectedType?.includes('null')) {
    return {
      suggestion: 'Add null check or use nullish coalescing',
      autoFix: true
    };
  }
  
  return {
    suggestion: 'Review type definitions and add proper type assertions',
    autoFix: false
  };
}

function fixTypeAssignmentError(error: TypeAssignmentError): boolean {
  const filePath = path.resolve(error.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}File not found: ${filePath}${colors.reset}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineIndex = error.line - 1;

  if (lineIndex >= lines.length) {
    return false;
  }

  const line = lines[lineIndex];
  if (!line) return false;

  error.context = line.trim();
  const { autoFix } = analyzeTypeError(error);
  
  if (!autoFix) {
    return false;
  }
  
  let updatedLine = line;
  
  // Auto-fix patterns
  if (error.actualType === 'any' && error.expectedType) {
    // Add type assertion for any types
    updatedLine = line.replace(/(\w+)(\s*[,;)\]}])/g, (match, varName, suffix) => {
      if (line.includes(varName) && !line.includes(`as ${error.expectedType}`)) {
        return `${varName} as ${error.expectedType}${suffix}`;
      }
      return match;
    });
  }
  
  // String to number conversion
  if (error.actualType?.includes('string') && error.expectedType?.includes('number')) {
    // Look for assignment patterns
    updatedLine = line.replace(/=\s*([^;,\n]+)/g, (match, value) => {
      if (!value.includes('parseInt') && !value.includes('Number(')) {
        return `= Number(${value.trim()})`;
      }
      return match;
    });
  }
  
  // Number to string conversion
  if (error.actualType?.includes('number') && error.expectedType?.includes('string')) {
    updatedLine = line.replace(/=\s*([^;,\n]+)/g, (match, value) => {
      if (!value.includes('toString') && !value.includes('String(')) {
        return `= String(${value.trim()})`;
      }
      return match;
    });
  }
  
  // Null checks
  if (error.actualType?.includes('null') && !error.expectedType?.includes('null')) {
    updatedLine = line.replace(/=\s*([^;,\n]+)/g, (match, value) => {
      if (!value.includes('??') && !value.includes('||')) {
        return `= ${value.trim()} ?? ''`;
      }
      return match;
    });
  }

  if (updatedLine !== line) {
    lines[lineIndex] = updatedLine;
    fs.writeFileSync(filePath, lines.join('\n'));
    return true;
  }

  return false;
}

function main() {
  console.log(`${colors.blue}TypeScript Strict Mode - Fixing Type Assignment Errors${colors.reset}\n`);

  const errors = getTypeAssignmentErrors();
  console.log(`Found ${colors.yellow}${errors.length}${colors.reset} type assignment errors\n`);

  if (errors.length === 0) {
    console.log(`${colors.green}✅ No type assignment errors found!${colors.reset}`);
    return;
  }

  // Group by file
  const fileGroups = new Map<string, TypeAssignmentError[]>();
  errors.forEach(error => {
    if (!fileGroups.has(error.file)) {
      fileGroups.set(error.file, []);
    }
    fileGroups.get(error.file)!.push(error);
  });

  // Analyze error patterns
  const typePatterns = new Map<string, number>();
  errors.forEach(error => {
    const pattern = `${error.actualType} → ${error.expectedType}`;
    typePatterns.set(pattern, (typePatterns.get(pattern) || 0) + 1);
  });
  
  console.log(`${colors.cyan}Most common type mismatches:${colors.reset}`);
  Array.from(typePatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([pattern, count]) => {
      console.log(`  ${colors.yellow}${pattern}${colors.reset}: ${count} occurrences`);
    });
  console.log();

  // Process files
  let fixedCount = 0;
  let manualCount = 0;
  const maxFilesToProcess = 10;
  let filesProcessed = 0;

  for (const [file, fileErrors] of Array.from(fileGroups.entries())) {
    if (filesProcessed >= maxFilesToProcess) {
      console.log(`\n${colors.yellow}Processed ${maxFilesToProcess} files. Run again to continue.${colors.reset}`);
      break;
    }

    console.log(`\n${colors.blue}Processing ${path.relative(process.cwd(), file)}${colors.reset}`);
    
    // Sort by line number in reverse
    fileErrors.sort((a, b) => b.line - a.line);
    
    fileErrors.forEach(error => {
      const { suggestion, autoFix } = analyzeTypeError(error);
      const typeInfo = error.actualType && error.expectedType 
        ? `${colors.red}${error.actualType}${colors.reset} → ${colors.green}${error.expectedType}${colors.reset}`
        : 'Type mismatch';
      
      console.log(`  Line ${error.line}: ${typeInfo}`);
      console.log(`    ${colors.cyan}Suggestion: ${suggestion}${colors.reset}`);
      
      if (autoFix && fixTypeAssignmentError(error)) {
        console.log(`    ${colors.green}✓ Auto-fixed${colors.reset}`);
        fixedCount++;
      } else {
        console.log(`    ${colors.yellow}⚠ Manual fix required${colors.reset}`);
        manualCount++;
      }
    });
    
    filesProcessed++;
  }

  console.log(`\n${colors.green}Summary:${colors.reset}`);
  console.log(`  Auto-fixed: ${colors.green}${fixedCount}${colors.reset}`);
  console.log(`  Manual fixes needed: ${colors.yellow}${manualCount}${colors.reset}`);
  console.log(`  Remaining: ${colors.yellow}${errors.length - fixedCount}${colors.reset}`);

  console.log(`\n${colors.green}Done! Run the script again to process more files.${colors.reset}`);
}

// Run the script
main();