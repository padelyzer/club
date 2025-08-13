#!/usr/bin/env python3
"""
Script para corregir el problema de club_id en producción.
Este script debe ejecutarse una sola vez para arreglar la columna huérfana.
"""

import os
import psycopg2
from urllib.parse import urlparse

# Parse DATABASE_URL from environment or use the production URL
DATABASE_URL = "postgresql://padelyzer_db_user:2kYqN8YwCNJEcCQj3XGCJyGH0RqzIdQC@dpg-cr1b85rtq21c73c91hdg-a.oregon-postgres.render.com/padelyzer_db"

# Parse the URL
url = urlparse(DATABASE_URL)

# Connect to the database
try:
    conn = psycopg2.connect(
        host=url.hostname,
        port=url.port,
        database=url.path[1:],  # Remove leading '/'
        user=url.username,
        password=url.password,
        sslmode='require'
    )
    conn.autocommit = False
    cursor = conn.cursor()
    
    print("🔧 Conectado a la base de datos de producción")
    
    # Check if the orphaned club_id column exists
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'authentication_user' 
        AND column_name = 'club_id'
    """)
    
    result = cursor.fetchone()
    
    if result:
        print(f"⚠️  Encontrada columna huérfana club_id: {result}")
        
        # Drop the orphaned column
        print("🗑️  Eliminando columna huérfana club_id...")
        cursor.execute("ALTER TABLE authentication_user DROP COLUMN IF EXISTS club_id CASCADE")
        
        # Add the proper foreign key column
        print("✅ Agregando columna club_id correcta como foreign key...")
        cursor.execute("""
            ALTER TABLE authentication_user 
            ADD COLUMN club_id INTEGER REFERENCES clubs_club(id) 
            ON DELETE SET NULL
        """)
        
        # Create index for performance
        print("📇 Creando índice para club_id...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS authentication_user_club_id_idx 
            ON authentication_user(club_id)
        """)
        
        # Commit the changes
        conn.commit()
        print("✅ ¡Cambios aplicados exitosamente!")
        
    else:
        print("✅ No se encontró columna huérfana club_id. La estructura está correcta.")
    
    # Verify the fix
    cursor.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'authentication_user' 
        AND column_name = 'club_id'
    """)
    
    result = cursor.fetchone()
    if result:
        print(f"✅ Verificación: club_id existe como: {result}")
    else:
        print("⚠️  club_id no existe en la tabla (esto es normal si el modelo no lo define)")
    
except Exception as e:
    print(f"❌ Error: {e}")
    if 'conn' in locals():
        conn.rollback()
    raise
finally:
    if 'cursor' in locals():
        cursor.close()
    if 'conn' in locals():
        conn.close()
    print("🔒 Conexión cerrada")