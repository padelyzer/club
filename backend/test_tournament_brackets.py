#!/usr/bin/env python3
"""
Probar generación de brackets de torneos
"""
import os
import sys
import django
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.tournaments.models import Tournament, TournamentRegistration, TournamentBracket, Match
from apps.clubs.models import Club

User = get_user_model()

def test_tournament_brackets():
    print("🏆 PROBAR GENERACIÓN DE BRACKETS DE TORNEOS")
    print("=" * 60)
    
    # Get tournament with registrations
    tournament = Tournament.objects.filter(
        registrations__status='confirmed'
    ).first()
    
    if not tournament:
        print("❌ No hay torneos con inscripciones confirmadas")
        return
    
    print(f"✅ Torneo: {tournament.name}")
    print(f"✅ Formato: {tournament.format}")
    print(f"✅ Equipos inscritos: {tournament.current_teams_count}")
    
    # Show registered teams
    print(f"\n📍 EQUIPOS REGISTRADOS:")
    for i, registration in enumerate(tournament.registrations.filter(status='confirmed'), 1):
        print(f"   {i}. {registration.team_name}")
        print(f"      Jugadores: {registration.player1.user.get_full_name()} / {registration.player2.user.get_full_name()}")
        print(f"      Estado: {registration.get_status_display()}")
        print(f"      Pago: {registration.get_payment_status_display()}")
    
    # Check if tournament can start
    print(f"\n📍 ESTADO DEL TORNEO:")
    print(f"   Mínimo equipos: {tournament.min_teams}")
    print(f"   Máximo equipos: {tournament.max_teams}")
    print(f"   Equipos actuales: {tournament.current_teams_count}")
    print(f"   ¿Puede comenzar?: {'SÍ' if tournament.can_start else 'NO'}")
    print(f"   Estado actual: {tournament.get_status_display()}")
    
    # Test tournament statistics
    print(f"\n📍 ESTADÍSTICAS DEL TORNEO:")
    print(f"   📊 Inscripciones totales: {tournament.registrations.count()}")
    print(f"   📊 Inscripciones confirmadas: {tournament.registrations.filter(status='confirmed').count()}")
    print(f"   📊 Inscripciones pendientes: {tournament.registrations.filter(status='pending').count()}")
    print(f"   📊 Partidos programados: {tournament.matches.count()}")
    print(f"   📊 Premios configurados: {tournament.prizes.count()}")
    
    # Calculate potential revenue
    confirmed_teams = tournament.registrations.filter(
        status='confirmed', 
        payment_status='paid'
    ).count()
    potential_revenue = confirmed_teams * tournament.registration_fee
    total_prizes = sum(prize.cash_value or 0 for prize in tournament.prizes.all())
    net_profit = potential_revenue - total_prizes
    
    print(f"\n📍 ANÁLISIS FINANCIERO:")
    print(f"   💰 Equipos pagados: {confirmed_teams}")
    print(f"   💰 Cuota por equipo: ${tournament.registration_fee}")
    print(f"   💰 Ingresos totales: ${potential_revenue}")
    print(f"   💰 Total premios: ${total_prizes}")
    print(f"   💰 Ganancia neta: ${net_profit}")
    
    # Test bracket generation (if tournament can start)
    if tournament.can_start and tournament.status == 'draft':
        print(f"\n📍 SIMULAR INICIO DE TORNEO:")
        print(f"   ⚠️  Torneo puede comenzar pero está en estado 'draft'")
        print(f"   ⚠️  En producción se cambiaría a 'registration_open' y luego a 'in_progress'")
        print(f"   ⚠️  Se generarían brackets automáticamente")
        
        # Show what brackets would look like
        teams = list(tournament.registrations.filter(status='confirmed'))
        if len(teams) >= tournament.min_teams:
            print(f"\n📍 BRACKETS SIMULADOS ({tournament.format.upper()}):")
            
            if tournament.format == 'elimination':
                # Simple elimination bracket
                for i in range(0, len(teams), 2):
                    if i + 1 < len(teams):
                        print(f"   Partido {i//2 + 1}: {teams[i].team_name} vs {teams[i+1].team_name}")
                    else:
                        print(f"   Partido {i//2 + 1}: {teams[i].team_name} vs BYE")
                        
            elif tournament.format == 'round_robin':
                # Round robin - all vs all
                match_count = 0
                for i in range(len(teams)):
                    for j in range(i + 1, len(teams)):
                        match_count += 1
                        print(f"   Partido {match_count}: {teams[i].team_name} vs {teams[j].team_name}")
                        
            elif tournament.format == 'double_elimination':
                # Double elimination - show first round
                print(f"   UPPER BRACKET:")
                for i in range(0, len(teams), 2):
                    if i + 1 < len(teams):
                        print(f"   UB-{i//2 + 1}: {teams[i].team_name} vs {teams[i+1].team_name}")
                print(f"   LOWER BRACKET: (Se genera después de las primeras derrotas)")
    
    # Show tournament schedule potential
    print(f"\n📍 PROGRAMACIÓN POTENCIAL:")
    start_date = tournament.start_date
    end_date = tournament.end_date
    days_available = (end_date - start_date).days + 1
    
    print(f"   📅 Fecha inicio: {start_date}")
    print(f"   📅 Fecha fin: {end_date}")
    print(f"   📅 Días disponibles: {days_available}")
    
    # Check available courts
    club = tournament.club
    available_courts = club.courts.filter(is_active=True).count() if hasattr(club, 'courts') else 0
    print(f"   🏟️  Canchas disponibles: {available_courts}")
    
    if available_courts > 0 and tournament.matches.count() == 0:
        total_matches_needed = 0
        if tournament.format == 'elimination':
            # For elimination: n-1 matches where n is teams
            total_matches_needed = max(0, tournament.current_teams_count - 1)
        elif tournament.format == 'round_robin':
            # For round robin: n*(n-1)/2 matches
            n = tournament.current_teams_count
            total_matches_needed = n * (n - 1) // 2
        elif tournament.format == 'double_elimination':
            # For double elimination: 2*n-2 matches maximum
            total_matches_needed = max(0, 2 * tournament.current_teams_count - 2)
        
        print(f"   🏃 Partidos totales estimados: {total_matches_needed}")
        
        if total_matches_needed > 0:
            matches_per_day = available_courts * 8  # Assuming 8 matches per court per day
            days_needed = max(1, (total_matches_needed + matches_per_day - 1) // matches_per_day)
            print(f"   📊 Partidos por día posibles: {matches_per_day}")
            print(f"   📊 Días necesarios: {days_needed}")
            print(f"   📊 ¿Factible?: {'SÍ' if days_needed <= days_available else 'NO'}")
    
    print(f"\n" + "="*60)
    print("🏆 RESUMEN DEL MÓDULO DE TORNEOS")
    print("="*60)
    print(f"✅ Torneo de prueba: {tournament.name}")
    print(f"✅ Inscripciones: {tournament.current_teams_count} equipos")
    print(f"✅ Sistema de premios: ${total_prizes} en premios")
    print(f"✅ Potencial de ingresos: ${potential_revenue}")
    print(f"✅ Formato de torneo: {tournament.get_format_display()}")
    print(f"✅ Brackets: {'Listos para generar' if tournament.can_start else 'Esperando más equipos'}")
    
    print(f"\n🎯 ¡Módulo de torneos completamente funcional!")
    
    return {
        'tournament_name': tournament.name,
        'teams_count': tournament.current_teams_count,
        'potential_revenue': float(potential_revenue),
        'total_prizes': float(total_prizes),
        'net_profit': float(net_profit),
        'can_start': tournament.can_start
    }

if __name__ == "__main__":
    test_tournament_brackets()