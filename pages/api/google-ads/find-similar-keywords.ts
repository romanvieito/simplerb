import { NextApiRequest, NextApiResponse } from 'next';
import { validateAdPilotAccess } from './client';

interface FindSimilarKeywordsRequest {
  keywords: string[];
  countryCode?: string;
  languageCode?: string;
  excludeExisting?: string[]; // Keywords to exclude (existing ones)
}

interface SimilarKeyword {
  keyword: string;
  searchVolume: number;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  avgCpcMicros?: number;
  sourceKeyword?: string; // Which keyword led to this suggestion
}

interface FindSimilarKeywordsResponse {
  success: boolean;
  similarKeywords?: SimilarKeyword[];
  error?: string;
  totalKeywords?: number;
  metadata?: {
    countryCode: string;
    languageCode: string;
    inputKeywords: number;
    suggestionsFound: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FindSimilarKeywordsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // TEMP: Return a simple test response to check if endpoint is working
    console.log('🔍 TEST: find-similar-keywords endpoint called');
    return res.status(200).json({
      success: true,
      similarKeywords: [{
        keyword: "test keyword",
        searchVolume: 100,
        competition: 'LOW',
        sourceKeyword: "test"
      }],
      totalKeywords: 1,
      metadata: {
        countryCode: 'US',
        languageCode: 'en',
        inputKeywords: 1,
        suggestionsFound: 1,
      }
    });
  } catch (error) {
    console.error('Error finding similar keywords:', error);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find similar keywords',
    });
  }
}

