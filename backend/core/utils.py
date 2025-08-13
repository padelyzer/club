"""
Utility functions for Padelyzer.
"""

import random
import re
import string
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from django.core.validators import ValidationError
from django.utils import timezone

import phonenumbers


def generate_code(length: int = 6, prefix: str = "") -> str:
    """
    Generate a random code with optional prefix.
    """
    chars = string.ascii_uppercase + string.digits
    code = "".join(random.choices(chars, k=length))
    return f"{prefix}{code}" if prefix else code


def generate_otp(length: int = 6) -> str:
    """
    Generate a numeric OTP code.
    """
    return "".join(random.choices(string.digits, k=length))


def validate_phone_number(phone: str, country: str = "MX") -> str:
    """
    Validate and format phone number.
    """
    try:
        parsed = phonenumbers.parse(phone, country)
        if not phonenumbers.is_valid_number(parsed):
            raise ValidationError("Invalid phone number")
        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except phonenumbers.NumberParseException:
        raise ValidationError("Invalid phone number format")


def validate_rfc(rfc: str) -> bool:
    """
    Validate Mexican RFC (tax ID).
    """
    rfc_pattern = r"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$"
    return bool(re.match(rfc_pattern, rfc.upper()))


def calculate_time_slots(
    start_time: str, end_time: str, duration_minutes: int, break_minutes: int = 0
) -> list:
    """
    Calculate available time slots between start and end time.
    """
    slots = []
    current = datetime.strptime(start_time, "%H:%M")
    end = datetime.strptime(end_time, "%H:%M")

    while current + timedelta(minutes=duration_minutes) <= end:
        slot_end = current + timedelta(minutes=duration_minutes)
        slots.append(
            {"start": current.strftime("%H:%M"), "end": slot_end.strftime("%H:%M")}
        )
        current = slot_end + timedelta(minutes=break_minutes)

    return slots


def calculate_price_with_tax(amount: float, tax_rate: float = 0.16) -> Dict[str, float]:
    """
    Calculate price breakdown with Mexican tax (IVA).
    """
    subtotal = round(amount / (1 + tax_rate), 2)
    tax = round(amount - subtotal, 2)
    return {"subtotal": subtotal, "tax": tax, "total": amount}


def get_week_range(date: Optional[datetime] = None) -> tuple:
    """
    Get the start and end dates of the week for a given date.
    """
    if not date:
        date = timezone.now()

    # Monday is 0, Sunday is 6
    weekday = date.weekday()
    start = date - timedelta(days=weekday)
    end = start + timedelta(days=6)

    return (
        start.replace(hour=0, minute=0, second=0, microsecond=0),
        end.replace(hour=23, minute=59, second=59, microsecond=999999),
    )


def format_currency(amount: float, currency: str = "MXN") -> str:
    """
    Format amount as currency string.
    """
    if currency == "MXN":
        return f"${amount:,.2f} MXN"
    return f"{amount:,.2f} {currency}"


def calculate_occupancy_rate(reserved_slots: int, total_slots: int) -> float:
    """
    Calculate occupancy rate as percentage.
    """
    if total_slots == 0:
        return 0.0
    return round((reserved_slots / total_slots) * 100, 2)


def parse_date_range(date_range: str) -> tuple:
    """
    Parse date range string (e.g., '2024-01-01,2024-01-31').
    """
    try:
        start_str, end_str = date_range.split(",")
        start = datetime.strptime(start_str.strip(), "%Y-%m-%d")
        end = datetime.strptime(end_str.strip(), "%Y-%m-%d")
        return (start, end)
    except (ValueError, AttributeError):
        raise ValidationError("Invalid date range format. Use: YYYY-MM-DD,YYYY-MM-DD")


def generate_invoice_number(organization_id: str, sequence: int) -> str:
    """
    Generate invoice number in format: ORG-YYYY-MM-00001
    """
    now = timezone.now()
    return f"{organization_id[:3].upper()}-{now.year}-{now.month:02d}-{sequence:05d}"


def mask_sensitive_data(data: str, visible_chars: int = 4) -> str:
    """
    Mask sensitive data showing only last N characters.
    """
    if len(data) <= visible_chars:
        return "*" * len(data)
    return "*" * (len(data) - visible_chars) + data[-visible_chars:]
