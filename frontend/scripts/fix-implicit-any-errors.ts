#!/usr/bin/env node

/**
 * Script to fix TS7006 errors (parameter implicitly has 'any' type)
 * This script analyzes and fixes parameters without explicit types
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

interface ImplicitAnyError {
  file: string;
  line: number;
  column: number;
  parameter: string;
  message: string;
  context?: string;
}

function getImplicitAnyErrors(): ImplicitAnyError[] {
  try {
    execSync('npx tsc --noEmit --project tsconfig.strict.json 2>&1', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return [];
  } catch (error: any) {
    const output = error.stdout || error.output?.[1] || '';
    const lines = output.split('\n');
    const errors: ImplicitAnyError[] = [];

    lines.forEach((line: string) => {
      // Match TS7006: Parameter 'X' implicitly has an 'any' type
      const match = line.match(/(.+?)\((\d+),(\d+)\): error TS7006: Parameter '(.+?)' implicitly has an 'any' type\./);
      if (match && match[1] && match[2] && match[3] && match[4]) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          parameter: match[4],
          message: line
        });
      }
    });

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

function inferParameterType(paramName: string, context: string): string {
  // Common parameter patterns
  const patterns: { [key: string]: string } = {
    // Event handlers
    'e': 'React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>',
    'event': 'React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>',
    'onClick': '() => void',
    'onChange': '(value: any) => void',
    'onClose': '() => void',
    'onSubmit': '(data: any) => void',
    'onSuccess': '() => void',
    'onError': '(error: any) => void',
    
    // Common parameters
    'id': 'string',
    'name': 'string',
    'value': 'string | number',
    'data': 'any',
    'error': 'any',
    'response': 'any',
    'request': 'any',
    'result': 'any',
    'item': 'any',
    'items': 'any[]',
    'index': 'number',
    'count': 'number',
    'page': 'number',
    'size': 'number',
    'loading': 'boolean',
    'disabled': 'boolean',
    'visible': 'boolean',
    'open': 'boolean',
    'children': 'React.ReactNode',
    'className': 'string',
    'style': 'React.CSSProperties',
    
    // API related
    'club': 'string | Club',
    'user': 'User',
    'reservation': 'Reservation',
    'court': 'Court',
    'client': 'Client',
    'tournament': 'Tournament',
    'match': 'Match',
  };

  // Check context for clues
  if (context.includes('.map(') || context.includes('.forEach(') || context.includes('.filter(')) {
    return 'any';
  }
  
  if (context.includes('async') && context.includes('=>')) {
    return 'any';
  }

  // Return pattern match or default to any
  return patterns[paramName] || 'any';
}

function fixImplicitAnyError(error: ImplicitAnyError): boolean {
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
  const inferredType = inferParameterType(error.parameter, error.context);
  
  // Different patterns for fixing
  let updatedLine = line;
  
  // Arrow function pattern: (param) => 
  const arrowPattern = new RegExp(`\\((${error.parameter})\\)\\s*=>`);
  if (arrowPattern.test(line)) {
    updatedLine = line.replace(arrowPattern, `(${error.parameter}: ${inferredType}) =>`);
  }
  
  // Multiple params pattern: (param1, param2)
  const multiParamPattern = new RegExp(`([,(]\\s*)(${error.parameter})(\\s*[,)])`);
  if (multiParamPattern.test(line)) {
    updatedLine = line.replace(multiParamPattern, `$1${error.parameter}: ${inferredType}$3`);
  }
  
  // Function declaration: function name(param)
  const functionPattern = new RegExp(`function\\s+\\w+\\s*\\(([^)]*\\b${error.parameter}\\b[^)]*)\\)`);
  if (functionPattern.test(line)) {
    updatedLine = line.replace(
      new RegExp(`\\b${error.parameter}\\b`),
      `${error.parameter}: ${inferredType}`
    );
  }

  if (updatedLine !== line) {
    lines[lineIndex] = updatedLine;
    fs.writeFileSync(filePath, lines.join('\n'));
    return true;
  }

  return false;
}

function main() {
  console.log(`${colors.blue}TypeScript Strict Mode - Fixing Implicit Any Errors${colors.reset}\n`);

  const errors = getImplicitAnyErrors();
  console.log(`Found ${colors.yellow}${errors.length}${colors.reset} implicit any errors\n`);

  if (errors.length === 0) {
    console.log(`${colors.green}✅ No implicit any errors found!${colors.reset}`);
    return;
  }

  // Group by file
  const fileGroups = new Map<string, ImplicitAnyError[]>();
  errors.forEach(error => {
    if (!fileGroups.has(error.file)) {
      fileGroups.set(error.file, []);
    }
    fileGroups.get(error.file)!.push(error);
  });

  // Process files
  let fixedCount = 0;
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
      error.context = getLineContext(error.file, error.line);
      const inferredType = inferParameterType(error.parameter, error.context || '');
      console.log(`  Line ${error.line}: ${colors.yellow}${error.parameter}${colors.reset} → ${colors.green}${inferredType}${colors.reset}`);
      
      if (fixImplicitAnyError(error)) {
        fixedCount++;
      }
    });
    
    filesProcessed++;
  }

  console.log(`\n${colors.green}Fixed ${fixedCount} implicit any errors${colors.reset}`);
  console.log(`${colors.yellow}${errors.length - fixedCount} remaining${colors.reset}`);
  
  // Show summary of parameter types used
  const typeUsage = new Map<string, number>();
  errors.forEach(error => {
    error.context = getLineContext(error.file, error.line);
    const type = inferParameterType(error.parameter, error.context || '');
    typeUsage.set(type, (typeUsage.get(type) || 0) + 1);
  });
  
  console.log(`\n${colors.cyan}Type inference summary:${colors.reset}`);
  Array.from(typeUsage.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([type, count]) => {
      console.log(`  ${colors.yellow}${type}${colors.reset}: ${count} occurrences`);
    });

  console.log(`\n${colors.green}Done! Run the script again to process more files.${colors.reset}`);
}

// Run the script
main();