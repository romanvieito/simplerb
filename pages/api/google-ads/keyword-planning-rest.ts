import { NextApiRequest, NextApiResponse } from 'next';

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
  usedFallback?: boolean;
  reason?: string;
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
      GADS_REFRESH_TOKEN,
      GADS_LOGIN_CUSTOMER_ID,
      GADS_CUSTOMER_ID
    } = process.env;

    if (!GADS_DEVELOPER_TOKEN || !GADS_CLIENT_ID || !GADS_CLIENT_SECRET || !GADS_REFRESH_TOKEN || !GADS_LOGIN_CUSTOMER_ID) {
      console.log('❌ Missing required Google Ads environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Missing required Google Ads environment variables' 
      });
    }

    // Get access token from refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GADS_CLIENT_ID,
        client_secret: GADS_CLIENT_SECRET,
        refresh_token: GADS_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('❌ Failed to get access token:', errorData);
      return res.status(500).json({
        success: false,
        error: 'Failed to authenticate with Google Ads API'
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
    const geoIdMap: Record<string, number> = {
      US: 2840,
      GB: 2826,
      CA: 2120,
      AU: 2036,
      DE: 2760,
      FR: 250,
      ES: 724,
      IT: 380,
      NL: 528,
      SE: 752,
      NO: 578,
      DK: 208,
      FI: 246,
      WORLD: 2840, // Default to US for WORLD
    };
    const geoId = geoIdMap[countryCode] ?? 2840; // Default to US
    console.log(`🗺️ Using geo ID: ${geoId} for country: ${countryCode}`);

    // Use the customer ID from environment
    const customerId = GADS_CUSTOMER_ID || GADS_LOGIN_CUSTOMER_ID;

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
      return res.status(500).json({
        success: false,
        error: `Google Ads API error: ${apiResponse.status} - ${errorData}`
      });
    }

    const responseData = await apiResponse.json();
    console.log(`📊 Google Ads API response data:`, JSON.stringify(responseData, null, 2));

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
      return res.status(200).json({
        success: false,
        usedFallback: true,
        keywords: [],
        metadata: { countryCode, languageCode, totalKeywords: 0 },
        reason: 'Google Ads API returned no results for the provided keywords.'
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
