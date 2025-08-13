"""
Tests for typed utility functions demonstrating pytest best practices.
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

from django.core.validators import ValidationError
from django.utils import timezone

import pytest

from core.utils_typed import (
    calculate_price_with_tax,
    calculate_time_slots,
    format_currency,
    generate_code,
    generate_otp,
    get_week_range,
    parse_bool,
    sanitize_filename,
    validate_phone_number,
    validate_rfc,
)


class TestGenerateCode:
    """Test generate_code function."""

    def test_default_length(self):
        """Test code generation with default length."""
        code = generate_code()
        assert len(code) == 6
        assert code.isalnum()
        assert code.isupper() or code.isdigit()

    def test_custom_length(self):
        """Test code generation with custom length."""
        code = generate_code(length=10)
        assert len(code) == 10

    def test_with_prefix(self):
        """Test code generation with prefix."""
        code = generate_code(prefix="USER-")
        assert code.startswith("USER-")
        assert len(code) == 11  # 5 prefix + 6 code

    def test_invalid_length(self):
        """Test that negative length raises error."""
        with pytest.raises(ValueError, match="Length must be positive"):
            generate_code(length=0)

    @pytest.mark.parametrize(
        "length,prefix",
        [
            (4, "ID-"),
            (8, ""),
            (12, "TOKEN_"),
        ],
    )
    def test_various_combinations(self, length, prefix):
        """Test various length and prefix combinations."""
        code = generate_code(length=length, prefix=prefix)
        assert len(code) == len(prefix) + length


class TestGenerateOTP:
    """Test generate_otp function."""

    def test_default_otp(self):
        """Test OTP generation with default length."""
        otp = generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()

    def test_custom_length_otp(self):
        """Test OTP generation with custom length."""
        otp = generate_otp(length=4)
        assert len(otp) == 4
        assert otp.isdigit()

    def test_invalid_otp_length(self):
        """Test that invalid length raises error."""
        with pytest.raises(ValueError, match="OTP length must be positive"):
            generate_otp(length=-1)


class TestValidatePhoneNumber:
    """Test validate_phone_number function."""

    @pytest.mark.parametrize(
        "phone,expected",
        [
            ("5551234567", "+525551234567"),
            ("+525551234567", "+525551234567"),
            ("55 5123 4567", "+525551234567"),
        ],
    )
    def test_valid_mexican_numbers(self, phone, expected):
        """Test validation of valid Mexican phone numbers."""
        result = validate_phone_number(phone, country="MX")
        assert result == expected

    def test_invalid_phone_number(self):
        """Test that invalid number raises ValidationError."""
        with pytest.raises(ValidationError, match="Invalid phone number"):
            validate_phone_number("123", country="MX")

    def test_invalid_format(self):
        """Test that badly formatted number raises ValidationError."""
        with pytest.raises(ValidationError, match="Invalid phone number format"):
            validate_phone_number("not-a-phone", country="MX")


class TestValidateRFC:
    """Test validate_rfc function."""

    @pytest.mark.parametrize(
        "rfc,expected",
        [
            ("XAXX010101000", True),
            ("XEXX010101000", True),
            ("ABC1234567890", False),
            ("", False),
            ("INVALID", False),
        ],
    )
    def test_rfc_validation(self, rfc, expected):
        """Test RFC validation with various inputs."""
        assert validate_rfc(rfc) == expected

    def test_rfc_case_insensitive(self):
        """Test that RFC validation is case insensitive."""
        assert validate_rfc("xaxx010101000") == True


class TestCalculateTimeSlots:
    """Test calculate_time_slots function."""

    def test_basic_time_slots(self):
        """Test basic time slot calculation."""
        slots = calculate_time_slots("09:00", "11:00", 60)
        assert len(slots) == 2
        assert slots[0] == {"start": "09:00", "end": "10:00"}
        assert slots[1] == {"start": "10:00", "end": "11:00"}

    def test_with_break_time(self):
        """Test time slots with break between them."""
        slots = calculate_time_slots("09:00", "11:30", 60, break_minutes=30)
        assert len(slots) == 2
        assert slots[0] == {"start": "09:00", "end": "10:00"}
        assert slots[1] == {"start": "10:30", "end": "11:30"}

    def test_invalid_time_format(self):
        """Test that invalid time format raises error."""
        with pytest.raises(ValueError, match="Invalid time format"):
            calculate_time_slots("9:00", "11:00", 60)

    def test_start_after_end(self):
        """Test that start after end raises error."""
        with pytest.raises(ValueError, match="Start time must be before end time"):
            calculate_time_slots("11:00", "09:00", 60)

    def test_invalid_duration(self):
        """Test that invalid duration raises error."""
        with pytest.raises(ValueError, match="Duration must be positive"):
            calculate_time_slots("09:00", "11:00", 0)


class TestCalculatePriceWithTax:
    """Test calculate_price_with_tax function."""

    def test_default_tax_rate(self):
        """Test price calculation with default tax rate."""
        result = calculate_price_with_tax(116.0)
        assert result["subtotal"] == 100.0
        assert result["tax"] == 16.0
        assert result["total"] == 116.0

    def test_custom_tax_rate(self):
        """Test price calculation with custom tax rate."""
        result = calculate_price_with_tax(110.0, tax_rate=0.10)
        assert result["subtotal"] == 100.0
        assert result["tax"] == 10.0
        assert result["total"] == 110.0

    def test_decimal_precision(self):
        """Test that decimal precision is maintained."""
        result = calculate_price_with_tax(Decimal("116.67"))
        assert result["subtotal"] == 100.58
        assert result["tax"] == 16.09
        assert result["total"] == 116.67

    def test_negative_amount(self):
        """Test that negative amount raises error."""
        with pytest.raises(ValueError, match="Amount cannot be negative"):
            calculate_price_with_tax(-100)

    def test_invalid_tax_rate(self):
        """Test that invalid tax rate raises error."""
        with pytest.raises(ValueError, match="Tax rate must be between 0 and 1"):
            calculate_price_with_tax(100, tax_rate=1.5)


class TestGetWeekRange:
    """Test get_week_range function."""

    def test_specific_date(self):
        """Test week range for specific date."""
        # Wednesday, January 10, 2024
        test_date = datetime(2024, 1, 10, 15, 30)
        start, end = get_week_range(test_date)

        assert start.weekday() == 0  # Monday
        assert end.weekday() == 6  # Sunday
        assert start.day == 8
        assert end.day == 14

    def test_date_object(self):
        """Test week range with date object (not datetime)."""
        test_date = date(2024, 1, 10)
        start, end = get_week_range(test_date)

        assert isinstance(start, datetime)
        assert isinstance(end, datetime)

    def test_current_week(self):
        """Test week range for current date."""
        start, end = get_week_range()

        assert start <= timezone.now() <= end
        assert (end - start).days == 6


class TestFormatCurrency:
    """Test format_currency function."""

    @pytest.mark.parametrize(
        "amount,currency,include_symbol,expected",
        [
            (1234.56, "MXN", True, "$1,234.56 MXN"),
            (1234.56, "MXN", False, "1,234.56 MXN"),
            (1234.56, "USD", True, "$1,234.56 USD"),
            (1234.56, "EUR", True, "€1,234.56 EUR"),
            (1234, "MXN", True, "$1,234.00 MXN"),
        ],
    )
    def test_currency_formatting(self, amount, currency, include_symbol, expected):
        """Test various currency formatting options."""
        result = format_currency(amount, currency, include_symbol)
        assert result == expected


class TestSanitizeFilename:
    """Test sanitize_filename function."""

    @pytest.mark.parametrize(
        "filename,expected",
        [
            ("normal_file.txt", "normal_file.txt"),
            ("file with spaces.pdf", "file_with_spaces.pdf"),
            ("file@#$%^&*.doc", "file_.doc"),
            ("file___name.jpg", "file_name.jpg"),
        ],
    )
    def test_filename_sanitization(self, filename, expected):
        """Test filename sanitization."""
        result = sanitize_filename(filename)
        assert result == expected

    def test_long_filename(self):
        """Test that long filenames are truncated."""
        long_name = "a" * 300 + ".txt"
        result = sanitize_filename(long_name, max_length=255)
        assert len(result) == 255
        assert result.endswith(".txt")


class TestParseBool:
    """Test parse_bool function."""

    @pytest.mark.parametrize(
        "value,expected",
        [
            (True, True),
            (False, False),
            ("true", True),
            ("True", True),
            ("TRUE", True),
            ("yes", True),
            ("1", True),
            ("on", True),
            ("false", False),
            ("0", False),
            ("no", False),
            ("", False),
            (None, False),
            (1, True),
            (0, False),
        ],
    )
    def test_bool_parsing(self, value, expected):
        """Test parsing various boolean representations."""
        assert parse_bool(value) == expected


# Integration test example
class TestIntegration:
    """Integration tests combining multiple utilities."""

    def test_reservation_workflow(self):
        """Test a complete reservation workflow using utilities."""
        # Generate a unique reservation code
        reservation_code = generate_code(prefix="RES-")
        assert reservation_code.startswith("RES-")

        # Calculate available slots
        slots = calculate_time_slots("09:00", "18:00", 90, break_minutes=15)
        assert len(slots) > 0

        # Calculate pricing
        base_price = 500.0
        pricing = calculate_price_with_tax(base_price)

        # Format for display
        formatted_price = format_currency(pricing["total"])
        assert "$" in formatted_price
        assert "MXN" in formatted_price
