#!/usr/bin/env node

/**
 * Script to fix common TS2339 property errors
 * This script will fix specific known issues in the codebase
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
  file: string;
  description: string;
  apply: () => boolean;
}

const fixes: Fix[] = [
  {
    file: 'src/lib/api/hooks/useAuth.ts',
    description: 'Add proper return type to login function',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/lib/api/hooks/useAuth.ts');
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Fix the login function to return LoginResponse type
      const updatedContent = content.replace(
        /const login = async \(credentials: LoginRequest\) => {/,
        'const login = async (credentials: LoginRequest): Promise<LoginResponse> => {'
      );
      
      if (content !== updatedContent) {
        fs.writeFileSync(filePath, updatedContent);
        return true;
      }
      return false;
    }
  },
  {
    file: 'src/types/user.ts',
    description: 'Add club_memberships to User interface',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/user.ts');
      if (!fs.existsSync(filePath)) {
        console.log(`${colors.yellow}Creating user types file...${colors.reset}`);
        const userTypes = `// User Types

export interface ClubMembership {
  id: string;
  club: {
    id: string;
    name: string;
    slug: string;
  };
  user: string;
  role: 'admin' | 'manager' | 'staff' | 'member';
  permissions: string[];
  joined_at: string;
  is_active: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  isStaff: boolean;
  isSuperuser: boolean;
  dateJoined: string;
  lastLogin?: string;
  groups?: string[];
  permissions?: string[];
  club_memberships?: ClubMembership[];
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfile extends User {
  bio?: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'O';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  preferences?: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}
`;
        fs.writeFileSync(filePath, userTypes);
        return true;
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('club_memberships')) {
          // Add club_memberships to existing User interface
          const updatedContent = content.replace(
            /export interface User {([^}]+)}/,
            (_match, fields) => {
              return `export interface User {${fields}  club_memberships?: ClubMembership[];\n}`;
            }
          );
          
          // Also add ClubMembership interface if not present
          let finalContent = updatedContent;
          if (!content.includes('interface ClubMembership')) {
            const clubMembershipInterface = `
export interface ClubMembership {
  id: string;
  club: {
    id: string;
    name: string;
    slug: string;
  };
  user: string;
  role: 'admin' | 'manager' | 'staff' | 'member';
  permissions: string[];
  joined_at: string;
  is_active: boolean;
}

`;
            finalContent = clubMembershipInterface + finalContent;
          }
          
          if (content !== finalContent) {
            fs.writeFileSync(filePath, finalContent);
            return true;
          }
        }
      }
      return false;
    }
  },
  {
    file: 'src/types/instructor.ts',
    description: 'Add firstName and lastName to Instructor interface',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/instructor.ts');
      if (!fs.existsSync(filePath)) {
        console.log(`${colors.yellow}Creating instructor types file...${colors.reset}`);
        const instructorTypes = `// Instructor Types

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  bio?: string;
  specialties: string[];
  certifications: string[];
  experience_years: number;
  rating: number;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface InstructorSchedule {
  instructor: string;
  day_of_week: number; // 0-6, where 0 is Monday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
}

export interface InstructorStats {
  total_classes: number;
  total_students: number;
  average_rating: number;
  completion_rate: number;
  revenue_generated: number;
}
`;
        fs.writeFileSync(filePath, instructorTypes);
        return true;
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('firstName') || !content.includes('lastName')) {
          const updatedContent = content.replace(
            /export interface Instructor {([^}]+)}/,
            (_match, fields) => {
              let newFields = fields;
              if (!fields.includes('firstName')) {
                newFields += '  firstName: string;\n';
              }
              if (!fields.includes('lastName')) {
                newFields += '  lastName: string;\n';
              }
              return `export interface Instructor {${newFields}}`;
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
    file: 'src/types/class.ts',
    description: 'Add missing properties to ClassSession interface',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/class.ts');
      if (!fs.existsSync(filePath)) {
        console.log(`${colors.yellow}Creating class types file...${colors.reset}`);
        const classTypes = `// Class Types

export interface ClassLevel {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  min_age?: number;
  max_age?: number;
  skill_requirement?: string;
  color: string;
  order: number;
}

export interface ClassType {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  max_students: number;
  min_students: number;
  level?: string;
  default_price: number;
  requires_equipment?: boolean;
  equipment_list?: string[];
  is_active: boolean;
}

export interface ClassSession {
  id: string;
  class_type: ClassType;
  instructor: {
    id: string;
    first_name: string;
    last_name: string;
    firstName?: string;
    lastName?: string;
  };
  court?: {
    id: string;
    name: string;
  };
  start_time: string;
  end_time: string;
  date: string;
  price: number;
  max_students: number;
  enrolled_students: number;
  current_participants?: number;
  currentParticipants?: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  level?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassEnrollment {
  id: string;
  class_session: string;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
  status: 'enrolled' | 'waitlist' | 'cancelled' | 'attended' | 'no_show';
  payment_status: 'pending' | 'paid' | 'refunded';
  enrolled_at: string;
  attended_at?: string;
  cancelled_at?: string;
  notes?: string;
}
`;
        fs.writeFileSync(filePath, classTypes);
        return true;
      } else {
        const content = fs.readFileSync(filePath, 'utf8');
        // Check if we need to add currentParticipants alias
        if (!content.includes('currentParticipants') && content.includes('interface ClassSession')) {
          const updatedContent = content.replace(
            /export interface ClassSession {([^}]+)}/,
            (match, fields) => {
              if (!fields.includes('currentParticipants')) {
                const newFields = fields + '  currentParticipants?: number;\n';
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
    file: 'src/types/reservation.ts',
    description: 'Add client property to Reservation interface',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/types/reservation.ts');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('client:') && content.includes('interface Reservation')) {
          const updatedContent = content.replace(
            /export interface Reservation {([^}]+)}/,
            (match, fields) => {
              if (!fields.includes('client:')) {
                const newFields = fields + '  client?: string | { id: string; name: string; email: string; };\n';
                return `export interface Reservation {${newFields}}`;
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
    file: 'src/types/court.ts', 
    description: 'Add list property to CourtsService',
    apply: () => {
      const filePath = path.join(process.cwd(), 'src/lib/api/services/courts.service.ts');
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('static async list')) {
          // Add list method that calls getAll
          const updatedContent = content.replace(
            /export class CourtsService {/,
            `export class CourtsService {
  // List courts with filters (alias for getAll)
  static async list(filters?: any): Promise<PaginatedResponse<Court>> {
    return this.getAll(filters);
  }
`
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
  console.log(`${colors.blue}Fixing Common Property Errors${colors.reset}\n`);

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
  console.log(`2. Update type imports in affected files`);
  console.log(`3. Run the property errors analysis script for detailed report`);
}

// Run the script
main();