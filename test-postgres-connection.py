#!/usr/bin/env python3
import requests
import json
import time

print("🔍 Verificando conexión a PostgreSQL...")
print("=" * 50)

# Esperar un poco para que el deployment se complete
print("⏳ Esperando 30 segundos para que el deployment se complete...")
time.sleep(30)

# Verificar el health endpoint
url = "https://backend-io1y.onrender.com/api/v1/health/"
print(f"\n📡 Verificando: {url}")

try:
    response = requests.get(url)
    data = response.json()
    
    print(f"\n📊 Estado general: {data['status']}")
    print(f"🌍 Ambiente: {data['environment']}")
    
    # Verificar específicamente la base de datos
    db_info = data['details']['database']
    print(f"\n🗄️  Base de datos:")
    print(f"   - Estado: {db_info['status']}")
    print(f"   - Vendor: {db_info['vendor']}")
    
    if db_info['vendor'] == 'postgresql':
        print("\n✅ ¡PostgreSQL está conectado correctamente!")
    else:
        print(f"\n⚠️  Todavía usando {db_info['vendor']}. Puede que necesites:")
        print("   1. Verificar que DATABASE_URL esté en el Environment Group")
        print("   2. Hacer un Manual Deploy en Render")
        print("   3. Esperar a que el deployment se complete")
    
    # Mostrar todos los checks
    print(f"\n🔍 Todos los checks:")
    for check, status in data['checks'].items():
        emoji = "✅" if status else "❌"
        print(f"   {emoji} {check}: {status}")
        
except Exception as e:
    print(f"\n❌ Error al verificar: {e}")
    print("   El servicio puede estar reiniciándose. Intenta de nuevo en unos minutos.")

print("\n" + "=" * 50)