import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Endpoint to check Google Ads Keyword Planning API status
 * Returns information about API access, configuration, and data source
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const {
    GADS_DEVELOPER_TOKEN,
    GADS_CLIENT_ID,
    GADS_CLIENT_SECRET,
    GADS_REFRESH_TOKEN,
    GADS_LOGIN_CUSTOMER_ID,
    GADS_CUSTOMER_ID,
    GADS_USE_KEYWORD_PLANNING
  } = process.env;

  const hasAllCredentials = !!(
    GADS_DEVELOPER_TOKEN &&
    GADS_CLIENT_ID &&
    GADS_CLIENT_SECRET &&
    GADS_REFRESH_TOKEN &&
    GADS_LOGIN_CUSTOMER_ID
  );

  const useKeywordPlanning = GADS_USE_KEYWORD_PLANNING === 'true';
  const willAttemptRealData = hasAllCredentials && useKeywordPlanning;

  console.log('🔍 Debug - Environment variables:');
  console.log('GADS_USE_KEYWORD_PLANNING:', GADS_USE_KEYWORD_PLANNING);
  console.log('GADS_USE_KEYWORD_PLANNING type:', typeof GADS_USE_KEYWORD_PLANNING);
  console.log('useKeywordPlanning:', useKeywordPlanning);

  let status: 'ready' | 'mock_only' | 'missing_credentials' | 'api_restricted';
  let statusMessage: string;
  let dataSource: 'google_ads_api' | 'mock_deterministic' | 'unknown';

  if (!hasAllCredentials) {
    status = 'missing_credentials';
    statusMessage = 'Missing required Google Ads API credentials';
    dataSource = 'mock_deterministic';
  } else if (!useKeywordPlanning) {
    status = 'mock_only';
    statusMessage = 'GADS_USE_KEYWORD_PLANNING not enabled';
    dataSource = 'mock_deterministic';
  } else {
    // We have credentials and flag is enabled, but API might fail
    status = 'api_restricted';
    statusMessage = 'Configuration ready, but API access may be limited (Basic vs Standard access)';
    dataSource = 'unknown'; // Will be determined at runtime
  }

  const response = {
    status,
    message: statusMessage,
    timestamp: new Date().toISOString(),
    configuration: {
      hasAllCredentials,
      useKeywordPlanningEnabled: useKeywordPlanning,
      willAttemptRealData,
      customerIdConfigured: !!GADS_CUSTOMER_ID,
      loginCustomerIdConfigured: !!GADS_LOGIN_CUSTOMER_ID,
    },
    expectedDataSource: dataSource,
    recommendations: [] as string[],
  };

  // Add recommendations
  if (!hasAllCredentials) {
    response.recommendations.push('Set up Google Ads API credentials in .env.local');
    response.recommendations.push('See GOOGLE_ADS_SETUP.md for instructions');
  } else if (!useKeywordPlanning) {
    response.recommendations.push('Set GADS_USE_KEYWORD_PLANNING=true in .env.local');
    response.recommendations.push('Restart your development server after changing environment variables');
  } else {
    response.recommendations.push('Configuration looks good!');
    response.recommendations.push('If you see mock data, you likely have Basic API access instead of Standard');
    response.recommendations.push('Apply for Standard API access at: https://ads.google.com/aw/apicenter');
    response.recommendations.push('Standard access typically approved in 24-48 hours with valid website/privacy policy');
  }

  res.status(200).json(response);
}
