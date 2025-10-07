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
      GADS_LOGIN_CUSTOMER_ID
    } = process.env;

    if (!GADS_DEVELOPER_TOKEN || !GADS_CLIENT_ID || !GADS_CLIENT_SECRET || !GADS_REFRESH_TOKEN || !GADS_LOGIN_CUSTOMER_ID) {
      return res.status(500).json({ 
        success: false, 
        error: 'Missing required Google Ads environment variables' 
      });
    }

    const client = getGoogleAdsClient();
    const customer = getGoogleAdsCustomer();
    const customerId = formatCustomerId(GADS_LOGIN_CUSTOMER_ID);

    // Use the keyword ideas approach with proper network settings to match Keyword Planner
    const keywordIdeasRequest = {
      customer_id: customerId,
      keyword_seed: {
        keywords: keywords
      },
      keyword_annotation: [
        'KEYWORD_CONCEPT',
        'KEYWORD_CONCEPT_GROUP',
        'SEARCH_VOLUME',
        'COMPETITION',
        'CPC_BID_ESTIMATE'
      ],
      geo_target_constants: [`geoTargetConstants/${countryCode}`],
      language_constants: [`languageConstants/${languageCode}`],
      // Add network settings to match Keyword Planner (Google Search only)
      network_settings: {
        target_google_search: true,
        target_search_network: false,
        target_content_network: false,
        target_partner_search_network: false
      },
      historical_metrics_options: {
        include_average_cpc: true,
        include_average_cpm: true,
        include_clicks: true,
        include_impressions: true,
        include_ctr: true,
        include_cost_micros: true,
        include_conversions: true,
        include_conversions_value: true,
        include_cost_per_conversion: true,
        include_gross_conversions: true,
        include_gross_conversions_value: true,
        include_view_through_conversions: true,
        include_video_view_rate: true,
        include_video_views: true,
        include_all_conversions: true,
        include_all_conversions_value: true,
        include_cost_per_all_conversions: true,
        include_value_per_all_conversions: true
      }
    };

    // Generate keyword ideas using the keyword planning service
    const keywordIdeasResponse = await customer.keywordPlanIdeaService.generateKeywordIdeas(keywordIdeasRequest);

    // Process the results
    const keywordIdeas: KeywordIdea[] = keywordIdeasResponse.results.map((idea: any) => {
      const keywordText = idea.text || idea.keyword_idea_metrics?.keyword?.text || '';
      const searchVolume = idea.keyword_idea_metrics?.search_volume || 0;
      const competitionIndex = idea.keyword_idea_metrics?.competition_index || 0;
      
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
        lowTopPageBidMicros: idea.keyword_idea_metrics?.low_top_of_page_bid_micros,
        highTopPageBidMicros: idea.keyword_idea_metrics?.high_top_of_page_bid_micros,
        avgCpcMicros: idea.keyword_idea_metrics?.avg_cpc_micros
      };
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