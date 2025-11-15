const { GoogleAdsApi } = require('google-ads-api');

// Helper function to get refresh token from database or environment
export async function getRefreshToken(): Promise<string> {
  // First try to get from database
  try {
    const { sql } = await import('@vercel/postgres');
    const result = await sql`
      SELECT refresh_token FROM oauth_tokens
      WHERE service = 'google_ads'
      LIMIT 1
    `;
    if (result.rows.length > 0 && result.rows[0].refresh_token) {
      return result.rows[0].refresh_token;
    }
  } catch (dbError) {
    console.warn('Failed to get token from database, falling back to env:', dbError);
  }

  // Fallback to environment variable
  const envToken = process.env.GADS_REFRESH_TOKEN;
  if (!envToken) {
    throw new Error('No Google Ads refresh token found in database or environment');
  }
  return envToken;
}

export async function getGoogleAdsClient() {
  const {
    GADS_DEVELOPER_TOKEN,
    GADS_CLIENT_ID,
    GADS_CLIENT_SECRET,
    GADS_LOGIN_CUSTOMER_ID
  } = process.env;

  if (!GADS_DEVELOPER_TOKEN || !GADS_CLIENT_ID || !GADS_CLIENT_SECRET || !GADS_LOGIN_CUSTOMER_ID) {
    throw new Error('Missing required Google Ads environment variables');
  }

  const refreshToken = await getRefreshToken();

  // Create a new client instance each time to avoid issues
  // Use default API version for compatibility with library version
  const client = new GoogleAdsApi({
    client_id: GADS_CLIENT_ID,
    client_secret: GADS_CLIENT_SECRET,
    developer_token: GADS_DEVELOPER_TOKEN,
    // Enable logging for debugging
    log_level: process.env.NODE_ENV === 'production' ? 'ERROR' : 'INFO',
    // Let the library use its default API version
  });

  return client;
}

export async function getGoogleAdsCustomer() {
  const client = await getGoogleAdsClient();
  const {
    GADS_LOGIN_CUSTOMER_ID,
    GADS_CUSTOMER_ID
  } = process.env;

  const refreshToken = await getRefreshToken();

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
    refresh_token: refreshToken,
    login_customer_id: loginId,
    // Add timeout configuration
    timeout: 30000, // 30 seconds
  });
}

// Enhanced function to get customer with specific customer ID
export async function getGoogleAdsCustomerById(customerId: string) {
  const client = await getGoogleAdsClient();
  const refreshToken = await getRefreshToken();

  return client.Customer({
    customer_id: customerId,
    refresh_token: refreshToken,
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

// Check if error is due to expired OAuth token
export function isTokenExpiredError(error: any): boolean {
  if (!error) return false;

  // Check for Google Ads API authentication errors
  if (error?.code === 16) return true; // UNAUTHENTICATED

  // Check for OAuth-specific errors
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorDetails = JSON.stringify(error).toLowerCase();

  return (
    errorMessage.includes('invalid_grant') ||
    errorMessage.includes('token has expired') ||
    errorMessage.includes('token expired') ||
    errorMessage.includes('unauthenticated') ||
    errorDetails.includes('invalid_grant') ||
    errorDetails.includes('token has expired')
  );
}

// Enhanced error handling for Google Ads API errors
export function handleGoogleAdsError(error: any): {
  message: string;
  code?: string;
  details?: any;
  isTokenExpired?: boolean;
  userMessage?: string;
} {
  const isExpired = isTokenExpiredError(error);

  if (error?.code) {
    let userMessage = error.message || 'Google Ads API error';

    if (isExpired) {
      userMessage = 'Your Google Ads API credentials have expired. Please refresh them in the admin panel.';
    }

    return {
      message: error.message || 'Google Ads API error',
      code: error.code.toString(),
      details: error.details,
      isTokenExpired: isExpired,
      userMessage
    };
  }

  if (error?.message) {
    let userMessage = error.message;

    if (isExpired) {
      userMessage = 'Your Google Ads API credentials have expired. Please refresh them in the admin panel.';
    }

    return {
      message: error.message,
      details: error,
      isTokenExpired: isExpired,
      userMessage
    };
  }

  return {
    message: 'Unknown Google Ads API error',
    details: error,
    isTokenExpired: false,
    userMessage: 'An unexpected error occurred with Google Ads API.'
  };
}
