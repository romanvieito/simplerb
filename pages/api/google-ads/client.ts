import { GoogleAdsApi } from 'google-ads-api';

let client: any = null;

export function getGoogleAdsClient() {
  if (!client) {
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

    client = new GoogleAdsApi({
      client_id: GADS_CLIENT_ID,
      client_secret: GADS_CLIENT_SECRET,
      developer_token: GADS_DEVELOPER_TOKEN,
    });

    // Authenticate with the MCC account
    client.customer({
      customer_id: GADS_LOGIN_CUSTOMER_ID,
      refresh_token: GADS_REFRESH_TOKEN,
    });
  }

  return client;
}

export function validateAdPilotAccess(userEmail?: string): boolean {
  const adminEmails = process.env.ADPILOT_ADMIN_EMAILS?.split(',') || [];
  
  // If no admin emails configured, allow access (for development)
  if (adminEmails.length === 0) {
    return true;
  }
  
  return userEmail ? adminEmails.includes(userEmail) : false;
}
