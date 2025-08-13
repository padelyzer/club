"""
Utility functions for Padelyzer with complete type hints.
This demonstrates best practices for type hinting in Python.
"""

import random
import re
import string
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple, Union

from django.core.exceptions import ImproperlyConfigured
from django.core.validators import ValidationError
from django.utils import timezone

import phonenumbers
from phonenumbers import NumberParseException, PhoneNumber


def generate_code(length: int = 6, prefix: str = "") -> str:
    """
    Generate a random code with optional prefix.

    Args:
        length: Length of the random part (default: 6)
        prefix: Optional prefix to prepend

    Returns:
        Generated code string

    Example:
        >>> generate_code(4, 'USR-')
        'USR-A3B9'
    """
    if length <= 0:
        raise ValueError("Length must be positive")

    chars: str = string.ascii_uppercase + string.digits
    code: str = "".join(random.choices(chars, k=length))
    return f"{prefix}{code}" if prefix else code


def generate_otp(length: int = 6) -> str:
    """
    Generate a numeric OTP code.

    Args:
        length: Length of OTP (default: 6)

    Returns:
        Numeric OTP string

    Raises:
        ValueError: If length is not positive
    """
    if length <= 0:
        raise ValueError("OTP length must be positive")

    return "".join(random.choices(string.digits, k=length))


def validate_phone_number(phone: str, country: str = "MX") -> str:
    """
    Validate and format phone number.

    Args:
        phone: Phone number to validate
        country: Country code for parsing (default: 'MX')

    Returns:
        Formatted phone number in E164 format

    Raises:
        ValidationError: If phone number is invalid
    """
    try:
        parsed: PhoneNumber = phonenumbers.parse(phone, country)
        if not phonenumbers.is_valid_number(parsed):
            raise ValidationError(f"Invalid phone number: {phone}")

        return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except NumberParseException as e:
        raise ValidationError(f"Invalid phone number format: {str(e)}")


def validate_rfc(rfc: str) -> bool:
    """
    Validate Mexican RFC (tax ID).

    Args:
        rfc: RFC string to validate

    Returns:
        True if valid, False otherwise

    Example:
        >>> validate_rfc('XAXX010101000')
        True
    """
    if not rfc:
        return False

    # RFC pattern for both individuals and companies
    rfc_pattern: str = r"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$"
    return bool(re.match(rfc_pattern, rfc.upper()))


TimeSlot = Dict[str, str]


def calculate_time_slots(
    start_time: str, end_time: str, duration_minutes: int, break_minutes: int = 0
) -> List[TimeSlot]:
    """
    Calculate available time slots between start and end time.

    Args:
        start_time: Start time in HH:MM format
        end_time: End time in HH:MM format
        duration_minutes: Duration of each slot in minutes
        break_minutes: Break between slots in minutes (default: 0)

    Returns:
        List of time slots with 'start' and 'end' keys

    Raises:
        ValueError: If times are invalid or start >= end

    Example:
        >>> calculate_time_slots('09:00', '11:00', 60)
        [{'start': '09:00', 'end': '10:00'}, {'start': '10:00', 'end': '11:00'}]
    """
    try:
        current: datetime = datetime.strptime(start_time, "%H:%M")
        end: datetime = datetime.strptime(end_time, "%H:%M")
    except ValueError as e:
        raise ValueError(f"Invalid time format: {e}")

    if current >= end:
        raise ValueError("Start time must be before end time")

    if duration_minutes <= 0:
        raise ValueError("Duration must be positive")

    slots: List[TimeSlot] = []

    while current + timedelta(minutes=duration_minutes) <= end:
        slot_end: datetime = current + timedelta(minutes=duration_minutes)
        slots.append(
            {"start": current.strftime("%H:%M"), "end": slot_end.strftime("%H:%M")}
        )
        current = slot_end + timedelta(minutes=break_minutes)

    return slots


PriceBreakdown = Dict[str, Union[float, Decimal]]


def calculate_price_with_tax(
    amount: Union[float, Decimal], tax_rate: float = 0.16
) -> PriceBreakdown:
    """
    Calculate price breakdown with Mexican tax (IVA).

    Args:
        amount: Total amount including tax
        tax_rate: Tax rate (default: 0.16 for 16% IVA)

    Returns:
        Dictionary with subtotal, tax, and total

    Example:
        >>> calculate_price_with_tax(116.0)
        {'subtotal': 100.0, 'tax': 16.0, 'total': 116.0}
    """
    if amount < 0:
        raise ValueError("Amount cannot be negative")

    if not 0 <= tax_rate < 1:
        raise ValueError("Tax rate must be between 0 and 1")

    # Convert to Decimal for precision
    amount_decimal = Decimal(str(amount))
    tax_rate_decimal = Decimal(str(tax_rate))

    subtotal = amount_decimal / (1 + tax_rate_decimal)
    tax = amount_decimal - subtotal

    return {
        "subtotal": float(subtotal.quantize(Decimal("0.01"))),
        "tax": float(tax.quantize(Decimal("0.01"))),
        "total": float(amount_decimal.quantize(Decimal("0.01"))),
    }


def get_week_range(
    target_date: Optional[Union[datetime, date]] = None,
) -> Tuple[datetime, datetime]:
    """
    Get the start and end dates of the week for a given date.

    Args:
        target_date: Date to get week range for (default: now)

    Returns:
        Tuple of (start_date, end_date) for the week

    Example:
        >>> start, end = get_week_range(datetime(2024, 1, 10))
        # Returns Monday and Sunday of that week
    """
    if target_date is None:
        target_date = timezone.now()
    elif isinstance(target_date, date) and not isinstance(target_date, datetime):
        # Convert date to datetime
        target_date = datetime.combine(target_date, datetime.min.time())
        target_date = timezone.make_aware(target_date)

    # Monday is 0, Sunday is 6
    weekday: int = target_date.weekday()
    start: datetime = target_date - timedelta(days=weekday)
    end: datetime = start + timedelta(days=6)

    # Set to beginning and end of day
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    end = end.replace(hour=23, minute=59, second=59, microsecond=999999)

    return (start, end)


def format_currency(
    amount: Union[int, float, Decimal],
    currency: str = "MXN",
    include_symbol: bool = True,
) -> str:
    """
    Format amount as currency string.

    Args:
        amount: Amount to format
        currency: Currency code (default: 'MXN')
        include_symbol: Whether to include currency symbol

    Returns:
        Formatted currency string

    Example:
        >>> format_currency(1234.56)
        '$1,234.56 MXN'
    """
    currency_symbols: Dict[str, str] = {
        "MXN": "$",
        "USD": "$",
        "EUR": "€",
    }

    # Format with thousands separator
    formatted: str = f"{amount:,.2f}"

    if include_symbol and currency in currency_symbols:
        return f"{currency_symbols[currency]}{formatted} {currency}"

    return f"{formatted} {currency}"


def sanitize_filename(filename: str, max_length: int = 255) -> str:
    """
    Sanitize filename for safe storage.

    Args:
        filename: Original filename
        max_length: Maximum allowed length

    Returns:
        Sanitized filename
    """
    # Remove potentially dangerous characters
    sanitized: str = re.sub(r"[^\w\s.-]", "_", filename)

    # Remove multiple underscores/spaces
    sanitized = re.sub(r"[_\s]+", "_", sanitized)

    # Ensure reasonable length
    if len(sanitized) > max_length:
        name, ext = sanitized.rsplit(".", 1) if "." in sanitized else (sanitized, "")
        max_name_length = max_length - len(ext) - 1 if ext else max_length
        sanitized = f"{name[:max_name_length]}.{ext}" if ext else name[:max_length]

    return sanitized


def get_client_ip(request: Any) -> Optional[str]:
    """
    Get client IP address from request.

    Args:
        request: Django request object

    Returns:
        IP address string or None
    """
    x_forwarded_for: Optional[str] = request.META.get("HTTP_X_FORWARDED_FOR")

    if x_forwarded_for:
        # Take the first IP if there are multiple
        ip: str = x_forwarded_for.split(",")[0].strip()
    else:
        ip = request.META.get("REMOTE_ADDR")

    return ip


def parse_bool(value: Any) -> bool:
    """
    Parse various representations of boolean values.

    Args:
        value: Value to parse

    Returns:
        Boolean value

    Example:
        >>> parse_bool('true')
        True
        >>> parse_bool('0')
        False
    """
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        value = value.lower().strip()
        return value in ("true", "yes", "1", "on", "t", "y")

    return bool(value)
