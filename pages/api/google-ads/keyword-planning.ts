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
  competition: 'LOW' | 'MEDIUM' | 'HIGH';
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
      return res.status(500).json({ 
        success: false, 
        error: 'Missing required Google Ads environment variables' 
      });
    }

    const client = getGoogleAdsClient();
    const customer = getGoogleAdsCustomer();
    // Use GADS_CUSTOMER_ID if available (client account), otherwise fall back to LOGIN_CUSTOMER_ID
    const customerId = formatCustomerId(GADS_CUSTOMER_ID || GADS_LOGIN_CUSTOMER_ID);

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

    const resolvedCountryName = countryNameMap[countryCode] || countryCode;
    let geoTargetResource: string | undefined;
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

    // Build a valid GenerateKeywordIdeasRequest
    const keywordIdeasRequest: any = {
      customer_id: customerId,
      keyword_seed: { keywords },
      geo_target_constants: geoTargetResource ? [geoTargetResource] : [`geoTargetConstants/2840`], // default US
      language: `languageConstants/${languageId}`,
      keyword_plan_network: 'GOOGLE_SEARCH',
      include_adult_keywords: false,
      historical_metrics_options: { include_average_cpc: true }
    };

    // Generate keyword ideas using the keyword planning service (correct accessor)
    console.log('📤 Sending request to Google Ads API...');
    console.log('Keyword planning request:', JSON.stringify(keywordIdeasRequest, null, 2));
    const keywordIdeasResponse = await customer.keywordPlanIdeas.generateKeywordIdeas(keywordIdeasRequest);
    console.log(`📥 Google Ads API response - Results count: ${keywordIdeasResponse?.results?.length || 0}`);

    // Process the results
    const keywordIdeas: KeywordIdea[] = (keywordIdeasResponse.results || []).map((idea: any) => {
      const keywordText = idea.text || idea.keyword_idea_metrics?.keyword?.text || idea.keyword || '';
      const metrics = idea.keyword_idea_metrics || idea.metrics || {};
      const searchVolume = metrics.avg_monthly_searches || metrics.search_volume || 0;
      const competitionIndex = metrics.competition_index || 0;
      
      // Convert competition index to string
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
        lowTopPageBidMicros: metrics.low_top_of_page_bid_micros,
        highTopPageBidMicros: metrics.high_top_of_page_bid_micros,
        avgCpcMicros: metrics.avg_cpc_micros
      };
    });

    // If Google returned 0 ideas, provide deterministic fallback
    if (keywordIdeas.length === 0) {
      console.warn('⚠️ Google Ads API returned 0 keyword ideas, using deterministic fallback');
      const deterministic = (text: string) => {
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
        const volume = Math.abs(hash % 90000) + 1000;
        const options = ['LOW', 'MEDIUM', 'HIGH'] as const;
        const competition = options[Math.abs(hash) % options.length];
        return { volume, competition } as const;
      };
      const fallbackIdeas: KeywordIdea[] = keywords.map((k) => {
        const { volume, competition } = deterministic(`${k}|${countryCode}|${languageCode}`);
        return {
          keyword: k,
          searchVolume: volume,
          competition,
          competitionIndex: 0,
        };
      });
      console.log(`📊 Returning ${fallbackIdeas.length} deterministic mock results`);
      return res.status(200).json({
        success: false,  // Mark as false so parent API knows this is fallback data
        usedFallback: true,
        keywords: fallbackIdeas,
        metadata: { countryCode, languageCode, totalKeywords: fallbackIdeas.length },
        reason: 'Google Ads API returned 0 results - likely due to Basic API access. Apply for Standard access.'
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
      }
    }

    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}