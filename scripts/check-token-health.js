#!/usr/bin/env node

/**
 * Google Ads API Refresh Token Health Check
 * 
 * This script checks if your refresh token is still valid.
 * Run monthly to catch token expiration before it causes issues.
 * 
 * Usage: node scripts/check-token-health.js
 */

require('dotenv').config({ path: '.env.local' });

const https = require('https');

const clientId = process.env.GADS_CLIENT_ID;
const clientSecret = process.env.GADS_CLIENT_SECRET;
const refreshToken = process.env.GADS_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
  console.log('❌ Missing required environment variables');
  console.log('Please set GADS_CLIENT_ID, GADS_CLIENT_SECRET, and GADS_REFRESH_TOKEN in .env.local');
  process.exit(1);
}

console.log('🔍 Checking Google Ads API refresh token health...\n');

// Test token by attempting to get an access token
const postData = require('querystring').stringify({
  client_id: clientId,
  client_secret: clientSecret,
  refresh_token: refreshToken,
  grant_type: 'refresh_token',
});

const options = {
  hostname: 'oauth2.googleapis.com',
  port: 443,
  path: '/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData),
  },
};

const startTime = Date.now();
const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    const duration = Date.now() - startTime;
    
    try {
      const result = JSON.parse(data);
      
      if (result.access_token) {
        console.log('✅ REFRESH TOKEN IS HEALTHY');
        console.log(`   Response time: ${duration}ms`);
        console.log(`   Access token expires in: ${result.expires_in || 'N/A'} seconds`);
        console.log('\n💡 Token is working correctly. No action needed.');
      } else {
        console.log('❌ REFRESH TOKEN NEEDS RENEWAL');
        console.log(`   Error: ${result.error || 'Unknown error'}`);
        console.log(`   Description: ${result.error_description || 'No description'}`);
        
        if (result.error === 'invalid_grant') {
          console.log('\n⚠️  ACTION REQUIRED:');
          console.log('   1. Run: node get-new-refresh-token.js');
          console.log('   2. Follow the OAuth flow to get a new authorization code');
          console.log('   3. Run: node exchange-ads-code.js <authorization_code>');
          console.log('   4. Update .env.local and Vercel production with the new token');
        }
        
        process.exit(1);
      }
    } catch (e) {
      console.log('❌ Failed to parse response:');
      console.log(data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
  process.exit(1);
});

req.write(postData);
req.end();

