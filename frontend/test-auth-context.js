#!/usr/bin/env node

/**
 * Test the auth context endpoint that aggregates all authentication data
 */

const BASE_URL = 'http://localhost:3000/api/auth/context';
let accessToken = '';

async function login() {
  console.log('\n1. Logging in to get access token...');
  
  try {
    const response = await fetch('http://localhost:3000/api/auth/login', {
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
      console.log('✅ Login successful');
      accessToken = data.access;
      return true;
    } else {
      console.error('❌ Login failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error during login:', error);
    return false;
  }
}

async function testAuthContext() {
  console.log('\n2. Testing auth context endpoint...');
  
  try {
    // The auth context expects the token in a cookie, not header
    // For testing, we'll use the header approach which should work as fallback
    const response = await fetch(BASE_URL, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Cookie': `access_token=${accessToken}`
      },
      credentials: 'include'
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Auth context endpoint working!');
      console.log('\n📋 Auth Context Data:');
      console.log('   User:', data.user?.email);
      console.log('   Organization:', data.organization?.trade_name || 'None');
      console.log('   Clubs:', data.clubs?.length || 0);
      console.log('   Global Permissions:', data.permissions?.global?.length || 0);
      console.log('   Club Permissions:', Object.keys(data.permissions?.by_club || {}).length, 'clubs');
      
      // Check if all required data is present
      const hasAllData = 
        data.user && 
        data.organization && 
        data.clubs && 
        data.permissions;
        
      if (hasAllData) {
        console.log('\n✅ All required auth context data is present!');
        return true;
      } else {
        console.log('\n⚠️  Some auth context data is missing');
        if (!data.user) console.log('   - Missing user data');
        if (!data.organization) console.log('   - Missing organization data');
        if (!data.clubs) console.log('   - Missing clubs data');
        if (!data.permissions) console.log('   - Missing permissions data');
        return false;
      }
    } else {
      console.error('❌ Auth context failed:', response.status, data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error fetching auth context:', error);
    return false;
  }
}

async function main() {
  console.log('Testing Frontend Auth Context Integration');
  console.log('========================================');
  
  // First login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('\n❌ Cannot continue without login');
    process.exit(1);
  }
  
  // Test auth context
  const contextSuccess = await testAuthContext();
  
  if (contextSuccess) {
    console.log('\n✅ Frontend auth context integration is working correctly!');
    console.log('   The frontend can now use all authentication data without 404 errors.');
  } else {
    console.log('\n❌ Frontend auth context integration has issues');
    process.exit(1);
  }
}

// Run the test
main();