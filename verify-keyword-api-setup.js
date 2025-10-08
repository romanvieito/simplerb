#!/usr/bin/env node
/**
 * Google Ads Keyword Planning API Verification Script
 * 
 * This script verifies that your environment is properly configured
 * to use REAL Google Ads API data instead of mock data.
 */

console.log('🔍 Google Ads Keyword Planning Setup Verification\n');
console.log('='.repeat(60));

// Check required environment variables
const requiredVars = [
  'GADS_DEVELOPER_TOKEN',
  'GADS_CLIENT_ID',
  'GADS_CLIENT_SECRET',
  'GADS_REFRESH_TOKEN',
  'GADS_LOGIN_CUSTOMER_ID'
];

const optionalVars = [
  'GADS_USE_KEYWORD_PLANNING'
];

let allPresent = true;

console.log('\n📋 Required Environment Variables:');
console.log('-'.repeat(60));

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? 
    (varName.includes('TOKEN') || varName.includes('SECRET') ? 
      `${value.substring(0, 8)}...` : 
      value) : 
    'NOT SET';
  
  console.log(`${status} ${varName}: ${displayValue}`);
  
  if (!value) {
    allPresent = false;
  }
});

console.log('\n📋 Optional Environment Variables:');
console.log('-'.repeat(60));

optionalVars.forEach(varName => {
  const value = process.env[varName];
  const isTrue = value === 'true';
  const status = isTrue ? '✅' : '⚠️';
  const displayValue = value || 'NOT SET (will use mock data)';
  
  console.log(`${status} ${varName}: ${displayValue}`);
  
  if (!isTrue) {
    console.log(`   ⚠️  Set to 'true' to enable real Google Ads API data`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:');
console.log('-'.repeat(60));

if (!allPresent) {
  console.log('❌ MISSING REQUIRED VARIABLES');
  console.log('   Some required Google Ads API credentials are missing.');
  console.log('   The API will return mock data in development mode.');
  console.log('   See GOOGLE_ADS_SETUP.md for setup instructions.\n');
  process.exit(1);
}

const useRealData = process.env.GADS_USE_KEYWORD_PLANNING === 'true';

if (useRealData) {
  console.log('✅ FULLY CONFIGURED FOR REAL DATA');
  console.log('   All required credentials are present.');
  console.log('   GADS_USE_KEYWORD_PLANNING is set to "true".');
  console.log('   The API will attempt to fetch real Google Ads data.\n');
  console.log('💡 Tip: Check server logs when making requests to see:');
  console.log('   - "📊 Using REAL GOOGLE API DATA"');
  console.log('   - "✅ Successfully fetched X keywords from Google Ads API"\n');
} else {
  console.log('⚠️  CONFIGURED BUT USING MOCK DATA');
  console.log('   All required credentials are present.');
  console.log('   However, GADS_USE_KEYWORD_PLANNING is NOT set to "true".');
  console.log('   The API will return deterministic mock data.\n');
  console.log('🔧 To enable real data:');
  console.log('   Add this to your .env.local file:');
  console.log('   GADS_USE_KEYWORD_PLANNING=true\n');
  console.log('💡 Tip: Check server logs when making requests to see:');
  console.log('   - "📊 Using MOCK DATA"');
  console.log('   - "⚠️  Returning mock data. Set GADS_USE_KEYWORD_PLANNING=true..."\n');
}

console.log('='.repeat(60));
console.log('\n🚀 To test the API:');
console.log('   1. Start your development server: npm run dev');
console.log('   2. Navigate to: http://localhost:3000/find-keywords');
console.log('   3. Enter some keywords and click "Research Keywords"');
console.log('   4. Check the server console logs for the emoji indicators\n');

process.exit(useRealData ? 0 : 1);
