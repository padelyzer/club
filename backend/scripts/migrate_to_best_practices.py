#!/usr/bin/env python
"""
Automated migration script to apply Python best practices to existing code.
This script helps migrate the codebase module by module.
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple


class BestPracticesMigrator:
    """Handles migration of code to best practices."""

    def __init__(self, module_name: str = None, dry_run: bool = True):
        self.module_name = module_name
        self.dry_run = dry_run
        self.base_dir = Path(__file__).parent.parent
        self.report = {
            "module": module_name,
            "timestamp": datetime.now().isoformat(),
            "steps": [],
        }

    def run_command(self, cmd: List[str], check: bool = True) -> Tuple[int, str, str]:
        """Run a command and return result."""
        if self.dry_run and any(x in cmd[0] for x in ["black", "isort", "autopep8"]):
            # For dry run, add appropriate flags
            if "black" in cmd[0]:
                cmd.extend(["--check", "--diff"])
            elif "isort" in cmd[0]:
                cmd.extend(["--check-only", "--diff"])

        print(f"Running: {' '.join(cmd)}")

        result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.base_dir)

        return result.returncode, result.stdout, result.stderr

    def log_step(self, step: str, status: str, details: str = ""):
        """Log a migration step."""
        self.report["steps"].append(
            {
                "step": step,
                "status": status,
                "details": details,
                "timestamp": datetime.now().isoformat(),
            }
        )

        emoji = "✅" if status == "success" else "❌" if status == "failed" else "⏭️"
        print(f"{emoji} {step}: {status}")
        if details:
            print(f"   {details}")

    def check_tools(self) -> bool:
        """Check if required tools are installed."""
        tools = ["black", "isort", "flake8", "pylint", "mypy", "pytest"]
        missing = []

        for tool in tools:
            ret, _, _ = self.run_command(["which", tool])
            if ret != 0:
                missing.append(tool)

        if missing:
            self.log_step(
                "Tool check", "failed", f"Missing tools: {', '.join(missing)}"
            )
            print("\nInstall missing tools with:")
            print("pip install black isort flake8 pylint mypy pytest pytest-django")
            return False

        self.log_step("Tool check", "success", "All tools available")
        return True

    def get_module_path(self) -> Path:
        """Get the path to the module."""
        if self.module_name:
            return self.base_dir / "apps" / self.module_name
        return self.base_dir / "apps"

    def format_with_black(self) -> bool:
        """Apply Black formatting."""
        module_path = self.get_module_path()
        ret, stdout, stderr = self.run_command(["black", str(module_path)])

        if ret == 0:
            self.log_step("Black formatting", "success", stdout)
            return True
        else:
            self.log_step("Black formatting", "failed", stderr)
            return False

    def sort_imports(self) -> bool:
        """Sort imports with isort."""
        module_path = self.get_module_path()
        ret, stdout, stderr = self.run_command(["isort", str(module_path)])

        if ret == 0:
            self.log_step("Import sorting", "success", stdout)
            return True
        else:
            self.log_step("Import sorting", "failed", stderr)
            return False

    def check_flake8(self) -> Dict[str, int]:
        """Run flake8 and return error counts."""
        module_path = self.get_module_path()
        ret, stdout, stderr = self.run_command(
            ["flake8", str(module_path), "--count", "--statistics"], check=False
        )

        # Parse error counts
        error_counts = {}
        for line in stdout.splitlines():
            if line.strip():
                parts = line.strip().split()
                if len(parts) >= 2:
                    count = parts[0]
                    code = parts[1]
                    error_counts[code] = int(count)

        total_errors = sum(error_counts.values())
        self.log_step(
            "Flake8 check",
            "success" if total_errors == 0 else "warning",
            f"{total_errors} issues found",
        )

        return error_counts

    def check_type_hints(self) -> Dict[str, int]:
        """Check type hint coverage."""
        module_path = self.get_module_path()
        stats = {"total_functions": 0, "typed_functions": 0, "files_checked": 0}

        for py_file in module_path.rglob("*.py"):
            if "migrations" in str(py_file) or "__pycache__" in str(py_file):
                continue

            stats["files_checked"] += 1

            with open(py_file, "r") as f:
                content = f.read()

            # Simple heuristic - count functions and typed functions
            import re

            # Find all function definitions
            func_pattern = r"def\s+\w+\s*\([^)]*\)\s*(?:->|:)"
            functions = re.findall(func_pattern, content)
            stats["total_functions"] += len(functions)

            # Find typed functions (with return type)
            typed_pattern = r"def\s+\w+\s*\([^)]*\)\s*->"
            typed_functions = re.findall(typed_pattern, content)
            stats["typed_functions"] += len(typed_functions)

        coverage = (
            (stats["typed_functions"] / stats["total_functions"] * 100)
            if stats["total_functions"] > 0
            else 0
        )

        self.log_step(
            "Type hints check",
            "success" if coverage > 80 else "warning",
            f"{coverage:.1f}% functions have type hints ({stats['typed_functions']}/{stats['total_functions']})",
        )

        return stats

    def check_docstrings(self) -> Dict[str, int]:
        """Check docstring coverage."""
        module_path = self.get_module_path()

        # Use interrogate if available
        ret, stdout, stderr = self.run_command(
            ["interrogate", "-v", str(module_path)], check=False
        )

        if ret == 0:
            # Parse interrogate output
            for line in stdout.splitlines():
                if "TOTAL" in line and "%" in line:
                    try:
                        coverage = float(line.split()[-1].rstrip("%"))
                        self.log_step(
                            "Docstring check",
                            "success" if coverage > 80 else "warning",
                            f"{coverage}% coverage",
                        )
                        return {"coverage": coverage}
                    except:
                        pass

        # Fallback to simple check
        stats = self._simple_docstring_check(module_path)
        coverage = (
            (stats["with_docstring"] / stats["total"] * 100)
            if stats["total"] > 0
            else 0
        )

        self.log_step(
            "Docstring check",
            "success" if coverage > 80 else "warning",
            f"{coverage:.1f}% have docstrings ({stats['with_docstring']}/{stats['total']})",
        )

        return stats

    def _simple_docstring_check(self, path: Path) -> Dict[str, int]:
        """Simple docstring checker."""
        stats = {"total": 0, "with_docstring": 0}

        for py_file in path.rglob("*.py"):
            if "migrations" in str(py_file) or "__pycache__" in str(py_file):
                continue

            with open(py_file, "r") as f:
                content = f.read()

            # Count classes and functions
            import ast

            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                        stats["total"] += 1
                        if ast.get_docstring(node):
                            stats["with_docstring"] += 1
            except:
                pass

        return stats

    def run_tests(self) -> bool:
        """Run tests for the module."""
        if self.module_name:
            ret, stdout, stderr = self.run_command(
                ["pytest", "tests/", "-k", self.module_name, "-v"], check=False
            )
        else:
            ret, stdout, stderr = self.run_command(
                ["pytest", "tests/", "-v"], check=False
            )

        # Parse test results
        passed = failed = 0
        for line in stdout.splitlines():
            if " passed" in line and " failed" in line:
                parts = line.split()
                for i, part in enumerate(parts):
                    if part == "passed":
                        passed = int(parts[i - 1])
                    elif part == "failed":
                        failed = int(parts[i - 1])

        total = passed + failed
        if total > 0:
            self.log_step(
                "Tests",
                "success" if failed == 0 else "failed",
                f"{passed}/{total} tests passed",
            )
        else:
            self.log_step("Tests", "warning", "No tests found")

        return failed == 0

    def generate_report(self) -> None:
        """Generate migration report."""
        report_file = (
            self.base_dir
            / f"migration_report_{self.module_name or 'all'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )

        with open(report_file, "w") as f:
            json.dump(self.report, f, indent=2)

        print(f"\n📊 Report saved to: {report_file}")

        # Print summary
        print("\n📋 Migration Summary:")
        print("=" * 50)

        success_count = sum(
            1 for step in self.report["steps"] if step["status"] == "success"
        )
        warning_count = sum(
            1 for step in self.report["steps"] if step["status"] == "warning"
        )
        failed_count = sum(
            1 for step in self.report["steps"] if step["status"] == "failed"
        )

        print(f"✅ Success: {success_count}")
        print(f"⚠️  Warnings: {warning_count}")
        print(f"❌ Failed: {failed_count}")

    def migrate(self) -> bool:
        """Run the full migration process."""
        print(f"\n🚀 Starting migration for: {self.module_name or 'all modules'}")
        print(f"Mode: {'DRY RUN' if self.dry_run else 'APPLYING CHANGES'}")
        print("=" * 50)

        # Check tools
        if not self.check_tools():
            return False

        # Run migration steps
        if not self.dry_run:
            self.format_with_black()
            self.sort_imports()
        else:
            print("\n📝 Checking what changes would be made...")
            self.format_with_black()
            self.sort_imports()

        # Run checks
        print("\n🔍 Running quality checks...")
        self.check_flake8()
        self.check_type_hints()
        self.check_docstrings()
        self.run_tests()

        # Generate report
        self.generate_report()

        if self.dry_run:
            print("\n💡 This was a DRY RUN. To apply changes, run with --apply flag")

        return True


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate Python code to best practices"
    )
    parser.add_argument(
        "module",
        nargs="?",
        help="Module name to migrate (e.g., authentication, clubs). If not provided, migrates all.",
    )
    parser.add_argument(
        "--apply", action="store_true", help="Apply changes (default is dry run)"
    )
    parser.add_argument("--skip-tests", action="store_true", help="Skip running tests")

    args = parser.parse_args()

    # Run migration
    migrator = BestPracticesMigrator(module_name=args.module, dry_run=not args.apply)

    success = migrator.migrate()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
