#!/usr/bin/env node

const fs = require('fs');

const filePath = './src/components/clients/export-modal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix commented properties in object literals
const fixes = [
  // Line 53-56
  {
    search: `interface ExportModalProps {
// isOpen: boolean;
  onClose: () => void;
  currentFilters?: ApiClientFilters;
}`,
    replace: `interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters?: ApiClientFilters;
}`
  },
  // Lines 62-65
  {
    search: `> = {
// csv: FileText
// xlsx: FileSpreadsheet
// pdf: FileText
// json: Table
};`,
    replace: `> = {
  csv: FileText,
  xlsx: FileSpreadsheet,
  pdf: FileText,
  json: Table
};`
  },
  // Lines 69-72
  {
    search: `const formatLabels: Record<ExportFormat, string> = {
// csv: 'CSV - Comma Separated Values'
// xlsx: 'Excel - Microsoft Excel Spreadsheet'
// pdf: 'PDF - Portable Document Format'
// json: 'JSON - JavaScript Object Notation'
};`,
    replace: `const formatLabels: Record<ExportFormat, string> = {
  csv: 'CSV - Comma Separated Values',
  xlsx: 'Excel - Microsoft Excel Spreadsheet',
  pdf: 'PDF - Portable Document Format',
  json: 'JSON - JavaScript Object Notation'
};`
  },
  // Line 154-157 (missing closing parenthesis)
  {
    search: `      updateConfig({
// format: template.format
        ...template.config,

    }`,
    replace: `      updateConfig({
        format: template.format,
        ...template.config
      });
    }`
  },
  // Line 202-203
  {
    search: `            total_steps: 3
// completed_steps: 0
// start_time: new Date().toISOString()
          },`,
    replace: `            total_steps: 3,
            completed_steps: 0,
            start_time: new Date().toISOString()
          },`
  },
  // Line 228
  {
    search: `            break;
// default: throw new Error('Unsupported format');
        }`,
    replace: `            break;
          default: 
            throw new Error('Unsupported format');
        }`
  },
  // Line 303-314 (handleClose function)
  {
    search: `  const handleClose = () => {
    setState({
// isOpen: false
// currentStep: 'configure'
// config: {
        format: 'csv'
// include_headers: true
        selected_fields: ['first_name', 'last_name', 'email', 'phone'],
// filters: currentFilters
// include_stats: false
      },
// templates: []

    setCustomFilename('');`,
    replace: `  const handleClose = () => {
    setState({
      isOpen: false,
      currentStep: 'configure',
      config: {
        format: 'csv',
        include_headers: true,
        selected_fields: ['first_name', 'last_name', 'email', 'phone'],
        filters: currentFilters,
        include_stats: false
      },
      templates: []
    });
    setCustomFilename('');`
  },
  // Lines 353-357
  {
    search: `              state.templates.find((t) => t.id === selectedTemplateId)
// description
            }`,
    replace: `              state.templates.find((t) => t.id === selectedTemplateId)
                ?.description
            }`
  },
  // Line 615
  {
    search: `        return 'Descargar';
// default: return 'Exportar Clientes';
    }`,
    replace: `        return 'Descargar';
      default: 
        return 'Exportar Clientes';
    }`
  },
  // Line 630
  {
    search: `        return true;
// default: return false;
    }`,
    replace: `        return true;
      default: 
        return false;
    }`
  }
];

// Apply all fixes
for (const fix of fixes) {
  if (content.includes(fix.search)) {
    content = content.replace(fix.search, fix.replace);
    console.log('✅ Applied fix');
  } else {
    console.log('⚠️  Pattern not found, trying partial match...');
    // Log what we're looking for
    const searchLines = fix.search.split('\n');
    console.log('   Looking for:', searchLines[0]);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('\n✨ Fixed export-modal.tsx');