"""
Security services for authentication.
"""


def check_suspicious_login(user, ip_address):
    """
    Check if login attempt is suspicious.
    For now, returns a simple response.
    """
    return {
        "is_suspicious": False,
        "location": {"city": "Unknown", "country": "Unknown", "ip": ip_address},
    }
