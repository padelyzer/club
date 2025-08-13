#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const fixes = [
  {
    file: './src/components/auth/enterprise-2fa-admin.tsx',
    issue: 'Missing closing parenthesis before return statement',
    search: `  }

  return (`,
    replace: `  };

  return (`
  },
  {
    file: './src/components/auth/session-security.tsx',
    issue: 'Missing closing parenthesis before return statement',
    search: `  }

  return (`,
    replace: `  };

  return (`
  },
  {
    file: './src/components/clients/client-detail.tsx',
    issue: 'Missing closing parenthesis before return statement',
    search: `  ];

  return (`,
    replace: `  ];

  return (`
  },
  {
    file: './src/components/clients/export-modal.tsx',
    issue: 'Malformed object with commented lines',
    search: `// config: {
      format: 'csv'
// include_headers: true
      selected_fields: ['first_name', 'last_name', 'email', 'phone'],
// filters: currentFilters
// include_stats: false
    },`,
    replace: `config: {
      format: 'csv',
      include_headers: true,
      selected_fields: ['first_name', 'last_name', 'email', 'phone'],
      filters: currentFilters,
      include_stats: false
    },`
  },
  {
    file: './src/components/reservations/apple-booking-flow.tsx',
    issue: 'Extra quote in string template',
    search: `    const time = \`\${hour.toString().padStart(2, '0')}:00\`;'`,
    replace: `    const time = \`\${hour.toString().padStart(2, '0')}:00\`;`
  }
];

let totalFixed = 0;

for (const fix of fixes) {
  const filePath = path.resolve(fix.file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${fix.file}`);
    continue;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(fix.search)) {
      content = content.replace(fix.search, fix.replace);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${fix.file} - ${fix.issue}`);
      totalFixed++;
    } else {
      console.log(`⚠️  Pattern not found in ${fix.file}`);
      
      // Try to find similar patterns
      const searchLines = fix.search.split('\n');
      for (let i = 0; i < searchLines.length; i++) {
        if (searchLines[i].trim() && !content.includes(searchLines[i])) {
          console.log(`   Missing line: "${searchLines[i].trim()}"`);
        }
      }
    }
  } catch (error) {
    console.log(`❌ Error processing ${fix.file}: ${error.message}`);
  }
}

console.log(`\n📊 Total files fixed: ${totalFixed}`);