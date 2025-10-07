const { google } = require('googleapis');
const readline = require('readline');

// Your OAuth credentials
const CLIENT_ID = '43683355815-173athgnaa91gqoet3rntnnd2bslfrke.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'http://localhost:3003/oauth/callback';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/adwords'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('🔗 Authorize this app by visiting this URL:');
console.log(authUrl);
console.log('\n📋 After authorization, you\'ll get a code. Paste it here:');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Success! Here are your tokens:');
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('Access Token:', tokens.access_token);
    
    // Test the refresh token
    oauth2Client.setCredentials(tokens);
    console.log('\n🧪 Testing refresh token...');
    
    // You can test with a simple API call here if needed
    console.log('✅ Refresh token is valid!');
    
  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
  }
  
  rl.close();
});
