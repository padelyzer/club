#!/usr/bin/env node

/**
 * Generate secure keys for production use
 * Run: node scripts/generate-secure-keys.js
 */

const crypto = require('crypto');

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generateBase64Key(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('🔐 Generating secure keys for production...\n');

// Generate encryption key
const encryptionKey = generateSecureKey(32); // 256 bits
const jwtSecret = generateSecureKey(32); // 256 bits
const sessionSecret = generateSecureKey(32); // 256 bits

console.log('# Add these to your secure environment configuration:');
console.log('# DO NOT commit these values to version control!\n');

console.log(`ENCRYPTION_KEY=${encryptionKey}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`SESSION_SECRET=${sessionSecret}`);

console.log('\n# Alternative Base64 encoded versions:');
console.log(`ENCRYPTION_KEY_BASE64=${generateBase64Key(32)}`);
console.log(`JWT_SECRET_BASE64=${generateBase64Key(32)}`);

console.log('\n⚠️  Security Guidelines:');
console.log('1. Store these keys in a secure secret management service');
console.log('2. Never hardcode keys in your application');
console.log('3. Use different keys for each environment');
console.log('4. Rotate keys regularly (at least every 90 days)');
console.log('5. Implement key versioning for smooth rotation');
console.log('6. Monitor key usage and access logs');

console.log('\n📦 Recommended Secret Management Services:');
console.log('- AWS Secrets Manager');
console.log('- Azure Key Vault');
console.log('- Google Cloud Secret Manager');
console.log('- HashiCorp Vault');
console.log('- Kubernetes Secrets (with encryption at rest)');

console.log('\n🚀 For Vercel deployment:');
console.log('Use: vercel env add ENCRYPTION_KEY production');
console.log('Then paste the generated key when prompted.');