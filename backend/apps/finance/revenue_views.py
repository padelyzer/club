"""
Revenue API views.
"""

from datetime import datetime
from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.finance.reports import RevenueReportService
from apps.clubs.models import Club
from rest_framework.permissions import IsAuthenticated


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_revenue_report(request):
    """Get daily revenue report."""
    date_str = request.query_params.get('date')
    club_id = request.query_params.get('club_id')
    
    # Parse date
    if date_str:
        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        date = None
    
    # Get club
    club = None
    if club_id:
        try:
            club = Club.objects.get(id=club_id)
            # Check permissions
            if not request.user.is_staff and request.user.club_id != club.id:
                return Response(
                    {'error': 'No permission to view this club data'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Club.DoesNotExist:
            return Response(
                {'error': 'Club not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Generate report
    report = RevenueReportService.daily_report(date=date, club=club)
    
    return Response(report, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def monthly_revenue_report(request):
    """Get monthly revenue report."""
    year = request.query_params.get('year', datetime.now().year)
    month = request.query_params.get('month', datetime.now().month)
    club_id = request.query_params.get('club_id')
    
    try:
        year = int(year)
        month = int(month)
    except ValueError:
        return Response(
            {'error': 'Invalid year or month'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get club
    club = None
    if club_id:
        try:
            club = Club.objects.get(id=club_id)
            # Check permissions
            if not request.user.is_staff and request.user.club_id != club.id:
                return Response(
                    {'error': 'No permission to view this club data'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Club.DoesNotExist:
            return Response(
                {'error': 'Club not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Generate report
    report = RevenueReportService.monthly_report(year=year, month=month, club=club)
    
    return Response(report, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def court_utilization_report(request):
    """Get court utilization report."""
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    club_id = request.query_params.get('club_id')
    
    # Validate required parameters
    if not all([start_date, end_date, club_id]):
        return Response(
            {'error': 'start_date, end_date, and club_id are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Parse dates
    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get club
    try:
        club = Club.objects.get(id=club_id)
        # Check permissions
        if not request.user.is_staff and request.user.club_id != club.id:
            return Response(
                {'error': 'No permission to view this club data'},
                status=status.HTTP_403_FORBIDDEN
            )
    except Club.DoesNotExist:
        return Response(
            {'error': 'Club not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generate report
    report = RevenueReportService.court_utilization_report(
        start_date=start_date,
        end_date=end_date,
        club=club
    )
    
    return Response(report, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_method_analysis(request):
    """Get payment method analysis."""
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    club_id = request.query_params.get('club_id')
    
    # Validate required parameters
    if not all([start_date, end_date]):
        return Response(
            {'error': 'start_date and end_date are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Parse dates
    try:
        start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
    except ValueError:
        return Response(
            {'error': 'Invalid date format. Use YYYY-MM-DD'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get club
    club = None
    if club_id:
        try:
            club = Club.objects.get(id=club_id)
            # Check permissions
            if not request.user.is_staff and request.user.club_id != club.id:
                return Response(
                    {'error': 'No permission to view this club data'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Club.DoesNotExist:
            return Response(
                {'error': 'Club not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Generate report
    report = RevenueReportService.payment_method_analysis(
        start_date=start_date,
        end_date=end_date,
        club=club
    )
    
    return Response(report, status=status.HTTP_200_OK)
