# Google Ads Keyword Planning Implementation

This document explains the new keyword planning implementation that uses the Google Ads API Keyword Planning service to provide real search volume and competition data.

## Overview

The implementation replaces mock data with real keyword research data from Google's Keyword Planner through the Google Ads API. It supports geographic targeting for different countries and languages.

## New Features

### 1. Real Keyword Planning Data
- **Search Volume**: Actual monthly search volumes from Google's data
- **Competition Level**: Real competition metrics (LOW, MEDIUM, HIGH)
- **Additional Metrics**: CPC estimates, bid ranges, and more

### 2. Geographic Targeting
- **Country Selection**: Choose from 12+ countries (US, UK, CA, AU, DE, FR, ES, IT, NL, SE, NO, DK, FI)
- **Language Selection**: Support for 11+ languages (English, Spanish, French, German, Italian, Portuguese, Dutch, Swedish, Norwegian, Danish, Finnish)
- **Localized Data**: Search volumes and competition specific to the selected region

### 3. Enhanced UI
- **Country/Language Dropdowns**: Easy selection of target markets
- **Real-time Results**: Live data from Google's Keyword Planner
- **Fallback Support**: Graceful fallback to mock data if API fails

## API Endpoints

### 1. `/api/google-ads/keyword-planning`
**Purpose**: Direct access to Google Ads Keyword Planning service

**Request Body**:
```json
{
  "keywords": ["digital marketing", "seo services"],
  "countryCode": "US",
  "languageCode": "en"
}
```

**Response**:
```json
{
  "success": true,
  "keywords": [
    {
      "keyword": "digital marketing",
      "searchVolume": 45000,
      "competition": "HIGH",
      "competitionIndex": 85,
      "lowTopPageBidMicros": 1200000,
      "highTopPageBidMicros": 2500000,
      "avgCpcMicros": 1800000
    }
  ],
  "metadata": {
    "countryCode": "US",
    "languageCode": "en",
    "totalKeywords": 1
  }
}
```

### 2. `/api/keyword-research` (Updated)
**Purpose**: Main keyword research endpoint with geographic targeting

**Request Body**:
```json
{
  "keywords": "digital marketing\nseo services",
  "countryCode": "US",
  "languageCode": "en"
}
```

**Response**:
```json
[
  {
    "keyword": "digital marketing",
    "searchVolume": 45000,
    "competition": "HIGH"
  }
]
```

## Setup Requirements

### 1. Google Ads API Credentials
Ensure these environment variables are set:

```bash
GADS_CLIENT_ID=your_client_id
GADS_CLIENT_SECRET=your_client_secret
GADS_DEVELOPER_TOKEN=your_developer_token
GADS_REFRESH_TOKEN=your_refresh_token
GADS_LOGIN_CUSTOMER_ID=your_customer_id
```

### 2. Google Ads API Access
- **Basic Access**: Required for keyword planning
- **Developer Token**: Must be approved by Google
- **OAuth 2.0**: Proper authentication setup

### 3. Permissions
- **Keyword Planning**: Access to keyword ideas and historical metrics
- **Customer Access**: Proper customer ID and login customer ID

## Usage Examples

### Frontend Integration

```typescript
// Basic keyword research
const response = await fetch('/api/keyword-research', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: 'digital marketing\nseo services',
    countryCode: 'US',
    languageCode: 'en'
  }),
});

const results = await response.json();
```

### Direct API Usage

```typescript
// Direct keyword planning service
const response = await fetch('/api/google-ads/keyword-planning', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: ['digital marketing', 'seo services'],
    countryCode: 'GB',
    languageCode: 'en'
  }),
});

const data = await response.json();
```

## Geographic Targeting

### Supported Countries
- **US**: United States
- **GB**: United Kingdom
- **CA**: Canada
- **AU**: Australia
- **DE**: Germany
- **FR**: France
- **ES**: Spain
- **IT**: Italy
- **NL**: Netherlands
- **SE**: Sweden
- **NO**: Norway
- **DK**: Denmark
- **FI**: Finland

### Supported Languages
- **en**: English
- **es**: Spanish
- **fr**: French
- **de**: German
- **it**: Italian
- **pt**: Portuguese
- **nl**: Dutch
- **sv**: Swedish
- **no**: Norwegian
- **da**: Danish
- **fi**: Finnish

## Error Handling

### 1. API Failures
- **Graceful Fallback**: Falls back to mock data if API fails
- **Error Logging**: Detailed error messages in console
- **User Feedback**: Clear error messages to users

### 2. Missing Credentials
- **Development Mode**: Uses mock data when credentials are missing
- **Production Mode**: Returns proper error messages
- **Environment Validation**: Checks for required environment variables

## Testing

### 1. Test Script
Run the included test script:

```bash
node test-keyword-planning.js
```

### 2. Manual Testing
1. Start the development server
2. Navigate to `/find-keywords` or `/ads`
3. Enter keywords and select country/language
4. Click "Research Keywords"
5. Verify real data is returned

## Migration Notes

### 1. Backward Compatibility
- Existing API calls continue to work
- Default to US/English if not specified
- Mock data fallback maintains UI functionality

### 2. New Parameters
- `countryCode`: Optional, defaults to 'US'
- `languageCode`: Optional, defaults to 'en'
- Additional response fields for enhanced data

### 3. UI Updates
- Added country/language dropdowns
- Enhanced result display
- Better error handling

## Troubleshooting

### 1. Common Issues
- **Permission Denied**: Check Google Ads API access
- **Invalid Customer ID**: Verify customer ID format
- **Rate Limiting**: Implement proper retry logic
- **Authentication**: Ensure refresh token is valid

### 2. Debug Mode
Enable debug logging by setting:
```bash
NODE_ENV=development
```

### 3. API Testing
Use the Google Ads API test endpoint:
```bash
curl -X GET http://localhost:3000/api/google-ads/test
```

## Future Enhancements

### 1. Additional Metrics
- **Forecast Data**: Future performance predictions
- **Trend Analysis**: Historical trend data
- **Related Keywords**: Keyword suggestions
- **Negative Keywords**: Exclude terms

### 2. Advanced Targeting
- **Device Targeting**: Mobile, desktop, tablet
- **Time Targeting**: Specific hours/days
- **Demographic Targeting**: Age, gender, income
- **Interest Targeting**: User interests and behaviors

### 3. Performance Optimization
- **Caching**: Cache results for repeated queries
- **Batch Processing**: Process multiple keyword sets
- **Rate Limiting**: Implement proper rate limiting
- **Error Recovery**: Automatic retry mechanisms

## Support

For issues or questions:
1. Check the Google Ads API documentation
2. Verify environment variables
3. Test with the included test script
4. Review error logs for specific issues
