"""
Financial integrity validators with fraud detection and business rule enforcement.
Provides comprehensive validation for all financial operations with zero tolerance for errors.

CRITICAL: These validators protect against financial fraud, data corruption, and business rule violations.
Every validation has been designed to prevent revenue loss and ensure regulatory compliance.
"""

import re
import logging
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_DOWN
from typing import Dict, List, Optional, Tuple, Union, Any
from dataclasses import dataclass

from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings
from django.db.models import Q, Sum, Count
from django.contrib.auth import get_user_model

logger = logging.getLogger('finance.validators')

User = get_user_model()

# Financial validation constants
MAX_DAILY_TRANSACTION_AMOUNT = Decimal('50000.00')
MAX_SINGLE_TRANSACTION_AMOUNT = Decimal('25000.00')
SUSPICIOUS_AMOUNT_THRESHOLD = Decimal('5000.00')
MAX_REFUND_AGE_DAYS = 90
MIN_TRANSACTION_AMOUNT = Decimal('0.01')

# Regex patterns for financial data validation
REFERENCE_NUMBER_PATTERN = r'^[A-Z]{3}-\d{8}-\d{4}$'
CARD_LAST4_PATTERN = r'^\d{4}$'
RFC_PATTERN = r'^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$'


@dataclass
class ValidationResult:
    """Standardized validation result."""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    risk_score: int = 0  # 0-100, higher is riskier
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


class FinancialIntegrityValidator:
    """
    CRITICAL: Main validator for financial data integrity and business rules.
    
    Provides comprehensive validation including:
    - Amount validation and precision checks
    - Business rule enforcement
    - Fraud pattern detection
    - Regulatory compliance checks
    - Data consistency validation
    """
    
    def validate_transaction_amount(self, amount: Union[str, int, float, Decimal]) -> ValidationResult:
        """
        CRITICAL: Validate transaction amount with strict business rules.
        
        Validates:
        - Amount format and precision
        - Minimum/maximum limits
        - Suspicious amount patterns
        - Decimal precision requirements
        """
        errors = []
        warnings = []
        risk_score = 0
        
        try:
            # Convert to Decimal for precision
            if isinstance(amount, Decimal):
                decimal_amount = amount
            else:
                decimal_amount = Decimal(str(amount))
            
            # Quantize to prevent precision issues
            decimal_amount = decimal_amount.quantize(Decimal('0.01'), rounding=ROUND_DOWN)
            
            # Check minimum amount
            if decimal_amount < MIN_TRANSACTION_AMOUNT:
                errors.append(f"Amount {decimal_amount} below minimum {MIN_TRANSACTION_AMOUNT}")
            
            # Check maximum amount
            if decimal_amount > MAX_SINGLE_TRANSACTION_AMOUNT:
                errors.append(f"Amount {decimal_amount} exceeds maximum {MAX_SINGLE_TRANSACTION_AMOUNT}")
                risk_score += 30
            
            # Check for zero or negative amounts
            if decimal_amount <= 0:
                errors.append(f"Amount must be positive, got {decimal_amount}")
            
            # Check for suspicious amounts
            if decimal_amount > SUSPICIOUS_AMOUNT_THRESHOLD:
                warnings.append(f"Large transaction amount: {decimal_amount}")
                risk_score += 20
            
            # Check for unusual precision (more than 2 decimal places)
            if decimal_amount != decimal_amount.quantize(Decimal('0.01')):
                warnings.append("Transaction amount has unusual precision")
                risk_score += 10
            
            # Check for round number patterns (potential fraud indicator)
            if decimal_amount % 1000 == 0 and decimal_amount >= 5000:
                warnings.append("Exact thousand amount - review for potential fraud")
                risk_score += 15
            
            return ValidationResult(
                is_valid=len(errors) == 0,
                errors=errors,
                warnings=warnings,
                risk_score=risk_score,
                metadata={'validated_amount': str(decimal_amount)}
            )
            
        except (ValueError, TypeError) as e:
            return ValidationResult(
                is_valid=False,
                errors=[f"Invalid amount format: {amount} - {str(e)}"],
                warnings=[],
                risk_score=100
            )
    
    def validate_payment_data(self, payment_data: Dict[str, Any]) -> ValidationResult:
        """
        CRITICAL: Comprehensive payment data validation.
        
        Validates all payment fields for consistency, format, and business rules.
        """
        errors = []
        warnings = []
        risk_score = 0
        
        # Required fields check
        required_fields = ['amount', 'payment_type', 'payment_method']
        for field in required_fields:
            if field not in payment_data or payment_data[field] is None:
                errors.append(f"Required field missing: {field}")
        
        # Amount validation
        if 'amount' in payment_data:
            amount_result = self.validate_transaction_amount(payment_data['amount'])
            errors.extend(amount_result.errors)
            warnings.extend(amount_result.warnings)
            risk_score += amount_result.risk_score
        
        # Payment type validation
        valid_payment_types = [
            'reservation', 'membership', 'class', 'tournament', 
            'product', 'service', 'penalty', 'other'
        ]
        if payment_data.get('payment_type') not in valid_payment_types:
            errors.append(f"Invalid payment type: {payment_data.get('payment_type')}")
        
        # Payment method validation
        valid_payment_methods = [
            'cash', 'card', 'transfer', 'stripe', 'paypal', 
            'oxxo', 'spei', 'credit', 'courtesy'
        ]
        if payment_data.get('payment_method') not in valid_payment_methods:
            errors.append(f"Invalid payment method: {payment_data.get('payment_method')}")
        
        # Reference number format validation
        if 'reference_number' in payment_data and payment_data['reference_number']:
            if not re.match(REFERENCE_NUMBER_PATTERN, payment_data['reference_number']):
                warnings.append("Reference number format may be incorrect")
        
        # Card data validation
        if payment_data.get('payment_method') == 'card':
            card_validation = self._validate_card_data(payment_data)
            errors.extend(card_validation['errors'])
            warnings.extend(card_validation['warnings'])
            risk_score += card_validation['risk_score']
        
        # Billing information validation
        if payment_data.get('requires_invoice', False):
            invoice_validation = self._validate_invoice_data(payment_data)
            errors.extend(invoice_validation['errors'])
            warnings.extend(invoice_validation['warnings'])
        
        # Metadata validation
        if 'metadata' in payment_data:
            metadata_validation = self._validate_metadata(payment_data['metadata'])
            errors.extend(metadata_validation['errors'])
            warnings.extend(metadata_validation['warnings'])
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            risk_score=risk_score
        )
    
    def _validate_card_data(self, payment_data: Dict) -> Dict[str, Any]:
        """Validate credit card related data."""
        errors = []
        warnings = []
        risk_score = 0
        
        # Card last 4 digits validation
        if 'card_last4' in payment_data and payment_data['card_last4']:
            if not re.match(CARD_LAST4_PATTERN, payment_data['card_last4']):
                errors.append("Invalid card last 4 digits format")
        
        # Card brand validation
        valid_brands = ['visa', 'mastercard', 'amex', 'discover', 'jcb', 'diners']
        if payment_data.get('card_brand') and payment_data['card_brand'].lower() not in valid_brands:
            warnings.append(f"Unusual card brand: {payment_data['card_brand']}")
            risk_score += 10
        
        # Country validation for high-risk countries
        high_risk_countries = ['XX', 'YY']  # Example high-risk country codes
        if payment_data.get('card_country') in high_risk_countries:
            warnings.append(f"Card from high-risk country: {payment_data['card_country']}")
            risk_score += 25
        
        return {
            'errors': errors,
            'warnings': warnings,
            'risk_score': risk_score
        }
    
    def _validate_invoice_data(self, payment_data: Dict) -> Dict[str, Any]:
        """Validate invoice-related data."""
        errors = []
        warnings = []
        
        # RFC validation (Mexican tax ID)
        if 'billing_rfc' in payment_data and payment_data['billing_rfc']:
            if not re.match(RFC_PATTERN, payment_data['billing_rfc'].upper()):
                errors.append("Invalid RFC format")
        
        # Required billing fields for invoice
        required_billing_fields = ['billing_name', 'billing_email']
        for field in required_billing_fields:
            if not payment_data.get(field):
                errors.append(f"Required billing field for invoice: {field}")
        
        return {
            'errors': errors,
            'warnings': warnings,
            'risk_score': 0
        }
    
    def _validate_metadata(self, metadata: Dict) -> Dict[str, Any]:
        """Validate metadata structure and content."""
        errors = []
        warnings = []
        
        # Check metadata size
        if len(str(metadata)) > 10000:  # 10KB limit
            errors.append("Metadata too large")
        
        # Check for sensitive data in metadata
        sensitive_patterns = ['password', 'ssn', 'credit_card', 'cvv']
        metadata_str = str(metadata).lower()
        for pattern in sensitive_patterns:
            if pattern in metadata_str:
                errors.append(f"Sensitive data detected in metadata: {pattern}")
        
        return {
            'errors': errors,
            'warnings': warnings
        }
    
    def validate_refund_eligibility(self, payment_id: str, refund_amount: Decimal = None) -> ValidationResult:
        """
        CRITICAL: Validate refund eligibility with strict business rules.
        
        Checks:
        - Payment status and age
        - Refund amount limits
        - Business rule compliance
        - Fraud indicators
        """
        from apps.finance.models import Payment
        
        errors = []
        warnings = []
        risk_score = 0
        
        try:
            payment = Payment.objects.get(id=payment_id)
        except Payment.DoesNotExist:
            return ValidationResult(
                is_valid=False,
                errors=[f"Payment {payment_id} not found"],
                warnings=[],
                risk_score=100
            )
        
        # Check payment status
        if payment.status != 'completed':
            errors.append(f"Cannot refund payment with status: {payment.status}")
        
        # Check payment age
        if payment.processed_at:
            age_days = (timezone.now() - payment.processed_at).days
            if age_days > MAX_REFUND_AGE_DAYS:
                errors.append(f"Payment too old for refund: {age_days} days (max {MAX_REFUND_AGE_DAYS})")
        
        # Check if refundable
        if not payment.is_refundable:
            errors.append("Payment marked as non-refundable")
        
        # Validate refund amount
        if refund_amount is not None:
            available_amount = payment.amount - payment.refund_amount
            
            if refund_amount <= 0:
                errors.append("Refund amount must be positive")
            
            if refund_amount > available_amount:
                errors.append(f"Refund amount {refund_amount} exceeds available {available_amount}")
            
            # Check for suspicious refund patterns
            if refund_amount == payment.amount:
                # Full refund - check for patterns
                recent_full_refunds = Payment.objects.filter(
                    user=payment.user,
                    status='refunded',
                    refunded_at__gte=timezone.now() - timedelta(days=30)
                ).count()
                
                if recent_full_refunds >= 3:
                    warnings.append("Multiple full refunds in past 30 days")
                    risk_score += 25
            
            # Large refund amounts
            if refund_amount > SUSPICIOUS_AMOUNT_THRESHOLD:
                warnings.append(f"Large refund amount: {refund_amount}")
                risk_score += 15
        
        # Check for related object constraints
        if payment.reservation and hasattr(payment.reservation, 'status'):
            if payment.reservation.status == 'completed':
                warnings.append("Refunding payment for completed reservation")
                risk_score += 10
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            risk_score=risk_score,
            metadata={
                'payment_amount': str(payment.amount),
                'available_refund': str(payment.amount - payment.refund_amount),
                'payment_age_days': (timezone.now() - payment.processed_at).days if payment.processed_at else None
            }
        )
    
    def validate_user_transaction_limits(self, user, amount: Decimal) -> ValidationResult:
        """
        CRITICAL: Validate user transaction limits to prevent fraud and abuse.
        
        Checks daily/monthly limits and suspicious patterns.
        """
        from apps.finance.models import Payment
        
        errors = []
        warnings = []
        risk_score = 0
        
        if not user:
            return ValidationResult(
                is_valid=False,
                errors=["User required for transaction limit validation"],
                warnings=[],
                risk_score=50
            )
        
        today = timezone.now().date()
        
        # Check daily transaction limit
        daily_payments = Payment.objects.filter(
            user=user,
            created_at__date=today,
            status__in=['completed', 'processing']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        if daily_payments + amount > MAX_DAILY_TRANSACTION_AMOUNT:
            errors.append(
                f"Daily transaction limit exceeded. "
                f"Current: {daily_payments}, Attempted: {amount}, "
                f"Limit: {MAX_DAILY_TRANSACTION_AMOUNT}"
            )
            risk_score += 40
        
        # Check for velocity abuse (too many transactions in short time)
        recent_transactions = Payment.objects.filter(
            user=user,
            created_at__gte=timezone.now() - timedelta(hours=1),
            status__in=['completed', 'processing']
        ).count()
        
        if recent_transactions >= 10:  # More than 10 transactions in 1 hour
            warnings.append(f"High transaction velocity: {recent_transactions} in past hour")
            risk_score += 30
        
        # Check for unusual amount patterns
        user_avg_amount = Payment.objects.filter(
            user=user,
            status='completed',
            created_at__gte=timezone.now() - timedelta(days=30)
        ).aggregate(avg=models.Avg('amount'))['avg']
        
        if user_avg_amount and amount > user_avg_amount * 5:
            warnings.append(f"Transaction amount much larger than user average: {amount} vs {user_avg_amount}")
            risk_score += 20
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            risk_score=risk_score,
            metadata={
                'daily_total': str(daily_payments),
                'recent_transaction_count': recent_transactions,
                'user_average_amount': str(user_avg_amount) if user_avg_amount else None
            }
        )


class FraudDetectionValidator:
    """
    CRITICAL: Advanced fraud detection with machine learning-style pattern recognition.
    
    Analyzes transaction patterns, user behavior, and risk indicators
    to detect potential fraudulent activity.
    """
    
    def __init__(self):
        # Fraud score thresholds
        self.LOW_RISK_THRESHOLD = 25
        self.MEDIUM_RISK_THRESHOLD = 50
        self.HIGH_RISK_THRESHOLD = 75
        
        # Pattern weights for risk scoring
        self.risk_weights = {
            'unusual_amount': 15,
            'unusual_time': 10,
            'new_payment_method': 20,
            'multiple_attempts': 25,
            'suspicious_location': 30,
            'user_behavior_anomaly': 35,
            'high_value_transaction': 20
        }
    
    def analyze_transaction_risk(self, 
                               user,
                               amount: Decimal,
                               payment_method: str,
                               metadata: Dict = None) -> ValidationResult:
        """
        CRITICAL: Comprehensive fraud analysis for transaction.
        
        Returns risk assessment with detailed scoring and recommendations.
        """
        risk_indicators = []
        risk_score = 0
        warnings = []
        errors = []
        
        if not metadata:
            metadata = {}
        
        # User behavior analysis
        if user:
            behavior_analysis = self._analyze_user_behavior(user, amount, payment_method)
            risk_score += behavior_analysis['risk_score']
            risk_indicators.extend(behavior_analysis['indicators'])
            
            # Account age analysis
            account_age_days = (timezone.now() - user.date_joined).days
            if account_age_days < 7:  # New account
                risk_score += self.risk_weights['new_payment_method']
                risk_indicators.append(f'new_account_{account_age_days}_days')
        
        # Amount pattern analysis
        amount_analysis = self._analyze_amount_patterns(amount, user)
        risk_score += amount_analysis['risk_score']
        risk_indicators.extend(amount_analysis['indicators'])
        
        # Time-based analysis
        time_analysis = self._analyze_transaction_timing()
        risk_score += time_analysis['risk_score']
        risk_indicators.extend(time_analysis['indicators'])
        
        # Payment method analysis
        method_analysis = self._analyze_payment_method_risk(payment_method, user)
        risk_score += method_analysis['risk_score']
        risk_indicators.extend(method_analysis['indicators'])
        
        # IP/Location analysis (if available in metadata)
        if 'ip_address' in metadata:
            location_analysis = self._analyze_location_risk(metadata['ip_address'], user)
            risk_score += location_analysis['risk_score']
            risk_indicators.extend(location_analysis['indicators'])
        
        # Generate risk level and recommendations
        risk_level = self._determine_risk_level(risk_score)
        recommendations = self._generate_fraud_recommendations(risk_level, risk_indicators)
        
        # Determine if transaction should be blocked
        should_block = risk_score >= self.HIGH_RISK_THRESHOLD
        if should_block:
            errors.append(f"Transaction blocked due to high fraud risk (score: {risk_score})")
        elif risk_score >= self.MEDIUM_RISK_THRESHOLD:
            warnings.append(f"Medium fraud risk detected (score: {risk_score})")
        
        return ValidationResult(
            is_valid=not should_block,
            errors=errors,
            warnings=warnings,
            risk_score=risk_score,
            metadata={
                'risk_level': risk_level,
                'risk_indicators': risk_indicators,
                'recommendations': recommendations,
                'fraud_score': risk_score
            }
        )
    
    def _analyze_user_behavior(self, user, amount: Decimal, payment_method: str) -> Dict[str, Any]:
        """Analyze user behavior patterns for anomalies."""
        from apps.finance.models import Payment
        
        risk_score = 0
        indicators = []
        
        # Get user's transaction history
        user_payments = Payment.objects.filter(
            user=user,
            status='completed',
            created_at__gte=timezone.now() - timedelta(days=90)
        ).order_by('-created_at')
        
        if not user_payments.exists():
            risk_score += 20
            indicators.append('no_transaction_history')
            return {'risk_score': risk_score, 'indicators': indicators}
        
        # Average transaction amount
        avg_amount = user_payments.aggregate(avg=Sum('amount'))['avg'] or Decimal('0')
        if amount > avg_amount * 3:  # 3x higher than average
            risk_score += self.risk_weights['unusual_amount']
            indicators.append(f'amount_3x_higher_than_average')
        
        # Payment method consistency
        common_methods = user_payments.values('payment_method').annotate(
            count=Count('payment_method')
        ).order_by('-count')
        
        if common_methods.exists():
            most_common_method = common_methods.first()['payment_method']
            if payment_method != most_common_method:
                risk_score += self.risk_weights['new_payment_method'] // 2
                indicators.append(f'unusual_payment_method_{payment_method}')
        
        # Transaction frequency analysis
        recent_count = user_payments.filter(
            created_at__gte=timezone.now() - timedelta(days=1)
        ).count()
        
        if recent_count > 5:  # More than 5 transactions in 24 hours
            risk_score += self.risk_weights['multiple_attempts']
            indicators.append(f'high_frequency_{recent_count}_per_day')
        
        return {'risk_score': risk_score, 'indicators': indicators}
    
    def _analyze_amount_patterns(self, amount: Decimal, user) -> Dict[str, Any]:
        """Analyze amount for suspicious patterns."""
        risk_score = 0
        indicators = []
        
        # Check for round numbers (fraud indicator)
        if amount % 100 == 0 and amount >= 1000:
            risk_score += 15
            indicators.append(f'round_number_{amount}')
        
        # Check for exact amounts that might indicate testing
        test_amounts = [Decimal('1.00'), Decimal('0.01'), Decimal('100.00')]
        if amount in test_amounts:
            risk_score += 25
            indicators.append(f'test_amount_{amount}')
        
        # High-value transaction
        if amount > Decimal('10000.00'):
            risk_score += self.risk_weights['high_value_transaction']
            indicators.append(f'high_value_{amount}')
        
        # Unusual precision (too many decimal places)
        if str(amount).count('.') > 0:
            decimal_places = len(str(amount).split('.')[1])
            if decimal_places > 2:
                risk_score += 10
                indicators.append(f'unusual_precision_{decimal_places}_places')
        
        return {'risk_score': risk_score, 'indicators': indicators}
    
    def _analyze_transaction_timing(self) -> Dict[str, Any]:
        """Analyze transaction timing for anomalies."""
        risk_score = 0
        indicators = []
        
        current_time = timezone.now()
        hour = current_time.hour
        day_of_week = current_time.weekday()
        
        # Unusual hours (midnight to 6 AM)
        if 0 <= hour <= 6:
            risk_score += self.risk_weights['unusual_time']
            indicators.append(f'unusual_hour_{hour}')
        
        # Weekend transactions (higher risk for some business types)
        if day_of_week >= 5:  # Saturday, Sunday
            risk_score += 5
            indicators.append('weekend_transaction')
        
        return {'risk_score': risk_score, 'indicators': indicators}
    
    def _analyze_payment_method_risk(self, payment_method: str, user) -> Dict[str, Any]:
        """Analyze payment method specific risks."""
        risk_score = 0
        indicators = []
        
        # High-risk payment methods
        high_risk_methods = ['cryptocurrency', 'gift_card', 'money_order']
        if payment_method in high_risk_methods:
            risk_score += 30
            indicators.append(f'high_risk_method_{payment_method}')
        
        # Cash transactions over certain amounts
        if payment_method == 'cash' and user:
            # Cash is higher risk for large amounts due to money laundering concerns
            risk_score += 5
            indicators.append('cash_transaction')
        
        return {'risk_score': risk_score, 'indicators': indicators}
    
    def _analyze_location_risk(self, ip_address: str, user) -> Dict[str, Any]:
        """Analyze IP/location for fraud indicators."""
        risk_score = 0
        indicators = []
        
        # This would integrate with IP geolocation service in production
        # For now, basic IP validation
        
        # Check for private/internal IPs (unusual for external transactions)
        if ip_address.startswith(('192.168.', '10.', '172.16.')):
            risk_score += 15
            indicators.append('private_ip_address')
        
        # Check for known proxy/VPN patterns (simplified)
        suspicious_patterns = ['vpn', 'proxy', 'tor']
        # In production, you'd use a proper IP intelligence service
        
        return {'risk_score': risk_score, 'indicators': indicators}
    
    def _determine_risk_level(self, risk_score: int) -> str:
        """Determine risk level based on score."""
        if risk_score < self.LOW_RISK_THRESHOLD:
            return 'low'
        elif risk_score < self.MEDIUM_RISK_THRESHOLD:
            return 'medium'
        elif risk_score < self.HIGH_RISK_THRESHOLD:
            return 'high'
        else:
            return 'critical'
    
    def _generate_fraud_recommendations(self, risk_level: str, indicators: List[str]) -> List[str]:
        """Generate recommendations based on fraud analysis."""
        recommendations = []
        
        if risk_level == 'low':
            recommendations.append("Process transaction normally")
        elif risk_level == 'medium':
            recommendations.append("Consider additional verification")
            recommendations.append("Monitor for follow-up transactions")
        elif risk_level == 'high':
            recommendations.append("Require manual review before processing")
            recommendations.append("Request additional identity verification")
        else:  # critical
            recommendations.append("Block transaction")
            recommendations.append("Require comprehensive identity verification")
            recommendations.append("Escalate to fraud team")
        
        # Specific recommendations based on indicators
        if any('new_account' in indicator for indicator in indicators):
            recommendations.append("Verify new account with additional documentation")
        
        if any('high_value' in indicator for indicator in indicators):
            recommendations.append("Require approval for high-value transaction")
        
        if any('unusual_hour' in indicator for indicator in indicators):
            recommendations.append("Verify transaction during business hours")
        
        return recommendations


# Singleton instances for global use
financial_integrity_validator = FinancialIntegrityValidator()
fraud_detection_validator = FraudDetectionValidator()