#!/usr/bin/env node

/**
 * TypeScript Strict Mode Migration Helper
 * Helps track and fix TypeScript strict mode errors gradually
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Error type descriptions
const errorDescriptions = {
  TS6133: 'Unused variable/parameter',
  TS2339: 'Property does not exist',
  TS2322: 'Type assignment error',
  TS4111: 'Property from index signature',
  TS7006: 'Parameter implicitly any',
  TS2345: 'Argument type mismatch',
  TS18048: 'Value possibly undefined',
  TS2484: 'Export/Import issue',
  TS7031: 'Binding element implicitly any',
  TS2532: 'Object possibly undefined',
};

function getTypeScriptErrors() {
  try {
    console.log(`${colors.blue}Running TypeScript compiler...${colors.reset}`);
    execSync('npx tsc --noEmit --project tsconfig.strict.json', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return [];
  } catch (error) {
    const output = error.stdout || error.output?.[1] || '';
    return output.split('\n').filter(line => line.includes('error TS'));
  }
}

function parseErrors(errorLines) {
  const errorMap = new Map();
  const fileErrors = new Map();

  errorLines.forEach(line => {
    const match = line.match(/(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)/);
    if (match) {
      const [, file, lineNum, colNum, errorCode, message] = match;
      
      // Skip node_modules
      if (file.includes('node_modules')) return;

      // Count by error type
      errorMap.set(errorCode, (errorMap.get(errorCode) || 0) + 1);

      // Group by file
      if (!fileErrors.has(file)) {
        fileErrors.set(file, []);
      }
      fileErrors.get(file).push({
        line: parseInt(lineNum),
        column: parseInt(colNum),
        code: errorCode,
        message
      });
    }
  });

  return { errorMap, fileErrors };
}

function displaySummary(errorMap, fileErrors) {
  console.log(`\n${colors.cyan}=== TypeScript Strict Mode Error Summary ===${colors.reset}\n`);

  // Total errors
  const totalErrors = Array.from(errorMap.values()).reduce((a, b) => a + b, 0);
  console.log(`${colors.yellow}Total Errors: ${totalErrors}${colors.reset}\n`);

  // Errors by type
  console.log(`${colors.magenta}Errors by Type:${colors.reset}`);
  const sortedErrors = Array.from(errorMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  sortedErrors.forEach(([code, count]) => {
    const description = errorDescriptions[code] || 'Unknown error';
    const percentage = ((count / totalErrors) * 100).toFixed(1);
    console.log(`  ${code}: ${count} (${percentage}%) - ${description}`);
  });

  // Files with most errors
  console.log(`\n${colors.magenta}Files with Most Errors:${colors.reset}`);
  const sortedFiles = Array.from(fileErrors.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 10);

  sortedFiles.forEach(([file, errors]) => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(`  ${relativePath}: ${errors.length} errors`);
  });
}

function generateFixScript(fileErrors) {
  const outputFile = 'typescript-strict-fixes.md';
  let content = '# TypeScript Strict Mode Fixes\n\n';
  content += `Generated: ${new Date().toISOString()}\n\n`;

  // Group files by directory
  const filesByDir = new Map();
  fileErrors.forEach((errors, file) => {
    const dir = path.dirname(file);
    if (!filesByDir.has(dir)) {
      filesByDir.set(dir, []);
    }
    filesByDir.get(dir).push({ file, errors });
  });

  // Generate fix suggestions
  filesByDir.forEach((files, dir) => {
    content += `## ${path.relative(process.cwd(), dir)}\n\n`;
    
    files.forEach(({ file, errors }) => {
      const fileName = path.basename(file);
      content += `### ${fileName}\n\n`;
      
      // Group errors by type
      const errorsByType = new Map();
      errors.forEach(error => {
        if (!errorsByType.has(error.code)) {
          errorsByType.set(error.code, []);
        }
        errorsByType.get(error.code).push(error);
      });

      errorsByType.forEach((errs, code) => {
        content += `**${code} - ${errorDescriptions[code] || 'Unknown'}** (${errs.length} errors)\n`;
        
        // Show first 3 examples
        errs.slice(0, 3).forEach(err => {
          content += `- Line ${err.line}: ${err.message}\n`;
        });
        
        if (errs.length > 3) {
          content += `- ... and ${errs.length - 3} more\n`;
        }
        
        content += '\n';
      });
    });
  });

  fs.writeFileSync(outputFile, content);
  console.log(`\n${colors.green}Fix suggestions written to: ${outputFile}${colors.reset}`);
}

function suggestQuickFixes(errorMap) {
  console.log(`\n${colors.cyan}=== Quick Fix Suggestions ===${colors.reset}\n`);

  if (errorMap.has('TS6133')) {
    console.log(`${colors.yellow}For unused variables (TS6133):${colors.reset}`);
    console.log('  1. Remove unused imports: npx eslint --fix');
    console.log('  2. Prefix unused parameters with underscore: _param');
    console.log('  3. Remove dead code\n');
  }

  if (errorMap.has('TS2339')) {
    console.log(`${colors.yellow}For missing properties (TS2339):${colors.reset}`);
    console.log('  1. Check API types match backend');
    console.log('  2. Add missing properties to interfaces');
    console.log('  3. Use optional chaining: obj?.property\n');
  }

  if (errorMap.has('TS7006')) {
    console.log(`${colors.yellow}For implicit any (TS7006):${colors.reset}`);
    console.log('  1. Add explicit types to function parameters');
    console.log('  2. Use generics for better type inference');
    console.log('  3. Import types from shared definitions\n');
  }
}

// Main execution
async function main() {
  console.log(`${colors.cyan}TypeScript Strict Mode Migration Helper${colors.reset}\n`);

  const errors = getTypeScriptErrors();
  
  if (errors.length === 0) {
    console.log(`${colors.green}✅ No TypeScript errors found! Strict mode is fully compliant.${colors.reset}`);
    return;
  }

  const { errorMap, fileErrors } = parseErrors(errors);
  
  displaySummary(errorMap, fileErrors);
  suggestQuickFixes(errorMap);
  generateFixScript(fileErrors);

  console.log(`\n${colors.blue}Next steps:${colors.reset}`);
  console.log('1. Review typescript-strict-fixes.md for detailed error list');
  console.log('2. Fix errors by category (start with TS6133 - unused variables)');
  console.log('3. Run this script again to track progress');
  console.log('4. Consider using @ts-expect-error for complex fixes\n');
}

// Run the script
main().catch(console.error);