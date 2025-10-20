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
  // Updated for Google Ads API v21 with enhanced configuration
  const client = new GoogleAdsApi({
    client_id: GADS_CLIENT_ID,
    client_secret: GADS_CLIENT_SECRET,
    developer_token: GADS_DEVELOPER_TOKEN,
    // Enable logging for debugging
    log_level: process.env.NODE_ENV === 'production' ? 'ERROR' : 'INFO',
    // Set API version explicitly
    api_version: 'v22',
  });

  return client;
}

export function getGoogleAdsCustomer() {
  const client = getGoogleAdsClient();
  const {
    GADS_LOGIN_CUSTOMER_ID,
    GADS_REFRESH_TOKEN,
    GADS_CUSTOMER_ID
  } = process.env;

  // Use MCC as login, client as customer
  const loginId = GADS_LOGIN_CUSTOMER_ID ? formatCustomerId(GADS_LOGIN_CUSTOMER_ID) : undefined as any;
  const customerId = GADS_CUSTOMER_ID ? formatCustomerId(GADS_CUSTOMER_ID) : (loginId || '');

  // Validate customer ID is not empty
  if (!customerId || customerId.trim() === '') {
    throw new Error('Customer ID is missing or invalid. Please check your GADS_CUSTOMER_ID or GADS_LOGIN_CUSTOMER_ID environment variable.');
  }

  // Updated initialization for v21 with enhanced error handling
  return client.Customer({
    // Use MCC as login, client as customer
    customer_id: customerId,
    refresh_token: GADS_REFRESH_TOKEN,
    login_customer_id: loginId,
    // Add timeout configuration
    timeout: 30000, // 30 seconds
  });
}

// Enhanced function to get customer with specific customer ID
export function getGoogleAdsCustomerById(customerId: string) {
  const client = getGoogleAdsClient();
  const { GADS_REFRESH_TOKEN } = process.env;

  return client.Customer({
    customer_id: customerId,
    refresh_token: GADS_REFRESH_TOKEN,
    login_customer_id: process.env.GADS_LOGIN_CUSTOMER_ID,
    timeout: 30000,
  });
}

// Check if user has access to AdPilot features
// Now checks database for admin status instead of just environment variable
export async function validateAdPilotAccess(userEmail?: string): Promise<boolean> {
  if (!userEmail) {
    return false;
  }

  try {
    // First, check the database for admin status
    const { sql } = await import('@vercel/postgres');
    const result = await sql`
      SELECT admin FROM users WHERE email = ${userEmail} LIMIT 1
    `;
    
    if (result.rows.length > 0 && result.rows[0].admin === true) {
      return true;
    }
  } catch (error) {
    console.warn('Database check failed, falling back to env variable:', error);
  }

  // Fallback to environment variable check
  const adminEmails = process.env.ADPILOT_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  
  // If no admin emails configured, allow access (for development)
  if (adminEmails.length === 0) {
    return true;
  }
  
  return adminEmails.includes(userEmail);
}

// Utility function to format customer ID (remove hyphens)
export function formatCustomerId(customerId: string): string {
  return customerId.replace(/-/g, '');
}

// Utility function to generate resource names
export function generateResourceName(resourceType: string, customerId: string, resourceId?: string): string {
  const formattedCustomerId = formatCustomerId(customerId);
  const id = resourceId || Date.now().toString();
  return `customers/${formattedCustomerId}/${resourceType}/${id}`;
}

// Utility function to parse resource name and extract ID
export function extractResourceId(resourceName: string): string | null {
  const parts = resourceName.split('/');
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

// Enhanced error handling for Google Ads API errors
export function handleGoogleAdsError(error: any): { message: string; code?: string; details?: any } {
  if (error?.code) {
    return {
      message: error.message || 'Google Ads API error',
      code: error.code.toString(),
      details: error.details
    };
  }
  
  if (error?.message) {
    return {
      message: error.message,
      details: error
    };
  }
  
  return {
    message: 'Unknown Google Ads API error',
    details: error
  };
}
