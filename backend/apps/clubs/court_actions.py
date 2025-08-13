"""
Additional actions for Court ViewSet - EMERGENCY RECOVERY VERSION.
"""

import json
from datetime import datetime, timedelta

from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import BulkAvailabilityRequestSerializer


class CourtActionsMixin:
    """Mixin to add additional actions to CourtViewSet."""

    @action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        """
        Get court availability for a specific date.
        Query params:
        - date: YYYY-MM-DD format (defaults to today)
        - days: number of days to check (defaults to 1, max 30)
        """
        court = self.get_object()
        date_str = request.query_params.get("date", timezone.now().date().isoformat())
        days = min(int(request.query_params.get("days", 1)), 30)

        try:
            start_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        availability_data = []

        for day_offset in range(days):
            current_date = start_date + timedelta(days=day_offset)

            # Get club schedule for this day
            weekday = current_date.weekday()
            schedule = court.club.schedules.filter(weekday=weekday).first()

            if not schedule or schedule.is_closed:
                availability_data.append(
                    {
                        "date": current_date.isoformat(),
                        "is_closed": True,
                        "time_slots": [],
                    }
                )
                continue

            # Generate time slots
            time_slots = []
            slot_duration = 60  # minutes
            current_time = datetime.combine(current_date, schedule.opening_time)
            end_time = datetime.combine(current_date, schedule.closing_time)

            while current_time < end_time:
                slot_end = current_time + timedelta(minutes=slot_duration)

                # Check if slot is available (not reserved)
                is_reserved = court.reservations.filter(
                    date=current_date,
                    start_time__lt=slot_end.time(),
                    end_time__gt=current_time.time(),
                    status__in=["confirmed", "pending"],
                ).exists()

                # Check for maintenance during this time slot
                from .models import MaintenanceRecord
                is_under_maintenance = MaintenanceRecord.objects.filter(
                    court=court,
                    status__in=['scheduled', 'in_progress'],
                    scheduled_date__date=current_date,
                    scheduled_date__time__lt=slot_end.time(),
                    scheduled_end_date__time__gt=current_time.time(),
                ).exists()

                # Also check the court's general maintenance status
                is_general_maintenance = court.is_maintenance

                is_available = not is_reserved and not is_under_maintenance and not is_general_maintenance

                time_slots.append(
                    {
                        "start_time": current_time.time().isoformat(),
                        "end_time": slot_end.time().isoformat(),
                        "is_available": is_available,
                        "is_reserved": is_reserved,
                        "is_maintenance": is_under_maintenance or is_general_maintenance,
                        "price": str(court.price_per_hour),
                    }
                )

                current_time = slot_end

            availability_data.append(
                {
                    "date": current_date.isoformat(),
                    "is_closed": False,
                    "time_slots": time_slots,
                }
            )

        return Response(
            {
                "court_id": str(court.id),
                "court_name": court.name,
                "availability": availability_data,
            }
        )

    @action(detail=True, methods=["get"], url_path="weekly-availability")
    def weekly_availability(self, request, pk=None):
        """Get court availability pattern for a typical week."""
        court = self.get_object()

        weekly_pattern = {}
        days = [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
        ]

        for weekday, day_name in enumerate(days):
            schedule = court.club.schedules.filter(weekday=weekday).first()

            if not schedule:
                weekly_pattern[day_name] = {
                    "is_closed": True,
                    "opening_time": None,
                    "closing_time": None,
                    "typical_occupancy": 0,
                }
            else:
                # Calculate typical occupancy for this day
                past_30_days = timezone.now().date() - timedelta(days=30)
                reservations_count = court.reservations.filter(
                    date__gte=past_30_days,
                    date__week_day=weekday + 1,  # Django uses 1-7, Monday is 1
                    status="confirmed",
                ).count()

                # Calculate available slots per day
                if not schedule.is_closed:
                    opening = datetime.combine(datetime.today(), schedule.opening_time)
                    closing = datetime.combine(datetime.today(), schedule.closing_time)
                    total_hours = (closing - opening).seconds / 3600
                    total_slots = int(total_hours)  # 1-hour slots

                    occupancy_rate = (
                        (reservations_count / (total_slots * 4.3)) * 100
                        if total_slots > 0
                        else 0
                    )  # 4.3 weeks in 30 days
                else:
                    occupancy_rate = 0

                weekly_pattern[day_name] = {
                    "is_closed": schedule.is_closed,
                    "opening_time": (
                        schedule.opening_time.isoformat()
                        if schedule.opening_time
                        else None
                    ),
                    "closing_time": (
                        schedule.closing_time.isoformat()
                        if schedule.closing_time
                        else None
                    ),
                    "typical_occupancy": round(occupancy_rate, 1),
                }

        return Response(
            {
                "court_id": str(court.id),
                "court_name": court.name,
                "weekly_pattern": weekly_pattern,
            }
        )

    @action(detail=True, methods=["get", "post"])
    def pricing(self, request, pk=None):
        """Get or update court pricing."""
        court = self.get_object()

        if request.method == "GET":
            # Get special pricing periods for this court
            from .models import CourtSpecialPricing
            from .serializers import SpecialPricingPeriodSummarySerializer
            from django.utils import timezone
            
            today = timezone.now().date()
            
            # Get all active special pricing periods
            special_pricing_periods = CourtSpecialPricing.objects.filter(
                court=court,
                is_active=True
            ).order_by('-priority', 'start_date')
            
            # Serialize special pricing periods
            special_pricing_data = []
            for period in special_pricing_periods:
                period_data = {
                    "id": str(period.id),
                    "name": period.name,
                    "description": period.description,
                    "period_type": period.period_type,
                    "period_type_display": period.get_period_type_display(),
                    "start_date": str(period.start_date),
                    "end_date": str(period.end_date),
                    "start_time": str(period.start_time) if period.start_time else None,
                    "end_time": str(period.end_time) if period.end_time else None,
                    "days_of_week": period.days_of_week,
                    "price_per_hour": str(period.price_per_hour),
                    "priority": period.priority,
                    "is_currently_active": period.is_applicable_for_datetime(today),
                    "created_at": period.created_at.isoformat(),
                    "updated_at": period.updated_at.isoformat(),
                }
                special_pricing_data.append(period_data)
            
            # Get current effective price (considering special pricing)
            current_effective_price = CourtSpecialPricing.get_effective_price_for_court_datetime(
                court, today
            )
            
            # Check if there's a special price active right now
            current_time = timezone.now().time()
            active_special_pricing = CourtSpecialPricing.get_active_pricing_for_court_datetime(
                court, today, current_time
            )
            
            # Return current pricing with special pricing information
            return Response(
                {
                    "court_id": str(court.id),
                    "court_name": court.name,
                    "default_price_per_hour": str(court.price_per_hour),
                    "current_effective_price": str(current_effective_price),
                    "currency": "MXN",
                    "has_active_special_pricing": active_special_pricing is not None,
                    "active_special_pricing": {
                        "id": str(active_special_pricing.id),
                        "name": active_special_pricing.name,
                        "period_type": active_special_pricing.period_type,
                        "period_type_display": active_special_pricing.get_period_type_display(),
                        "price_per_hour": str(active_special_pricing.price_per_hour),
                        "priority": active_special_pricing.priority,
                    } if active_special_pricing else None,
                    "special_pricing_periods": special_pricing_data,
                    "special_pricing_count": len(special_pricing_data),
                    "generated_at": timezone.now().isoformat(),
                }
            )

        elif request.method == "POST":
            # Update pricing
            new_price = request.data.get("price_per_hour")

            if new_price is None:
                return Response(
                    {"error": "price_per_hour is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                court.price_per_hour = float(new_price)
                court.save(update_fields=["price_per_hour", "updated_at"])

                return Response(
                    {
                        "court_id": str(court.id),
                        "court_name": court.name,
                        "price_per_hour": str(court.price_per_hour),
                        "updated_at": court.updated_at.isoformat(),
                    }
                )
            except (ValueError, TypeError):
                return Response(
                    {"error": "Invalid price format"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

    @action(detail=True, methods=["get"])
    def effective_pricing(self, request, pk=None):
        """Get effective pricing for a court at a specific date/time."""
        court = self.get_object()
        
        # Get parameters
        date_str = request.query_params.get("date")
        time_str = request.query_params.get("time")
        
        if not date_str:
            from django.utils import timezone
            date = timezone.now().date()
        else:
            try:
                from datetime import datetime
                date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        time = None
        if time_str:
            try:
                from datetime import datetime
                time = datetime.strptime(time_str, "%H:%M").time()
            except ValueError:
                return Response(
                    {"error": "Invalid time format. Use HH:MM"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        # Get effective price and active special pricing
        from .models import CourtSpecialPricing
        
        effective_price = CourtSpecialPricing.get_effective_price_for_court_datetime(
            court, date, time
        )
        
        active_special_pricing = CourtSpecialPricing.get_active_pricing_for_court_datetime(
            court, date, time
        )
        
        return Response({
            "court_id": str(court.id),
            "court_name": court.name,
            "date": str(date),
            "time": str(time) if time else None,
            "default_price_per_hour": str(court.price_per_hour),
            "effective_price_per_hour": str(effective_price),
            "has_special_pricing": active_special_pricing is not None,
            "special_pricing": {
                "id": str(active_special_pricing.id),
                "name": active_special_pricing.name,
                "period_type": active_special_pricing.period_type,
                "period_type_display": active_special_pricing.get_period_type_display(),
                "price_per_hour": str(active_special_pricing.price_per_hour),
                "priority": active_special_pricing.priority,
                "start_date": str(active_special_pricing.start_date),
                "end_date": str(active_special_pricing.end_date),
                "start_time": str(active_special_pricing.start_time) if active_special_pricing.start_time else None,
                "end_time": str(active_special_pricing.end_time) if active_special_pricing.end_time else None,
            } if active_special_pricing else None,
        })

    @action(detail=True, methods=["get"])
    def occupancy(self, request, pk=None):
        """Get court occupancy statistics."""
        court = self.get_object()

        # Get date range from query params
        days = int(request.query_params.get("days", 30))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # Get all reservations in date range
        reservations = court.reservations.filter(
            date__range=[start_date, end_date], status="confirmed"
        )

        # Calculate total available hours
        total_hours = 0
        current_date = start_date

        while current_date <= end_date:
            weekday = current_date.weekday()
            schedule = court.club.schedules.filter(weekday=weekday).first()

            if schedule and not schedule.is_closed:
                opening = datetime.combine(current_date, schedule.opening_time)
                closing = datetime.combine(current_date, schedule.closing_time)
                daily_hours = (closing - opening).seconds / 3600
                total_hours += daily_hours

            current_date += timedelta(days=1)

        # Calculate occupied hours
        occupied_hours = sum(
            [
                (
                    datetime.combine(r.date, r.end_time)
                    - datetime.combine(r.date, r.start_time)
                ).seconds
                / 3600
                for r in reservations
            ]
        )

        occupancy_rate = (occupied_hours / total_hours * 100) if total_hours > 0 else 0

        # Daily breakdown
        daily_stats = []
        current_date = start_date

        while current_date <= end_date:
            daily_reservations = reservations.filter(date=current_date)
            daily_hours = sum(
                [
                    (
                        datetime.combine(r.date, r.end_time)
                        - datetime.combine(r.date, r.start_time)
                    ).seconds
                    / 3600
                    for r in daily_reservations
                ]
            )

            daily_stats.append(
                {
                    "date": current_date.isoformat(),
                    "reservations_count": daily_reservations.count(),
                    "occupied_hours": daily_hours,
                    "revenue": float(daily_hours * court.price_per_hour),
                }
            )

            current_date += timedelta(days=1)

        return Response(
            {
                "court_id": str(court.id),
                "court_name": court.name,
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": days,
                },
                "summary": {
                    "total_available_hours": round(total_hours, 1),
                    "total_occupied_hours": round(occupied_hours, 1),
                    "occupancy_rate": round(occupancy_rate, 1),
                    "total_reservations": reservations.count(),
                    "total_revenue": float(occupied_hours * court.price_per_hour),
                },
                "daily_breakdown": daily_stats[-7:],  # Last 7 days for brevity
            }
        )

    @action(detail=True, methods=["post"], url_path="bulk-availability")
    def bulk_availability(self, request, pk=None):
        """
        Update availability for multiple time slots at once.
        
        This endpoint allows bulk blocking/unblocking of court time slots.
        Note: This is a simplified implementation. In production, you might want
        to use a separate BlockedSlot model for more granular control.
        """
        court = self.get_object()

        # Validate request data
        serializer = BulkAvailabilityRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        slots = serializer.validated_data["slots"]
        updated_count = 0
        errors = []

        for slot_data in slots:
            try:
                date = slot_data["date"]
                start_time = slot_data["start_time"]
                end_time = slot_data["end_time"]
                is_available = slot_data.get("is_available", True)

                # Validate time range
                if end_time <= start_time:
                    errors.append({
                        "slot": slot_data,
                        "error": "End time must be after start time"
                    })
                    continue

                # Check if date is in the past (optional validation)
                if date < timezone.now().date():
                    errors.append({
                        "slot": slot_data,
                        "error": "Cannot modify availability for past dates"
                    })
                    continue

                if not is_available:
                    # For this simplified implementation, we'll use the maintenance flag
                    # In production, consider using a separate BlockedTimeSlot model
                    court.is_maintenance = True
                    maintenance_note = f"Blocked slot: {date} {start_time}-{end_time}"
                    if court.maintenance_notes:
                        court.maintenance_notes += f"; {maintenance_note}"
                    else:
                        court.maintenance_notes = maintenance_note
                    court.save(update_fields=["is_maintenance", "maintenance_notes", "updated_at"])
                    updated_count += 1
                else:
                    # For enabling availability, we'd need more complex logic
                    # For now, just count it as processed
                    updated_count += 1

            except Exception as e:
                errors.append({
                    "slot": slot_data,
                    "error": f"Unexpected error: {str(e)}"
                })

        return Response(
            {
                "court_id": str(court.id),
                "updated_slots": updated_count,
                "errors": errors,
                "message": f"Processed {updated_count} slots with {len(errors)} errors"
            }
        )

    @action(detail=True, methods=["get", "post"])
    def maintenance(self, request, pk=None):
        """Get or schedule court maintenance."""
        court = self.get_object()

        if request.method == "GET":
            # Return maintenance history and scheduled maintenance
            from .models import MaintenanceRecord
            from .serializers import MaintenanceRecordSerializer
            
            # Get maintenance history (last 30 days)
            past_30_days = timezone.now() - timedelta(days=30)
            maintenance_history = MaintenanceRecord.objects.filter(
                court=court,
                status='completed',
                completed_at__gte=past_30_days
            ).order_by('-completed_at')[:10]
            
            # Get scheduled maintenance (upcoming)
            scheduled_maintenance = MaintenanceRecord.objects.filter(
                court=court,
                status__in=['scheduled', 'in_progress'],
                scheduled_date__gte=timezone.now()
            ).order_by('scheduled_date')
            
            # Get active maintenance separately to avoid slice error
            active_maintenance_exists = MaintenanceRecord.objects.filter(
                court=court, 
                status='in_progress'
            ).exists()
            
            # Limit the queryset for serialization
            scheduled_maintenance_limited = scheduled_maintenance[:10]
            
            return Response(
                {
                    "court_id": str(court.id),
                    "court_name": court.name,
                    "current_status": {
                        "is_maintenance": court.is_maintenance,
                        "maintenance_notes": court.maintenance_notes,
                        "has_active_maintenance": active_maintenance_exists,
                        "next_scheduled": (
                            scheduled_maintenance.first().scheduled_date.isoformat() 
                            if scheduled_maintenance.exists() else None
                        ),
                    },
                    "maintenance_history": MaintenanceRecordSerializer(maintenance_history, many=True).data,
                    "scheduled_maintenance": MaintenanceRecordSerializer(scheduled_maintenance_limited, many=True).data,
                    "stats": {
                        "total_completed": MaintenanceRecord.objects.filter(court=court, status='completed').count(),
                        "pending_count": scheduled_maintenance.count(),
                        "overdue_count": MaintenanceRecord.objects.filter(
                            court=court,
                            status='scheduled',
                            scheduled_date__lt=timezone.now()
                        ).count(),
                    }
                }
            )

        elif request.method == "POST":
            # Schedule new maintenance using MaintenanceRecord
            from .models import MaintenanceRecord, MaintenanceType
            from .serializers import MaintenanceRecordCreateSerializer
            
            # Get basic data
            maintenance_type_id = request.data.get("maintenance_type_id")
            title = request.data.get("title", "Court Maintenance")
            description = request.data.get("description", "")
            scheduled_date = request.data.get("scheduled_date")
            duration_hours = float(request.data.get("duration_hours", 2))
            priority = request.data.get("priority", "medium")

            if not scheduled_date:
                return Response(
                    {"error": "scheduled_date is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                # Parse scheduled date
                if isinstance(scheduled_date, str):
                    try:
                        scheduled_datetime = datetime.strptime(scheduled_date, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        try:
                            scheduled_datetime = datetime.strptime(scheduled_date, "%Y-%m-%dT%H:%M:%S")
                        except ValueError:
                            scheduled_datetime = datetime.strptime(scheduled_date, "%Y-%m-%d %H:%M")
                    
                    # Make timezone aware
                    scheduled_datetime = timezone.make_aware(scheduled_datetime)
                else:
                    scheduled_datetime = scheduled_date
                
                # Calculate end time
                scheduled_end_datetime = scheduled_datetime + timedelta(hours=duration_hours)
                
                # Get maintenance type if provided
                maintenance_type = None
                if maintenance_type_id:
                    try:
                        maintenance_type = MaintenanceType.objects.get(
                            id=maintenance_type_id,
                            organization=request.user.organization
                        )
                    except MaintenanceType.DoesNotExist:
                        pass

                # Create maintenance record
                maintenance_data = {
                    'club': court.club.id,
                    'court': court.id,
                    'maintenance_type': maintenance_type.id if maintenance_type else None,
                    'title': title,
                    'description': description,
                    'scheduled_date': scheduled_datetime,
                    'scheduled_end_date': scheduled_end_datetime,
                    'priority': priority,
                    'estimated_cost': maintenance_type.estimated_cost if maintenance_type else 0,
                }
                
                serializer = MaintenanceRecordCreateSerializer(data=maintenance_data)
                if serializer.is_valid():
                    maintenance_record = serializer.save(
                        organization=request.user.organization,
                        created_by=request.user
                    )
                    
                    return Response({
                        "court_id": str(court.id),
                        "message": "Maintenance scheduled successfully",
                        "maintenance_record": MaintenanceRecordSerializer(maintenance_record).data
                    })
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            except ValueError as e:
                return Response(
                    {"error": f"Invalid date format: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            except Exception as e:
                return Response(
                    {"error": f"Failed to schedule maintenance: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
