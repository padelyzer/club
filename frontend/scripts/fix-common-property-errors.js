#!/usr/bin/env node
"use strict";
/**
 * Script to fix common TS2339 property errors
 * This script will fix specific known issues in the codebase
 */
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};
var fixes = [
    {
        file: 'src/lib/api/hooks/useAuth.ts',
        description: 'Add proper return type to login function',
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/lib/api/hooks/useAuth.ts');
            var content = fs.readFileSync(filePath, 'utf8');
            // Fix the login function to return LoginResponse type
            var updatedContent = content.replace(/const login = async \(credentials: LoginRequest\) => {/, 'const login = async (credentials: LoginRequest): Promise<LoginResponse> => {');
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
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/user.ts');
            if (!fs.existsSync(filePath)) {
                console.log("".concat(colors.yellow, "Creating user types file...").concat(colors.reset));
                var userTypes = "// User Types\n\nexport interface ClubMembership {\n  id: string;\n  club: {\n    id: string;\n    name: string;\n    slug: string;\n  };\n  user: string;\n  role: 'admin' | 'manager' | 'staff' | 'member';\n  permissions: string[];\n  joined_at: string;\n  is_active: boolean;\n}\n\nexport interface User {\n  id: string;\n  email: string;\n  username: string;\n  firstName: string;\n  lastName: string;\n  fullName?: string;\n  avatar?: string;\n  phone?: string;\n  isActive: boolean;\n  isStaff: boolean;\n  isSuperuser: boolean;\n  dateJoined: string;\n  lastLogin?: string;\n  groups?: string[];\n  permissions?: string[];\n  club_memberships?: ClubMembership[];\n  is_active?: boolean;\n  is_staff?: boolean;\n  is_superuser?: boolean;\n  created_at?: string;\n  updated_at?: string;\n}\n\nexport interface UserProfile extends User {\n  bio?: string;\n  birthDate?: string;\n  gender?: 'M' | 'F' | 'O';\n  address?: {\n    street?: string;\n    city?: string;\n    state?: string;\n    postalCode?: string;\n    country?: string;\n  };\n  preferences?: {\n    language: string;\n    timezone: string;\n    notifications: {\n      email: boolean;\n      sms: boolean;\n      push: boolean;\n    };\n  };\n}\n";
                fs.writeFileSync(filePath, userTypes);
                return true;
            }
            else {
                var content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('club_memberships')) {
                    // Add club_memberships to existing User interface
                    var updatedContent = content.replace(/export interface User {([^}]+)}/, function (match, fields) {
                        return "export interface User {".concat(fields, "  club_memberships?: ClubMembership[];\n}");
                    });
                    // Also add ClubMembership interface if not present
                    var finalContent = updatedContent;
                    if (!content.includes('interface ClubMembership')) {
                        var clubMembershipInterface = "\nexport interface ClubMembership {\n  id: string;\n  club: {\n    id: string;\n    name: string;\n    slug: string;\n  };\n  user: string;\n  role: 'admin' | 'manager' | 'staff' | 'member';\n  permissions: string[];\n  joined_at: string;\n  is_active: boolean;\n}\n\n";
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
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/instructor.ts');
            if (!fs.existsSync(filePath)) {
                console.log("".concat(colors.yellow, "Creating instructor types file...").concat(colors.reset));
                var instructorTypes = "// Instructor Types\n\nexport interface Instructor {\n  id: string;\n  firstName: string;\n  lastName: string;\n  first_name: string;\n  last_name: string;\n  email: string;\n  phone?: string;\n  bio?: string;\n  specialties: string[];\n  certifications: string[];\n  experience_years: number;\n  rating: number;\n  is_active: boolean;\n  avatar_url?: string;\n  created_at: string;\n  updated_at: string;\n}\n\nexport interface InstructorSchedule {\n  instructor: string;\n  day_of_week: number; // 0-6, where 0 is Monday\n  start_time: string; // HH:MM format\n  end_time: string; // HH:MM format\n  is_available: boolean;\n}\n\nexport interface InstructorStats {\n  total_classes: number;\n  total_students: number;\n  average_rating: number;\n  completion_rate: number;\n  revenue_generated: number;\n}\n";
                fs.writeFileSync(filePath, instructorTypes);
                return true;
            }
            else {
                var content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('firstName') || !content.includes('lastName')) {
                    var updatedContent = content.replace(/export interface Instructor {([^}]+)}/, function (match, fields) {
                        var newFields = fields;
                        if (!fields.includes('firstName')) {
                            newFields += '  firstName: string;\n';
                        }
                        if (!fields.includes('lastName')) {
                            newFields += '  lastName: string;\n';
                        }
                        return "export interface Instructor {".concat(newFields, "}");
                    });
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
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/class.ts');
            if (!fs.existsSync(filePath)) {
                console.log("".concat(colors.yellow, "Creating class types file...").concat(colors.reset));
                var classTypes = "// Class Types\n\nexport interface ClassLevel {\n  id: string;\n  name: string;\n  display_name: string;\n  description?: string;\n  min_age?: number;\n  max_age?: number;\n  skill_requirement?: string;\n  color: string;\n  order: number;\n}\n\nexport interface ClassType {\n  id: string;\n  name: string;\n  description?: string;\n  duration_minutes: number;\n  max_students: number;\n  min_students: number;\n  level?: string;\n  default_price: number;\n  requires_equipment?: boolean;\n  equipment_list?: string[];\n  is_active: boolean;\n}\n\nexport interface ClassSession {\n  id: string;\n  class_type: ClassType;\n  instructor: {\n    id: string;\n    first_name: string;\n    last_name: string;\n    firstName?: string;\n    lastName?: string;\n  };\n  court?: {\n    id: string;\n    name: string;\n  };\n  start_time: string;\n  end_time: string;\n  date: string;\n  price: number;\n  max_students: number;\n  enrolled_students: number;\n  current_participants?: number;\n  currentParticipants?: number;\n  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';\n  level?: string;\n  notes?: string;\n  created_at: string;\n  updated_at: string;\n}\n\nexport interface ClassEnrollment {\n  id: string;\n  class_session: string;\n  student: {\n    id: string;\n    full_name: string;\n    email: string;\n  };\n  status: 'enrolled' | 'waitlist' | 'cancelled' | 'attended' | 'no_show';\n  payment_status: 'pending' | 'paid' | 'refunded';\n  enrolled_at: string;\n  attended_at?: string;\n  cancelled_at?: string;\n  notes?: string;\n}\n";
                fs.writeFileSync(filePath, classTypes);
                return true;
            }
            else {
                var content = fs.readFileSync(filePath, 'utf8');
                // Check if we need to add currentParticipants alias
                if (!content.includes('currentParticipants') && content.includes('interface ClassSession')) {
                    var updatedContent = content.replace(/export interface ClassSession {([^}]+)}/, function (match, fields) {
                        if (!fields.includes('currentParticipants')) {
                            var newFields = fields + '  currentParticipants?: number;\n';
                            return "export interface ClassSession {".concat(newFields, "}");
                        }
                        return match;
                    });
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
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/reservation.ts');
            if (fs.existsSync(filePath)) {
                var content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('client:') && content.includes('interface Reservation')) {
                    var updatedContent = content.replace(/export interface Reservation {([^}]+)}/, function (match, fields) {
                        if (!fields.includes('client:')) {
                            var newFields = fields + '  client?: string | { id: string; name: string; email: string; };\n';
                            return "export interface Reservation {".concat(newFields, "}");
                        }
                        return match;
                    });
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
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/lib/api/services/courts.service.ts');
            if (fs.existsSync(filePath)) {
                var content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('static async list')) {
                    // Add list method that calls getAll
                    var updatedContent = content.replace(/export class CourtsService {/, "export class CourtsService {\n  // List courts with filters (alias for getAll)\n  static async list(filters?: any): Promise<PaginatedResponse<Court>> {\n    return this.getAll(filters);\n  }\n");
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
    console.log("".concat(colors.blue, "Fixing Common Property Errors").concat(colors.reset, "\n"));
    var fixedCount = 0;
    var failedCount = 0;
    for (var _i = 0, fixes_1 = fixes; _i < fixes_1.length; _i++) {
        var fix = fixes_1[_i];
        process.stdout.write("".concat(colors.cyan).concat(fix.description, "...").concat(colors.reset, " "));
        try {
            var result = fix.apply();
            if (result) {
                console.log("".concat(colors.green, "\u2713 Fixed").concat(colors.reset));
                fixedCount++;
            }
            else {
                console.log("".concat(colors.yellow, "\u26A0 Already fixed or not needed").concat(colors.reset));
            }
        }
        catch (error) {
            console.log("".concat(colors.red, "\u2717 Error: ").concat(error.message).concat(colors.reset));
            failedCount++;
        }
    }
    console.log("\n".concat(colors.green, "Summary:").concat(colors.reset));
    console.log("  Fixed: ".concat(colors.green).concat(fixedCount).concat(colors.reset));
    console.log("  Failed: ".concat(colors.red).concat(failedCount).concat(colors.reset));
    console.log("  Skipped: ".concat(colors.yellow).concat(fixes.length - fixedCount - failedCount).concat(colors.reset));
    console.log("\n".concat(colors.cyan, "Next steps:").concat(colors.reset));
    console.log("1. Run ".concat(colors.yellow, "npm run typecheck").concat(colors.reset, " to see remaining errors"));
    console.log("2. Update type imports in affected files");
    console.log("3. Run the property errors analysis script for detailed report");
}
// Run the script
main();
