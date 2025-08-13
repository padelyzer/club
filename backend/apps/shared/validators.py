import re
from datetime import datetime, time
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

import bleach
import phonenumbers


class InputValidators:
    """Comprehensive input validators for Mexican context."""

    @staticmethod
    def validate_phone_mx(value):
        """Validate Mexican phone number format."""
        # Remove spaces and dashes
        cleaned = re.sub(r"[\s\-\(\)]", "", value)

        # Check for Mexican format
        pattern = r"^(\+52)?[1-9]\d{9}$"
        if not re.match(pattern, cleaned):
            raise ValidationError(
                "Invalid Mexican phone number. Format: +52XXXXXXXXXX or XXXXXXXXXX"
            )

        # Additional validation with phonenumbers library
        try:
            parsed = phonenumbers.parse(cleaned, "MX")
            if not phonenumbers.is_valid_number(parsed):
                raise ValidationError("Invalid phone number")
        except:
            raise ValidationError("Invalid phone number format")

        return cleaned

    @staticmethod
    def validate_rfc(value):
        """Validate Mexican RFC (tax ID) format."""
        value = value.upper().strip()

        # RFC pattern for both individuals (13 chars) and companies (12 chars)
        pattern = r"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$"

        if not re.match(pattern, value):
            raise ValidationError(
                "Invalid RFC format. Expected: 3-4 letters + 6 digits + 3 alphanumeric"
            )

        # Additional validation for date component
        if len(value) >= 10:
            date_str = value[4:10] if len(value) == 13 else value[3:9]
            try:
                year = (
                    int("19" + date_str[0:2])
                    if int(date_str[0:2]) > 50
                    else int("20" + date_str[0:2])
                )
                month = int(date_str[2:4])
                day = int(date_str[4:6])
                datetime(year, month, day)
            except:
                raise ValidationError("Invalid date in RFC")

        return value

    @staticmethod
    def validate_curp(value):
        """Validate Mexican CURP format."""
        value = value.upper().strip()

        # CURP pattern
        pattern = r"^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$"

        if not re.match(pattern, value):
            raise ValidationError(
                "Invalid CURP format. Expected: 4 letters + 6 digits + H/M + 5 letters + 1 alphanumeric + 1 digit"
            )

        return value

    @staticmethod
    def sanitize_input(value):
        """Sanitize input to prevent XSS and SQL injection."""
        if not isinstance(value, str):
            return value

        # Remove any potential SQL injection attempts
        sql_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "EXEC", "SCRIPT"]
        for keyword in sql_keywords:
            if keyword in value.upper():
                # Log potential attack
                import logging

                logger = logging.getLogger("security")
                logger.warning(
                    f"Potential SQL injection attempt detected: {keyword} in {value[:50]}..."
                )

        # Clean HTML tags except allowed ones
        allowed_tags = ["b", "i", "u", "em", "strong", "p", "br"]
        allowed_attributes = {}

        cleaned = bleach.clean(
            value, tags=allowed_tags, attributes=allowed_attributes, strip=True
        )

        # Remove any remaining suspicious patterns
        cleaned = re.sub(
            r"<script.*?>.*?</script>", "", cleaned, flags=re.IGNORECASE | re.DOTALL
        )
        cleaned = re.sub(r"javascript:", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"on\w+\s*=", "", cleaned, flags=re.IGNORECASE)

        return cleaned.strip()

    @staticmethod
    def validate_price(value):
        """Validate price format and range."""
        try:
            price = Decimal(str(value))

            if price < 0:
                raise ValidationError("Price cannot be negative")

            if price > 999999.99:
                raise ValidationError("Price exceeds maximum allowed value")

            # Check decimal places
            if price.as_tuple().exponent < -2:
                raise ValidationError("Price can have maximum 2 decimal places")

            return price
        except (ValueError, TypeError):
            raise ValidationError("Invalid price format")

    @staticmethod
    def validate_time_slot(start_time, end_time, duration_minutes=None):
        """Validate time slot for reservations."""
        # Convert to time objects if strings
        if isinstance(start_time, str):
            start_time = datetime.strptime(start_time, "%H:%M").time()
        if isinstance(end_time, str):
            end_time = datetime.strptime(end_time, "%H:%M").time()

        # Basic validation
        if start_time >= end_time:
            raise ValidationError("End time must be after start time")

        # Check business hours (6 AM - 11 PM)
        min_time = time(6, 0)
        max_time = time(23, 0)

        if start_time < min_time or end_time > max_time:
            raise ValidationError("Time slots must be between 6:00 AM and 11:00 PM")

        # Validate duration if provided
        if duration_minutes:
            start_datetime = datetime.combine(datetime.today(), start_time)
            end_datetime = datetime.combine(datetime.today(), end_time)
            actual_duration = (end_datetime - start_datetime).seconds // 60

            if actual_duration != duration_minutes:
                raise ValidationError(
                    f"Duration mismatch: expected {duration_minutes} minutes, got {actual_duration}"
                )

        return True

    @staticmethod
    def validate_email_mx(value):
        """Validate email with additional checks for Mexican domains."""
        from django.core.validators import EmailValidator

        # Basic email validation
        validator = EmailValidator()
        validator(value)

        # Check for common typos in Mexican domains
        common_mx_domains = [
            "gmail.com",
            "hotmail.com",
            "outlook.com",
            "yahoo.com.mx",
            "prodigy.net.mx",
        ]
        domain = value.split("@")[1].lower()

        # Warn about suspicious domains
        if domain.endswith(".mx"):
            # Valid Mexican domain
            pass
        elif any(
            domain.startswith(d.split(".")[0]) and domain != d
            for d in common_mx_domains
        ):
            # Possible typo
            import logging

            logger = logging.getLogger("validation")
            logger.warning(f"Possible email domain typo: {domain}")

        return value

    @staticmethod
    def validate_court_number(value):
        """Validate court number."""
        try:
            court_num = int(value)
            if court_num < 1 or court_num > 50:
                raise ValidationError("Court number must be between 1 and 50")
            return court_num
        except (ValueError, TypeError):
            raise ValidationError("Invalid court number")

    @staticmethod
    def validate_player_level(value):
        """Validate player skill level."""
        valid_levels = ["beginner", "intermediate", "advanced", "professional"]
        if value.lower() not in valid_levels:
            raise ValidationError(
                f'Invalid player level. Must be one of: {", ".join(valid_levels)}'
            )
        return value.lower()

    @staticmethod
    def validate_tournament_format(value):
        """Validate tournament format."""
        valid_formats = [
            "single_elimination",
            "double_elimination",
            "round_robin",
            "swiss",
        ]
        if value.lower() not in valid_formats:
            raise ValidationError(
                f'Invalid tournament format. Must be one of: {", ".join(valid_formats)}'
            )
        return value.lower()


# Regex validators for common patterns
phone_regex = RegexValidator(
    regex=r"^(\+52)?[1-9]\d{9}$", message="Enter a valid Mexican phone number"
)

rfc_regex = RegexValidator(
    regex=r"^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$", message="Enter a valid RFC"
)

curp_regex = RegexValidator(
    regex=r"^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$", message="Enter a valid CURP"
)

alphanumeric_regex = RegexValidator(
    regex=r"^[a-zA-Z0-9\s\-\_]+$",
    message="Only letters, numbers, spaces, hyphens and underscores allowed",
)
