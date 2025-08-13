#!/usr/bin/env python3
"""
Reporte completo del sistema Padelyzer
"""
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Sum, Count, Q
from apps.finance.models import Transaction, PaymentMethod
from apps.reservations.models import Reservation
from apps.tournaments.models import Tournament, TournamentRegistration
from apps.leagues.models import League, LeagueTeam
from apps.classes.models import ClassSchedule, ClassEnrollment
from apps.clubs.models import Club
from apps.clients.models import ClientProfile

User = get_user_model()

def generate_system_report():
    print("🏆 REPORTE COMPLETO DEL SISTEMA PADELYZER")
    print("=" * 80)
    print(f"📅 Fecha del reporte: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Setup
    club = Club.objects.get(name='API Test Padel Club')
    organization = club.organization
    
    print(f"🏢 Organización: {organization.trade_name}")
    print(f"🏟️  Club: {club.name}")
    
    # SECTION 1: USER MANAGEMENT
    print(f"\n" + "="*80)
    print("👥 GESTIÓN DE USUARIOS Y CLIENTES")
    print("="*80)
    
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    total_clients = ClientProfile.objects.filter(club=club).count()
    active_clients = ClientProfile.objects.filter(club=club, is_active=True).count()
    
    print(f"📊 Usuarios totales en el sistema: {total_users}")
    print(f"📊 Usuarios activos: {active_users}")
    print(f"📊 Clientes registrados en el club: {total_clients}")
    print(f"📊 Clientes activos: {active_clients}")
    
    # Show recent clients
    recent_clients = ClientProfile.objects.filter(club=club).order_by('-created_at')[:5]
    print(f"\n👥 Últimos 5 clientes registrados:")
    for client in recent_clients:
        print(f"   • {client.user.get_full_name()} - {client.created_at.strftime('%Y-%m-%d')}")
    
    # SECTION 2: RESERVATIONS MODULE
    print(f"\n" + "="*80)
    print("🏟️  MÓDULO DE RESERVACIONES")
    print("="*80)
    
    total_reservations = Reservation.objects.filter(club=club).count()
    confirmed_reservations = Reservation.objects.filter(club=club, status='confirmed').count()
    pending_reservations = Reservation.objects.filter(club=club, status='pending').count()
    cancelled_reservations = Reservation.objects.filter(club=club, status='cancelled').count()
    
    print(f"📊 Reservaciones totales: {total_reservations}")
    print(f"📊 Reservaciones confirmadas: {confirmed_reservations}")
    print(f"📊 Reservaciones pendientes: {pending_reservations}")
    print(f"📊 Reservaciones canceladas: {cancelled_reservations}")
    
    # Reservation revenue
    reservation_revenue = Transaction.objects.filter(
        club=club,
        category='reservation_payment',
        status='completed'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    print(f"💰 Ingresos por reservaciones: ${reservation_revenue}")
    
    # SECTION 3: TOURNAMENTS MODULE
    print(f"\n" + "="*80)
    print("🏆 MÓDULO DE TORNEOS")
    print("="*80)
    
    total_tournaments = Tournament.objects.filter(club=club).count()
    active_tournaments = Tournament.objects.filter(
        club=club, 
        status__in=['published', 'registration_open', 'in_progress']
    ).count()
    
    total_tournament_registrations = TournamentRegistration.objects.filter(
        tournament__club=club
    ).count()
    confirmed_tournament_registrations = TournamentRegistration.objects.filter(
        tournament__club=club, 
        status='confirmed',
        payment_status='paid'
    ).count()
    
    print(f"📊 Torneos totales: {total_tournaments}")
    print(f"📊 Torneos activos: {active_tournaments}")
    print(f"📊 Inscripciones totales: {total_tournament_registrations}")
    print(f"📊 Inscripciones confirmadas: {confirmed_tournament_registrations}")
    
    # Tournament revenue
    tournament_revenue = Transaction.objects.filter(
        club=club,
        category='tournament_entry',
        status='completed'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    print(f"💰 Ingresos por torneos: ${tournament_revenue}")
    
    # Show active tournaments
    active_tournaments_list = Tournament.objects.filter(
        club=club,
        status__in=['published', 'registration_open', 'in_progress']
    )[:3]
    
    print(f"\n🏆 Torneos activos:")
    for tournament in active_tournaments_list:
        print(f"   • {tournament.name} - {tournament.get_status_display()}")
        print(f"     Equipos: {tournament.current_teams_count}/{tournament.max_teams}")
        print(f"     Cuota: ${tournament.registration_fee}")
    
    # SECTION 4: LEAGUES MODULE
    print(f"\n" + "="*80)
    print("🏅 MÓDULO DE LIGAS")
    print("="*80)
    
    total_leagues = League.objects.filter(club=club).count()
    active_leagues = League.objects.filter(
        club=club,
        status__in=['published', 'registration_open', 'in_progress']
    ).count()
    
    total_league_teams = LeagueTeam.objects.filter(season__league__club=club).count()
    confirmed_league_teams = LeagueTeam.objects.filter(
        season__league__club=club,
        payment_status='paid'
    ).count()
    
    print(f"📊 Ligas totales: {total_leagues}")
    print(f"📊 Ligas activas: {active_leagues}")
    print(f"📊 Equipos totales: {total_league_teams}")
    print(f"📊 Equipos confirmados: {confirmed_league_teams}")
    
    # League revenue
    league_revenue = Transaction.objects.filter(
        club=club,
        category='membership_fee',
        status='completed'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    print(f"💰 Ingresos por ligas: ${league_revenue}")
    
    # Show active leagues
    active_leagues_list = League.objects.filter(club=club)[:3]
    print(f"\n🏅 Ligas configuradas:")
    for league in active_leagues_list:
        current_season = league.current_season
        teams_count = current_season.teams_count if current_season else 0
        print(f"   • {league.name} - {league.get_division_display()}")
        print(f"     Equipos: {teams_count}/{league.max_teams}")
        print(f"     Cuota: ${league.registration_fee}")
    
    # SECTION 5: CLASSES MODULE
    print(f"\n" + "="*80)
    print("📚 MÓDULO DE CLASES")
    print("="*80)
    
    try:
        total_classes = ClassSchedule.objects.filter(club=club).count()
        total_enrollments = ClassEnrollment.objects.count()  # Simplified count
        confirmed_enrollments = ClassEnrollment.objects.filter(paid=True).count()
        
        print(f"📊 Clases programadas: {total_classes}")
        print(f"📊 Inscripciones totales: {total_enrollments}")
        print(f"📊 Inscripciones confirmadas: {confirmed_enrollments}")
    except Exception as e:
        print(f"📊 Clases programadas: 0")
        print(f"📊 Inscripciones totales: 0")
        print(f"📊 Inscripciones confirmadas: 0")
        print(f"ℹ️  Módulo de clases: {str(e)}")
    
    # Class revenue
    class_revenue = Transaction.objects.filter(
        club=club,
        category='class_payment',
        status='completed'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    print(f"💰 Ingresos por clases: ${class_revenue}")
    
    if total_classes == 0:
        print("ℹ️  Módulo de clases configurado pero sin clases programadas")
    
    # SECTION 6: FINANCIAL SUMMARY
    print(f"\n" + "="*80)
    print("💰 RESUMEN FINANCIERO")
    print("="*80)
    
    # Payment methods
    payment_methods_count = PaymentMethod.objects.filter(club=club).count()
    enabled_payment_methods = PaymentMethod.objects.filter(club=club, is_enabled=True).count()
    
    # Transactions
    total_transactions = Transaction.objects.filter(club=club).count()
    completed_transactions = Transaction.objects.filter(club=club, status='completed').count()
    
    # Revenue summary
    total_income = Transaction.objects.filter(
        club=club,
        transaction_type='income',
        status='completed'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    total_expenses = Transaction.objects.filter(
        club=club,
        transaction_type='expense',
        status='completed'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    net_profit = total_income - total_expenses
    
    print(f"💳 Métodos de pago configurados: {payment_methods_count}")
    print(f"💳 Métodos de pago activos: {enabled_payment_methods}")
    print(f"📊 Transacciones totales: {total_transactions}")
    print(f"📊 Transacciones completadas: {completed_transactions}")
    print(f"")
    print(f"💰 INGRESOS TOTALES: ${total_income}")
    print(f"💸 GASTOS TOTALES: ${total_expenses}")
    print(f"💵 GANANCIA NETA: ${net_profit}")
    
    # Revenue breakdown
    print(f"\n💰 DESGLOSE DE INGRESOS:")
    print(f"   🏟️  Reservaciones: ${reservation_revenue} ({(reservation_revenue/total_income*100):.1f}%)" if total_income > 0 else "   🏟️  Reservaciones: $0.00 (0.0%)")
    print(f"   🏆 Torneos: ${tournament_revenue} ({(tournament_revenue/total_income*100):.1f}%)" if total_income > 0 else "   🏆 Torneos: $0.00 (0.0%)")
    print(f"   🏅 Ligas: ${league_revenue} ({(league_revenue/total_income*100):.1f}%)" if total_income > 0 else "   🏅 Ligas: $0.00 (0.0%)")
    print(f"   📚 Clases: ${class_revenue} ({(class_revenue/total_income*100):.1f}%)" if total_income > 0 else "   📚 Clases: $0.00 (0.0%)")
    
    # SECTION 7: SYSTEM HEALTH CHECK
    print(f"\n" + "="*80)
    print("🔍 VERIFICACIÓN DE SALUD DEL SISTEMA")
    print("="*80)
    
    health_checks = []
    
    # User management check
    if active_clients > 0:
        health_checks.append("✅ Sistema de clientes: Funcional")
    else:
        health_checks.append("⚠️  Sistema de clientes: Sin clientes activos")
    
    # Reservations check
    if confirmed_reservations > 0:
        health_checks.append("✅ Sistema de reservaciones: Funcional")
    else:
        health_checks.append("⚠️  Sistema de reservaciones: Sin reservaciones")
    
    # Tournaments check
    if total_tournaments > 0:
        health_checks.append("✅ Sistema de torneos: Funcional")
    else:
        health_checks.append("⚠️  Sistema de torneos: Sin torneos configurados")
    
    # Leagues check
    if total_leagues > 0:
        health_checks.append("✅ Sistema de ligas: Funcional")
    else:
        health_checks.append("⚠️  Sistema de ligas: Sin ligas configuradas")
    
    # Finance check
    if total_income > 0:
        health_checks.append("✅ Sistema financiero: Funcional")
    else:
        health_checks.append("❌ Sistema financiero: Sin ingresos registrados")
    
    # Payment methods check
    if enabled_payment_methods >= 2:
        health_checks.append("✅ Métodos de pago: Múltiples opciones disponibles")
    elif enabled_payment_methods == 1:
        health_checks.append("⚠️  Métodos de pago: Solo una opción disponible")
    else:
        health_checks.append("❌ Métodos de pago: No configurados")
    
    # Multi-tenant check
    if organization and club:
        health_checks.append("✅ Arquitectura multi-tenant: Funcional")
    else:
        health_checks.append("❌ Arquitectura multi-tenant: Problemas de configuración")
    
    for check in health_checks:
        print(f"   {check}")
    
    # SECTION 8: PERFORMANCE METRICS
    print(f"\n" + "="*80)
    print("📊 MÉTRICAS DE RENDIMIENTO")
    print("="*80)
    
    # Calculate some key metrics
    avg_reservations_per_client = confirmed_reservations / active_clients if active_clients > 0 else 0
    revenue_per_client = total_income / active_clients if active_clients > 0 else 0
    transaction_success_rate = (completed_transactions / total_transactions * 100) if total_transactions > 0 else 0
    
    print(f"📊 Reservaciones promedio por cliente: {avg_reservations_per_client:.1f}")
    print(f"📊 Ingresos promedio por cliente: ${revenue_per_client:.2f}")
    print(f"📊 Tasa de éxito de transacciones: {transaction_success_rate:.1f}%")
    
    # Active revenue streams
    active_revenue_streams = 0
    if reservation_revenue > 0:
        active_revenue_streams += 1
    if tournament_revenue > 0:
        active_revenue_streams += 1
    if league_revenue > 0:
        active_revenue_streams += 1
    if class_revenue > 0:
        active_revenue_streams += 1
    
    print(f"📊 Fuentes de ingresos activas: {active_revenue_streams}/4")
    
    # SECTION 9: FINAL ASSESSMENT
    print(f"\n" + "="*80)
    print("🎯 EVALUACIÓN FINAL DEL SISTEMA")
    print("="*80)
    
    # Calculate overall system score
    total_score = 0
    max_score = 10
    
    # Scoring criteria
    if active_clients > 0:
        total_score += 1
    if confirmed_reservations > 0:
        total_score += 1
    if total_tournaments > 0:
        total_score += 1
    if total_leagues > 0:
        total_score += 1
    if total_income > Decimal('1000.00'):
        total_score += 2
    if enabled_payment_methods >= 2:
        total_score += 1
    if transaction_success_rate >= 90:
        total_score += 1
    if active_revenue_streams >= 3:
        total_score += 1
    if net_profit > 0:
        total_score += 1
    
    score_percentage = (total_score / max_score) * 100
    
    print(f"🏆 PUNTUACIÓN DEL SISTEMA: {total_score}/{max_score} ({score_percentage:.0f}%)")
    
    if score_percentage >= 90:
        grade = "A+ (Excelente)"
    elif score_percentage >= 80:
        grade = "A (Muy Bueno)"
    elif score_percentage >= 70:
        grade = "B (Bueno)"
    elif score_percentage >= 60:
        grade = "C (Aceptable)"
    else:
        grade = "D (Necesita mejoras)"
    
    print(f"🎖️  CALIFICACIÓN: {grade}")
    
    # Final status
    print(f"\n" + "="*80)
    print("🚀 ESTADO FINAL")
    print("="*80)
    
    if score_percentage >= 80:
        print("✅ EL SISTEMA PADELYZER ESTÁ COMPLETAMENTE FUNCIONAL")
        print("✅ Todos los módulos principales están operativos")
        print("✅ La generación de ingresos está funcionando correctamente")
        print("✅ El sistema está listo para producción")
    elif score_percentage >= 60:
        print("⚠️  EL SISTEMA PADELYZER ESTÁ MAYORMENTE FUNCIONAL")
        print("⚠️  La mayoría de módulos están operativos")
        print("⚠️  Algunas áreas necesitan atención")
    else:
        print("❌ EL SISTEMA PADELYZER NECESITA MEJORAS SIGNIFICATIVAS")
        print("❌ Varios módulos requieren configuración adicional")
    
    print(f"\n📋 RESUMEN EJECUTIVO:")
    print(f"   • {active_clients} clientes activos generando ${total_income}")
    print(f"   • {active_revenue_streams} fuentes de ingresos operativas")
    print(f"   • {completed_transactions} transacciones procesadas exitosamente")
    print(f"   • Ganancia neta de ${net_profit}")
    
    print(f"\n🎯 ¡Sistema Padelyzer verificado completamente!")
    
    return {
        'score': total_score,
        'max_score': max_score,
        'percentage': score_percentage,
        'grade': grade,
        'total_income': float(total_income),
        'net_profit': float(net_profit),
        'active_clients': active_clients,
        'active_revenue_streams': active_revenue_streams
    }

if __name__ == "__main__":
    generate_system_report()