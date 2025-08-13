#!/usr/bin/env python3
"""
Verificar estado del módulo de torneos
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.tournaments.models import Tournament, TournamentCategory, TournamentRegistration, Match, Prize
from apps.clubs.models import Club

def check_tournaments_status():
    print('🏆 ESTADO DEL MÓDULO DE TORNEOS')
    print('=' * 50)
    
    # Counts
    categories_count = TournamentCategory.objects.count()
    tournaments_count = Tournament.objects.count()
    registrations_count = TournamentRegistration.objects.count()
    matches_count = Match.objects.count()
    prizes_count = Prize.objects.count()
    
    print(f'📊 Categorías: {categories_count}')
    print(f'📊 Torneos: {tournaments_count}')
    print(f'📊 Inscripciones: {registrations_count}')
    print(f'📊 Partidos: {matches_count}')
    print(f'📊 Premios: {prizes_count}')
    
    # Show existing data
    if categories_count > 0:
        print('\n📋 Categorías existentes:')
        for cat in TournamentCategory.objects.all()[:5]:
            print(f'   - {cat.name} ({cat.category_type})')
    
    if tournaments_count > 0:
        print('\n🏆 Torneos existentes:')
        for tournament in Tournament.objects.all()[:5]:
            print(f'   - {tournament.name} ({tournament.status}) - ${tournament.registration_fee}')
            print(f'     📅 {tournament.start_date} a {tournament.end_date}')
            print(f'     👥 {tournament.current_teams_count}/{tournament.max_teams} equipos')
    
    if registrations_count > 0:
        print('\n👥 Inscripciones:')
        for reg in TournamentRegistration.objects.all()[:3]:
            print(f'   - {reg.team_name}: {reg.player1.user.get_full_name()} / {reg.player2.user.get_full_name()}')
    
    return {
        'categories': categories_count,
        'tournaments': tournaments_count,
        'registrations': registrations_count,
        'matches': matches_count,
        'prizes': prizes_count
    }

if __name__ == "__main__":
    check_tournaments_status()