# 🔄 Refresh Token Maintenance Guide

## Understanding Refresh Tokens

Google OAuth refresh tokens can expire or be revoked in these scenarios:

1. **User revokes access** - User manually revokes app access in their Google account
2. **Token expiration** - Refresh tokens expire after 6 months of inactivity (unless used)
3. **Security changes** - User changes password or enables 2FA, may revoke tokens
4. **OAuth client changes** - If client ID/secret changes, old refresh tokens become invalid

## 🚨 Early Detection

### Monitor for these symptoms:

- `invalid_grant` errors in API responses
- 401/403 authentication errors from Google Ads API
- Failed keyword research requests
- Error logs showing "Token has been expired or revoked"

### Automated Health Check

Run this periodically to check token health:

```bash
# Quick token verification
node -e "
require('dotenv').config({path:'.env.local'});
const https = require('https');
const postData = require('querystring').stringify({
  client_id: process.env.GADS_CLIENT_ID,
  client_secret: process.env.GADS_CLIENT_SECRET,
  refresh_token: process.env.GADS_REFRESH_TOKEN,
  grant_type: 'refresh_token'
});
const req = https.request({
  hostname: 'oauth2.googleapis.com',
  path: '/token',
  method: 'POST',
  headers: {'Content-Type': 'application/x-www-form-urlencoded'}
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.access_token) {
      console.log('✅ Token is valid');
    } else {
      console.log('❌ Token needs renewal:', result.error);
    }
  });
});
req.write(postData);
req.end();
"
```

## 🔧 Renewal Process

### When you get `invalid_grant` errors:

1. **Stop what you're doing** - The app won't work with Google Ads API until fixed

2. **Use the renewal script:**
   ```bash
   node get-new-refresh-token.js
   ```

3. **Follow the process:**
   - Open the generated URL in your browser
   - Sign in and authorize
   - Copy the authorization code from the redirect URL
   - Run: `node exchange-ads-code.js <authorization_code>`

4. **Update both environments:**
   ```bash
   # Local
   # Add to .env.local: GADS_REFRESH_TOKEN=<new_token>
   
   # Production (Vercel)
   echo "<new_token>" | vercel env rm GADS_REFRESH_TOKEN production
   echo "<new_token>" | vercel env add GADS_REFRESH_TOKEN production
   ```

5. **Test immediately:**
   ```bash
   # Test your API endpoints
   curl -X POST http://localhost:3000/api/keyword-research \
     -H "Content-Type: application/json" \
     -d '{"keywords":"test keyword"}'
   ```

## 📋 Prevention Checklist

### Do This Regularly:

- [ ] **Monthly**: Run token health check (see script above)
- [ ] **Every 3 months**: Proactively renew refresh token before expiration
- [ ] **After OAuth changes**: If CLIENT_ID or CLIENT_SECRET change, renew token
- [ ] **Monitor error logs**: Set up alerts for `invalid_grant` errors in production

### Best Practices:

1. **Keep OAuth credentials consistent** - Use the same CLIENT_ID/CLIENT_SECRET in local and production
2. **Document token dates** - Note when tokens were created/renewed in team docs
3. **Automate monitoring** - Set up error tracking (Sentry, LogRocket) to alert on auth failures
4. **Regular testing** - Run API tests weekly to catch issues early

## 🚨 Emergency Response

If production is down due to token issues:

1. **Immediate**: Generate new refresh token (5-10 minutes)
2. **Update Vercel**: Add new token to production env vars
3. **Redeploy**: Trigger a redeploy or wait for next deployment
4. **Verify**: Test production API endpoints work
5. **Document**: Update team on what happened and when token expires

## 📝 Token History

Keep this updated when renewing tokens:

| Date | Location | Token Prefix | Notes |
|------|----------|--------------|-------|
| 2024-01-XX | Local + Production | `1//05xfk...` | Initial setup |
| YYYY-MM-DD | Local + Production | `1//...` | Renewed after invalid_grant |

## 🔗 Related Files

- `get-new-refresh-token.js` - Generate authorization URL
- `exchange-ads-code.js` - Exchange code for refresh token
- `GOOGLE_ADS_SETUP.md` - Full setup guide
- `QUICK_SETUP_GUIDE.md` - Quick reference

## 💡 Pro Tips

1. **Use long-lived tokens**: When generating, ensure `prompt=consent` is in the auth URL
2. **Keep credentials secret**: Never commit tokens to git
3. **Rotation schedule**: Mark calendar to renew tokens every 5 months
4. **Team communication**: Notify team when renewing production tokens

