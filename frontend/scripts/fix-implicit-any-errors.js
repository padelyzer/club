#!/usr/bin/env node
"use strict";
/**
 * Script to fix TS7006 errors (parameter implicitly has 'any' type)
 * This script analyzes and fixes parameters without explicit types
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
function getImplicitAnyErrors() {
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
        var errors_1 = [];
        lines.forEach(function (line) {
            // Match TS7006: Parameter 'X' implicitly has an 'any' type
            var match = line.match(/(.+?)\((\d+),(\d+)\): error TS7006: Parameter '(.+?)' implicitly has an 'any' type\./);
            if (match && match[1] && match[2] && match[3] && match[4]) {
                errors_1.push({
                    file: match[1],
                    line: parseInt(match[2]),
                    column: parseInt(match[3]),
                    parameter: match[4],
                    message: line
                });
            }
        });
        return errors_1;
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
function inferParameterType(paramName, context) {
    // Common parameter patterns
    var patterns = {
        // Event handlers
        'e': 'React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>',
        'event': 'React.MouseEvent | React.KeyboardEvent | React.ChangeEvent<HTMLInputElement>',
        'onClick': '() => void',
        'onChange': '(value: any) => void',
        'onClose': '() => void',
        'onSubmit': '(data: any) => void',
        'onSuccess': '() => void',
        'onError': '(error: any) => void',
        // Common parameters
        'id': 'string',
        'name': 'string',
        'value': 'string | number',
        'data': 'any',
        'error': 'any',
        'response': 'any',
        'request': 'any',
        'result': 'any',
        'item': 'any',
        'items': 'any[]',
        'index': 'number',
        'count': 'number',
        'page': 'number',
        'size': 'number',
        'loading': 'boolean',
        'disabled': 'boolean',
        'visible': 'boolean',
        'open': 'boolean',
        'children': 'React.ReactNode',
        'className': 'string',
        'style': 'React.CSSProperties',
        // API related
        'club': 'string | Club',
        'user': 'User',
        'reservation': 'Reservation',
        'court': 'Court',
        'client': 'Client',
        'tournament': 'Tournament',
        'match': 'Match',
    };
    // Check context for clues
    if (context.includes('.map(') || context.includes('.forEach(') || context.includes('.filter(')) {
        return 'any';
    }
    if (context.includes('async') && context.includes('=>')) {
        return 'any';
    }
    // Return pattern match or default to any
    return patterns[paramName] || 'any';
}
function fixImplicitAnyError(error) {
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
    var inferredType = inferParameterType(error.parameter, error.context);
    // Different patterns for fixing
    var updatedLine = line;
    // Arrow function pattern: (param) => 
    var arrowPattern = new RegExp("\\((".concat(error.parameter, ")\\)\\s*=>"));
    if (arrowPattern.test(line)) {
        updatedLine = line.replace(arrowPattern, "(".concat(error.parameter, ": ").concat(inferredType, ") =>"));
    }
    // Multiple params pattern: (param1, param2)
    var multiParamPattern = new RegExp("([,(]\\s*)(".concat(error.parameter, ")(\\s*[,)])"));
    if (multiParamPattern.test(line)) {
        updatedLine = line.replace(multiParamPattern, "$1".concat(error.parameter, ": ").concat(inferredType, "$3"));
    }
    // Function declaration: function name(param)
    var functionPattern = new RegExp("function\\s+\\w+\\s*\\(([^)]*\\b".concat(error.parameter, "\\b[^)]*)\\)"));
    if (functionPattern.test(line)) {
        updatedLine = line.replace(new RegExp("\\b".concat(error.parameter, "\\b")), "".concat(error.parameter, ": ").concat(inferredType));
    }
    if (updatedLine !== line) {
        lines[lineIndex] = updatedLine;
        fs.writeFileSync(filePath, lines.join('\n'));
        return true;
    }
    return false;
}
function main() {
    console.log("".concat(colors.blue, "TypeScript Strict Mode - Fixing Implicit Any Errors").concat(colors.reset, "\n"));
    var errors = getImplicitAnyErrors();
    console.log("Found ".concat(colors.yellow).concat(errors.length).concat(colors.reset, " implicit any errors\n"));
    if (errors.length === 0) {
        console.log("".concat(colors.green, "\u2705 No implicit any errors found!").concat(colors.reset));
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
    // Process files
    var fixedCount = 0;
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
            error.context = getLineContext(error.file, error.line);
            var inferredType = inferParameterType(error.parameter, error.context || '');
            console.log("  Line ".concat(error.line, ": ").concat(colors.yellow).concat(error.parameter).concat(colors.reset, " \u2192 ").concat(colors.green).concat(inferredType).concat(colors.reset));
            if (fixImplicitAnyError(error)) {
                fixedCount++;
            }
        });
        filesProcessed++;
    }
    console.log("\n".concat(colors.green, "Fixed ").concat(fixedCount, " implicit any errors").concat(colors.reset));
    console.log("".concat(colors.yellow).concat(errors.length - fixedCount, " remaining").concat(colors.reset));
    // Show summary of parameter types used
    var typeUsage = new Map();
    errors.forEach(function (error) {
        error.context = getLineContext(error.file, error.line);
        var type = inferParameterType(error.parameter, error.context || '');
        typeUsage.set(type, (typeUsage.get(type) || 0) + 1);
    });
    console.log("\n".concat(colors.cyan, "Type inference summary:").concat(colors.reset));
    Array.from(typeUsage.entries())
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, 5)
        .forEach(function (_a) {
        var type = _a[0], count = _a[1];
        console.log("  ".concat(colors.yellow).concat(type).concat(colors.reset, ": ").concat(count, " occurrences"));
    });
    console.log("\n".concat(colors.green, "Done! Run the script again to process more files.").concat(colors.reset));
}
// Run the script
main();
