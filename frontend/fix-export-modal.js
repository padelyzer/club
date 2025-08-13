#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const filePath = './src/components/clients/export-modal.tsx';

if (!fs.existsSync(filePath)) {
  console.log('❌ File not found:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: setState at line 103-110
content = content.replace(
  `setState((prev) => ({
        ...prev,
// isOpen: true
// config: {
          ...prev.config
// filters: currentFilters
        },
      }));`,
  `setState((prev) => ({
        ...prev,
        isOpen: true,
        config: {
          ...prev.config,
          filters: currentFilters
        }
      }));`
);

// Fix 2: setState with templates around line 117-127
content = content.replace(
  `setState((prev) => ({
        ...prev,
// templates: [
          ...templates
          ...DEFAULT_EXPORT_TEMPLATES.map((t, i) => {
            ...t,
            id: \`default-\${i}\`,
// created_at: new Date().toISOString()
// updated_at: new Date().toISOString()
          })),
        ],
      }));`,
  `setState((prev) => ({
        ...prev,
        templates: [
          ...templates,
          ...DEFAULT_EXPORT_TEMPLATES.map((t, i) => ({
            ...t,
            id: \`default-\${i}\`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        ]
      }));`
);

// Fix 3: setState in catch block around line 131-139
content = content.replace(
  `setState((prev) => ({
        ...prev,
        templates: DEFAULT_EXPORT_TEMPLATES.map((t, i) => {
          ...t,
          id: \`default-\${i}\`,
// created_at: new Date().toISOString()
// updated_at: new Date().toISOString()
        })),
      }));`,
  `setState((prev) => ({
        ...prev,
        templates: DEFAULT_EXPORT_TEMPLATES.map((t, i) => ({
          ...t,
          id: \`default-\${i}\`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }))
      }));`
);

// Fix 4: setState with progress around line 192-201
content = content.replace(
  `setState((prev) => ({
        ...prev,
// currentStep: 'processing'
// progress: {
            id: operation_id
// type: 'export'
// state: 'processing'
// progress_percentage: 0
// current_step: 'Preparing export...'
// total_steps: 3`,
  `setState((prev) => ({
        ...prev,
        currentStep: 'processing',
        progress: {
            id: operation_id,
            type: 'export',
            state: 'processing',
            progress_percentage: 0,
            current_step: 'Preparing export...',
            total_steps: 3`
);

// Fix 5: setState error handling around line 235-242
content = content.replace(
  `setState((prev) => ({
        ...prev,
// currentStep: 'configure'
// progress: {
          ...prev.progress!
// state: 'error'
// error_message: error instanceof Error ? error.message : 'Error during export'
        },
      }));`,
  `setState((prev) => ({
        ...prev,
        currentStep: 'configure',
        progress: {
          ...prev.progress!,
          state: 'error',
          error_message: error instanceof Error ? error.message : 'Error during export'
        }
      }));`
);

// Fix 6: setState in pollExportProgress around line 264-268
content = content.replace(
  `setState((prev) => ({
        ...prev,
// currentStep: 'download'
            result,
          }));`,
  `setState((prev) => ({
        ...prev,
        currentStep: 'download',
        result
      }));`
);

// Fix 7: setState error in pollExportProgress around line 271-274
content = content.replace(
  `setState((prev) => ({
        ...prev,
// currentStep: 'configure'
          }));`,
  `setState((prev) => ({
        ...prev,
        currentStep: 'configure'
      }));`
);

// Fix 8: Arrow function returns in nextStep/prevStep
content = content.replace(/setState\(\(prev\) => \({\s*\n\s*\.\.\.prev, currentStep: '(\w+)' \}\)\);/g, 
  `setState((prev) => ({
        ...prev, 
        currentStep: '$1'
      }));`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed all setState issues in export-modal.tsx');