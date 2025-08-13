#!/usr/bin/env node
"use strict";
/**
 * Script to fix TS6133 errors (unused variables)
 * Adds underscore prefix to unused parameters and removes unused imports
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
};
function getUnusedVariables() {
    var _a;
    try {
        var output = (0, child_process_1.execSync)('npx tsc --noEmit --project tsconfig.strict.json 2>&1', {
            encoding: 'utf8',
            cwd: process.cwd()
        });
        return [];
    }
    catch (error) {
        var output = error.stdout || ((_a = error.output) === null || _a === void 0 ? void 0 : _a[1]) || '';
        var lines = output.split('\n');
        var unusedVars_1 = [];
        lines.forEach(function (line) {
            var match = line.match(/(.+?)\((\d+),(\d+)\): error TS6133: '(.+?)' is declared but its value is never read\./);
            if (match && match[1] && match[2] && match[3] && match[4]) {
                unusedVars_1.push({
                    file: match[1],
                    line: parseInt(match[2]),
                    column: parseInt(match[3]),
                    variable: match[4],
                    message: line
                });
            }
        });
        return unusedVars_1;
    }
}
function fixUnusedVariable(unusedVar) {
    var filePath = path.resolve(unusedVar.file);
    if (!fs.existsSync(filePath)) {
        console.log("".concat(colors.red, "File not found: ").concat(filePath).concat(colors.reset));
        return false;
    }
    var content = fs.readFileSync(filePath, 'utf8');
    var lines = content.split('\n');
    var lineIndex = unusedVar.line - 1;
    if (lineIndex >= lines.length) {
        console.log("".concat(colors.red, "Line ").concat(unusedVar.line, " not found in ").concat(filePath).concat(colors.reset));
        return false;
    }
    var line = lines[lineIndex];
    if (!line) {
        console.log("".concat(colors.red, "Line content not found").concat(colors.reset));
        return false;
    }
    // Check if it's an import statement
    if (line.includes('import')) {
        // Handle different import patterns
        if (line.includes("{ ".concat(unusedVar.variable))) {
            // Named import - remove just this import
            var importRegex = new RegExp("\\b".concat(unusedVar.variable, "\\s*,?\\s*"), 'g');
            lines[lineIndex] = line.replace(importRegex, '').replace(/,\s*,/g, ',').replace(/{\s*,/g, '{').replace(/,\s*}/g, '}');
            // If the import is now empty, remove the entire line
            if (lines[lineIndex].match(/import\s*{\s*}\s*from/)) {
                lines.splice(lineIndex, 1);
            }
        }
        else if (line.includes("import ".concat(unusedVar.variable))) {
            // Default import - remove entire line
            lines.splice(lineIndex, 1);
        }
    }
    else {
        // It's a parameter or variable declaration
        // For parameters, prefix with underscore
        if (line.includes('(') && line.includes(')')) {
            // Function parameter
            var paramRegex = new RegExp("\\b".concat(unusedVar.variable, "\\b"), 'g');
            lines[lineIndex] = line.replace(paramRegex, "_".concat(unusedVar.variable));
        }
        else {
            // Variable declaration - comment it out or remove
            var varRegex = new RegExp("(const|let|var)\\s+".concat(unusedVar.variable, "\\b"));
            if (varRegex.test(line)) {
                // Comment out the line
                lines[lineIndex] = "// ".concat(line, " // Unused - removed by strict mode migration");
            }
        }
    }
    // Write the file back
    fs.writeFileSync(filePath, lines.join('\n'));
    return true;
}
function main() {
    console.log("".concat(colors.blue, "TypeScript Strict Mode - Fixing Unused Variables").concat(colors.reset, "\n"));
    var unusedVars = getUnusedVariables();
    console.log("Found ".concat(colors.yellow).concat(unusedVars.length).concat(colors.reset, " unused variables\n"));
    if (unusedVars.length === 0) {
        console.log("".concat(colors.green, "\u2705 No unused variables found!").concat(colors.reset));
        return;
    }
    // Group by file
    var fileGroups = new Map();
    unusedVars.forEach(function (uv) {
        if (!fileGroups.has(uv.file)) {
            fileGroups.set(uv.file, []);
        }
        fileGroups.get(uv.file).push(uv);
    });
    // Process files
    var fixedCount = 0;
    var maxFilesToProcess = 10; // Process in batches
    var filesProcessed = 0;
    for (var _i = 0, _a = Array.from(fileGroups.entries()); _i < _a.length; _i++) {
        var _b = _a[_i], file = _b[0], vars = _b[1];
        if (filesProcessed >= maxFilesToProcess) {
            console.log("\n".concat(colors.yellow, "Processed ").concat(maxFilesToProcess, " files. Run again to continue.").concat(colors.reset));
            break;
        }
        console.log("\n".concat(colors.blue, "Processing ").concat(path.relative(process.cwd(), file)).concat(colors.reset));
        // Sort by line number in reverse to avoid line number shifts
        vars.sort(function (a, b) { return b.line - a.line; });
        vars.forEach(function (uv) {
            console.log("  Line ".concat(uv.line, ": ").concat(colors.yellow).concat(uv.variable).concat(colors.reset));
            if (fixUnusedVariable(uv)) {
                fixedCount++;
            }
        });
        filesProcessed++;
    }
    console.log("\n".concat(colors.green, "Fixed ").concat(fixedCount, " unused variables").concat(colors.reset));
    console.log("".concat(colors.yellow).concat(unusedVars.length - fixedCount, " remaining").concat(colors.reset));
    // Run ESLint to clean up
    console.log("\n".concat(colors.blue, "Running ESLint to clean up...").concat(colors.reset));
    try {
        (0, child_process_1.execSync)('npx eslint --fix --ext .ts,.tsx src/ 2>/dev/null', { stdio: 'inherit' });
    }
    catch (_c) {
        // ESLint might have some errors, but that's ok
    }
    console.log("\n".concat(colors.green, "Done! Run the script again to process more files.").concat(colors.reset));
}
// Run the script
main();
