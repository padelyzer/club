#!/usr/bin/env node

const fs = require('fs');

const filePath = './src/components/reservations/apple-booking-flow.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix extra single quotes at the end of lines
content = content.replace(/useState\(''\);'/g, "useState('');");
content = content.replace(/parseInt\(bookingData\.court\?\.price_per_hour \|\| '500'\);'/g, 
  "parseInt(bookingData.court?.price_per_hour || '500');");

// Fix any other remaining patterns with extra quotes
const lines = content.split('\n');
const fixedLines = lines.map(line => {
  // Look for lines ending with ';' pattern (semicolon followed by single quote)
  if (line.match(/;\s*'$/)) {
    return line.replace(/;\s*'$/, ';');
  }
  return line;
});

content = fixedLines.join('\n');

// Fix the object syntax issues
// Look for patterns where we have commented properties
content = content.replace(/^(\s*)\/\/\s*(\w+):\s*(.*?)$/gm, (match, indent, prop, value) => {
  // Only uncomment if it looks like it should be part of an object
  if (value && !value.includes('//')) {
    return `${indent}${prop}: ${value}`;
  }
  return match;
});

// Fix specific object issues in the file
const objectFixes = [
  {
    search: `interface BookingStep {
id: string;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
}`,
    replace: `interface BookingStep {
  id: string;
  title: string;
  icon: React.ReactNode;
  completed: boolean;
}`
  },
  {
    search: `interface TimeSlot {
time: string;
  available: boolean;
  price?: number;
}`,
    replace: `interface TimeSlot {
  time: string;
  available: boolean;
  price?: number;
}`
  },
  {
    search: `interface BookingData {
date: Date | null;
  duration: number;`,
    replace: `interface BookingData {
  date: Date | null;
  duration: number;`
  }
];

for (const fix of objectFixes) {
  if (content.includes(fix.search)) {
    content = content.replace(fix.search, fix.replace);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed apple-booking-flow.tsx');