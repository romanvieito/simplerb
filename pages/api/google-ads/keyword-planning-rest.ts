import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { handleGoogleAdsError, getRefreshToken, formatCustomerId } from './client';

interface KeywordPlanningRequest {
  keywords: string[];
  countryCode?: string;
  languageCode?: string;
}

interface NormalizedMonthlySearchVolume {
  month: string;
  year: number;
  monthIndex: number;
  monthLabel: string;
  dateKey: string;
  monthlySearches: number;
}

interface KeywordIdea {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  avgCpcMicros?: number;
  monthlySearchVolumes?: NormalizedMonthlySearchVolume[];
}

interface KeywordPlanningResponse {
  success: boolean;
  keywords?: KeywordIdea[];
  error?: string;
  errorDetails?: any;
  usedFallback?: boolean;
  reason?: string;
  message?: string;
  metadata?: {
    countryCode: string;
    languageCode: string;
    totalKeywords: number;
  };
}

const MONTH_ENUM_TO_INDEX: Record<string, number> = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
};

const MONTH_INDEX_TO_ENUM = Object.keys(MONTH_ENUM_TO_INDEX).reduce<string[]>((acc, key) => {
  acc[MONTH_ENUM_TO_INDEX[key]] = key;
  return acc;
}, []);

const padMonth = (monthIndex: number) => String(monthIndex + 1).padStart(2, '0');

const normalizeMonthlySearchVolumes = (
  raw?: Array<{ month: string | number; year: number; monthlySearches: number }>
): NormalizedMonthlySearchVolume[] | undefined => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return undefined;
  }

  const normalized = raw
    .map((entry) => {
      const rawMonth = entry.month;
      const year = Number(entry.year);
      const monthlySearches = Number(entry.monthlySearches ?? 0);

      if (!Number.isFinite(year)) {
        return null;
      }

      let monthIndex: number | undefined;
      let monthEnum: string | undefined;

      if (typeof rawMonth === 'number') {
        monthIndex = rawMonth - 1;
        monthEnum = MONTH_INDEX_TO_ENUM[monthIndex] ?? MONTH_INDEX_TO_ENUM[Math.max(Math.min(monthIndex, 11), 0)];
      } else if (typeof rawMonth === 'string') {
        const normalizedMonth = rawMonth.toUpperCase();
        monthIndex = MONTH_ENUM_TO_INDEX[normalizedMonth];
        monthEnum = monthIndex !== undefined ? normalizedMonth : undefined;
      }

      if (monthIndex === undefined || monthIndex < 0 || monthIndex > 11) {
        return null;
      }

      const monthLabel = new Date(year, monthIndex, 1).toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      return {
        month: monthEnum ?? MONTH_INDEX_TO_ENUM[monthIndex] ?? 'UNKNOWN',
        year,
        monthIndex,
        monthLabel,
        dateKey: `${year}-${padMonth(monthIndex)}`,
        monthlySearches: Math.max(0, Math.round(monthlySearches)),
      } as NormalizedMonthlySearchVolume;
    })
    .filter((entry): entry is NormalizedMonthlySearchVolume => entry !== null);

  if (normalized.length === 0) {
    return undefined;
  }

  const sortedDesc = normalized.sort((a, b) => {
    if (a.year === b.year) {
      return b.monthIndex - a.monthIndex;
    }
    return b.year - a.year;
  });

  const latestTwelve = sortedDesc.slice(0, 12);

  return latestTwelve.sort((a, b) => {
    if (a.year === b.year) {
      return a.monthIndex - b.monthIndex;
    }
    return a.year - b.year;
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KeywordPlanningResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const auth = getAuth(req);
    const headerUserId = req.headers['x-user-id'] as string | undefined;
    const userId = auth.userId || headerUserId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const userEmail = req.headers['x-user-email'] as string | undefined;

    const { keywords, countryCode = 'US', languageCode = 'en' }: KeywordPlanningRequest = req.body;

    console.log('🔍 Google Ads Keyword Planning REST API called');
    console.log(`📝 Keywords: ${keywords.join(', ')}`);
    console.log(`🌍 Country: ${countryCode}, Language: ${languageCode}`);

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Keywords are required' 
      });
    }

    // Validate environment variables
    const {
      GADS_DEVELOPER_TOKEN,
      GADS_CLIENT_ID,
      GADS_CLIENT_SECRET,
      GADS_LOGIN_CUSTOMER_ID,
      GADS_CUSTOMER_ID,
    } = process.env;

    if (!GADS_DEVELOPER_TOKEN || !GADS_CLIENT_ID || !GADS_CLIENT_SECRET || !GADS_LOGIN_CUSTOMER_ID) {
      console.log('❌ Missing required Google Ads environment variables');
      console.log('GADS_DEVELOPER_TOKEN:', GADS_DEVELOPER_TOKEN ? 'SET' : 'NOT SET');
      console.log('GADS_CLIENT_ID:', GADS_CLIENT_ID ? 'SET' : 'NOT SET');
      console.log('GADS_CLIENT_SECRET:', GADS_CLIENT_SECRET ? 'SET' : 'NOT SET');
      console.log('GADS_LOGIN_CUSTOMER_ID:', GADS_LOGIN_CUSTOMER_ID ? 'SET' : 'NOT SET');
      return res.status(500).json({
        success: false,
        error: 'Missing required Google Ads environment variables'
      });
    }

    // Get refresh token from database or environment (same as other endpoints)
    let refreshToken: string;
    let customerIdFromToken: string | null | undefined = null;
    try {
      const tokenInfo = await getRefreshToken({ userId, userEmail });
      refreshToken = tokenInfo.refreshToken;
      customerIdFromToken = tokenInfo.customerId;
    } catch (tokenError) {
      console.error('❌ Failed to get refresh token:', tokenError);
      return res.status(500).json({
        success: false,
        error: 'Failed to get Google Ads refresh token. Please connect your Google Ads account.'
      });
    }

    // Log environment info for debugging (mask sensitive data)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 OAuth Configuration:');
      console.log(`   Client ID: ${GADS_CLIENT_ID.substring(0, 10)}...`);
      console.log(`   Client Secret: ${GADS_CLIENT_SECRET.substring(0, 6)}...`);
      console.log(`   Refresh Token: ${refreshToken.substring(0, 6)}...`);
      console.log(`   Login Customer ID: ${GADS_LOGIN_CUSTOMER_ID}`);
    }

    console.log('🔑 Attempting to get OAuth access token...');

    // Get access token from refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GADS_CLIENT_ID,
        client_secret: GADS_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    console.log(`🔑 OAuth token response status: ${tokenResponse.status}`);

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Failed to get access token:', errorData);

      let errorDetails: any = {};

      try {
        errorDetails = JSON.parse(errorData);
      } catch {
        errorDetails = { error: errorData };
      }

      const errorInfo = handleGoogleAdsError(errorDetails);

      return res.status(500).json({
        success: false,
        error: errorInfo.message,
        errorDetails: errorDetails,
        isTokenExpired: errorInfo.isTokenExpired,
        userMessage: errorInfo.userMessage
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log('✅ Successfully obtained access token');

    // Language constant IDs (Google Ads) - fallback to English 1000
    const languageIdMap: Record<string, number> = {
      en: 1000,
      de: 1001,
      fr: 1002,
      es: 1003,
      it: 1004,
      nl: 1010,
      pt: 1014,
      no: 1015,
      sv: 1017,
      fi: 1018,
    };
    const languageId = languageIdMap[languageCode.toLowerCase()] ?? 1000;

    // Country/Geo target constant IDs (Google Ads)
    // Updated with correct current geo target constants as of Google Ads API v17
    // NOTE: These IDs can change over time. If countries stop working, check:
    // https://developers.google.com/google-ads/api/reference/rpc/latest/GeoTargetConstantService
    // or use the suggestGeoTargetConstants method for dynamic resolution
    const geoIdMap: Record<string, number> = {
      US: 2840,
      GB: 2826,
      CA: 2120,
      AU: 2036,
      DE: 2276,
      FR: 2250,
      ES: 2724,
      IT: 2380,
      NL: 2528,
      SE: 2752,
      NO: 2578,
      DK: 2208,
      FI: 2246,
      WORLD: 2840, // Default to US for WORLD
    };
    const geoId = geoIdMap[countryCode] ?? 2840; // Default to US
    console.log(`🗺️ Using geo ID: ${geoId} for country: ${countryCode}`);

    // Use the customer ID from user token or environment
    const customerIdRaw = customerIdFromToken || GADS_CUSTOMER_ID || GADS_LOGIN_CUSTOMER_ID;
    if (!customerIdRaw) {
      return res.status(400).json({
        success: false,
        error: 'No Google Ads customer ID found. Please reconnect your Google Ads account.'
      });
    }
    const customerId = formatCustomerId(customerIdRaw);

    // Build the REST API request
    const requestBody: any = {
      language: `languageConstants/${languageId}`,
      includeAdultKeywords: false,
      keywordPlanNetwork: 'GOOGLE_SEARCH',
      keywordSeed: {
        keywords: keywords
      },
      historicalMetricsOptions: {
        includeAverageCpc: true
      }
    };

    // Only add geo targeting for specific countries, not for WORLD
    if (countryCode !== 'WORLD') {
      requestBody.geoTargetConstants = [`geoTargetConstants/${geoId}`];
    }

    console.log('📤 Sending REST API request to Google Ads...');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Call Google Ads REST API
    const apiResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}:generateKeywordIdeas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'developer-token': GADS_DEVELOPER_TOKEN,
        'login-customer-id': GADS_LOGIN_CUSTOMER_ID,
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`📥 Google Ads REST API response status: ${apiResponse.status}`);

    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      console.error('❌ Google Ads API error:', errorData);

      let errorDetails: any = {};
      try {
        errorDetails = JSON.parse(errorData);
      } catch {
        errorDetails = { error: errorData };
      }

      const errorInfo = handleGoogleAdsError(errorDetails);

      return res.status(500).json({
        success: false,
        error: errorInfo.message,
        errorDetails: errorDetails,
        isTokenExpired: errorInfo.isTokenExpired,
        userMessage: errorInfo.userMessage
      });
    }

    const responseData = await apiResponse.json();
    
    // Log response summary (not full data in production to avoid log bloat)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📊 Google Ads API response data:`, JSON.stringify(responseData, null, 2));
    } else {
      console.log(`📊 Google Ads API response: ${responseData.results?.length || 0} results`);
    }

    // Process the results
    const keywordIdeas: KeywordIdea[] = (responseData.results || []).map((idea: any) => {
      const keywordText = idea.text || '';
      const metrics = idea.keywordIdeaMetrics || {};
      
      const searchVolume = metrics.avgMonthlySearches || 0;
      const competitionIndex = metrics.competitionIndex || 0;
      
      // Convert competition index to string (0-100 scale)
      let competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' = 'UNKNOWN';
      if (competitionIndex >= 70) {
        competition = 'HIGH';
      } else if (competitionIndex >= 30) {
        competition = 'MEDIUM';
      } else if (competitionIndex >= 0) {
        competition = 'LOW';
      }

      return {
        keyword: keywordText,
        searchVolume: searchVolume,
        competition: competition,
        competitionIndex: competitionIndex,
        lowTopPageBidMicros: metrics.lowTopOfPageBidMicros,
        highTopPageBidMicros: metrics.highTopOfPageBidMicros,
        avgCpcMicros: metrics.avgCpcMicros,
        monthlySearchVolumes: normalizeMonthlySearchVolumes(metrics.monthlySearchVolumes)
      };
    });

    if (keywordIdeas.length === 0) {
      console.warn('⚠️ Google Ads API returned 0 keyword ideas');
      console.warn(`📝 Requested keywords: ${keywords.join(', ')}`);
      console.warn(`🌍 Country: ${countryCode}, Language: ${languageCode}`);
      console.warn(`🔍 This may be normal for very niche keywords or if keywords don't match any search volume data`);
      
      // Return success: false but don't mark as fallback - this is a legitimate API response
      return res.status(200).json({
        success: false,
        usedFallback: true, // Keep this for backward compatibility with existing code
        keywords: [],
        metadata: { countryCode, languageCode, totalKeywords: 0 },
        reason: 'Google Ads API returned no results for the provided keywords. This may be normal for very niche or low-volume keywords.'
      });
    }

    console.log(`✅ Successfully returning ${keywordIdeas.length} REAL Google Ads API results`);
    keywordIdeas.forEach(idea => {
      console.log(`  - ${idea.keyword}: ${idea.searchVolume} searches, ${idea.competition} competition`);
    });
    
    return res.status(200).json({
      success: true,
      keywords: keywordIdeas,
      metadata: {
        countryCode,
        languageCode,
        totalKeywords: keywordIdeas.length
      }
    });

  } catch (error) {
    console.error('Keyword planning REST API error:', error);
    
    let errorMessage = 'An error occurred during keyword planning';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
