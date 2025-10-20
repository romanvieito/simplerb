import { NextApiRequest, NextApiResponse } from 'next';

interface KeywordPlanningRequest {
  keywords: string[];
  countryCode?: string;
  languageCode?: string;
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

    // Use the customer ID from environment
    const customerId = GADS_CUSTOMER_ID || GADS_LOGIN_CUSTOMER_ID;

    // Build the REST API request
    const requestBody = {
      language: `languageConstants/${languageId}`,
      geoTargetConstants: [`geoTargetConstants/2840`], // default US
      includeAdultKeywords: false,
      keywordPlanNetwork: 'GOOGLE_SEARCH',
      keywordSeed: {
        keywords: keywords
      }
    };

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
        lowTopPageBidMicros: metrics.lowTopPageBidMicros,
        highTopPageBidMicros: metrics.highTopPageBidMicros,
        avgCpcMicros: metrics.avgCpcMicros
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
