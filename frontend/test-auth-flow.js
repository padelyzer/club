#!/usr/bin/env node

/**
 * Test completo del flujo de autenticación
 */

const BASE_URL = 'http://localhost:8000/api/v1';
let accessToken = '';

async function testLogin() {
  console.log('\n1. Probando login...');
  
  try {
    const response = await fetch(`${BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@padelyzer.com',
        password: 'testpass123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Login exitoso');
      console.log('📧 Email:', data.user.email);
      console.log('🏢 Organization memberships:', data.user.organization_memberships?.length || 0);
      console.log('🔑 Access token:', data.access ? 'Recibido' : 'NO RECIBIDO');
      
      accessToken = data.access;
      
      // Mostrar organizaciones
      if (data.user.organization_memberships) {
        data.user.organization_memberships.forEach((membership, index) => {
          console.log(`\n  Organización ${index + 1}:`);
          console.log(`    - ID: ${membership.organization}`);
          console.log(`    - Nombre: ${membership.organization_name}`);
          console.log(`    - Rol: ${membership.role}`);
        });
      }
      
      return data.user;
    } else {
      console.error('❌ Error en login:', data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    process.exit(1);
  }
}

async function testGetClub(clubSlug) {
  console.log(`\n2. Obteniendo información del club: ${clubSlug}`);
  
  try {
    const response = await fetch(`${BASE_URL}/clubs/by-slug/${clubSlug}/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Club obtenido exitosamente');
      console.log('🏟️ Nombre:', data.name);
      console.log('🆔 ID:', data.id);
      console.log('🏢 Organization ID:', data.organization);
      return data;
    } else {
      console.error('❌ Error obteniendo club:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return null;
  }
}

async function testProfile() {
  console.log('\n3. Obteniendo perfil de usuario...');
  
  try {
    const response = await fetch(`${BASE_URL}/auth/profile/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Perfil obtenido exitosamente');
      console.log('👤 Usuario:', data.email);
      console.log('🏢 Current organization:', data.current_organization?.trade_name || 'Ninguna');
      return data;
    } else {
      console.error('❌ Error obteniendo perfil:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return null;
  }
}

async function runTests() {
  console.log('=== PRUEBA COMPLETA DEL FLUJO DE AUTENTICACIÓN ===');
  
  // 1. Login
  const user = await testLogin();
  
  if (!user) {
    console.error('\n❌ Login falló, abortando pruebas');
    return;
  }
  
  // 2. Obtener club
  const club = await testGetClub('api-test-padel-club');
  
  // 3. Obtener perfil
  const profile = await testProfile();
  
  // 4. Verificar acceso
  console.log('\n4. Verificando acceso al club...');
  
  if (user && club) {
    const hasAccess = user.organization_memberships?.some(m => 
      m.organization === club.organization
    );
    
    if (hasAccess) {
      console.log('✅ El usuario TIENE acceso al club');
      
      const membership = user.organization_memberships.find(m => 
        m.organization === club.organization
      );
      console.log(`   - A través de la organización: ${membership.organization_name}`);
      console.log(`   - Con rol: ${membership.role}`);
    } else {
      console.log('❌ El usuario NO tiene acceso al club');
      console.log(`   - Club pertenece a organización: ${club.organization}`);
      console.log(`   - Usuario tiene membresías en:`, 
        user.organization_memberships?.map(m => m.organization).join(', ') || 'Ninguna'
      );
    }
  }
  
  console.log('\n=== FIN DE LAS PRUEBAS ===\n');
}

// Ejecutar pruebas
runTests();