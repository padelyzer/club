#!/usr/bin/env node
"use strict";
/**
 * Script to fix specific common property errors
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
        description: 'Add status to TournamentMatch type',
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/tournament.ts');
            if (fs.existsSync(filePath)) {
                var content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('interface TournamentMatch') && !content.includes('status:')) {
                    var updatedContent = content.replace(/export interface TournamentMatch {([^}]+)}/, function (match, fields) {
                        if (!fields.includes('status:')) {
                            var newFields = fields + '  status: \'scheduled\' | \'in_progress\' | \'completed\' | \'cancelled\';\n';
                            return "export interface TournamentMatch {".concat(newFields, "}");
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
        description: 'Add level to ClassSession type',
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/class.ts');
            if (fs.existsSync(filePath)) {
                var content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('interface ClassSession') && !content.includes('level:')) {
                    var updatedContent = content.replace(/export interface ClassSession {([^}]+)}/, function (match, fields) {
                        if (!fields.includes('level:')) {
                            var newFields = fields + '  level?: string;\n';
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
        description: 'Add firstName/lastName to Instructor type',
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/instructor.ts');
            if (fs.existsSync(filePath)) {
                var content = fs.readFileSync(filePath, 'utf8');
                var modified = false;
                var updatedContent = content;
                if (!content.includes('firstName:')) {
                    updatedContent = updatedContent.replace(/export interface Instructor {([^}]+)}/, function (match, fields) {
                        return "export interface Instructor {".concat(fields, "  firstName: string;\n}");
                    });
                    modified = true;
                }
                if (!updatedContent.includes('lastName:')) {
                    updatedContent = updatedContent.replace(/export interface Instructor {([^}]+)}/, function (match, fields) {
                        return "export interface Instructor {".concat(fields, "  lastName: string;\n}");
                    });
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
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/reservation.ts');
            if (!fs.existsSync(filePath)) {
                // Create the file if it doesn't exist
                var reservationTypes = "// Reservation Types\n\nexport interface Reservation {\n  id: string;\n  club: string;\n  club_name?: string;\n  court: string;\n  court_name?: string;\n  organization: string;\n  created_by: string;\n  created_by_name?: string;\n  date: string;\n  start_time: string;\n  end_time: string;\n  duration_hours: number;\n  player_name: string;\n  player_email: string;\n  player_phone?: string;\n  player_count: number;\n  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';\n  payment_status: 'pending' | 'paid' | 'refunded';\n  price_per_hour: number;\n  total_price: number;\n  notes?: string;\n  cancelled_at?: string;\n  cancelled_by?: string;\n  cancellation_reason?: string;\n  client?: string | { id: string; name: string; email: string; };\n  can_cancel: boolean;\n  is_past: boolean;\n  is_today: boolean;\n  created_at: string;\n  updated_at: string;\n}\n\nexport interface ReservationFilters {\n  club?: string;\n  court?: string;\n  date?: string;\n  date_from?: string;\n  date_to?: string;\n  status?: string;\n  payment_status?: string;\n  search?: string;\n  page?: number;\n  page_size?: number;\n  ordering?: string;\n}\n";
                fs.writeFileSync(filePath, reservationTypes);
                return true;
            }
            else {
                var content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('client:')) {
                    var updatedContent = content.replace(/export interface Reservation {([^}]+)}/, function (match, fields) {
                        var newFields = fields + '  client?: string | { id: string; name: string; email: string; };\n';
                        return "export interface Reservation {".concat(newFields, "}");
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
        description: 'Add role to User type',
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/user.ts');
            if (fs.existsSync(filePath)) {
                var content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('role:')) {
                    var updatedContent = content.replace(/export interface User {([^}]+)}/, function (match, fields) {
                        var newFields = fields + '  role?: \'ROOT\' | \'ADMIN\' | \'STAFF\' | \'CLIENT\';\n';
                        return "export interface User {".concat(newFields, "}");
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
        description: 'Add name to ClassSession type',
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/types/class.ts');
            if (fs.existsSync(filePath)) {
                var content = fs.readFileSync(filePath, 'utf8');
                if (content.includes('interface ClassSession') && !content.includes('  name:')) {
                    var updatedContent = content.replace(/export interface ClassSession {([^}]+)}/, function (match, fields) {
                        if (!fields.includes('  name:')) {
                            var newFields = fields + '  name?: string;\n';
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
        description: 'Add loading method to toast',
        apply: function () {
            var filePath = path.join(process.cwd(), 'src/lib/toast.ts');
            if (fs.existsSync(filePath)) {
                var content = fs.readFileSync(filePath, 'utf8');
                if (!content.includes('loading:')) {
                    // Add loading method to the toast export
                    var updatedContent = content.replace(/export default {([^}]+)}/, function (match, methods) {
                        if (!methods.includes('loading:')) {
                            var newMethods = methods.trim();
                            var loadingMethod = "\n  loading: (message: string) => {\n    if (typeof window !== 'undefined' && window.Toastify) {\n      window.Toastify({\n        text: message,\n        duration: -1, // Persistent until dismissed\n        gravity: \"top\",\n        position: \"right\",\n        className: \"toast-loading\",\n        style: {\n          background: \"linear-gradient(135deg, #667eea 0%, #764ba2 100%)\",\n        },\n      }).showToast();\n    } else {\n      console.log('\u23F3 ' + message);\n    }\n  },";
                            return "export default {\n".concat(newMethods).concat(newMethods.endsWith(',') ? '' : ',', "\n").concat(loadingMethod, "\n}");
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
    }
];
function main() {
    console.log("".concat(colors.blue, "Fixing Specific Property Errors").concat(colors.reset, "\n"));
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
    console.log("2. Review the changes to ensure they are correct");
    console.log("3. Update imports in affected files if needed");
}
// Run the script
main();
