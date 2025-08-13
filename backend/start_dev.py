#!/usr/bin/env python3
"""Development server startup script with minimal dependencies"""
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

    # Add project root to path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable?"
        ) from exc

    # Check for required environment variables
    required_vars = ["SECRET_KEY", "DATABASE_URL"]
    missing_vars = [var for var in required_vars if not os.environ.get(var)]

    if missing_vars:
        print(f"Warning: Missing environment variables: {', '.join(missing_vars)}")
        print("Using defaults for development...")

        # Set development defaults
        if "SECRET_KEY" not in os.environ:
            os.environ["SECRET_KEY"] = (
                "django-insecure-dev-key-do-not-use-in-production"
            )

        if "DATABASE_URL" not in os.environ:
            os.environ["DATABASE_URL"] = "sqlite:///db.sqlite3"

    # Run migrations if needed
    print("Checking database migrations...")
    execute_from_command_line(["manage.py", "migrate", "--run-syncdb"])

    # Start server
    print("Starting development server on http://localhost:8000")
    execute_from_command_line(["manage.py", "runserver", "0.0.0.0:8000"])
