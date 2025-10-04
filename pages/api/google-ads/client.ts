const { GoogleAdsApi } = require('google-ads-api');

export function getGoogleAdsClient() {
  const {
    GADS_DEVELOPER_TOKEN,
    GADS_CLIENT_ID,
    GADS_CLIENT_SECRET,
    GADS_REFRESH_TOKEN,
    GADS_LOGIN_CUSTOMER_ID
  } = process.env;

  if (!GADS_DEVELOPER_TOKEN || !GADS_CLIENT_ID || !GADS_CLIENT_SECRET || !GADS_REFRESH_TOKEN || !GADS_LOGIN_CUSTOMER_ID) {
    throw new Error('Missing required Google Ads environment variables');
  }

  // Create a new client instance each time to avoid issues
  // Updated for Google Ads API v21
  const client = new GoogleAdsApi({
    client_id: GADS_CLIENT_ID,
    client_secret: GADS_CLIENT_SECRET,
    developer_token: GADS_DEVELOPER_TOKEN,
  });

  return client;
}

export function getGoogleAdsCustomer() {
  const client = getGoogleAdsClient();
  const {
    GADS_LOGIN_CUSTOMER_ID,
    GADS_REFRESH_TOKEN
  } = process.env;

  // Updated initialization for v21
  return client.Customer({
    customer_id: GADS_LOGIN_CUSTOMER_ID,
    refresh_token: GADS_REFRESH_TOKEN,
    login_customer_id: GADS_LOGIN_CUSTOMER_ID,
  });
}

export function validateAdPilotAccess(userEmail?: string): boolean {
  const adminEmails = process.env.ADPILOT_ADMIN_EMAILS?.split(',') || [];
  
  // If no admin emails configured, allow access (for development)
  if (adminEmails.length === 0) {
    return true;
  }
  
  return userEmail ? adminEmails.includes(userEmail) : false;
}
