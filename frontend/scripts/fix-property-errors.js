#!/usr/bin/env node
"use strict";
/**
 * Script to help fix TS2339 errors (property does not exist)
 * This script analyzes the errors and provides suggestions for fixes
 */
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var child_process_1 = require("child_process");
var colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};
function getPropertyErrors() {
    var _a;
    try {
        (0, child_process_1.execSync)('npx tsc --noEmit --project tsconfig.strict.json 2>&1', {
            encoding: 'utf8',
            cwd: process.cwd()
        });
        return [];
    }
    catch (error) {
        var output = error.stdout || ((_a = error.output) === null || _a === void 0 ? void 0 : _a[1]) || '';
        var lines = output.split('\n');
        var propertyErrors_1 = [];
        lines.forEach(function (line) {
            // Match TS2339: Property 'X' does not exist on type 'Y'
            var match = line.match(/(.+?)\((\d+),(\d+)\): error TS2339: Property '(.+?)' does not exist on type '(.+?)'\./);
            if (match && match[1] && match[2] && match[3] && match[4] && match[5]) {
                propertyErrors_1.push({
                    file: match[1],
                    line: parseInt(match[2]),
                    column: parseInt(match[3]),
                    property: match[4],
                    type: match[5],
                    message: line
                });
            }
        });
        return propertyErrors_1;
    }
}
function getLineContext(file, lineNumber) {
    var _a;
    try {
        var content = fs.readFileSync(file, 'utf8');
        var lines = content.split('\n');
        var lineIndex = lineNumber - 1;
        if (lineIndex >= 0 && lineIndex < lines.length) {
            return ((_a = lines[lineIndex]) === null || _a === void 0 ? void 0 : _a.trim()) || '';
        }
    }
    catch (error) {
        // Ignore
    }
    return '';
}
function analyzeError(error) {
    var _a, _b, _c;
    error.context = getLineContext(error.file, error.line);
    // Categorize common patterns
    if (error.type.includes('Window & typeof globalThis')) {
        return {
            category: 'Window/Global',
            suggestion: "Add type declaration: declare global { interface Window { ".concat(error.property, ": any; } }")
        };
    }
    if (error.type.includes('HTMLElement')) {
        return {
            category: 'DOM Element',
            suggestion: "Use type assertion: (element as HTMLInputElement).".concat(error.property)
        };
    }
    if (error.type.includes('{}') || error.type === 'object') {
        return {
            category: 'Missing Type',
            suggestion: 'Define proper interface or type for this object'
        };
    }
    if (error.type.includes('any[]')) {
        return {
            category: 'Array Type',
            suggestion: 'Define proper type for array elements'
        };
    }
    if (((_a = error.context) === null || _a === void 0 ? void 0 : _a.includes('response')) || ((_b = error.context) === null || _b === void 0 ? void 0 : _b.includes('error'))) {
        return {
            category: 'API Response',
            suggestion: 'Define API response/error interfaces'
        };
    }
    if ((_c = error.context) === null || _c === void 0 ? void 0 : _c.includes('club_memberships')) {
        return {
            category: 'User Type',
            suggestion: 'Update User interface to include club_memberships property'
        };
    }
    return {
        category: 'Other',
        suggestion: 'Check type definition and add missing property'
    };
}
function groupErrorsByCategory(errors) {
    var groups = new Map();
    errors.forEach(function (error) {
        var category = analyzeError(error).category;
        if (!groups.has(category)) {
            groups.set(category, []);
        }
        groups.get(category).push(error);
    });
    return groups;
}
function main() {
    console.log("".concat(colors.blue, "TypeScript Strict Mode - Analyzing Property Errors (TS2339)").concat(colors.reset, "\n"));
    var propertyErrors = getPropertyErrors();
    console.log("Found ".concat(colors.yellow).concat(propertyErrors.length).concat(colors.reset, " property errors\n"));
    if (propertyErrors.length === 0) {
        console.log("".concat(colors.green, "\u2705 No property errors found!").concat(colors.reset));
        return;
    }
    // Group errors by category
    var errorGroups = groupErrorsByCategory(propertyErrors);
    // Display summary
    console.log("".concat(colors.cyan, "Error Summary by Category:").concat(colors.reset));
    for (var _i = 0, _a = Array.from(errorGroups.entries()); _i < _a.length; _i++) {
        var _b = _a[_i], category = _b[0], errors = _b[1];
        console.log("  ".concat(colors.magenta).concat(category).concat(colors.reset, ": ").concat(errors.length, " errors"));
    }
    console.log();
    // Show detailed analysis for each category
    for (var _c = 0, _d = Array.from(errorGroups.entries()); _c < _d.length; _c++) {
        var _e = _d[_c], category = _e[0], errors = _e[1];
        console.log("\n".concat(colors.cyan, "=== ").concat(category, " ===").concat(colors.reset));
        // Show first few examples
        var examples = errors.slice(0, 3);
        examples.forEach(function (error) {
            var suggestion = analyzeError(error).suggestion;
            var relPath = path.relative(process.cwd(), error.file);
            console.log("\n".concat(colors.blue).concat(relPath, ":").concat(error.line).concat(colors.reset));
            console.log("  Property: ".concat(colors.yellow).concat(error.property).concat(colors.reset, " on type ").concat(colors.yellow).concat(error.type).concat(colors.reset));
            if (error.context) {
                console.log("  Context: ".concat(colors.gray).concat(error.context).concat(colors.reset));
            }
            console.log("  ".concat(colors.green, "Suggestion: ").concat(suggestion).concat(colors.reset));
        });
        if (errors.length > 3) {
            console.log("  ".concat(colors.gray, "... and ").concat(errors.length - 3, " more").concat(colors.reset));
        }
    }
    // Generate fix recommendations
    console.log("\n".concat(colors.cyan, "Recommended Fixes:").concat(colors.reset, "\n"));
    if (errorGroups.has('User Type')) {
        console.log("1. ".concat(colors.yellow, "Update User interface:").concat(colors.reset));
        console.log("   Add missing properties like club_memberships to the User type");
    }
    if (errorGroups.has('API Response')) {
        console.log("2. ".concat(colors.yellow, "Define API interfaces:").concat(colors.reset));
        console.log("   Create proper TypeScript interfaces for all API responses");
    }
    if (errorGroups.has('Missing Type')) {
        console.log("3. ".concat(colors.yellow, "Replace 'any' and '{}' types:").concat(colors.reset));
        console.log("   Define specific interfaces for objects instead of using generic types");
    }
    if (errorGroups.has('DOM Element')) {
        console.log("4. ".concat(colors.yellow, "Use proper DOM type assertions:").concat(colors.reset));
        console.log("   Cast HTML elements to specific types (HTMLInputElement, etc.)");
    }
    // Show most common missing properties
    var propertyCount = new Map();
    propertyErrors.forEach(function (error) {
        var key = "".concat(error.property, " (on ").concat(error.type, ")");
        propertyCount.set(key, (propertyCount.get(key) || 0) + 1);
    });
    var sortedProperties = Array.from(propertyCount.entries())
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, 10);
    console.log("\n".concat(colors.cyan, "Most Common Missing Properties:").concat(colors.reset));
    sortedProperties.forEach(function (_a) {
        var prop = _a[0], count = _a[1];
        console.log("  ".concat(colors.yellow).concat(prop).concat(colors.reset, ": ").concat(count, " occurrences"));
    });
}
// Run the script
main();
