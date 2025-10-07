const { google } = require('googleapis');
const readline = require('readline');

// Your OAuth credentials
const CLIENT_ID = '43683355815-173athgnaa91gqoet3rntnnd2bslfrke.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

// Try different redirect URIs that might be configured
const REDIRECT_URIS = [
  'http://localhost:3000/oauth/callback',
  'http://localhost:3003/oauth/callback',
  'http://localhost:3000',
  'http://localhost:3003',
  'urn:ietf:wg:oauth:2.0:oob', // For installed applications
  'http://localhost'
];

async function tryGetRefreshToken() {
  console.log('🔧 Trying to get refresh token with different redirect URIs...\n');

  for (const redirectUri of REDIRECT_URIS) {
    console.log(`Trying redirect URI: ${redirectUri}`);
    
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      redirectUri
    );

    const SCOPES = ['https://www.googleapis.com/auth/adwords'];

    try {
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });

      console.log(`\n🔗 Try this URL: ${authUrl}`);
      console.log('If this works, you\'ll get a code. If not, we\'ll try the next redirect URI.\n');
      
      // For now, let's just show the URL and let you try manually
      console.log('📋 Manual steps:');
      console.log('1. Click the URL above');
      console.log('2. If it works, copy the authorization code from the URL');
      console.log('3. Run: node exchange-code.js <your_code>');
      console.log('4. If it doesn\'t work, we\'ll try the next redirect URI\n');
      
      break; // Try the first one for now
      
    } catch (error) {
      console.log(`❌ Failed with ${redirectUri}: ${error.message}\n`);
    }
  }
}

// Run the function
tryGetRefreshToken();
