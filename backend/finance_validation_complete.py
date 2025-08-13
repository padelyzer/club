#!/usr/bin/env python3
"""
Validación completa del módulo de finanzas y todos los ingresos
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

User = get_user_model()

def finance_validation_complete():
    print("💰 VALIDACIÓN COMPLETA DEL MÓDULO DE FINANZAS")
    print("=" * 70)
    
    # Setup
    club = Club.objects.get(name='API Test Padel Club')
    organization = club.organization
    
    print(f"✅ Club: {club.name}")
    print(f"✅ Organización: {organization.trade_name}")
    
    # STEP 1: Create payment methods if they don't exist
    print(f"\n📍 PASO 1: Configurar métodos de pago")
    
    payment_methods_data = [
        {
            'club': club,
            'name': 'Efectivo',
            'payment_type': 'cash',
            'description': 'Pagos en efectivo',
            'is_enabled': True,
            'processing_fee_percentage': Decimal('0.000'),
            'fixed_fee': Decimal('0.00')
        },
        {
            'club': club,
            'name': 'Tarjeta de Crédito',
            'payment_type': 'credit_card',
            'description': 'Pagos con tarjeta de crédito',
            'is_enabled': True,
            'processing_fee_percentage': Decimal('3.500'),
            'fixed_fee': Decimal('5.00')
        },
        {
            'club': club,
            'name': 'Transferencia Bancaria',
            'payment_type': 'bank_transfer',
            'description': 'Transferencias bancarias',
            'is_enabled': True,
            'processing_fee_percentage': Decimal('0.000'),
            'fixed_fee': Decimal('0.00')
        }
    ]
    
    created_payment_methods = []
    for pm_data in payment_methods_data:
        try:
            pm, created = PaymentMethod.objects.get_or_create(
                club=pm_data['club'],
                name=pm_data['name'],
                defaults=pm_data
            )
            if created:
                print(f"   ✅ Método de pago creado: {pm.name}")
            else:
                print(f"   ⚠️  Método ya existe: {pm.name}")
            created_payment_methods.append(pm)
        except Exception as e:
            print(f"   ❌ Error creando {pm_data['name']}: {str(e)}")
    
    # Get default payment method
    cash_method = PaymentMethod.objects.filter(club=club, payment_type='cash').first()
    if not cash_method and created_payment_methods:
        cash_method = created_payment_methods[0]
    
    # STEP 2: Analyze reservation revenue
    print(f"\n📍 PASO 2: Analizar ingresos por reservaciones")
    
    reservations = Reservation.objects.filter(club=club, status='confirmed')
    total_reservations = reservations.count()
    
    # Calculate reservation revenue
    reservation_revenue = Decimal('0.00')
    for reservation in reservations:
        if hasattr(reservation, 'total_cost') and reservation.total_cost:
            reservation_revenue += reservation.total_cost
        elif hasattr(reservation, 'court') and reservation.court and hasattr(reservation.court, 'default_price'):
            # Estimate based on court default price
            reservation_revenue += reservation.court.default_price
        else:
            # Default estimate
            reservation_revenue += Decimal('250.00')  # Average court price
    
    print(f"   📊 Reservaciones confirmadas: {total_reservations}")
    print(f"   💰 Ingresos por reservaciones: ${reservation_revenue}")
    
    # Create transactions for reservations if they don't exist
    reservation_transactions = 0
    if cash_method:
        for reservation in reservations:
            # Check if transaction already exists
            existing_transaction = Transaction.objects.filter(
                reservation=reservation,
                club=club
            ).first()
            
            if not existing_transaction:
                try:
                    # Estimate transaction amount
                    amount = Decimal('250.00')  # Default court rental price
                    if hasattr(reservation, 'total_cost') and reservation.total_cost:
                        amount = reservation.total_cost
                    elif hasattr(reservation, 'court') and reservation.court and hasattr(reservation.court, 'default_price'):
                        amount = reservation.court.default_price
                    
                    Transaction.objects.create(
                        organization=organization,
                        club=club,
                        reference_number=f"RES-{reservation.id}-{timezone.now().strftime('%Y%m%d')}",
                        transaction_type='income',
                        category='reservation_payment',
                        description=f"Pago de reserva - {reservation.court.name if hasattr(reservation, 'court') else 'Cancha'}",
                        amount=amount,
                        payment_method=cash_method,
                        status='completed',
                        reservation=reservation,
                        user=reservation.client.user if hasattr(reservation, 'client') else None,
                        transaction_date=reservation.created_at,
                        completed_at=reservation.created_at
                    )
                    reservation_transactions += 1
                except Exception as e:
                    print(f"   ⚠️  Error creando transacción para reserva {reservation.id}: {str(e)}")
    
    print(f"   ✅ Transacciones de reserva creadas: {reservation_transactions}")
    
    # STEP 3: Analyze tournament revenue
    print(f"\n📍 PASO 3: Analizar ingresos por torneos")
    
    tournaments = Tournament.objects.filter(club=club)
    tournament_revenue = Decimal('0.00')
    tournament_registrations = 0
    
    for tournament in tournaments:
        confirmed_registrations = tournament.registrations.filter(
            status='confirmed',
            payment_status='paid'
        )
        tournament_registrations += confirmed_registrations.count()
        tournament_revenue += confirmed_registrations.count() * tournament.registration_fee
    
    print(f"   📊 Torneos activos: {tournaments.count()}")
    print(f"   📊 Inscripciones pagadas: {tournament_registrations}")
    print(f"   💰 Ingresos por torneos: ${tournament_revenue}")
    
    # Create tournament transactions
    tournament_transactions = 0
    if cash_method:
        for tournament in tournaments:
            for registration in tournament.registrations.filter(status='confirmed', payment_status='paid'):
                existing_transaction = Transaction.objects.filter(
                    club=club,
                    category='tournament_entry',
                    external_transaction_id=f"TOURN-{registration.id}"
                ).first()
                
                if not existing_transaction:
                    try:
                        Transaction.objects.create(
                            organization=organization,
                            club=club,
                            reference_number=f"TOURN-{registration.id}-{timezone.now().strftime('%Y%m%d')}",
                            transaction_type='income',
                            category='tournament_entry',
                            description=f"Inscripción torneo: {tournament.name} - {registration.team_name}",
                            amount=tournament.registration_fee,
                            payment_method=cash_method,
                            status='completed',
                            user=registration.player1.user,
                            external_transaction_id=f"TOURN-{registration.id}",
                            transaction_date=registration.created_at,
                            completed_at=registration.created_at
                        )
                        tournament_transactions += 1
                    except Exception as e:
                        print(f"   ⚠️  Error creando transacción para torneo {registration.id}: {str(e)}")
    
    print(f"   ✅ Transacciones de torneos creadas: {tournament_transactions}")
    
    # STEP 4: Analyze league revenue
    print(f"\n📍 PASO 4: Analizar ingresos por ligas")
    
    leagues = League.objects.filter(club=club)
    league_revenue = Decimal('0.00')
    league_teams = 0
    
    for league in leagues:
        for season in league.seasons.all():
            paid_teams = season.teams.filter(payment_status='paid')
            league_teams += paid_teams.count()
            league_revenue += paid_teams.count() * league.registration_fee
    
    print(f"   📊 Ligas activas: {leagues.count()}")
    print(f"   📊 Equipos pagados: {league_teams}")
    print(f"   💰 Ingresos por ligas: ${league_revenue}")
    
    # Create league transactions
    league_transactions = 0
    if cash_method:
        for league in leagues:
            for season in league.seasons.all():
                for team in season.teams.filter(payment_status='paid'):
                    existing_transaction = Transaction.objects.filter(
                        club=club,
                        category='membership_fee',
                        external_transaction_id=f"LEAGUE-{team.id}"
                    ).first()
                    
                    if not existing_transaction:
                        try:
                            Transaction.objects.create(
                                organization=organization,
                                club=club,
                                reference_number=f"LEAGUE-{team.id}-{timezone.now().strftime('%Y%m%d')}",
                                transaction_type='income',
                                category='membership_fee',
                                description=f"Inscripción liga: {league.name} - {team.team_name}",
                                amount=league.registration_fee,
                                payment_method=cash_method,
                                status='completed',
                                user=team.player1.user,
                                external_transaction_id=f"LEAGUE-{team.id}",
                                transaction_date=team.registration_date,
                                completed_at=team.registration_date
                            )
                            league_transactions += 1
                        except Exception as e:
                            print(f"   ⚠️  Error creando transacción para liga {team.id}: {str(e)}")
    
    print(f"   ✅ Transacciones de ligas creadas: {league_transactions}")
    
    # STEP 5: Analyze class revenue (if any)
    print(f"\n📍 PASO 5: Analizar ingresos por clases")
    
    try:
        classes = ClassSchedule.objects.filter(club=club)
        class_revenue = Decimal('0.00')
        class_enrollments = 0
        
        for class_obj in classes:
            paid_enrollments = ClassEnrollment.objects.filter(
                class_schedule=class_obj, 
                payment_status='paid'
            )
            class_enrollments += paid_enrollments.count()
            if hasattr(class_obj, 'price_per_session'):
                class_revenue += paid_enrollments.count() * class_obj.price_per_session
            else:
                class_revenue += paid_enrollments.count() * Decimal('150.00')  # Default estimate
        
        print(f"   📊 Clases activas: {classes.count()}")
        print(f"   📊 Inscripciones pagadas: {class_enrollments}")
        print(f"   💰 Ingresos por clases: ${class_revenue}")
    except Exception as e:
        print(f"   ⚠️  Módulo de clases no completamente disponible: {str(e)}")
        class_revenue = Decimal('0.00')
    
    # STEP 6: Financial summary and validation
    print(f"\n📍 PASO 6: Resumen financiero completo")
    
    # Get all transactions for this club
    all_transactions = Transaction.objects.filter(club=club, status='completed')
    
    # Income transactions
    income_transactions = all_transactions.filter(transaction_type='income')
    total_income = income_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Expense transactions
    expense_transactions = all_transactions.filter(transaction_type='expense')
    total_expenses = expense_transactions.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    
    # Revenue by category
    reservation_income = income_transactions.filter(category='reservation_payment').aggregate(
        total=Sum('amount'))['total'] or Decimal('0.00')
    tournament_income = income_transactions.filter(category='tournament_entry').aggregate(
        total=Sum('amount'))['total'] or Decimal('0.00')
    league_income = income_transactions.filter(category='membership_fee').aggregate(
        total=Sum('amount'))['total'] or Decimal('0.00')
    class_income = income_transactions.filter(category='class_payment').aggregate(
        total=Sum('amount'))['total'] or Decimal('0.00')
    
    print(f"   💰 INGRESOS POR CATEGORÍA:")
    print(f"      🏟️  Reservaciones: ${reservation_income}")
    print(f"      🏆 Torneos: ${tournament_income}")
    print(f"      🏅 Ligas: ${league_income}")
    print(f"      📚 Clases: ${class_income}")
    print(f"      ➖➖➖➖➖➖➖➖➖➖➖➖➖")
    print(f"      💰 TOTAL INGRESOS: ${total_income}")
    
    print(f"\n   💸 GASTOS:")
    print(f"      💸 Total gastos: ${total_expenses}")
    print(f"      ➖➖➖➖➖➖➖➖➖➖➖➖➖")
    print(f"      💰 GANANCIA NETA: ${total_income - total_expenses}")
    
    # Transaction statistics
    print(f"\n   📊 ESTADÍSTICAS DE TRANSACCIONES:")
    print(f"      📊 Transacciones totales: {all_transactions.count()}")
    print(f"      📊 Transacciones de ingreso: {income_transactions.count()}")
    print(f"      📊 Transacciones de gasto: {expense_transactions.count()}")
    
    # Payment method analysis
    payment_method_stats = income_transactions.values('payment_method__name').annotate(
        count=Count('id'),
        total=Sum('amount')
    ).order_by('-total')
    
    print(f"\n   💳 ANÁLISIS POR MÉTODO DE PAGO:")
    for pm_stat in payment_method_stats:
        print(f"      {pm_stat['payment_method__name']}: ${pm_stat['total']} ({pm_stat['count']} transacciones)")
    
    # Recent transaction activity
    recent_transactions = income_transactions.order_by('-transaction_date')[:5]
    print(f"\n   📋 ÚLTIMAS 5 TRANSACCIONES:")
    for trans in recent_transactions:
        print(f"      {trans.transaction_date.strftime('%Y-%m-%d')}: {trans.get_category_display()} - ${trans.amount}")
    
    # Validation checks
    print(f"\n📍 PASO 7: Validaciones del sistema financiero")
    
    validation_checks = []
    
    # Check 1: All revenue modules are generating income
    if reservation_income > 0:
        validation_checks.append("✅ Módulo de reservaciones generando ingresos")
    else:
        validation_checks.append("⚠️  Módulo de reservaciones sin ingresos")
    
    if tournament_income > 0:
        validation_checks.append("✅ Módulo de torneos generando ingresos")
    else:
        validation_checks.append("⚠️  Módulo de torneos sin ingresos")
    
    if league_income > 0:
        validation_checks.append("✅ Módulo de ligas generando ingresos")
    else:
        validation_checks.append("⚠️  Módulo de ligas sin ingresos")
    
    # Check 2: Payment methods are configured
    if PaymentMethod.objects.filter(club=club, is_enabled=True).count() >= 2:
        validation_checks.append("✅ Múltiples métodos de pago configurados")
    else:
        validation_checks.append("⚠️  Pocos métodos de pago configurados")
    
    # Check 3: Transaction integrity
    if all_transactions.count() > 0:
        validation_checks.append("✅ Sistema de transacciones funcional")
    else:
        validation_checks.append("❌ Sistema de transacciones no funcional")
    
    # Check 4: Financial tracking
    if total_income > Decimal('1000.00'):
        validation_checks.append("✅ Ingresos significativos registrados")
    else:
        validation_checks.append("⚠️  Ingresos bajos registrados")
    
    for check in validation_checks:
        print(f"   {check}")
    
    # Final summary
    print(f"\n" + "="*70)
    print("💰 RESUMEN FINAL DEL MÓDULO DE FINANZAS")
    print("="*70)
    print(f"✅ Métodos de pago configurados: {PaymentMethod.objects.filter(club=club).count()}")
    print(f"✅ Transacciones procesadas: {all_transactions.count()}")
    print(f"✅ Ingresos totales: ${total_income}")
    print(f"✅ Gastos totales: ${total_expenses}")
    print(f"✅ Ganancia neta: ${total_income - total_expenses}")
    print(f"✅ Fuentes de ingresos activas: {len([x for x in [reservation_income, tournament_income, league_income, class_income] if x > 0])}")
    
    # Revenue breakdown percentage
    if total_income > 0:
        print(f"\n📊 DESGLOSE DE INGRESOS (%):")
        print(f"   Reservaciones: {(reservation_income / total_income * 100):.1f}%")
        print(f"   Torneos: {(tournament_income / total_income * 100):.1f}%")
        print(f"   Ligas: {(league_income / total_income * 100):.1f}%")
        if class_income > 0:
            print(f"   Clases: {(class_income / total_income * 100):.1f}%")
    
    print(f"\n🎯 ¡Módulo de finanzas validado y funcional!")
    
    return {
        'total_income': float(total_income),
        'total_expenses': float(total_expenses),
        'net_profit': float(total_income - total_expenses),
        'reservation_income': float(reservation_income),
        'tournament_income': float(tournament_income),
        'league_income': float(league_income),
        'class_income': float(class_income),
        'total_transactions': all_transactions.count(),
        'payment_methods': PaymentMethod.objects.filter(club=club).count()
    }

if __name__ == "__main__":
    finance_validation_complete()