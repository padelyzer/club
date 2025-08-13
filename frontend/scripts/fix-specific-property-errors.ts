#!/usr/bin/env node

/**
 * Script to fix specific common property errors
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
  apply: () => boolean;
}

const fixes: Fix[] = [
  {
    description: 'Add status to TournamentMatch type',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/tournament.ts');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('interface TournamentMatch') && !content.includes('status:')) {
          const updatedContent = content.replace(
            /export interface TournamentMatch {([^}]+)}/,
            (match, fields) => {
              if (!fields.includes('status:')) {
                const newFields = fields + '  status: \'scheduled\' | \'in_progress\' | \'completed\' | \'cancelled\';\n';
                return `export interface TournamentMatch {${newFields}}`;
              }
              return match;
            }
          );
          
          if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    description: 'Add level to ClassSession type',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/class.ts');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('interface ClassSession') && !content.includes('level:')) {
          const updatedContent = content.replace(
            /export interface ClassSession {([^}]+)}/,
            (match, fields) => {
              if (!fields.includes('level:')) {
                const newFields = fields + '  level?: string;\n';
                return `export interface ClassSession {${newFields}}`;
              }
              return match;
            }
          );
          
          if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    description: 'Add firstName/lastName to Instructor type',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/instructor.ts');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let updatedContent = content;
        
        if (!content.includes('firstName:')) {
          updatedContent = updatedContent.replace(
            /export interface Instructor {([^}]+)}/,
            (match, fields) => {
              return `export interface Instructor {${fields}  firstName: string;\n}`;
            }
          );
          modified = true;
        }
        
        if (!updatedContent.includes('lastName:')) {
          updatedContent = updatedContent.replace(
            /export interface Instructor {([^}]+)}/,
            (match, fields) => {
              return `export interface Instructor {${fields}  lastName: string;\n}`;
            }
          );
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(filePath, updatedContent);
          return true;
        }
      }
      return false;
    }
  },
  {
    description: 'Add client to Reservation type',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/reservation.ts');
      if (!fs.existsSync(filePath)) {
        // Create the file if it doesn't exist
        const reservationTypes = `// Reservation Types

export interface Reservation {
  id: string;
  club: string;
  club_name?: string;
  court: string;
  court_name?: string;
  organization: string;
  created_by: string;
  created_by_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  player_name: string;
  player_email: string;
  player_phone?: string;
  player_count: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'paid' | 'refunded';
  price_per_hour: number;
  total_price: number;
  notes?: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  client?: string | { id: string; name: string; email: string; };
  can_cancel: boolean;
  is_past: boolean;
  is_today: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReservationFilters {
  club?: string;
  court?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  payment_status?: string;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}
`;
        fs.writeFileSync(filePath, reservationTypes);
        return true;
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('client:')) {
          const updatedContent = content.replace(
            /export interface Reservation {([^}]+)}/,
            (match, fields) => {
              const newFields = fields + '  client?: string | { id: string; name: string; email: string; };\n';
              return `export interface Reservation {${newFields}}`;
            }
          );
          
          if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    description: 'Add role to User type',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/user.ts');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('role:')) {
          const updatedContent = content.replace(
            /export interface User {([^}]+)}/,
            (match, fields) => {
              const newFields = fields + '  role?: \'ROOT\' | \'ADMIN\' | \'STAFF\' | \'CLIENT\';\n';
              return `export interface User {${newFields}}`;
            }
          );
          
          if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    description: 'Add name to ClassSession type',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/class.ts');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('interface ClassSession') && !content.includes('  name:')) {
          const updatedContent = content.replace(
            /export interface ClassSession {([^}]+)}/,
            (match, fields) => {
              if (!fields.includes('  name:')) {
                const newFields = fields + '  name?: string;\n';
                return `export interface ClassSession {${newFields}}`;
              }
              return match;
            }
          );
          
          if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    description: 'Add loading method to toast',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/lib/toast.ts');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('loading:')) {
          // Add loading method to the toast export
          const updatedContent = content.replace(
            /export default {([^}]+)}/,
            (match, methods) => {
              if (!methods.includes('loading:')) {
                const newMethods = methods.trim();
                const loadingMethod = `
  loading: (message: string) => {
    if (typeof window !== 'undefined' && window.Toastify) {
      window.Toastify({
        text: message,
        duration: -1, // Persistent until dismissed
        gravity: "top",
        position: "right",
        className: "toast-loading",
        style: {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        },
      }).showToast();
    } else {
      console.log('⏳ ' + message);
    }
  },`;
                return `export default {\n${newMethods}${newMethods.endsWith(',') ? '' : ','}\n${loadingMethod}\n}`;
              }
              return match;
            }
          );
          
          if (content !== updatedContent) {
            fs.writeFileSync(filePath, updatedContent);
            return true;
          }
        }
      }
      return false;
    }
  }
];

function main() {
  console.log(`${colors.blue}Fixing Specific Property Errors${colors.reset}\n`);

  let fixedCount = 0;
  let failedCount = 0;

  for (const fix of fixes) {
    process.stdout.write(`${colors.cyan}${fix.description}...${colors.reset} `);
    
    try {
      const result = fix.apply();
      if (result) {
        console.log(`${colors.green}✓ Fixed${colors.reset}`);
        fixedCount++;
      } else {
        console.log(`${colors.yellow}⚠ Already fixed or not needed${colors.reset}`);
      }
    } catch (error: any) {
      console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
      failedCount++;
    }
  }

  console.log(`\n${colors.green}Summary:${colors.reset}`);
  console.log(`  Fixed: ${colors.green}${fixedCount}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${failedCount}${colors.reset}`);
  console.log(`  Skipped: ${colors.yellow}${fixes.length - fixedCount - failedCount}${colors.reset}`);
  
  console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
  console.log(`1. Run ${colors.yellow}npm run typecheck${colors.reset} to see remaining errors`);
  console.log(`2. Review the changes to ensure they are correct`);
  console.log(`3. Update imports in affected files if needed`);
}

// Run the script
main();