import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsClient, getGoogleAdsCustomer, formatCustomerId } from './client';

interface KeywordPlanningRequest {
  keywords: string[];
  countryCode?: string; // ISO country code like 'US', 'GB', 'CA', etc.
  languageCode?: string; // ISO language code like 'en', 'es', 'fr', etc.
}

interface KeywordIdea {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  avgCpcMicros?: number;
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<KeywordPlanningResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { keywords, countryCode = 'US', languageCode = 'en' }: KeywordPlanningRequest = req.body;

    console.log('🔍 Google Ads Keyword Planning API called');
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
      console.log('Available vars:', {
        GADS_DEVELOPER_TOKEN: !!GADS_DEVELOPER_TOKEN,
        GADS_CLIENT_ID: !!GADS_CLIENT_ID,
        GADS_CLIENT_SECRET: !!GADS_CLIENT_SECRET,
        GADS_REFRESH_TOKEN: !!GADS_REFRESH_TOKEN,
        GADS_LOGIN_CUSTOMER_ID: !!GADS_LOGIN_CUSTOMER_ID
      });
      return res.status(500).json({ 
        success: false, 
        error: 'Missing required Google Ads environment variables' 
      });
    }

    const client = await getGoogleAdsClient();
    const customer = await getGoogleAdsCustomer();
    // Use GADS_CUSTOMER_ID if available (client account), otherwise fall back to LOGIN_CUSTOMER_ID
    const rawCustomerId = GADS_CUSTOMER_ID || GADS_LOGIN_CUSTOMER_ID;
    const customerId = rawCustomerId ? formatCustomerId(rawCustomerId) : '';
    
    console.log('🔍 Customer ID debugging:', {
      GADS_CUSTOMER_ID,
      GADS_LOGIN_CUSTOMER_ID,
      rawCustomerId,
      formattedCustomerId: customerId,
      customerObjectId: customer.credentials.customer_id
    });

    // Validate customer ID is not empty
    if (!customerId || customerId.trim() === '') {
      console.error('❌ Customer ID is empty or invalid');
      return res.status(500).json({
        success: false,
        error: 'Customer ID is missing or invalid. Please check your GADS_CUSTOMER_ID or GADS_LOGIN_CUSTOMER_ID environment variable.'
      });
    }

    // Resolve geo target constant from ISO code → name → resource
    const countryNameMap: Record<string, string> = {
      US: 'United States',
      GB: 'United Kingdom',
      CA: 'Canada',
      AU: 'Australia',
      DE: 'Germany',
      FR: 'France',
      ES: 'Spain',
      IT: 'Italy',
      NL: 'Netherlands',
      SE: 'Sweden',
      NO: 'Norway',
      DK: 'Denmark',
      FI: 'Finland',
    };

    let geoTargetResource: string | undefined;

    // Handle WORLD specially - don't add geo targeting for worldwide
    if (countryCode !== 'WORLD') {
      const resolvedCountryName = countryNameMap[countryCode] || countryCode;
      try {
        const geoResp: any = await client.service.geoTargetConstants.suggestGeoTargetConstants({
          locale: 'en',
          country_code: countryCode,
          location_names: { names: [resolvedCountryName] },
        });
        const suggestion = geoResp?.geo_target_constant_suggestions?.[0];
        geoTargetResource = suggestion?.geo_target_constant?.resource_name;
      } catch (e) {
        // Best-effort; leave undefined if lookup failed
      }
    }

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

    // Build a valid GenerateKeywordIdeasRequest according to Google Ads API v22 spec
    // Note: Don't pass customerId in the request - the customer object already knows its ID
    const keywordIdeasRequest: any = {
      keywordSeed: {
        keywords: keywords
      },
      geoTargetConstants: geoTargetResource ? [geoTargetResource] : [`geoTargetConstants/2840`], // default US
      language: `languageConstants/${languageId}`,
      keywordPlanNetwork: 'GOOGLE_SEARCH',
      includeAdultKeywords: false,
      historicalMetricsOptions: {
        includeAverageCpc: true
      }
    };

    // Generate keyword ideas using the keyword planning service (correct accessor)
    console.log('📤 Sending request to Google Ads API...');
    console.log('Keyword planning request:', JSON.stringify(keywordIdeasRequest, null, 2));
    
    // Use the correct service method as per Google Ads API v22 documentation with timeout
    const keywordIdeasResponse = await Promise.race([
      customer.keywordPlanIdeas.generateKeywordIdeas(keywordIdeasRequest),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Google Ads API timeout after 10 seconds')), 10000))
    ]);
    console.log(`📥 Google Ads API response - Results count: ${keywordIdeasResponse?.results?.length || 0}`);

    // Process the results according to Google Ads API v22 response format
    const keywordIdeas: KeywordIdea[] = (keywordIdeasResponse.results || []).map((idea: any) => {
      // Extract keyword text - API v22 format
      const keywordText = idea.text || idea.keywordIdeaMetrics?.text || idea.keyword || '';
      const metrics = idea.keywordIdeaMetrics || idea.metrics || {};
      
      // Extract search volume and competition data
      const searchVolume = metrics.avgMonthlySearches || metrics.searchVolume || 0;
      const competitionIndex = metrics.competitionIndex || metrics.competition_index || 0;
      
      // Convert competition index to string (0-100 scale)
      let competition: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
      if (competitionIndex >= 70) {
        competition = 'HIGH';
      } else if (competitionIndex >= 30) {
        competition = 'MEDIUM';
      }

      return {
        keyword: keywordText,
        searchVolume: searchVolume,
        competition: competition,
        competitionIndex: competitionIndex,
        lowTopPageBidMicros: metrics.lowTopPageBidMicros || metrics.low_top_of_page_bid_micros,
        highTopPageBidMicros: metrics.highTopPageBidMicros || metrics.high_top_of_page_bid_micros,
        avgCpcMicros: metrics.avgCpcMicros || metrics.avg_cpc_micros
      };
    });

    // With Standard Access, we expect results but provide minimal fallback for edge cases
    if (keywordIdeas.length === 0) {
      console.warn('⚠️ Google Ads API returned 0 keyword ideas despite Standard Access - this is unusual');

      // For Standard Access, provide minimal fallback data instead of full mock
      const minimalFallback: KeywordIdea[] = keywords.map((k) => ({
        keyword: k,
        searchVolume: 0, // Indicate no data available
        competition: 'UNKNOWN',
        competitionIndex: 0,
        lowTopPageBidMicros: undefined,
        highTopPageBidMicros: undefined,
        avgCpcMicros: undefined
      }));

      console.log(`📊 Returning ${minimalFallback.length} minimal fallback results (Standard Access)`);
      return res.status(200).json({
        success: false,  // Mark as partial success
        usedFallback: true,
        keywords: minimalFallback,
        metadata: { countryCode, languageCode, totalKeywords: minimalFallback.length },
        reason: 'Google Ads API returned no results. This may be due to very low-volume keywords or temporary API issues.'
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
    console.error('Keyword planning error:', error);
    
    let errorMessage = 'An error occurred during keyword planning';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Handle specific Google Ads API errors
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as any;
      if (apiError.code === 7) {
        errorMessage = 'Permission denied. Please check your Google Ads API access.';
      } else if (apiError.code === 3) {
        errorMessage = 'Invalid argument. Please check your request parameters.';
      } else if (apiError.code === 5) {
        errorMessage = 'Not found. Please check your customer ID and permissions.';
      } else if (apiError.code === 2 && apiError.details?.includes('invalid_grant')) {
        errorMessage = 'OAuth token expired. Please refresh your Google Ads API credentials.';
      }
    }

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}