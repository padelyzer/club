#!/usr/bin/env node

/**
 * Script to replace console.log/error/warn/debug with production-safe logger
 */

import { promises as fs } from 'fs';
import { glob } from 'glob';

const LOGGER_IMPORT = "import { logger } from '@/lib/logger';";
const SPECIALIZED_LOGGERS = {
  'api/': 'apiLogger',
  'auth/': 'authLogger',
  'store/': 'storeLogger',
  'components/': 'uiLogger',
  'hooks/': 'logger',
};

async function processFile(filePath: string): Promise<number> {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    const originalContent = content;
    
    // Skip if already uses logger
    if (content.includes("from '@/lib/logger'")) {
      return 0;
    }

    // Skip test files
    if (filePath.includes('.test.') || filePath.includes('.spec.')) {
      return 0;
    }

    // Count console statements
    const consoleRegex = /console\.(log|error|warn|debug|info)/g;
    const matches = content.match(consoleRegex);
    
    if (!matches || matches.length === 0) {
      return 0;
    }

    // Determine which logger to use based on file path
    let loggerName = 'logger';
    for (const [pathPattern, loggerType] of Object.entries(SPECIALIZED_LOGGERS)) {
      if (filePath.includes(pathPattern)) {
        loggerName = loggerType;
        break;
      }
    }

    // Replace console statements
    content = content.replace(/console\.log/g, `${loggerName}.info`);
    content = content.replace(/console\.error/g, `${loggerName}.error`);
    content = content.replace(/console\.warn/g, `${loggerName}.warn`);
    content = content.replace(/console\.debug/g, `${loggerName}.debug`);
    content = content.replace(/console\.info/g, `${loggerName}.info`);

    // Add import statement if file was modified
    if (content !== originalContent) {
      // Find the right place to add import
      const importRegex = /^import\s+.*$/m;
      const lastImport = content.match(importRegex);
      
      if (lastImport) {
        // Add after the last import
        const lines = content.split('\n');
        let lastImportIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].match(importRegex)) {
            lastImportIndex = i;
          }
        }
        
        if (lastImportIndex !== -1) {
          const importStatement = loggerName === 'logger' 
            ? LOGGER_IMPORT 
            : `import { ${loggerName} } from '@/lib/logger';`;
          
          lines.splice(lastImportIndex + 1, 0, importStatement);
          content = lines.join('\n');
        }
      } else {
        // Add at the beginning of file
        const importStatement = loggerName === 'logger' 
          ? LOGGER_IMPORT 
          : `import { ${loggerName} } from '@/lib/logger';`;
        
        content = importStatement + '\n\n' + content;
      }

      // Write the modified content
      await fs.writeFile(filePath, content, 'utf-8');
      
      console.log(`✅ Updated ${filePath} (${matches.length} replacements)`);
      return matches.length;
    }

    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return 0;
  }
}

async function main() {
  console.log('🔍 Searching for console.log statements...\n');

  // Find all TypeScript/JavaScript files
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
    ignore: [
      '**/node_modules/**',
      '**/*.test.*',
      '**/*.spec.*',
      '**/dist/**',
      '**/.next/**',
    ],
  });

  console.log(`Found ${files.length} files to process\n`);

  let totalReplacements = 0;
  let filesUpdated = 0;

  // Process files in batches
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(processFile));
    
    results.forEach((count, _index) => {
      if (count > 0) {
        totalReplacements += count;
        filesUpdated++;
      }
    });
  }

  console.log('\n📊 Summary:');
  console.log(`- Files processed: ${files.length}`);
  console.log(`- Files updated: ${filesUpdated}`);
  console.log(`- Total replacements: ${totalReplacements}`);
  
  if (filesUpdated > 0) {
    console.log('\n⚠️  Please review the changes and test your application!');
    console.log('💡 The logger is automatically disabled in production.');
  }
}

// Run the script
main().catch(console.error);