#!/usr/bin/env node

// Simple test to check if we can access the reservations page
const { spawn } = require('child_process');

console.log('🔍 Testing modal error...\n');

// First check if frontend is running
console.log('1. Checking frontend server...');
const frontendCheck = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', 'http://localhost:3001']);

frontendCheck.stdout.on('data', (data) => {
  const statusCode = data.toString().trim();
  console.log(`   Frontend status: ${statusCode}`);
  
  if (statusCode === '200') {
    console.log('   ✅ Frontend is running');
    
    // Check backend
    console.log('\n2. Checking backend server...');
    const backendCheck = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', 'http://localhost:8000/api/v1/health/']);
    
    backendCheck.stdout.on('data', (data) => {
      const backendStatus = data.toString().trim();
      console.log(`   Backend status: ${backendStatus}`);
      
      if (backendStatus === '200') {
        console.log('   ✅ Backend is running');
        
        // Check specific page
        console.log('\n3. Testing reservations page redirect...');
        const pageCheck = spawn('curl', ['-I', 'http://localhost:3001/es/api-test-padel-club/reservations']);
        
        pageCheck.stdout.on('data', (data) => {
          const response = data.toString();
          console.log('   Response headers:');
          console.log(response);
          
          if (response.includes('307') || response.includes('login')) {
            console.log('\n   ⚠️  Page is redirecting to login');
            console.log('   This suggests authentication is required');
            console.log('\n💡 Solution: You need to log in first');
            console.log('   1. Go to: http://localhost:3001/es/login');
            console.log('   2. Use test credentials');
            console.log('   3. Then navigate to reservations page');
          } else {
            console.log('\n   ✅ Page loads without redirect');
          }
        });
      } else {
        console.log('   ❌ Backend is not responding correctly');
        console.log('   Please start the Django server: python manage.py runserver 8000');
      }
    });
  } else {
    console.log('   ❌ Frontend is not responding correctly');
    console.log('   Please check the Next.js server');
  }
});

frontendCheck.on('error', (error) => {
  console.log('   ❌ Error checking frontend:', error.message);
});