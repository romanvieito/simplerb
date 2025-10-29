#!/usr/bin/env node

/**
 * Google Ads API Refresh Token Renewal Script
 * 
 * This script helps you get a new refresh token when your current one has expired.
 * 
 * Usage:
 * 1. Run: node get-new-refresh-token.js
 * 2. Visit the provided URL in your browser
 * 3. Authorize the application
 * 4. Copy the authorization code from the URL
 * 5. Run: node exchange-ads-code.js <authorization_code>
 */

const clientId = process.env.GADS_CLIENT_ID;

if (!clientId) {
  console.log('❌ Missing required environment variable');
  console.log('Please set GADS_CLIENT_ID in your environment');
  console.log('You can find this value in your Google Cloud Console OAuth credentials');
  process.exit(1);
}
const redirectUri = 'http://localhost:3000/oauth/callback';

// Generate the authorization URL
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${clientId}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `scope=${encodeURIComponent('https://www.googleapis.com/auth/adwords')}&` +
  `response_type=code&` +
  `access_type=offline&` +
  `prompt=consent`;

console.log('🔄 Google Ads API Refresh Token Renewal');
console.log('=====================================');
console.log('');
console.log('Your OAuth refresh token has expired (invalid_grant error).');
console.log('Follow these steps to get a new one:');
console.log('');
console.log('1. Visit this URL in your browser:');
console.log('');
console.log(authUrl);
console.log('');
console.log('2. Sign in to your Google account and authorize the application');
console.log('');
console.log('3. You will be redirected to a URL that looks like:');
console.log('   http://localhost:3000/oauth/callback?code=4/0AX4XfWh...');
console.log('');
console.log('4. Copy the "code" parameter from the URL');
console.log('');
console.log('5. Run this command with your authorization code:');
console.log('   node exchange-ads-code.js <your_authorization_code>');
console.log('');
console.log('6. Update your environment variables with the new refresh token');
console.log('');
console.log('💡 The new refresh token will be displayed in the terminal.');
console.log('');
console.log('📚 See REFRESH_TOKEN_MAINTENANCE.md for detailed instructions and prevention tips.');
