const { google } = require('googleapis');

// Your OAuth credentials
const CLIENT_ID = '43683355815-173athgnaa91gqoet3rntnnd2bslfrke.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

// Get the authorization code from command line
const authCode = process.argv[2];

if (!authCode) {
  console.log('❌ Please provide an authorization code:');
  console.log('Usage: node exchange-code.js <your_authorization_code>');
  process.exit(1);
}

async function exchangeCodeForTokens() {
  // Try different redirect URIs
  const REDIRECT_URIS = [
    'http://localhost:3000/oauth/callback',
    'http://localhost:3003/oauth/callback',
    'http://localhost:3000',
    'http://localhost:3003',
    'urn:ietf:wg:oauth:2.0:oob',
    'http://localhost'
  ];

  for (const redirectUri of REDIRECT_URIS) {
    console.log(`Trying redirect URI: ${redirectUri}`);
    
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      redirectUri
    );

    try {
      const { tokens } = await oauth2Client.getToken(authCode);
      
      console.log('\n✅ Success! Here are your tokens:');
      console.log('Refresh Token:', tokens.refresh_token);
      console.log('Access Token:', tokens.access_token);
      
      console.log('\n📝 Update your .env.local file with:');
      console.log(`GADS_REFRESH_TOKEN=${tokens.refresh_token}`);
      
      return;
      
    } catch (error) {
      console.log(`❌ Failed with ${redirectUri}: ${error.message}`);
    }
  }
  
  console.log('\n❌ All redirect URIs failed. You may need to:');
  console.log('1. Check your Google Cloud Console OAuth configuration');
  console.log('2. Add the correct redirect URI to your OAuth app');
  console.log('3. Try again with the correct redirect URI');
}

// Run the function
exchangeCodeForTokens();
