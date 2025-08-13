"""
Script para verificar clubes y organizaciones existentes.
Run with: python manage.py shell < check_clubs.py
"""

from django.contrib.auth import get_user_model

from apps.clubs.models import Club, Court
from apps.root.models import Organization

User = get_user_model()

print("=" * 60)
print("📊 VERIFICACIÓN DE MÓDULO ROOT Y CLUBES")
print("=" * 60)

# 1. Verificar Organizaciones (módulo root)
print("\n🏢 ORGANIZACIONES (Módulo ROOT):")
print("-" * 40)
organizations = Organization.objects.all()
if organizations.exists():
    for org in organizations:
        print(f"\n✅ Organización encontrada:")
        print(f"   - RFC: {org.rfc}")
        print(f"   - Razón Social: {org.business_name}")
        print(f"   - Nombre Comercial: {org.trade_name}")
        print(f"   - Tipo: {org.get_type_display()}")
        print(f"   - Estado: {org.get_state_display()}")
        print(f"   - Email: {org.primary_email}")
        print(f"   - Teléfono: {org.primary_phone}")
        print(f"   - Dirección fiscal: {org.tax_address}")
        print(f"   - Activa: {'Sí' if org.is_active else 'No'}")
        print(f"   - Creada: {org.created_at.strftime('%Y-%m-%d %H:%M')}")

        # Verificar membresías
        memberships = org.memberships.all()
        if memberships:
            print(f"   - Miembros ({memberships.count()}):")
            for member in memberships:
                print(f"     • {member.user.email} - {member.get_role_display()}")
else:
    print("❌ No hay organizaciones creadas")

# 2. Verificar Clubes (módulo clubs)
print("\n\n🎾 CLUBES (Módulo CLUBS):")
print("-" * 40)
clubs = Club.objects.all()
if clubs.exists():
    for club in clubs:
        print(f"\n✅ Club encontrado:")
        print(f"   - Nombre: {club.name}")
        print(f"   - Slug: {club.slug}")
        print(f"   - Organización: {club.organization.trade_name}")
        print(f"   - Email: {club.email}")
        print(f"   - Teléfono: {club.phone}")
        print(f"   - Website: {club.website}")
        print(f"   - Dirección: {club.address}")
        print(f"   - Horario: {club.opening_time} - {club.closing_time}")
        print(f"   - Días abierto: {club.days_open}")
        print(f"   - Características: {club.features}")
        print(f"   - Activo: {'Sí' if club.is_active else 'No'}")
        print(f"   - Total de canchas: {club.courts.count()}")

        # Mostrar canchas
        courts = club.courts.all()
        if courts:
            print(f"   - Canchas:")
            for court in courts:
                print(
                    f"     • {court.name} - {court.get_surface_type_display()} - €{court.price_per_hour}/hora"
                )
else:
    print("❌ No hay clubes creados")

# 3. Resumen de la estructura
print("\n\n📈 RESUMEN DE LA ESTRUCTURA:")
print("-" * 40)
print(f"Total de organizaciones: {Organization.objects.count()}")
print(f"Total de clubes: {Club.objects.count()}")
print(f"Total de canchas: {Court.objects.count()}")

# 4. Verificar relación Organization-Club
print("\n\n🔗 RELACIÓN ORGANIZATION-CLUB:")
print("-" * 40)
for org in Organization.objects.all():
    clubs_count = org.clubs.count()
    print(f"\n{org.trade_name} (RFC: {org.rfc}):")
    print(f"  - Tiene {clubs_count} club(es)")
    if clubs_count > 0:
        for club in org.clubs.all():
            print(f"    • {club.name} ({club.courts.count()} canchas)")

print("\n" + "=" * 60)
print("✅ Verificación completada")
print("=" * 60)
