#!/usr/bin/env node
"use strict";
/**
 * Script to fix TS2322 errors (type assignment errors)
 * This script analyzes type mismatches and provides fixes
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
};
function getTypeAssignmentErrors() {
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
        var errors = [];
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            // Match TS2322: Type 'X' is not assignable to type 'Y'
            var match = line.match(/(.+?)\((\d+),(\d+)\): error TS2322: Type '(.+?)' is not assignable to type '(.+?)'\./);
            if (match && match[1] && match[2] && match[3]) {
                var error_1 = {
                    file: match[1],
                    line: parseInt(match[2]),
                    column: parseInt(match[3]),
                    message: line,
                    actualType: match[4],
                    expectedType: match[5]
                };
                // Try to get more context from following lines
                if (i + 1 < lines.length && lines[i + 1].includes('Type')) {
                    error_1.message += '\n' + lines[i + 1];
                }
                errors.push(error_1);
            }
        }
        return errors;
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
function analyzeTypeError(error) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    error.context = getLineContext(error.file, error.line);
    // Common patterns
    if (((_a = error.actualType) === null || _a === void 0 ? void 0 : _a.includes('undefined')) && !((_b = error.expectedType) === null || _b === void 0 ? void 0 : _b.includes('undefined'))) {
        return {
            suggestion: 'Add undefined check or use optional chaining',
            autoFix: false
        };
    }
    if (error.actualType === 'any' && error.expectedType !== 'any') {
        return {
            suggestion: "Cast to ".concat(error.expectedType, " or define proper type"),
            autoFix: true
        };
    }
    if (((_c = error.actualType) === null || _c === void 0 ? void 0 : _c.includes('string')) && ((_d = error.expectedType) === null || _d === void 0 ? void 0 : _d.includes('number'))) {
        return {
            suggestion: 'Use parseInt() or Number() to convert',
            autoFix: true
        };
    }
    if (((_e = error.actualType) === null || _e === void 0 ? void 0 : _e.includes('number')) && ((_f = error.expectedType) === null || _f === void 0 ? void 0 : _f.includes('string'))) {
        return {
            suggestion: 'Use toString() or String() to convert',
            autoFix: true
        };
    }
    if (error.message.includes('missing the following properties')) {
        return {
            suggestion: 'Add missing properties or use partial type',
            autoFix: false
        };
    }
    if (((_g = error.actualType) === null || _g === void 0 ? void 0 : _g.includes('null')) && !((_h = error.expectedType) === null || _h === void 0 ? void 0 : _h.includes('null'))) {
        return {
            suggestion: 'Add null check or use nullish coalescing',
            autoFix: true
        };
    }
    return {
        suggestion: 'Review type definitions and add proper type assertions',
        autoFix: false
    };
}
function fixTypeAssignmentError(error) {
    var _a, _b, _c, _d, _e, _f;
    var filePath = path.resolve(error.file);
    if (!fs.existsSync(filePath)) {
        console.log("".concat(colors.red, "File not found: ").concat(filePath).concat(colors.reset));
        return false;
    }
    var content = fs.readFileSync(filePath, 'utf8');
    var lines = content.split('\n');
    var lineIndex = error.line - 1;
    if (lineIndex >= lines.length) {
        return false;
    }
    var line = lines[lineIndex];
    if (!line)
        return false;
    error.context = line.trim();
    var autoFix = analyzeTypeError(error).autoFix;
    if (!autoFix) {
        return false;
    }
    var updatedLine = line;
    // Auto-fix patterns
    if (error.actualType === 'any' && error.expectedType) {
        // Add type assertion for any types
        updatedLine = line.replace(/(\w+)(\s*[,;)\]}])/g, function (match, varName, suffix) {
            if (line.includes(varName) && !line.includes("as ".concat(error.expectedType))) {
                return "".concat(varName, " as ").concat(error.expectedType).concat(suffix);
            }
            return match;
        });
    }
    // String to number conversion
    if (((_a = error.actualType) === null || _a === void 0 ? void 0 : _a.includes('string')) && ((_b = error.expectedType) === null || _b === void 0 ? void 0 : _b.includes('number'))) {
        // Look for assignment patterns
        updatedLine = line.replace(/=\s*([^;,\n]+)/g, function (match, value) {
            if (!value.includes('parseInt') && !value.includes('Number(')) {
                return "= Number(".concat(value.trim(), ")");
            }
            return match;
        });
    }
    // Number to string conversion
    if (((_c = error.actualType) === null || _c === void 0 ? void 0 : _c.includes('number')) && ((_d = error.expectedType) === null || _d === void 0 ? void 0 : _d.includes('string'))) {
        updatedLine = line.replace(/=\s*([^;,\n]+)/g, function (match, value) {
            if (!value.includes('toString') && !value.includes('String(')) {
                return "= String(".concat(value.trim(), ")");
            }
            return match;
        });
    }
    // Null checks
    if (((_e = error.actualType) === null || _e === void 0 ? void 0 : _e.includes('null')) && !((_f = error.expectedType) === null || _f === void 0 ? void 0 : _f.includes('null'))) {
        updatedLine = line.replace(/=\s*([^;,\n]+)/g, function (match, value) {
            if (!value.includes('??') && !value.includes('||')) {
                return "= ".concat(value.trim(), " ?? ''");
            }
            return match;
        });
    }
    if (updatedLine !== line) {
        lines[lineIndex] = updatedLine;
        fs.writeFileSync(filePath, lines.join('\n'));
        return true;
    }
    return false;
}
function main() {
    console.log("".concat(colors.blue, "TypeScript Strict Mode - Fixing Type Assignment Errors").concat(colors.reset, "\n"));
    var errors = getTypeAssignmentErrors();
    console.log("Found ".concat(colors.yellow).concat(errors.length).concat(colors.reset, " type assignment errors\n"));
    if (errors.length === 0) {
        console.log("".concat(colors.green, "\u2705 No type assignment errors found!").concat(colors.reset));
        return;
    }
    // Group by file
    var fileGroups = new Map();
    errors.forEach(function (error) {
        if (!fileGroups.has(error.file)) {
            fileGroups.set(error.file, []);
        }
        fileGroups.get(error.file).push(error);
    });
    // Analyze error patterns
    var typePatterns = new Map();
    errors.forEach(function (error) {
        var pattern = "".concat(error.actualType, " \u2192 ").concat(error.expectedType);
        typePatterns.set(pattern, (typePatterns.get(pattern) || 0) + 1);
    });
    console.log("".concat(colors.cyan, "Most common type mismatches:").concat(colors.reset));
    Array.from(typePatterns.entries())
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, 10)
        .forEach(function (_a) {
        var pattern = _a[0], count = _a[1];
        console.log("  ".concat(colors.yellow).concat(pattern).concat(colors.reset, ": ").concat(count, " occurrences"));
    });
    console.log();
    // Process files
    var fixedCount = 0;
    var manualCount = 0;
    var maxFilesToProcess = 10;
    var filesProcessed = 0;
    for (var _i = 0, _a = Array.from(fileGroups.entries()); _i < _a.length; _i++) {
        var _b = _a[_i], file = _b[0], fileErrors = _b[1];
        if (filesProcessed >= maxFilesToProcess) {
            console.log("\n".concat(colors.yellow, "Processed ").concat(maxFilesToProcess, " files. Run again to continue.").concat(colors.reset));
            break;
        }
        console.log("\n".concat(colors.blue, "Processing ").concat(path.relative(process.cwd(), file)).concat(colors.reset));
        // Sort by line number in reverse
        fileErrors.sort(function (a, b) { return b.line - a.line; });
        fileErrors.forEach(function (error) {
            var _a = analyzeTypeError(error), suggestion = _a.suggestion, autoFix = _a.autoFix;
            var typeInfo = error.actualType && error.expectedType
                ? "".concat(colors.red).concat(error.actualType).concat(colors.reset, " \u2192 ").concat(colors.green).concat(error.expectedType).concat(colors.reset)
                : 'Type mismatch';
            console.log("  Line ".concat(error.line, ": ").concat(typeInfo));
            console.log("    ".concat(colors.cyan, "Suggestion: ").concat(suggestion).concat(colors.reset));
            if (autoFix && fixTypeAssignmentError(error)) {
                console.log("    ".concat(colors.green, "\u2713 Auto-fixed").concat(colors.reset));
                fixedCount++;
            }
            else {
                console.log("    ".concat(colors.yellow, "\u26A0 Manual fix required").concat(colors.reset));
                manualCount++;
            }
        });
        filesProcessed++;
    }
    console.log("\n".concat(colors.green, "Summary:").concat(colors.reset));
    console.log("  Auto-fixed: ".concat(colors.green).concat(fixedCount).concat(colors.reset));
    console.log("  Manual fixes needed: ".concat(colors.yellow).concat(manualCount).concat(colors.reset));
    console.log("  Remaining: ".concat(colors.yellow).concat(errors.length - fixedCount).concat(colors.reset));
    console.log("\n".concat(colors.green, "Done! Run the script again to process more files.").concat(colors.reset));
}
// Run the script
main();
