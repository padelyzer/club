"""
Views for classes module.
"""

from datetime import date, datetime, timedelta

from django.db.models import Avg, Count, Q
from django.utils import timezone

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.classes.models import (
    ClassAttendance,
    ClassEnrollment,
    ClassLevel,
    ClassPackage,
    ClassSchedule,
    ClassSession,
    ClassType,
    Instructor,
    InstructorEvaluation,
    StudentPackage,
)
from apps.classes.serializers import (
    ClassAttendanceSerializer,
    ClassEnrollmentSerializer,
    ClassLevelSerializer,
    ClassPackageSerializer,
    ClassScheduleSerializer,
    ClassSessionSerializer,
    ClassTypeSerializer,
    InstructorEvaluationSerializer,
    InstructorSerializer,
    StudentPackageSerializer,
)
from core.pagination import StandardResultsSetPagination
from core.permissions import IsAuthenticated, IsOrganizationMember
from apps.finance.models import Payment
from apps.finance.services import PaymentService


class ClassLevelViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassLevel model."""

    queryset = ClassLevel.objects.all()
    serializer_class = ClassLevelSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        if self.request.query_params.get("active_only") == "true":
            queryset = queryset.filter(is_active=True)

        return queryset.order_by("order")


class ClassTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassType model."""

    queryset = ClassType.objects.all()
    serializer_class = ClassTypeSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by organization/club
        user_org = self.request.user.organization
        queryset = queryset.filter(organization=user_org)

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by active status
        if self.request.query_params.get("active_only") == "true":
            queryset = queryset.filter(is_active=True)

        return queryset


class InstructorViewSet(viewsets.ModelViewSet):
    """ViewSet for Instructor model."""

    queryset = Instructor.objects.all()
    serializer_class = InstructorSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by organization/club
        user_org = self.request.user.organization
        queryset = queryset.filter(organization=user_org)

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by active status
        if self.request.query_params.get("active_only") == "true":
            queryset = queryset.filter(is_active=True)

        # Filter by specialties
        specialty = self.request.query_params.get("specialty")
        if specialty:
            queryset = queryset.filter(specialties__id=specialty)

        return queryset

    @action(detail=True, methods=["get"])
    def schedule(self, request, pk=None):
        """Get instructor's schedule."""
        instructor = self.get_object()

        # Get date range
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if not start_date:
            start_date = timezone.now().date()
        else:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

        if not end_date:
            end_date = start_date + timedelta(days=30)
        else:
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

        # Get sessions
        sessions = ClassSession.objects.filter(
            instructor=instructor,
            scheduled_datetime__date__range=[start_date, end_date],
        ).order_by("scheduled_datetime")

        serializer = ClassSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def evaluations(self, request, pk=None):
        """Get instructor evaluations."""
        instructor = self.get_object()

        evaluations = InstructorEvaluation.objects.filter(
            instructor=instructor
        ).order_by("-created_at")

        # Filter by rating
        min_rating = request.query_params.get("min_rating")
        if min_rating:
            evaluations = evaluations.filter(overall_rating__gte=min_rating)

        # Pagination
        page = self.paginate_queryset(evaluations)
        if page is not None:
            serializer = InstructorEvaluationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = InstructorEvaluationSerializer(evaluations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        """Get instructor statistics."""
        instructor = self.get_object()

        # Calculate stats
        total_sessions = ClassSession.objects.filter(instructor=instructor).count()
        completed_sessions = ClassSession.objects.filter(
            instructor=instructor, status="completed"
        ).count()

        total_students = ClassEnrollment.objects.filter(
            session__instructor=instructor, status="enrolled"
        ).count()

        avg_attendance = ClassAttendance.objects.filter(
            session__instructor=instructor, present=True
        ).count()

        # Recent evaluations
        evaluations_stats = InstructorEvaluation.objects.filter(
            instructor=instructor
        ).aggregate(
            avg_overall=Avg("overall_rating"),
            avg_teaching=Avg("teaching_quality"),
            avg_punctuality=Avg("punctuality"),
            avg_communication=Avg("communication"),
            total_evaluations=Count("id"),
        )

        return Response(
            {
                "total_sessions": total_sessions,
                "completed_sessions": completed_sessions,
                "total_students": total_students,
                "attendance_rate": avg_attendance / max(completed_sessions, 1) * 100,
                "evaluations": evaluations_stats,
            }
        )
    
    @action(detail=True, methods=["get", "post"])
    def availability(self, request, pk=None):
        """Get or update instructor availability."""
        instructor = self.get_object()
        
        if request.method == "GET":
            # Return current availability
            return Response({
                "available_days": instructor.available_days,
                "available_from": instructor.available_from,
                "available_until": instructor.available_until,
                "max_weekly_hours": instructor.max_weekly_hours,
                "accepts_substitutions": instructor.accepts_substitutions
            })
        
        # Update availability
        if "available_days" in request.data:
            instructor.available_days = request.data["available_days"]
        if "available_from" in request.data:
            instructor.available_from = request.data["available_from"]
        if "available_until" in request.data:
            instructor.available_until = request.data["available_until"]
        if "max_weekly_hours" in request.data:
            instructor.max_weekly_hours = request.data["max_weekly_hours"]
        if "accepts_substitutions" in request.data:
            instructor.accepts_substitutions = request.data["accepts_substitutions"]
        
        instructor.save()
        
        return Response({
            "message": "Availability updated",
            "available_days": instructor.available_days,
            "available_from": instructor.available_from,
            "available_until": instructor.available_until,
            "max_weekly_hours": instructor.max_weekly_hours,
            "accepts_substitutions": instructor.accepts_substitutions
        })
    
    @action(detail=True, methods=["get"])
    def upcoming_sessions(self, request, pk=None):
        """Get instructor's upcoming sessions."""
        instructor = self.get_object()
        
        sessions = ClassSession.objects.filter(
            Q(instructor=instructor) | Q(substitute_instructor=instructor),
            scheduled_datetime__gte=timezone.now(),
            status__in=["scheduled", "confirmed"]
        ).order_by("scheduled_datetime")[:10]
        
        serializer = ClassSessionSerializer(sessions, many=True)
        return Response(serializer.data)


class ClassScheduleViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassSchedule model."""

    queryset = ClassSchedule.objects.all()
    serializer_class = ClassScheduleSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by organization/club
        user_org = self.request.user.organization
        queryset = queryset.filter(organization=user_org)

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by active/published status
        if self.request.query_params.get("published_only") == "true":
            queryset = queryset.filter(is_published=True, is_active=True)

        # Filter by instructor
        instructor_id = self.request.query_params.get("instructor")
        if instructor_id:
            queryset = queryset.filter(instructor_id=instructor_id)

        # Filter by class type
        class_type_id = self.request.query_params.get("class_type")
        if class_type_id:
            queryset = queryset.filter(class_type_id=class_type_id)

        # Filter by level
        level_id = self.request.query_params.get("level")
        if level_id:
            queryset = queryset.filter(level_id=level_id)

        return queryset

    @action(detail=True, methods=["post"])
    def generate_sessions(self, request, pk=None):
        """Generate sessions for schedule."""
        schedule = self.get_object()

        until_date_str = request.data.get("until_date")
        until_date = None

        if until_date_str:
            until_date = datetime.strptime(until_date_str, "%Y-%m-%d").date()

        sessions_created = schedule.generate_sessions(until_date)

        return Response(
            {
                "sessions_created": sessions_created,
                "message": f"Se crearon {sessions_created} sesiones",
            }
        )

    @action(detail=True, methods=["patch"])
    def toggle_published(self, request, pk=None):
        """Toggle published status."""
        schedule = self.get_object()
        schedule.is_published = not schedule.is_published
        schedule.save()

        return Response(
            {
                "is_published": schedule.is_published,
                "message": "Publicado" if schedule.is_published else "Despublicado",
            }
        )


class ClassSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassSession model."""

    queryset = ClassSession.objects.all()
    serializer_class = ClassSessionSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by organization/club
        user_org = self.request.user.organization
        queryset = queryset.filter(organization=user_org)

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by date range
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            queryset = queryset.filter(scheduled_datetime__date__gte=start_date)

        if end_date:
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            queryset = queryset.filter(scheduled_datetime__date__lte=end_date)

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by instructor
        instructor_id = self.request.query_params.get("instructor")
        if instructor_id:
            queryset = queryset.filter(instructor_id=instructor_id)

        # Filter upcoming/past
        time_filter = self.request.query_params.get("time_filter")
        if time_filter == "upcoming":
            queryset = queryset.filter(scheduled_datetime__gt=timezone.now())
        elif time_filter == "past":
            queryset = queryset.filter(scheduled_datetime__lt=timezone.now())

        return queryset.order_by("scheduled_datetime")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel session."""
        session = self.get_object()
        reason = request.data.get("reason", "")

        session.cancel(reason)

        return Response({"status": "cancelled", "message": "Clase cancelada"})

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Start session."""
        session = self.get_object()

        session.status = "in_progress"
        session.actual_start_time = timezone.now()
        session.save()

        return Response({"status": "in_progress", "message": "Clase iniciada"})

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Complete session."""
        session = self.get_object()

        session.status = "completed"
        session.actual_end_time = timezone.now()
        session.save()

        return Response({"status": "completed", "message": "Clase completada"})

    @action(detail=True, methods=["get"])
    def enrollments(self, request, pk=None):
        """Get session enrollments."""
        session = self.get_object()

        enrollments = session.enrollments.all().order_by("enrolled_at")

        # Filter by status
        status_filter = request.query_params.get("status")
        if status_filter:
            enrollments = enrollments.filter(status=status_filter)

        serializer = ClassEnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"])
    def take_attendance(self, request, pk=None):
        """Take attendance for the session."""
        session = self.get_object()
        
        # Check if session is in progress or completed
        if session.status not in ["in_progress", "completed"]:
            return Response(
                {"error": "Cannot take attendance for session that hasn't started"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attendance_data = request.data.get("attendance", [])
        
        for record in attendance_data:
            enrollment_id = record.get("enrollment_id")
            present = record.get("present", False)
            notes = record.get("notes", "")
            
            try:
                enrollment = ClassEnrollment.objects.get(
                    id=enrollment_id,
                    session=session
                )
                
                # Create or update attendance record
                attendance, created = ClassAttendance.objects.update_or_create(
                    session=session,
                    enrollment=enrollment,
                    student=enrollment.student,
                    defaults={
                        "present": present,
                        "arrival_time": timezone.now() if present else None,
                        "instructor_notes": notes
                    }
                )
                
                # Update enrollment check-in status
                if present and not enrollment.checked_in:
                    enrollment.check_in()
                    
            except ClassEnrollment.DoesNotExist:
                continue
        
        # Update session attended count
        session.attended_count = ClassAttendance.objects.filter(
            session=session,
            present=True
        ).count()
        session.save()
        
        return Response({
            "message": "Attendance taken",
            "attended_count": session.attended_count,
            "enrolled_count": session.enrolled_count
        })
    
    @action(detail=True, methods=["get"])
    def waitlist(self, request, pk=None):
        """Get waitlist for session."""
        session = self.get_object()
        
        waitlist = session.enrollments.filter(
            status="waitlisted"
        ).order_by("waitlist_position")
        
        serializer = ClassEnrollmentSerializer(waitlist, many=True)
        return Response({
            "waitlist": serializer.data,
            "total_waitlisted": waitlist.count(),
            "max_waitlist": session.schedule.waitlist_size
        })
    
    @action(detail=True, methods=["post"])
    def assign_substitute(self, request, pk=None):
        """Assign substitute instructor."""
        session = self.get_object()
        substitute_id = request.data.get("substitute_instructor_id")
        
        if not substitute_id:
            return Response(
                {"error": "Substitute instructor ID required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            substitute = Instructor.objects.get(
                id=substitute_id,
                organization=session.organization,
                is_active=True
            )
            
            # Check if substitute is available
            conflicts = ClassSession.objects.filter(
                instructor=substitute,
                scheduled_datetime=session.scheduled_datetime,
                status__in=["scheduled", "confirmed", "in_progress"]
            ).exists()
            
            if conflicts:
                return Response(
                    {"error": "Substitute instructor has scheduling conflict"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            session.substitute_instructor = substitute
            session.save()
            
            # TODO: Send notifications to students and instructors
            
            return Response({
                "message": "Substitute instructor assigned",
                "substitute": InstructorSerializer(substitute).data
            })
            
        except Instructor.DoesNotExist:
            return Response(
                {"error": "Instructor not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class ClassEnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassEnrollment model."""

    queryset = ClassEnrollment.objects.all()
    serializer_class = ClassEnrollmentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by current user's enrollments
        if hasattr(self.request.user, "client_profile"):
            queryset = queryset.filter(student=self.request.user.client_profile)
        else:
            # For staff, filter by organization
            user_org = getattr(self.request.user, "organization", None)
            if user_org:
                queryset = queryset.filter(session__organization=user_org)

        # Filter by status
        status_filter = self.request.query_params.get("status")
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by session
        session_id = self.request.query_params.get("session")
        if session_id:
            queryset = queryset.filter(session_id=session_id)

        return queryset.order_by("-enrolled_at")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel enrollment."""
        enrollment = self.get_object()
        reason = request.data.get("reason", "")

        enrollment.cancel(reason)

        return Response({"status": "cancelled", "message": "Inscripción cancelada"})

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        """Check in for class."""
        enrollment = self.get_object()

        enrollment.check_in()

        return Response({"checked_in": True, "message": "Check-in realizado"})
    
    def create(self, request, *args, **kwargs):
        """Create enrollment with payment processing."""
        # Get session
        session_id = request.data.get("session")
        if not session_id:
            return Response(
                {"error": "Session ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = ClassSession.objects.get(id=session_id)
        except ClassSession.DoesNotExist:
            return Response(
                {"error": "Session not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user can enroll
        student = request.user.client_profile
        can_enroll, message = session.can_enroll(request.user)
        if not can_enroll:
            return Response(
                {"error": message},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if using package
        package_id = request.data.get("student_package")
        payment_method = request.data.get("payment_method", "cash")
        
        enrollment_data = {
            "session": session,
            "student": student,
            "status": "enrolled" if not session.is_full else "waitlisted",
        }
        
        if package_id:
            # Use package for payment
            try:
                package = StudentPackage.objects.get(
                    id=package_id,
                    student=student,
                    is_active=True,
                    classes_remaining__gt=0
                )
                
                # Check if package is valid for this class type
                if session.schedule.class_type not in package.package.class_types.all():
                    return Response(
                        {"error": "Package not valid for this class type"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Use one class from package
                package.use_class()
                enrollment_data["paid"] = True
                enrollment_data["payment_method"] = "package"
                enrollment_data["payment_reference"] = f"PKG-{package.id}"
                
            except StudentPackage.DoesNotExist:
                return Response(
                    {"error": "Invalid or expired package"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Process regular payment
            amount = session.schedule.price
            if hasattr(student, "is_member") and student.is_member and session.schedule.member_price:
                amount = session.schedule.member_price
            
            # Create payment
            payment = PaymentService.create_payment(
                amount=amount,
                payment_type="class",
                payment_method=payment_method,
                organization=session.organization,
                club=session.club,
                user=request.user,
                client=student,
                description=f"Class enrollment: {session.schedule.name}",
                metadata={
                    "session_id": str(session.id),
                    "class_name": session.schedule.name,
                    "instructor": session.instructor.user.get_full_name()
                }
            )
            
            enrollment_data["paid"] = payment.status == "completed"
            enrollment_data["payment_amount"] = amount
            enrollment_data["payment_method"] = payment_method
            enrollment_data["payment_reference"] = payment.reference_number
        
        # Create enrollment
        enrollment = ClassEnrollment.objects.create(**enrollment_data)
        
        # Update session enrolled count
        session.enrolled_count = session.enrollments.filter(status="enrolled").count()
        session.save()
        
        serializer = self.get_serializer(enrollment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ClassAttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassAttendance model."""

    queryset = ClassAttendance.objects.all()
    serializer_class = ClassAttendanceSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by organization
        user_org = self.request.user.organization
        queryset = queryset.filter(session__organization=user_org)

        # Filter by session
        session_id = self.request.query_params.get("session")
        if session_id:
            queryset = queryset.filter(session_id=session_id)

        # Filter by student
        student_id = self.request.query_params.get("student")
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        return queryset


class InstructorEvaluationViewSet(viewsets.ModelViewSet):
    """ViewSet for InstructorEvaluation model."""

    queryset = InstructorEvaluation.objects.all()
    serializer_class = InstructorEvaluationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by current user's evaluations
        if hasattr(self.request.user, "client_profile"):
            queryset = queryset.filter(student=self.request.user.client_profile)
        else:
            # For staff, filter by organization
            user_org = getattr(self.request.user, "organization", None)
            if user_org:
                queryset = queryset.filter(session__organization=user_org)

        # Filter by instructor
        instructor_id = self.request.query_params.get("instructor")
        if instructor_id:
            queryset = queryset.filter(instructor_id=instructor_id)

        return queryset.order_by("-created_at")


class ClassPackageViewSet(viewsets.ModelViewSet):
    """ViewSet for ClassPackage model."""

    queryset = ClassPackage.objects.all()
    serializer_class = ClassPackageSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by organization/club
        user_org = self.request.user.organization
        queryset = queryset.filter(organization=user_org)

        club_id = self.request.query_params.get("club")
        if club_id:
            queryset = queryset.filter(club_id=club_id)

        # Filter by active status
        if self.request.query_params.get("active_only") == "true":
            queryset = queryset.filter(is_active=True)

        return queryset


class StudentPackageViewSet(viewsets.ModelViewSet):
    """ViewSet for StudentPackage model."""

    queryset = StudentPackage.objects.all()
    serializer_class = StudentPackageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by current user's packages
        if hasattr(self.request.user, "client_profile"):
            queryset = queryset.filter(student=self.request.user.client_profile)
        else:
            # For staff, filter by organization
            user_org = getattr(self.request.user, "organization", None)
            if user_org:
                queryset = queryset.filter(package__organization=user_org)

        # Filter by active status
        if self.request.query_params.get("active_only") == "true":
            queryset = queryset.filter(
                is_active=True, expires_at__gt=timezone.now(), classes_remaining__gt=0
            )

        return queryset.order_by("-purchased_at")


# Search view for finding available classes
class ClassSearchViewSet(viewsets.ViewSet):
    """ViewSet for searching available classes."""
    
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=["get"])
    def available(self, request):
        """Search for available classes based on filters."""
        # Get filters
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        class_type = request.query_params.get("class_type")
        level = request.query_params.get("level")
        instructor = request.query_params.get("instructor")
        day_of_week = request.query_params.get("day_of_week")
        time_range = request.query_params.get("time_range")  # morning, afternoon, evening
        
        # Base query
        sessions = ClassSession.objects.filter(
            status="scheduled",
            scheduled_datetime__gte=timezone.now()
        )
        
        # Filter by organization
        if hasattr(request.user, "organization"):
            sessions = sessions.filter(organization=request.user.organization)
        
        # Apply filters
        if start_date:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
            sessions = sessions.filter(scheduled_datetime__date__gte=start_date)
        
        if end_date:
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date()
            sessions = sessions.filter(scheduled_datetime__date__lte=end_date)
        
        if class_type:
            sessions = sessions.filter(schedule__class_type_id=class_type)
        
        if level:
            sessions = sessions.filter(schedule__level_id=level)
        
        if instructor:
            sessions = sessions.filter(instructor_id=instructor)
        
        if day_of_week:
            # 0 = Monday, 6 = Sunday
            sessions = sessions.filter(scheduled_datetime__week_day=int(day_of_week) + 1)
        
        if time_range:
            if time_range == "morning":
                sessions = sessions.filter(scheduled_datetime__hour__lt=12)
            elif time_range == "afternoon":
                sessions = sessions.filter(
                    scheduled_datetime__hour__gte=12,
                    scheduled_datetime__hour__lt=18
                )
            elif time_range == "evening":
                sessions = sessions.filter(scheduled_datetime__hour__gte=18)
        
        # Filter only sessions with available spots
        available_sessions = []
        for session in sessions:
            if session.available_spots > 0:
                available_sessions.append(session)
        
        # Order by date
        available_sessions.sort(key=lambda x: x.scheduled_datetime)
        
        # Limit results
        available_sessions = available_sessions[:50]
        
        serializer = ClassSessionSerializer(available_sessions, many=True)
        
        return Response({
            "total": len(available_sessions),
            "sessions": serializer.data
        })


# Calendar and schedule views
class CalendarViewSet(viewsets.ViewSet):
    """ViewSet for calendar-related endpoints."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def monthly(self, request):
        """Get monthly calendar view."""
        year = int(request.query_params.get("year", timezone.now().year))
        month = int(request.query_params.get("month", timezone.now().month))

        # Calculate month range
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)

        # Get sessions
        sessions = ClassSession.objects.filter(
            scheduled_datetime__date__range=[start_date, end_date],
            status__in=["scheduled", "confirmed", "in_progress"],
        )

        # Filter by organization if not superuser
        if hasattr(request.user, "organization"):
            sessions = sessions.filter(organization=request.user.organization)

        # Group by date
        calendar_data = {}
        for session in sessions:
            date_str = session.scheduled_datetime.date().isoformat()
            if date_str not in calendar_data:
                calendar_data[date_str] = []

            calendar_data[date_str].append(
                {
                    "id": session.id,
                    "title": session.schedule.name,
                    "time": session.scheduled_datetime.time().strftime("%H:%M"),
                    "instructor": session.instructor.user.get_full_name(),
                    "enrolled": session.enrolled_count,
                    "max_participants": session.max_participants,
                    "status": session.status,
                }
            )

        return Response(calendar_data)

    @action(detail=False, methods=["get"])
    def weekly(self, request):
        """Get weekly calendar view."""
        # Get week start date
        week_start_str = request.query_params.get("week_start")
        if week_start_str:
            week_start = datetime.strptime(week_start_str, "%Y-%m-%d").date()
        else:
            # Default to current week
            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday())

        week_end = week_start + timedelta(days=6)

        # Get sessions
        sessions = ClassSession.objects.filter(
            scheduled_datetime__date__range=[week_start, week_end],
            status__in=["scheduled", "confirmed", "in_progress"],
        ).order_by("scheduled_datetime")

        # Filter by organization if not superuser
        if hasattr(request.user, "organization"):
            sessions = sessions.filter(organization=request.user.organization)

        serializer = ClassSessionSerializer(sessions, many=True)

        return Response(
            {
                "week_start": week_start,
                "week_end": week_end,
                "sessions": serializer.data,
            }
        )


# Student history view
class StudentHistoryViewSet(viewsets.ViewSet):
    """ViewSet for student class history."""

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def my_classes(self, request):
        """Get current user's class history."""
        if not hasattr(request.user, "client_profile"):
            return Response(
                {"error": "User does not have a client profile"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student = request.user.client_profile

        # Get enrollments
        enrollments = ClassEnrollment.objects.filter(student=student).order_by(
            "-enrolled_at"
        )

        # Filter by status
        status_filter = request.query_params.get("status")
        if status_filter:
            enrollments = enrollments.filter(status=status_filter)

        # Pagination
        page = self.paginate_queryset(enrollments)
        if page is not None:
            serializer = ClassEnrollmentSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ClassEnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Get current user's class statistics."""
        if not hasattr(request.user, "client_profile"):
            return Response(
                {"error": "User does not have a client profile"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        student = request.user.client_profile

        # Calculate stats
        total_enrollments = ClassEnrollment.objects.filter(student=student).count()
        completed_classes = ClassAttendance.objects.filter(
            student=student, present=True
        ).count()

        missed_classes = ClassAttendance.objects.filter(
            student=student, present=False
        ).count()

        # Get packages
        active_packages = StudentPackage.objects.filter(
            student=student,
            is_active=True,
            expires_at__gt=timezone.now(),
            classes_remaining__gt=0,
        ).count()

        total_packages = StudentPackage.objects.filter(student=student).count()

        return Response(
            {
                "total_enrollments": total_enrollments,
                "completed_classes": completed_classes,
                "missed_classes": missed_classes,
                "attendance_rate": completed_classes
                / max(completed_classes + missed_classes, 1)
                * 100,
                "active_packages": active_packages,
                "total_packages": total_packages,
            }
        )
