# 🚀 Quick Google Ads API Setup Guide

## ✅ **Step 1: Get Your Credentials**

### 1.1 Developer Token (Already Approved!)
- Go to [Google Ads API Center](https://ads.google.com/aw/apicenter)
- Copy your Developer Token

### 1.2 OAuth Credentials
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create/select project → Enable Google Ads API
- Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
- Set type to "Web application"
- Add redirect URI: `http://localhost:3000/oauth/callback`
- Copy Client ID and Secret

### 1.3 Customer ID
- Go to [Google Ads](https://ads.google.com/)
- Copy the number from URL: `https://ads.google.com/aw/overview?ocid=1234567890`
- Remove hyphens: `1234567890`

## ✅ **Step 2: Get Refresh Token**

```bash
# Install dependencies if needed
npm install googleapis

# Run the refresh token script
node get-refresh-token.js
```

Follow the prompts to get your refresh token.

## ✅ **Step 3: Update Environment Variables**

Edit `.env.local` with your actual credentials:

```bash
# Replace these with your actual values
GADS_DEVELOPER_TOKEN=your_actual_developer_token
GADS_CLIENT_ID=your_actual_client_id
GADS_CLIENT_SECRET=your_actual_client_secret
GADS_REFRESH_TOKEN=your_actual_refresh_token
GADS_LOGIN_CUSTOMER_ID=your_actual_customer_id
```

## ✅ **Step 4: Test Your Setup**

```bash
# Test your configuration
node test-google-ads-setup.js
```

You should see:
- ✅ All environment variables set
- ✅ Google Ads API client created
- ✅ Customer client created
- ✅ API query successful

## ✅ **Step 5: Start Using the API**

```bash
# Start your development server
npm run dev
```

Then test the endpoints:
- `http://localhost:3003/api/google-ads/test`
- `http://localhost:3003/ads`

## 🎯 **What You Can Do Now**

Once set up, you'll have access to:

### **Campaign Management**
- Create Search & Performance Max campaigns
- Configure advanced targeting (demographics, audiences, locations)
- Enable smart bidding strategies
- Adjust schedules and device bid modifiers

### **Campaign Insights**
- Pull campaign metrics through the API
- Inspect active keywords with quality metrics
- Export current keyword inventory

### **Automated Optimization**
- Run baseline optimisation scripts
- Launch advanced optimisation workflows
- Trigger maintenance tasks for long-running accounts
- Generate recommended keyword expansions

### **API Endpoints**
- `GET /api/google-ads/test` – Test connection
- `GET /api/google-ads/get-campaign-keywords` – Fetch campaign keyword inventory
- `POST /api/google-ads/find-similar-keywords` – Discover new keyword ideas
- `GET /api/google-ads/metrics` – Retrieve performance data
- `POST /api/google-ads/create-campaign` – Create campaigns
- `POST /api/google-ads/optimize` – Run baseline optimisations
- `POST /api/google-ads/optimize-advanced` – Execute advanced optimisations
- `GET /ads` – Ads Pilot interface for keyword analysis and exports

## 🆘 **Troubleshooting**

### Common Issues:

1. **"Missing environment variables"**
   - Check that all variables are set in `.env.local`
   - Restart your development server

2. **"invalid_grant" error**
   - Your refresh token expired
   - Run `node get-refresh-token.js` again

3. **"developer_token" error**
   - Check your developer token is correct
   - Ensure it's approved in Google Ads API Center

4. **"permission denied" error**
   - Check your Google Ads account permissions
   - Ensure API access is enabled

### Getting Help:
- Check server logs for detailed error messages
- Use the test script to verify your setup
- See `GOOGLE_ADS_SETUP.md` for detailed troubleshooting

## 🎉 **You're Ready!**

Your Google Ads API integration is now ready to scale your advertising efforts with enterprise-grade features!
