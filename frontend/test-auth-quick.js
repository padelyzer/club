#!/usr/bin/env node

const fetch = require('node-fetch');

async function testAuth() {
  console.log('🔐 Testing authentication flow...\n');
  
  try {
    // Test backend auth endpoint
    console.log('1. Testing login endpoint...');
    const loginResponse = await fetch('http://localhost:8000/api/v1/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin@test.com',
        password: 'admin123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('   ✅ Login successful');
      console.log(`   User: ${loginData.user?.username || 'N/A'}`);
      console.log(`   Access token: ${loginData.access ? 'Present' : 'Missing'}`);
      
      // Test if we can access protected endpoint
      if (loginData.access) {
        console.log('\n2. Testing protected endpoint...');
        const protectedResponse = await fetch('http://localhost:8000/api/v1/clubs/', {
          headers: {
            'Authorization': `Bearer ${loginData.access}`
          }
        });
        
        if (protectedResponse.ok) {
          const clubs = await protectedResponse.json();
          console.log('   ✅ Protected endpoint accessible');
          console.log(`   Found ${clubs.length || 0} clubs`);
        } else {
          console.log('   ❌ Protected endpoint failed');
        }
      }
    } else {
      console.log('   ❌ Login failed');
      const error = await loginResponse.text();
      console.log(`   Error: ${error}`);
      
      // Try alternative credentials
      console.log('\n   Trying alternative credentials...');
      const altLoginResponse = await fetch('http://localhost:8000/api/v1/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'admin123'
        })
      });
      
      if (altLoginResponse.ok) {
        console.log('   ✅ Alternative login successful');
      } else {
        console.log('   ❌ Alternative login also failed');
      }
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
  
  console.log('\n📝 Next steps:');
  console.log('1. Open browser and go to: http://localhost:3001/es/login');
  console.log('2. Try these credentials:');
  console.log('   - admin@test.com / admin123');
  console.log('   - admin / admin123');
  console.log('3. After login, try creating a reservation again');
}

testAuth();