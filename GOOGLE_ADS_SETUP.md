# Google Ads API Setup Guide

Congratulations on getting your Google Ads API Basic Access Application approved! This guide will help you set up the full integration with your AdPilot system.

## 🎉 What You Now Have Access To

With Basic Access, you can now:
- ✅ Create and manage Search campaigns
- ✅ Create and manage Performance Max campaigns
- ✅ Access detailed performance metrics
- ✅ Optimize bids and keywords
- ✅ Manage targeting and audiences
- ✅ Track conversions and ROI

## 🔧 Environment Variables Setup

Add these environment variables to your deployment (Vercel, Railway, etc.):

```bash
# Google Ads API Credentials
GADS_DEVELOPER_TOKEN=your_developer_token_here
GADS_CLIENT_ID=your_oauth_client_id_here
GADS_CLIENT_SECRET=your_oauth_client_secret_here
GADS_REFRESH_TOKEN=your_refresh_token_here
GADS_LOGIN_CUSTOMER_ID=your_customer_id_here

# Optional: AdPilot Configuration
ADPILOT_ADMIN_EMAILS=your-email@example.com,admin@example.com
ADPILOT_LABEL=AdPilot
ADPILOT_VALIDATE_ONLY=false
```

## 📋 Step-by-Step Setup

### 1. Get Your Developer Token
- Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
- Copy your Developer Token (it should be approved now)

### 2. Create OAuth 2.0 Credentials
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Select your project or create a new one
- Enable the Google Ads API
- Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
- Set application type to "Web application"
- Add your domain to authorized redirect URIs
- Download the JSON file with your Client ID and Secret

### 3. Get Refresh Token
Use this script to get your refresh token:

```javascript
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'YOUR_REDIRECT_URI'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/adwords']
});

console.log('Authorize this app by visiting this url:', authUrl);
```

### 4. Get Your Customer ID
- Go to [Google Ads](https://ads.google.com/)
- Look at the URL: `https://ads.google.com/aw/overview?ocid=1234567890`
- The number after `ocid=` is your Customer ID
- Remove any hyphens (e.g., `123-456-7890` becomes `1234567890`)

## 🚀 Testing Your Setup

### 1. Test API Connection
```bash
curl -X GET "https://your-domain.com/api/google-ads/test" \
  -H "x-user-email: your-email@example.com"
```

Expected response:
```json
{
  "success": true,
  "message": "Google Ads API v21 connection successful!",
  "apiVersion": "v21",
  "customerId": "1234567890",
  "capabilities": [
    "✅ Campaign creation (Search & Performance Max)",
    "✅ Keyword research and management",
    "✅ Ad copy generation and testing",
    "✅ Performance metrics tracking",
    "✅ Bid optimization",
    "✅ Audience targeting",
    "✅ Location and language targeting"
  ]
}
```

### 2. Test Campaign Creation
```bash
curl -X POST "https://your-domain.com/api/google-ads/create-campaign" \
  -H "Content-Type: application/json" \
  -H "x-user-email: your-email@example.com" \
  -d '{
    "type": "SEARCH",
    "keywords": ["test keyword", "example search"],
    "budgetDaily": 10,
    "locations": ["2840"],
    "languages": ["1000"],
    "url": "https://example.com",
    "copy": {
      "headlines": ["Test Headline 1", "Test Headline 2"],
      "descriptions": ["Test Description 1", "Test Description 2"]
    }
  }'
```

## 📊 Available Endpoints

### Campaign Management
- `GET /api/google-ads/test` - Test API connection
- `POST /api/google-ads/create-campaign` - Create new campaigns
- `GET /api/google-ads/metrics` - Get performance metrics
- `POST /api/google-ads/optimize-advanced` - Run optimizations

### Keyword Research
- `POST /api/keyword-research` - Research keywords

### Campaign Analysis
- `POST /api/google-ads/analyze-csv` - Analyze campaign data
- `GET /api/google-ads/export-recommendations` - Export optimization recommendations

## 🎯 Dashboard Access

Visit `/ads-dashboard` to access the comprehensive Google Ads management dashboard with:
- Real-time performance metrics
- Campaign management interface
- Automated optimization tools
- Performance insights and recommendations

## 🔧 Advanced Features

### Enhanced Campaign Creation
Your campaigns now support:
- **Advanced Targeting**: Demographics, audiences, interests
- **Smart Bidding**: Target CPA, Target ROAS, Maximize Conversions
- **Ad Scheduling**: Time-based bid adjustments
- **Device Targeting**: Mobile, tablet, desktop bid modifiers
- **Location Targeting**: Country, state, city-level targeting

### Performance Optimization
- **Automated Bid Adjustments**: Based on performance thresholds
- **Keyword Management**: Pause low-performing keywords
- **Negative Keywords**: Add negative keywords automatically
- **Quality Score Tracking**: Monitor and improve ad relevance

### Detailed Metrics
- **Conversion Tracking**: Track conversions and conversion value
- **ROAS Analysis**: Return on ad spend calculations
- **Budget Utilization**: Monitor budget usage and efficiency
- **Performance Recommendations**: AI-powered optimization suggestions

## 🛠️ Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check that all environment variables are set correctly
   - Verify your refresh token is valid and not expired
   - Ensure your customer ID is correct (no hyphens)

2. **403 Forbidden**
   - Verify you have the necessary permissions in your Google Ads account
   - Check that your account has API access enabled
   - Ensure your developer token is approved

3. **Query Errors**
   - This is normal for new accounts with no campaign data
   - Create a test campaign first to generate data
   - Check that your date ranges are valid

4. **Campaign Creation Fails**
   - Verify all required fields are provided
   - Check that your keywords and copy meet Google Ads policies
   - Ensure your budget and bid amounts are within valid ranges

### Getting Help

If you encounter issues:
1. Check the server logs for detailed error messages
2. Use the test endpoint to verify your setup
3. Ensure your Google Ads account has sufficient permissions
4. Verify all environment variables are correctly set

## 🎉 Next Steps

1. **Set up your environment variables** in your deployment platform
2. **Test the API connection** using the test endpoint
3. **Create your first campaign** using the enhanced campaign creation
4. **Monitor performance** using the dashboard and metrics endpoints
5. **Run optimizations** to improve campaign performance

Your Google Ads API integration is now ready to scale your advertising efforts! 🚀
