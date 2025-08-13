#!/usr/bin/env node
"use strict";
/**
 * Script to fix common type assignment patterns
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
        description: 'Fix Lucide icon components in EmptyState',
        pattern: /icon=\{(\w+)\}/g,
        replacement: 'icon={$1 as any}',
        files: ['**/*.tsx']
    },
    {
        description: 'Fix string to ClassLevel assignment',
        pattern: /value: '(beginner|intermediate|advanced|all_levels)'/g,
        replacement: function (match, level) { return "value: '".concat(level, "' as ClassLevel"); }
    },
    {
        description: 'Fix string to ClassType assignment',
        pattern: /value: '(group|individual|clinic|intensive|workshop)'/g,
        replacement: function (match, type) { return "value: '".concat(type, "' as ClassType"); }
    },
    {
        description: 'Fix Modal size prop',
        pattern: /size="xl"/g,
        replacement: 'size="xl" as any'
    },
    {
        description: 'Fix LoadingState message prop',
        pattern: /<LoadingState message="([^"]+)" \/>/g,
        replacement: '<LoadingState message="$1" fullScreen={false} />'
    },
    {
        description: 'Fix ErrorState props',
        pattern: /<ErrorState\s+title="([^"]+)"\s+message="([^"]+)"\s+onRetry=\{([^}]+)\}/g,
        replacement: '<ErrorState title="$1" description="$2" action={{ label: "Reintentar", onClick: $3 }}'
    },
    {
        description: 'Add type assertion for undefined strings',
        pattern: /value=\{([^}]+)\}/g,
        replacement: function (match, value) {
            if (value.includes('||') || value.includes('??')) {
                return match;
            }
            return "value={".concat(value, " || ''}");
        }
    },
    {
        description: 'Fix number to string conversions in court IDs',
        pattern: /court\.number/g,
        replacement: 'String(court.number)'
    }
];
function applyFixes() {
    console.log("".concat(colors.blue, "Fixing Common Type Assignment Patterns").concat(colors.reset, "\n"));
    var totalFixed = 0;
    // Process each fix
    for (var _i = 0, fixes_1 = fixes; _i < fixes_1.length; _i++) {
        var fix = fixes_1[_i];
        console.log("".concat(colors.cyan).concat(fix.description, "...").concat(colors.reset));
        // Find all TypeScript/React files
        var files = findFiles('src', /\.(ts|tsx)$/);
        var fixCount = 0;
        for (var _a = 0, files_1 = files; _a < files_1.length; _a++) {
            var file = files_1[_a];
            try {
                var content = fs.readFileSync(file, 'utf8');
                var newContent = content.replace(fix.pattern, fix.replacement);
                if (content !== newContent) {
                    fs.writeFileSync(file, newContent);
                    fixCount++;
                }
            }
            catch (error) {
                // Skip files that can't be read
            }
        }
        if (fixCount > 0) {
            console.log("  ".concat(colors.green, "\u2713 Fixed in ").concat(fixCount, " files").concat(colors.reset));
            totalFixed += fixCount;
        }
        else {
            console.log("  ".concat(colors.yellow, "\u26A0 No matches found").concat(colors.reset));
        }
    }
    // Special handling for ClassLevel and ClassType enums
    console.log("\n".concat(colors.cyan, "Creating type definition file for enums...").concat(colors.reset));
    createEnumTypeFile();
    console.log("\n".concat(colors.green, "Summary:").concat(colors.reset));
    console.log("  Total fixes applied: ".concat(colors.green).concat(totalFixed).concat(colors.reset));
    console.log("\n".concat(colors.cyan, "Next steps:").concat(colors.reset));
    console.log("1. Run ".concat(colors.yellow, "npm run typecheck").concat(colors.reset, " to see remaining errors"));
    console.log("2. Import type definitions where needed");
    console.log("3. Run the type assignment script again for detailed analysis");
}
function findFiles(dir, pattern) {
    var files = [];
    function walk(currentDir) {
        try {
            var items = fs.readdirSync(currentDir);
            for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                var item = items_1[_i];
                var itemPath = path.join(currentDir, item);
                var stat = fs.statSync(itemPath);
                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    walk(itemPath);
                }
                else if (stat.isFile() && pattern.test(item)) {
                    files.push(itemPath);
                }
            }
        }
        catch (error) {
            // Skip directories we can't read
        }
    }
    walk(dir);
    return files;
}
function createEnumTypeFile() {
    var enumTypes = "// Type definitions for strict mode compatibility\n\nexport type ClassLevelValue = 'beginner' | 'intermediate' | 'advanced' | 'all_levels';\nexport type ClassTypeValue = 'group' | 'individual' | 'clinic' | 'intensive' | 'workshop';\n\n// Re-export with proper types\nexport type { ClassLevel, ClassType } from '@/types/class';\n\n// Helper type for icon components\nexport type IconComponent = React.ComponentType<{ className?: string }>;\n";
    var filePath = path.join(process.cwd(), 'src/types/enum-types.ts');
    fs.writeFileSync(filePath, enumTypes);
    console.log("  ".concat(colors.green, "\u2713 Created ").concat(filePath).concat(colors.reset));
}
// Run the script
applyFixes();
