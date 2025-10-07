#!/bin/bash

echo "🚀 Google Ads API Setup Helper"
echo "================================"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cp env-template.txt .env.local
    echo "✅ Created .env.local from template"
    echo ""
    echo "📋 Next steps:"
    echo "1. Edit .env.local with your actual Google Ads credentials"
    echo "2. Run: node get-refresh-token.js"
    echo "3. Run: node test-google-ads-setup.js"
    echo ""
else
    echo "✅ .env.local already exists"
fi

echo ""
echo "🔧 Available setup commands:"
echo "  node get-refresh-token.js     - Get OAuth refresh token"
echo "  node test-google-ads-setup.js - Test your configuration"
echo "  npm run dev                   - Start development server"
echo ""

echo "📚 For detailed instructions, see:"
echo "  - GOOGLE_ADS_SETUP.md"
echo "  - env-template.txt"
echo ""
