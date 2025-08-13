"""
Core services for the application.
"""

import logging
from typing import Any, Dict, Optional

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

import requests

logger = logging.getLogger(__name__)


class IPGeolocationService:
    """
    Service for IP geolocation using IPinfo.io API.
    """

    def __init__(self):
        self.api_token = getattr(settings, "IPINFO_TOKEN", None)
        self.base_url = "https://ipinfo.io"
        self.cache_timeout = 86400  # 24 hours

    def get_location(self, ip_address: str) -> Dict[str, Any]:
        """
        Get geolocation data for an IP address.

        Args:
            ip_address: IP address to lookup

        Returns:
            Dict with location data including:
            - ip: IP address
            - city: City name
            - region: Region/State name
            - country: Country code (e.g., 'MX')
            - loc: Latitude,Longitude coordinates
            - timezone: Timezone (e.g., 'America/Mexico_City')
            - org: Organization/ISP
        """
        # Check cache first
        cache_key = f"ipinfo:{ip_address}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        # Skip for local/private IPs
        if self._is_private_ip(ip_address):
            return self._get_default_location(ip_address)

        try:
            # Build URL with token if available
            url = f"{self.base_url}/{ip_address}/json"
            params = {"token": self.api_token} if self.api_token else {}

            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()

            data = response.json()

            # Parse coordinates
            if "loc" in data:
                lat, lon = data["loc"].split(",")
                data["latitude"] = float(lat)
                data["longitude"] = float(lon)

            # Cache the result
            cache.set(cache_key, data, self.cache_timeout)

            return data

        except requests.exceptions.RequestException as e:
            logger.error(f"IPinfo API error for {ip_address}: {str(e)}")
            return self._get_default_location(ip_address)
        except Exception as e:
            logger.error(
                f"Unexpected error in IP geolocation for {ip_address}: {str(e)}"
            )
            return self._get_default_location(ip_address)

    def _is_private_ip(self, ip_address: str) -> bool:
        """Check if IP is private/local."""
        private_ranges = [
            "10.",
            "172.16.",
            "172.17.",
            "172.18.",
            "172.19.",
            "172.20.",
            "172.21.",
            "172.22.",
            "172.23.",
            "172.24.",
            "172.25.",
            "172.26.",
            "172.27.",
            "172.28.",
            "172.29.",
            "172.30.",
            "172.31.",
            "192.168.",
            "127.",
            "localhost",
        ]

        for range_prefix in private_ranges:
            if ip_address.startswith(range_prefix):
                return True

        return ip_address in ["::1", "::ffff:127.0.0.1"]

    def _get_default_location(self, ip_address: str) -> Dict[str, Any]:
        """Get default location for private IPs or errors."""
        return {
            "ip": ip_address,
            "city": "Mexico City",
            "region": "Mexico City",
            "country": "MX",
            "loc": "19.4326,-99.1332",
            "latitude": 19.4326,
            "longitude": -99.1332,
            "timezone": "America/Mexico_City",
            "org": "Private Network",
            "is_default": True,
        }

    def get_country_name(self, country_code: str) -> str:
        """Convert country code to country name."""
        country_names = {
            "MX": "Mexico",
            "US": "United States",
            "CA": "Canada",
            "ES": "Spain",
            "AR": "Argentina",
            "BR": "Brazil",
            "CO": "Colombia",
            "CL": "Chile",
            "PE": "Peru",
            "VE": "Venezuela",
            # Add more as needed
        }
        return country_names.get(country_code, country_code)

    def is_mexico_ip(self, ip_address: str) -> bool:
        """Check if IP is from Mexico."""
        location = self.get_location(ip_address)
        return location.get("country") == "MX"

    def get_distance_between_ips(self, ip1: str, ip2: str) -> Optional[float]:
        """
        Calculate distance in kilometers between two IP addresses.

        Uses Haversine formula for great-circle distance.
        """
        try:
            loc1 = self.get_location(ip1)
            loc2 = self.get_location(ip2)

            if not all(
                [
                    "latitude" in loc1,
                    "longitude" in loc1,
                    "latitude" in loc2,
                    "longitude" in loc2,
                ]
            ):
                return None

            from math import atan2, cos, radians, sin, sqrt

            # Radius of Earth in kilometers
            R = 6371.0

            lat1 = radians(loc1["latitude"])
            lon1 = radians(loc1["longitude"])
            lat2 = radians(loc2["latitude"])
            lon2 = radians(loc2["longitude"])

            dlon = lon2 - lon1
            dlat = lat2 - lat1

            a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))

            distance = R * c
            return round(distance, 2)

        except Exception as e:
            logger.error(f"Error calculating distance: {str(e)}")
            return None


class SecurityService:
    """
    Service for security-related operations.
    """

    def __init__(self):
        self.geolocation = IPGeolocationService()

    def check_suspicious_login(self, user, ip_address: str) -> Dict[str, Any]:
        """
        Check if a login attempt is suspicious based on location.

        Args:
            user: User attempting to login
            ip_address: IP address of login attempt

        Returns:
            Dict with:
            - is_suspicious: Boolean indicating if login is suspicious
            - reason: Reason for suspicion
            - location: Location data
        """
        try:
            # Get current location
            current_location = self.geolocation.get_location(ip_address)

            # Get user's last login location
            last_login_ip = getattr(user, "last_login_ip", None)

            if not last_login_ip:
                # First login or no previous IP
                return {
                    "is_suspicious": False,
                    "reason": "First login or no previous location",
                    "location": current_location,
                }

            # Check if country changed
            last_location = self.geolocation.get_location(last_login_ip)

            if last_location.get("country") != current_location.get("country"):
                return {
                    "is_suspicious": True,
                    "reason": f"Login from different country: {current_location.get('country')} (was {last_location.get('country')})",
                    "location": current_location,
                    "previous_location": last_location,
                }

            # Check distance if same country
            distance = self.geolocation.get_distance_between_ips(
                last_login_ip, ip_address
            )

            if distance and distance > 500:  # More than 500km
                # Check time difference
                time_diff = timezone.now() - user.last_login
                hours_diff = time_diff.total_seconds() / 3600

                # If moved more than 500km in less than 2 hours, suspicious
                if hours_diff < 2:
                    return {
                        "is_suspicious": True,
                        "reason": f"Impossible travel: {distance}km in {hours_diff:.1f} hours",
                        "location": current_location,
                        "previous_location": last_location,
                        "distance": distance,
                    }

            return {
                "is_suspicious": False,
                "reason": "Location check passed",
                "location": current_location,
            }

        except Exception as e:
            logger.error(f"Error checking suspicious login: {str(e)}")
            return {
                "is_suspicious": False,
                "reason": "Error checking location",
                "error": str(e),
            }

    def log_security_event(
        self, event_type: str, user, ip_address: str, details: Optional[Dict] = None
    ) -> None:
        """
        Log a security event.

        Args:
            event_type: Type of event (login, logout, failed_login, etc.)
            user: User involved
            ip_address: IP address
            details: Additional details
        """
        try:
            from apps.root.models import AuditLog

            location = self.geolocation.get_location(ip_address)

            AuditLog.objects.create(
                user=user if user and user.is_authenticated else None,
                ip_address=ip_address,
                action=f"security:{event_type}",
                model_name="User",
                object_id=str(user.id) if user else None,
                object_repr=str(user) if user else "Anonymous",
                changes={
                    "event_type": event_type,
                    "location": location,
                    "details": details or {},
                },
            )

        except Exception as e:
            logger.error(f"Error logging security event: {str(e)}")


# Global instance for easy access
ip_geolocation = IPGeolocationService()
security = SecurityService()
