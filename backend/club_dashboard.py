#!/usr/bin/env python3
"""
Dashboard visual del estado del club
"""
import os
import sys
import django
from datetime import datetime, timedelta
from collections import defaultdict
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q, Avg
from apps.clubs.models import Club, Court, Schedule, Announcement
from apps.reservations.models import Reservation
from apps.clients.models import ClientProfile
from apps.root.models import Organization
from apps.authentication.models import OrganizationMembership

User = get_user_model()

class ClubDashboard:
    def __init__(self):
        self.user = User.objects.get(email="test@padelyzer.com")
        self.organization = Organization.objects.get(id=self.user.current_organization_id)
        self.club = Club.objects.filter(organization=self.organization, is_active=True).first()
        
    def print_header(self, title, emoji="📊"):
        print(f"\n{emoji} {title}")
        print("=" * 70)
    
    def show_club_overview(self):
        """Mostrar vista general del club"""
        self.print_header(f"DASHBOARD: {self.club.name}", "🏢")
        
        print(f"""
📍 Información General:
   • Nombre: {self.club.name}
   • Organización: {self.organization.trade_name}
   • Email: {self.club.email}
   • Teléfono: {self.club.phone}
   • Horario: {self.club.opening_time} - {self.club.closing_time}
   • Estado: {'✅ Activo' if self.club.is_active else '❌ Inactivo'}
""")
        
        # Dirección
        if self.club.address:
            print(f"   • Dirección: {self.club.full_address}")
        
        # Features
        if self.club.features:
            print(f"   • Servicios: {', '.join(self.club.features)}")
    
    def show_courts_status(self):
        """Mostrar estado de las canchas"""
        self.print_header("CANCHAS", "🎾")
        
        courts = Court.objects.filter(club=self.club).order_by('number')
        
        print(f"Total de canchas: {courts.count()}")
        print(f"Canchas activas: {courts.filter(is_active=True).count()}")
        print(f"En mantenimiento: {courts.filter(is_maintenance=True).count()}")
        
        print("\nDetalle de canchas:")
        for court in courts:
            status = []
            if not court.is_active:
                status.append("❌ Inactiva")
            elif court.is_maintenance:
                status.append("🔧 Mantenimiento")
            else:
                status.append("✅ Disponible")
            
            features = []
            if court.has_lighting:
                features.append("💡 Iluminación")
            if court.has_roof:
                features.append("🏠 Techada")
            if court.has_heating:
                features.append("🔥 Calefacción")
            
            print(f"""
   Cancha #{court.number} - {court.name}
   • Estado: {' '.join(status)}
   • Superficie: {court.get_surface_type_display()}
   • Precio/hora: ${court.price_per_hour}
   • Características: {' '.join(features) or 'Ninguna'}
""")
    
    def show_reservations_summary(self):
        """Mostrar resumen de reservaciones"""
        self.print_header("RESERVACIONES", "📅")
        
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Estadísticas generales
        total_reservations = Reservation.objects.filter(club=self.club).count()
        
        # Por período
        today_res = Reservation.objects.filter(
            club=self.club,
            date=today
        ).count()
        
        week_res = Reservation.objects.filter(
            club=self.club,
            date__gte=week_ago,
            date__lte=today
        ).count()
        
        month_res = Reservation.objects.filter(
            club=self.club,
            date__gte=month_ago,
            date__lte=today
        ).count()
        
        # Por estado
        status_counts = Reservation.objects.filter(
            club=self.club
        ).values('status').annotate(count=Count('id'))
        
        print(f"""
📊 Estadísticas:
   • Total histórico: {total_reservations}
   • Hoy: {today_res}
   • Última semana: {week_res}
   • Último mes: {month_res}
   
📌 Por estado:""")
        
        for status in status_counts:
            emoji = {
                'confirmed': '✅',
                'pending': '⏳',
                'cancelled': '❌',
                'completed': '✔️'
            }.get(status['status'], '❓')
            print(f"   • {emoji} {status['status'].capitalize()}: {status['count']}")
        
        # Próximas reservaciones
        upcoming = Reservation.objects.filter(
            club=self.club,
            date__gte=today,
            status__in=['confirmed', 'pending']
        ).order_by('date', 'start_time')[:5]
        
        if upcoming:
            print("\n📆 Próximas reservaciones:")
            for res in upcoming:
                print(f"   • {res.date} {res.start_time}-{res.end_time} | Cancha {res.court.number}")
    
    def show_clients_info(self):
        """Mostrar información de clientes"""
        self.print_header("CLIENTES", "👥")
        
        # Contar clientes únicos
        clients_count = ClientProfile.objects.filter(
            club=self.club
        ).count()
        
        # Contar usuarios únicos con reservaciones (por email)
        unique_players = Reservation.objects.filter(
            club=self.club
        ).values('player_email').distinct().count()
        
        print(f"""
📊 Estadísticas de clientes:
   • Perfiles registrados: {clients_count}
   • Jugadores únicos (por reservaciones): {unique_players}
   • Total usuarios del sistema: {User.objects.filter(is_active=True).count()}
""")
        
        # Top jugadores por email en reservaciones
        top_players = Reservation.objects.filter(
            club=self.club
        ).values('player_email', 'player_name').annotate(
            reservation_count=Count('id')
        ).order_by('-reservation_count')[:5]
        
        if top_players:
            print("🏆 Top jugadores (por reservaciones):")
            for i, player in enumerate(top_players, 1):
                print(f"   {i}. {player['player_name']} ({player['player_email']}) - {player['reservation_count']} reservaciones")
    
    def show_announcements(self):
        """Mostrar anuncios activos"""
        self.print_header("ANUNCIOS ACTIVOS", "📢")
        
        now = timezone.now()
        active_announcements = Announcement.objects.filter(
            club=self.club,
            starts_at__lte=now,
            ends_at__gte=now
        ).order_by('-is_priority', '-starts_at')
        
        if active_announcements:
            for ann in active_announcements:
                priority = "🔴 PRIORITARIO" if ann.is_priority else ""
                print(f"""
{priority} {ann.title}
   • Tipo: {ann.get_announcement_type_display()}
   • Contenido: {ann.content[:100]}{'...' if len(ann.content) > 100 else ''}
   • Válido hasta: {ann.ends_at.strftime('%Y-%m-%d %H:%M')}
""")
        else:
            print("   No hay anuncios activos")
    
    def show_schedules(self):
        """Mostrar horarios del club"""
        self.print_header("HORARIOS", "⏰")
        
        schedules = Schedule.objects.filter(club=self.club).order_by('weekday')
        
        if schedules:
            days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
            
            for schedule in schedules:
                if schedule.is_closed:
                    print(f"   • {days[schedule.weekday]}: CERRADO")
                else:
                    print(f"   • {days[schedule.weekday]}: {schedule.opening_time} - {schedule.closing_time}")
                if schedule.notes:
                    print(f"     Nota: {schedule.notes}")
        else:
            print(f"   Horario general: {self.club.opening_time} - {self.club.closing_time}")
    
    def show_financial_summary(self):
        """Mostrar resumen financiero básico"""
        self.print_header("RESUMEN FINANCIERO", "💰")
        
        # Ingresos estimados del mes
        month_ago = datetime.now().date() - timedelta(days=30)
        
        month_revenue = Reservation.objects.filter(
            club=self.club,
            date__gte=month_ago,
            status='completed',
            payment_status='paid'
        ).aggregate(
            total=Sum('total_price')
        )['total'] or 0
        
        month_reservations = Reservation.objects.filter(
            club=self.club,
            date__gte=month_ago,
            status='completed'
        ).count()
        
        avg_ticket = month_revenue / month_reservations if month_reservations > 0 else 0
        
        print(f"""
📊 Último mes:
   • Ingresos estimados: ${month_revenue:,.2f}
   • Reservaciones completadas: {month_reservations}
   • Ticket promedio: ${avg_ticket:,.2f}
   
⚠️  Nota: Estos son cálculos estimados basados en reservaciones completadas
""")
    
    def generate_dashboard(self):
        """Generar dashboard completo"""
        print("\n" + "🎾" * 35)
        print("DASHBOARD COMPLETO DEL CLUB")
        print("🎾" * 35)
        
        self.show_club_overview()
        self.show_courts_status()
        self.show_reservations_summary()
        self.show_clients_info()
        self.show_announcements()
        self.show_schedules()
        self.show_financial_summary()
        
        print("\n" + "=" * 70)
        print(f"📅 Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"👤 Usuario: {self.user.email}")
        print(f"🏢 Organización: {self.organization.trade_name}")
        print("=" * 70)

if __name__ == "__main__":
    try:
        dashboard = ClubDashboard()
        dashboard.generate_dashboard()
    except Exception as e:
        print(f"❌ Error generando dashboard: {str(e)}")
        import traceback
        traceback.print_exc()