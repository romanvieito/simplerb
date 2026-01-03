#!/bin/bash

# Quick Google Ads Token Setup
# Simple setup for token refresh when needed

echo "🔧 Quick Google Ads Token Setup"
echo "==============================="

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Check if .env.local exists
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
    echo "❌ .env.local file not found. Please create it first."
    exit 1
fi

# Check if required variables are set
MISSING_VARS=()
REQUIRED_VARS=("GADS_CLIENT_ID" "GADS_CLIENT_SECRET" "GADS_REFRESH_TOKEN" "GADS_DEVELOPER_TOKEN")

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^$var=" "$PROJECT_DIR/.env.local" 2>/dev/null; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "💡 Add these to your .env.local file"
    exit 1
fi

echo "✅ Environment variables configured"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 When tokens expire:"
echo "   1. Go to /admin/oauth-refresh in your app"
echo "   2. Enter your Google Ads customer ID"
echo "   3. Click 'Connect Google Ads'"
echo "   4. Follow the OAuth flow"
echo ""
echo "🔧 Or use the TokenRefresh component:"
echo "   <TokenRefresh /> // One-click refresh button"
echo ""
echo "📖 For manual token refresh:"
echo "   node get-refresh-token.js"
