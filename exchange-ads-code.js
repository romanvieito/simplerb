#!/usr/bin/env node

const https = require('https');

const code = process.argv[2];

if (!code) {
  console.log('❌ Please provide an authorization code');
  console.log('Usage: node exchange-ads-code.js <your_authorization_code>');
  process.exit(1);
}

const clientId = process.env.GADS_CLIENT_ID;
const clientSecret = process.env.GADS_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.log('❌ Missing required environment variables');
  console.log('Please set GADS_CLIENT_ID and GADS_CLIENT_SECRET in your environment');
  console.log('You can find these values in your Google Cloud Console OAuth credentials');
  process.exit(1);
}
const redirectUri = 'http://localhost:3000/oauth/callback';

// OAuth2 token endpoint expects application/x-www-form-urlencoded, not JSON
const postData = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  code: code,
  grant_type: 'authorization_code',
  redirect_uri: redirectUri
}).toString();

const options = {
  hostname: 'oauth2.googleapis.com',
  port: 443,
  path: '/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔄 Exchanging authorization code for refresh token...');

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.refresh_token) {
        console.log('✅ Success! Here is your new refresh token:');
        console.log('');
        console.log('REFRESH_TOKEN=' + response.refresh_token);
        console.log('');
        console.log('🔧 To update Vercel, run:');
        console.log(`echo "${response.refresh_token}" | vercel env add GADS_REFRESH_TOKEN production`);
        console.log('');
        console.log('🚀 Then redeploy:');
        console.log('vercel --prod');
        console.log('');
        console.log('✅ Remember to update both local (.env.local) and production (Vercel) environments!');
        console.log('📚 Run "node scripts/check-token-health.js" monthly to monitor token health.');
      } else {
        console.log('❌ Error getting refresh token:');
        console.log(JSON.stringify(response, null, 2));
      }
    } catch (e) {
      console.log('❌ Error parsing response:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
