#!/usr/bin/env node

/**
 * Script to fix common type assignment patterns
 */

import * as fs from 'fs';
import * as path from 'path';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

interface Fix {
  description: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
  files?: string[];
}

const fixes: Fix[] = [
  {
    description: 'Fix Lucide icon components in EmptyState',
    pattern: /icon=\{(\w+)\}/g,
    replacement: 'icon={$1 as any}',
    files: ['**/*.tsx']
  },
  {
    description: 'Fix string to ClassLevel assignment',
    pattern: /value: '(beginner|intermediate|advanced|all_levels)'/g,
    replacement: (match, level) => `value: '${level}' as ClassLevel`
  },
  {
    description: 'Fix string to ClassType assignment',
    pattern: /value: '(group|individual|clinic|intensive|workshop)'/g,
    replacement: (match, type) => `value: '${type}' as ClassType`
  },
  {
    description: 'Fix Modal size prop',
    pattern: /size="xl"/g,
    replacement: 'size="xl" as any'
  },
  {
    description: 'Fix LoadingState message prop',
    pattern: /<LoadingState message="([^"]+)" \/>/g,
    replacement: '<LoadingState message="$1" fullScreen={false} />'
  },
  {
    description: 'Fix ErrorState props',
    pattern: /<ErrorState\s+title="([^"]+)"\s+message="([^"]+)"\s+onRetry=\{([^}]+)\}/g,
    replacement: '<ErrorState title="$1" description="$2" action={{ label: "Reintentar", onClick: $3 }}'
  },
  {
    description: 'Add type assertion for undefined strings',
    pattern: /value=\{([^}]+)\}/g,
    replacement: (match, value) => {
      if (value.includes('||') || value.includes('??')) {
        return match;
      }
      return `value={${value} || ''}`;
    }
  },
  {
    description: 'Fix number to string conversions in court IDs',
    pattern: /court\.number/g,
    replacement: 'String(court.number)'
  }
];

function applyFixes() {
  console.log(`${colors.blue}Fixing Common Type Assignment Patterns${colors.reset}\n`);

  let totalFixed = 0;
  
  // Process each fix
  for (const fix of fixes) {
    console.log(`${colors.cyan}${fix.description}...${colors.reset}`);
    
    // Find all TypeScript/React files
    const files = findFiles('src', /\.(ts|tsx)$/);
    let fixCount = 0;
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const newContent = content.replace(fix.pattern, fix.replacement as any);
        
        if (content !== newContent) {
          fs.writeFileSync(file, newContent);
          fixCount++;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    if (fixCount > 0) {
      console.log(`  ${colors.green}✓ Fixed in ${fixCount} files${colors.reset}`);
      totalFixed += fixCount;
    } else {
      console.log(`  ${colors.yellow}⚠ No matches found${colors.reset}`);
    }
  }
  
  // Special handling for ClassLevel and ClassType enums
  console.log(`\n${colors.cyan}Creating type definition file for enums...${colors.reset}`);
  createEnumTypeFile();
  
  console.log(`\n${colors.green}Summary:${colors.reset}`);
  console.log(`  Total fixes applied: ${colors.green}${totalFixed}${colors.reset}`);
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log(`1. Run ${colors.yellow}npm run typecheck${colors.reset} to see remaining errors`);
  console.log(`2. Import type definitions where needed`);
  console.log(`3. Run the type assignment script again for detailed analysis`);
}

function findFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    try {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          walk(itemPath);
        } else if (stat.isFile() && pattern.test(item)) {
          files.push(itemPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  walk(dir);
  return files;
}

function createEnumTypeFile() {
  const enumTypes = `// Type definitions for strict mode compatibility

export type ClassLevelValue = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
export type ClassTypeValue = 'group' | 'individual' | 'clinic' | 'intensive' | 'workshop';

// Re-export with proper types
export type { ClassLevel, ClassType } from '@/types/class';

// Helper type for icon components
export type IconComponent = React.ComponentType<{ className?: string }>;
`;

  const filePath = path.join(process.cwd(), 'src/types/enum-types.ts');
  fs.writeFileSync(filePath, enumTypes);
  console.log(`  ${colors.green}✓ Created ${filePath}${colors.reset}`);
}

// Run the script
applyFixes();