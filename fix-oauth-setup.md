# 🔧 Fix OAuth Setup for Google Ads API

## The Issue
Your current OAuth app is configured for Gmail, but Google Ads API requires a specific scope. The refresh token works for basic authentication but fails when trying to access Google Ads resources.

## Solution: Update Your OAuth App

### Step 1: Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Find your OAuth 2.0 Client ID: `43683355815-173athgnaa91gqoet3rntnnd2bslfrke.apps.googleusercontent.com`

### Step 2: Update OAuth Consent Screen
1. Go to "OAuth consent screen"
2. Add the Google Ads API scope: `https://www.googleapis.com/auth/adwords`
3. Save the changes

### Step 3: Update Authorized Redirect URIs
Add these redirect URIs to your OAuth app:
- `http://localhost:3000/oauth/callback`
- `http://localhost:3003/oauth/callback`
- `urn:ietf:wg:oauth:2.0:oob` (for installed apps)

### Step 4: Get New Refresh Token
Run this command to get a new refresh token with Google Ads scope:

```bash
node get-refresh-token-simple.js
```

Then follow the URL and get the authorization code, then run:

```bash
node exchange-code.js <your_authorization_code>
```

## Alternative: Quick Test with Existing Token

If you want to test quickly, you can temporarily set `ADPILOT_VALIDATE_ONLY=true` in your `.env.local` to test campaign creation in dry-run mode:

```bash
echo "ADPILOT_VALIDATE_ONLY=true" >> .env.local
```

This will let you test the campaign creation logic without actually creating campaigns.

## Current Status
✅ **Working:**
- API connection established
- Basic authentication working
- Dashboard accessible
- Metrics endpoint responding (with empty data)

❌ **Needs Fix:**
- Campaign creation (invalid_grant error)
- Need proper Google Ads scope in OAuth app

## Next Steps
1. Update your OAuth app with Google Ads scope
2. Get new refresh token with proper scope
3. Test campaign creation
4. Start using the full Google Ads API features!
