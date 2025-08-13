#!/usr/bin/env node

/**
 * Script to fix TS6133 errors (unused variables)
 * Adds underscore prefix to unused parameters and removes unused imports
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
};

interface UnusedVariable {
  file: string;
  line: number;
  column: number;
  variable: string;
  message: string;
}

function getUnusedVariables(): UnusedVariable[] {
  try {
    execSync('npx tsc --noEmit --project tsconfig.strict.json 2>&1', {
      encoding: 'utf8',
      cwd: process.cwd()
    });
    return [];
  } catch (error: any) {
    const output = error.stdout || error.output?.[1] || '';
    const lines = output.split('\n');
    const unusedVars: UnusedVariable[] = [];

    lines.forEach((line: string) => {
      const match = line.match(/(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read\./);
      if (match && match[1] && match[2] && match[3] && match[4]) {
        unusedVars.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          variable: match[4],
          message: line
        });
      }
    });

    return unusedVars;
  }
}

function fixUnusedVariable(unusedVar: UnusedVariable): boolean {
  const filePath = path.resolve(unusedVar.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}File not found: ${filePath}${colors.reset}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const lineIndex = unusedVar.line - 1;

  if (lineIndex >= lines.length) {
    console.log(`${colors.red}Line ${unusedVar.line} not found in ${filePath}${colors.reset}`);
    return false;
  }

  const line = lines[lineIndex];
  
  if (!line) {
    console.log(`${colors.red}Line content not found${colors.reset}`);
    return false;
  }
  
  // Check if it's an import statement
  if (line.includes('import')) {
    // Handle different import patterns
    if (line.includes(`{ ${unusedVar.variable}`)) {
      // Named import - remove just this import
      const importRegex = new RegExp(`\\b${unusedVar.variable}\\s*,?\\s*`, 'g');
      lines[lineIndex] = line.replace(importRegex, '').replace(/,\s*,/g, ',').replace(/{\s*,/g, '{').replace(/,\s*}/g, '}');
      
      // If the import is now empty, remove the entire line
      if (lines[lineIndex].match(/import\s*{\s*}\s*from/)) {
        lines.splice(lineIndex, 1);
      }
    } else if (line.includes(`import ${unusedVar.variable}`)) {
      // Default import - remove entire line
      lines.splice(lineIndex, 1);
    }
  } else {
    // It's a parameter or variable declaration
    // For parameters, prefix with underscore
    if (line.includes('(') && line.includes(')')) {
      // Function parameter
      const paramRegex = new RegExp(`\\b${unusedVar.variable}\\b`, 'g');
      lines[lineIndex] = line.replace(paramRegex, `_${unusedVar.variable}`);
    } else {
      // Variable declaration - comment it out or remove
      const varRegex = new RegExp(`(const|let|var)\\s+${unusedVar.variable}\\b`);
      if (varRegex.test(line)) {
        // Comment out the line
        lines[lineIndex] = `// ${line} // Unused - removed by strict mode migration`;
      }
    }
  }

  // Write the file back
  fs.writeFileSync(filePath, lines.join('\n'));
  return true;
}

function main() {
  console.log(`${colors.blue}TypeScript Strict Mode - Fixing Unused Variables${colors.reset}\n`);

  const unusedVars = getUnusedVariables();
  console.log(`Found ${colors.yellow}${unusedVars.length}${colors.reset} unused variables\n`);

  if (unusedVars.length === 0) {
    console.log(`${colors.green}✅ No unused variables found!${colors.reset}`);
    return;
  }

  // Group by file
  const fileGroups = new Map<string, UnusedVariable[]>();
  unusedVars.forEach(uv => {
    if (!fileGroups.has(uv.file)) {
      fileGroups.set(uv.file, []);
    }
    fileGroups.get(uv.file)!.push(uv);
  });

  // Process files
  let fixedCount = 0;
  const maxFilesToProcess = 10; // Process in batches
  let filesProcessed = 0;

  for (const [file, vars] of Array.from(fileGroups.entries())) {
    if (filesProcessed >= maxFilesToProcess) {
      console.log(`\n${colors.yellow}Processed ${maxFilesToProcess} files. Run again to continue.${colors.reset}`);
      break;
    }

    console.log(`\n${colors.blue}Processing ${path.relative(process.cwd(), file)}${colors.reset}`);
    
    // Sort by line number in reverse to avoid line number shifts
    vars.sort((a: UnusedVariable, b: UnusedVariable) => b.line - a.line);
    
    vars.forEach((uv: UnusedVariable) => {
      console.log(`  Line ${uv.line}: ${colors.yellow}${uv.variable}${colors.reset}`);
      if (fixUnusedVariable(uv)) {
        fixedCount++;
      }
    });
    
    filesProcessed++;
  }

  console.log(`\n${colors.green}Fixed ${fixedCount} unused variables${colors.reset}`);
  console.log(`${colors.yellow}${unusedVars.length - fixedCount} remaining${colors.reset}`);
  
  // Run ESLint to clean up
  console.log(`\n${colors.blue}Running ESLint to clean up...${colors.reset}`);
  try {
    execSync('npx eslint --fix --ext .ts,.tsx src/ 2>/dev/null', { stdio: 'inherit' });
  } catch {
    // ESLint might have some errors, but that's ok
  }

  console.log(`\n${colors.green}Done! Run the script again to process more files.${colors.reset}`);
}

// Run the script
main();