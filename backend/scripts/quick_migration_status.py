#!/usr/bin/env python
"""
Quick script to check current migration status of the codebase.
Shows what needs to be done for each module.
"""
import json
import os
import subprocess
from pathlib import Path
from typing import Dict, List


def check_module_status(module_path: Path) -> Dict:
    """Check the current status of a module."""
    status = {
        "name": module_path.name,
        "files": 0,
        "black_compliant": 0,
        "has_type_hints": 0,
        "has_docstrings": 0,
        "has_tests": 0,
        "issues": [],
    }

    # Count Python files
    py_files = list(module_path.rglob("*.py"))
    py_files = [
        f
        for f in py_files
        if "migrations" not in str(f) and "__pycache__" not in str(f)
    ]
    status["files"] = len(py_files)

    # Check each file
    for py_file in py_files:
        # Check Black compliance
        result = subprocess.run(
            ["black", "--check", str(py_file)],
            capture_output=True,
            stderr=subprocess.DEVNULL,
        )
        if result.returncode == 0:
            status["black_compliant"] += 1

        # Check for type hints and docstrings
        try:
            with open(py_file, "r") as f:
                content = f.read()

            # Basic type hint check
            if (
                "-> " in content
                or ": List[" in content
                or ": Dict[" in content
                or ": Optional[" in content
            ):
                status["has_type_hints"] += 1

            # Basic docstring check
            if '"""' in content:
                status["has_docstrings"] += 1

        except Exception as e:
            status["issues"].append(f"Error reading {py_file}: {e}")

    # Check for tests
    test_files = [
        Path(f"tests/test_{module_path.name}.py"),
        Path(f"tests/unit/test_{module_path.name}.py"),
        Path(f"tests/integration/test_{module_path.name}.py"),
        module_path / "tests",
    ]

    for test_path in test_files:
        if test_path.exists():
            status["has_tests"] = 1
            break

    return status


def print_status_table(modules_status: List[Dict]):
    """Print a nice status table."""
    print("\n📊 MIGRATION STATUS REPORT")
    print("=" * 80)
    print(
        f"{'Module':<15} {'Files':<8} {'Black':<10} {'Types':<10} {'Docs':<10} {'Tests':<10}"
    )
    print("-" * 80)

    total_files = 0
    total_black = 0
    total_types = 0
    total_docs = 0
    total_tests = 0

    for status in modules_status:
        name = status["name"]
        files = status["files"]
        black_pct = (status["black_compliant"] / files * 100) if files > 0 else 0
        types_pct = (status["has_type_hints"] / files * 100) if files > 0 else 0
        docs_pct = (status["has_docstrings"] / files * 100) if files > 0 else 0
        has_tests = "✅" if status["has_tests"] else "❌"

        # Color coding
        black_str = f"{black_pct:>5.1f}% {'✅' if black_pct == 100 else '⚠️' if black_pct > 50 else '❌'}"
        types_str = f"{types_pct:>5.1f}% {'✅' if types_pct > 80 else '⚠️' if types_pct > 30 else '❌'}"
        docs_str = f"{docs_pct:>5.1f}% {'✅' if docs_pct > 80 else '⚠️' if docs_pct > 50 else '❌'}"

        print(
            f"{name:<15} {files:<8} {black_str:<10} {types_str:<10} {docs_str:<10} {has_tests:<10}"
        )

        total_files += files
        total_black += status["black_compliant"]
        total_types += status["has_type_hints"]
        total_docs += status["has_docstrings"]
        total_tests += status["has_tests"]

    print("-" * 80)

    # Totals
    total_black_pct = (total_black / total_files * 100) if total_files > 0 else 0
    total_types_pct = (total_types / total_files * 100) if total_files > 0 else 0
    total_docs_pct = (total_docs / total_files * 100) if total_files > 0 else 0
    total_tests_pct = (total_tests / len(modules_status) * 100) if modules_status else 0

    print(
        f"{'TOTAL':<15} {total_files:<8} {total_black_pct:>5.1f}%     {total_types_pct:>5.1f}%     {total_docs_pct:>5.1f}%     {total_tests_pct:>5.1f}%"
    )
    print("=" * 80)


def main():
    """Check migration status for all modules."""
    base_dir = Path(__file__).parent.parent
    apps_dir = base_dir / "apps"

    # Get all modules
    modules = [
        d for d in apps_dir.iterdir() if d.is_dir() and not d.name.startswith("__")
    ]
    modules_status = []

    print("🔍 Checking migration status...")

    for module in sorted(modules):
        print(f"  Checking {module.name}...", end="", flush=True)
        status = check_module_status(module)
        modules_status.append(status)
        print(" ✓")

    # Print results
    print_status_table(modules_status)

    # Recommendations
    print("\n📋 RECOMMENDATIONS:")
    print("-" * 40)

    priority_modules = []
    for status in modules_status:
        if status["black_compliant"] < status["files"]:
            priority_modules.append(status["name"])

    if priority_modules:
        print(f"1. Apply Black formatting to: {', '.join(priority_modules)}")
        print(f"   Run: black apps/{{module_name}}/")

    low_type_modules = [
        s["name"]
        for s in modules_status
        if s["files"] > 0 and (s["has_type_hints"] / s["files"]) < 0.3
    ]
    if low_type_modules:
        print(f"2. Add type hints to: {', '.join(low_type_modules)}")

    no_test_modules = [s["name"] for s in modules_status if not s["has_tests"]]
    if no_test_modules:
        print(f"3. Add tests for: {', '.join(no_test_modules)}")

    print("\n🚀 Quick start:")
    print("   python scripts/migrate_to_best_practices.py <module_name> --apply")

    # Save report
    report_file = base_dir / "migration_status_report.json"
    with open(report_file, "w") as f:
        json.dump(
            {
                "timestamp": str(Path.ctime(Path(__file__))),
                "modules": modules_status,
                "summary": {
                    "total_files": total_files,
                    "black_compliance": f"{total_black_pct:.1f}%",
                    "type_hints_coverage": f"{total_types_pct:.1f}%",
                    "docstring_coverage": f"{total_docs_pct:.1f}%",
                    "test_coverage": f"{total_tests_pct:.1f}%",
                },
            },
            indent=2,
        )

    print(f"\n📄 Detailed report saved to: {report_file}")


if __name__ == "__main__":
    main()
