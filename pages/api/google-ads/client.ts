const { GoogleAdsApi } = require('google-ads-api');

type TokenLookupParams = {
  userId?: string | null;
  userEmail?: string | null;
};

type TokenInfo = {
  refreshToken: string;
  customerId?: string | null;
  source: 'user' | 'service-db' | 'service-env';
};

/**
 * Fetch a Google Ads refresh token + customer id for a given user.
 * Falls back to the legacy service-level token for compatibility.
 */
export async function getRefreshToken(params: TokenLookupParams = {}): Promise<TokenInfo> {
  const { userId, userEmail } = params;

  // 1) User-scoped token by user_id or email
  try {
    const { sql } = await import('@vercel/postgres');
    let result;

    if (userId) {
      result = await sql`
        SELECT refresh_token, customer_id
        FROM oauth_tokens
        WHERE service = 'google_ads' AND user_id = ${userId}
        ORDER BY updated_at DESC
        LIMIT 1
      `;
    } else if (userEmail) {
      result = await sql`
        SELECT refresh_token, customer_id
        FROM oauth_tokens
        WHERE service = 'google_ads' AND user_email = ${userEmail}
        ORDER BY updated_at DESC
        LIMIT 1
      `;
    }

    if (result && result.rows.length > 0 && result.rows[0].refresh_token) {
      return {
        refreshToken: result.rows[0].refresh_token,
        customerId: result.rows[0].customer_id,
        source: 'user',
      };
    }
  } catch (dbError: any) {
    if (dbError?.code === '42703') {
      console.warn('oauth_tokens missing customer_id/user_id columns; run add-user-columns-to-oauth-tokens migration.');
    } else {
      console.warn('Failed to get user token from database, will fall back to service token:', dbError);
    }
  }

  // 2) Service-level token from DB (legacy)
  try {
    const { sql } = await import('@vercel/postgres');
    const result = await sql`
      SELECT refresh_token, customer_id
      FROM oauth_tokens
      WHERE service = 'google_ads' AND user_id IS NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    if (result.rows.length > 0 && result.rows[0].refresh_token) {
      return {
        refreshToken: result.rows[0].refresh_token,
        customerId: result.rows[0].customer_id,
        source: 'service-db',
      };
    }
  } catch (dbError: any) {
    if (dbError?.code === '42703') {
      console.warn('oauth_tokens missing customer_id/user_id columns; run add-user-columns-to-oauth-tokens migration.');
    } else {
      console.warn('Failed to get service token from database, will fall back to env:', dbError);
    }
  }

  // 3) Env fallback
  const envToken = process.env.GADS_REFRESH_TOKEN;
  if (!envToken) {
    throw new Error('No Google Ads refresh token found for this user or service. Please connect Google Ads.');
  }
  return { refreshToken: envToken, customerId: process.env.GADS_CUSTOMER_ID, source: 'service-env' };
}

export async function getGoogleAdsClient() {
  const {
    GADS_DEVELOPER_TOKEN,
    GADS_CLIENT_ID,
    GADS_CLIENT_SECRET,
  } = process.env;

  if (!GADS_DEVELOPER_TOKEN || !GADS_CLIENT_ID || !GADS_CLIENT_SECRET) {
    throw new Error('Missing required Google Ads environment variables');
  }

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

type CustomerParams = TokenLookupParams & {
  customerId?: string | null;
  loginCustomerId?: string | null;
};

export async function getGoogleAdsCustomer(params: CustomerParams = {}) {
  const { userId, userEmail, customerId: customerIdOverride, loginCustomerId } = params;
  const client = await getGoogleAdsClient();

  const tokenInfo = await getRefreshToken({ userId, userEmail });

  const derivedCustomerId = customerIdOverride
    || tokenInfo.customerId
    || process.env.GADS_CUSTOMER_ID
    || process.env.GADS_LOGIN_CUSTOMER_ID;

  if (!derivedCustomerId || derivedCustomerId.trim() === '') {
    throw new Error('Google Ads customer ID is missing. Connect your Google Ads account to continue.');
  }

  const formattedCustomerId = formatCustomerId(derivedCustomerId);
  const loginId = loginCustomerId
    ? formatCustomerId(loginCustomerId)
    : (process.env.GADS_LOGIN_CUSTOMER_ID ? formatCustomerId(process.env.GADS_LOGIN_CUSTOMER_ID) : undefined as any);

  return client.Customer({
    customer_id: formattedCustomerId,
    refresh_token: tokenInfo.refreshToken,
    login_customer_id: loginId,
    timeout: 30000,
  });
}

// Enhanced function to get customer with specific customer ID for a user
export async function getGoogleAdsCustomerById(customerId: string, params: TokenLookupParams = {}) {
  const client = await getGoogleAdsClient();
  const tokenInfo = await getRefreshToken(params);

  return client.Customer({
    customer_id: formatCustomerId(customerId),
    refresh_token: tokenInfo.refreshToken,
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
