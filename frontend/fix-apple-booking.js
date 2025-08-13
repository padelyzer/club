#!/usr/bin/env node

const fs = require('fs');

const filePath = './src/components/reservations/apple-booking-flow.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the incomplete console.log object
content = content.replace(
  `          console.log('AppleBookingFlow: Checking canProceed', {
            hasDate,
            hasStartTime,
            hasDuration,
// date: bookingData.date
// startTime: bookingData.startTime
// duration: bookingData.duration
// canProceed: hasDate && hasStartTime && hasDuration
// timestamp: new Date().toISOString()`,
  `          console.log('AppleBookingFlow: Checking canProceed', {
            hasDate,
            hasStartTime,
            hasDuration,
            date: bookingData.date,
            startTime: bookingData.startTime,
            duration: bookingData.duration,
            canProceed: hasDate && hasStartTime && hasDuration,
            timestamp: new Date().toISOString()
          });`
);

// Look for any other incomplete objects/console.logs that might exist
const lines = content.split('\n');
let inComment = false;
let fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // If we see a pattern like "// property: value" after an opening brace, it's likely a commented object property
  if (line.trim().startsWith('//') && i > 0 && 
      (lines[i-1].includes('{') || lines[i-1].includes(',')) &&
      line.includes(':')) {
    // Convert commented property to uncommented
    line = line.replace(/^(\s*)\/\/\s*/, '$1');
  }
  
  fixedLines.push(line);
}

content = fixedLines.join('\n');

// Ensure the console.log is properly closed
if (!content.includes('timestamp: new Date().toISOString()\n          });')) {
  // Find and fix any remaining issues
  content = content.replace(/timestamp: new Date\(\)\.toISOString\(\)\s*$/m, 
    'timestamp: new Date().toISOString()\n          });');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed apple-booking-flow.tsx');