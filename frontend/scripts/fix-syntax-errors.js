const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patrones problemáticos conocidos y sus correcciones
const fixes = [
  {
    // Corregir if statements con strings no cerradas
    pattern: /if\s*\(process\.env\.NODE_ENV\s*===\s*'development'\)\s*\{\s*'/g,
    replacement: "if (process.env.NODE_ENV === 'development') {"
  },
  {
    // Corregir comentarios mal formados
    pattern: /\/\/\s*\/\/\s*/g,
    replacement: '//'
  },
  {
    // Corregir bloques vacíos después de console.log removal
    pattern: /if\s*\(process\.env\.NODE_ENV\s*===\s*'development'\)\s*\{\s*\}/g,
    replacement: "if (process.env.NODE_ENV === 'development') {\n      // Development mode\n    }"
  },
  {
    // Corregir expresiones sueltas con optional chaining
    pattern: /^\s*\?\./gm,
    replacement: '// '
  },
  {
    // Corregir funciones con parámetros sin usar
    pattern: /\(([^)]+)\)\s*=>\s*\(\s*\{/g,
    replacement: '($1) => {'
  },
  {
    // Corregir objetos con propiedades sueltas
    pattern: /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^,}]+),?\s*$/gm,
    replacement: '// $1: $2'
  },
  {
    // Corregir bloques de comentarios incompletos
    pattern: /\/\*(?![\s\S]*\*\/)/g,
    replacement: '/* '
  },
  {
    // Cerrar bloques de comentarios no cerrados
    pattern: /\/\*([^*]|\*(?!\/))*$/g,
    replacement: '$& */'
  }
];

// Archivos a verificar
const filesToCheck = [
  'src/app/[locale]/[club-slug]/(club)/layout.tsx',
  'src/app/[locale]/(auth)/login/page.tsx',
  'src/components/reservations/apple-booking-flow.tsx',
  'src/lib/api/stable-client.ts',
  'src/store/tournamentsStore.ts',
  'src/app/[locale]/(dashboard)/classes/page.tsx',
  'src/components/clients/export-modal.tsx',
  'src/components/payments/payment-gateway-selector.tsx',
  'src/components/finance/subscription-manager.tsx',
  'src/components/finance/payments-list.tsx',
  'src/components/finance/invoices-list.tsx',
  'src/components/classes/class-filters.tsx'
];

function fixFile(filePath) {
  try {
    const fullPath = path.join('/Users/ja/PZR4/frontend', filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    let changesMade = false;

    // Aplicar cada corrección
    fixes.forEach(fix => {
      const before = content;
      content = content.replace(fix.pattern, fix.replacement);
      if (before !== content) {
        changesMade = true;
      }
    });

    // Correcciones específicas adicionales
    // Eliminar líneas que solo contienen "});"
    content = content.replace(/^\s*}\);\s*$/gm, '');
    
    // Corregir logLoginFlow no definido
    content = content.replace(/logLoginFlow\([^)]*\);?/g, '// Login flow log removed');
    
    // Corregir useAuthDiagnostics no definido
    content = content.replace(/const\s*{\s*logLoginFlow\s*}\s*=\s*useAuthDiagnostics\([^)]*\);?/g, '// Auth diagnostics removed');

    if (changesMade || originalContent !== content) {
      // Hacer backup
      const backupPath = fullPath + '.backup';
      fs.writeFileSync(backupPath, originalContent);
      
      // Escribir archivo corregido
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`✔️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Starting syntax error fixes...\n');

// Procesar cada archivo
filesToCheck.forEach(fixFile);

// También buscar otros archivos tsx/ts con problemas potenciales
const allFiles = glob.sync('src/**/*.{ts,tsx}', {
  cwd: '/Users/ja/PZR4/frontend',
  ignore: ['**/node_modules/**', '**/.next/**']
});

console.log(`\n🔍 Checking ${allFiles.length} additional files for syntax issues...`);

let additionalFixed = 0;
allFiles.forEach(file => {
  if (!filesToCheck.includes(file)) {
    try {
      const fullPath = path.join('/Users/ja/PZR4/frontend', file);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for common problematic patterns
      if (
        content.includes("if (process.env.NODE_ENV === 'development') {'") ||
        content.includes('// //') ||
        /^\s*\?\./m.test(content) ||
        content.includes('logLoginFlow(') ||
        content.includes('useAuthDiagnostics(')
      ) {
        fixFile(file);
        additionalFixed++;
      }
    } catch (error) {
      // Ignore read errors
    }
  }
});

console.log(`\n✨ Syntax fix complete!`);
console.log(`📝 Fixed ${additionalFixed} additional files`);
console.log(`\n💡 Next steps:`);
console.log(`1. Run: cd /Users/ja/PZR4/frontend && rm -rf .next`);
console.log(`2. Run: npm run dev`);
console.log(`3. Check for any remaining errors`);