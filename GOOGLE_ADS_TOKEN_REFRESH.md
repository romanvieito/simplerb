# Google Ads Token Refresh - Simple Guide

## When You Need to Refresh

Google Ads API tokens expire every 6 months. When you see this error:
> "Google Ads connection needed"

It means your token has expired and needs to be refreshed.

## How to Refresh (Super Simple)

### Option 1: One-Click in App
1. When you see the error, click the link in the error message
2. Or go to `/admin/oauth-refresh` in your browser
3. **Your Google Ads customer ID is automatically filled in** ✨
4. Click "Connect Google Ads"
5. Sign in to Google and approve access
6. Done! Your connection is refreshed

### Option 2: Command Line
```bash
# Run this script
node get-refresh-token.js

# Follow the instructions:
# 1. Copy the authorization URL
# 2. Paste it in your browser
# 3. Sign in and approve
# 4. Copy the authorization code
# 5. Paste it back in the terminal
```

## What Happens

- ✅ Keyword research works again with real Google Ads data
- ✅ No more "sample data" messages
- ✅ Full functionality restored

## Prevent Future Issues

- **Your customer ID is automatically remembered** - no need to look it up again
- Add a calendar reminder every 5 months to refresh your token (takes < 2 minutes)
- The refresh process gets easier each time you do it

## Need Help?

If you get stuck:
1. Make sure you're using the correct Google Ads customer ID (no dashes)
2. Ensure you're signed in to the Google account that owns the Google Ads account
3. The account needs Google Ads access permissions

That's it! Much simpler than before. 🎉
