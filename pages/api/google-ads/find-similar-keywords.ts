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
    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!(await validateAdPilotAccess(userEmail))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const {
      keywords,
      countryCode = 'US',
      languageCode = 'en',
      excludeExisting = [],
    }: FindSimilarKeywordsRequest = req.body;

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keywords are required',
      });
    }

    console.log(`🔍 Finding similar keywords for ${keywords.length} input keywords`);

    // Use the existing keyword-planning API endpoint internally
    // Call it for each keyword and aggregate results
    const allSimilarKeywords: SimilarKeyword[] = [];
    const keywordMap = new Map<string, SimilarKeyword>(); // Deduplicate by keyword text

    // Process keywords in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < keywords.length; i += batchSize) {
      const batch = keywords.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (sourceKeyword) => {
          try {
            // Call internal keyword planning API
            // Construct URL from request or use environment variable
            const baseUrl = req.headers.origin || 
                           (req.headers.host ? `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}` : 'http://localhost:3000');
            
            const internalResponse = await fetch(`${baseUrl}/api/google-ads/keyword-planning`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                keywords: [sourceKeyword],
                countryCode,
                languageCode,
              }),
            });

            const data = await internalResponse.json();

            if (data.success && data.keywords) {
              // Process each suggested keyword
              data.keywords.forEach((idea: any) => {
                const suggestedKeyword = idea.keyword?.toLowerCase().trim();
                
                // Skip if it's in the exclude list or already processed
                if (
                  !suggestedKeyword ||
                  excludeExisting.includes(suggestedKeyword) ||
                  keywords.map(k => k.toLowerCase().trim()).includes(suggestedKeyword) ||
                  keywordMap.has(suggestedKeyword)
                ) {
                  return;
                }

                // Only keep it if it's actually similar (contains some words from source or is related)
                const sourceWords = sourceKeyword.toLowerCase().split(' ');
                const suggestedWords = suggestedKeyword.split(' ');
                
                // Check if there's at least one common word (simple similarity check)
                const hasCommonWord = sourceWords.some(word => 
                  suggestedWords.some((sw: string) => sw.includes(word) || word.includes(sw))
                );

                if (hasCommonWord || keywordMap.size < 100) {
                  keywordMap.set(suggestedKeyword, {
                    keyword: idea.keyword,
                    searchVolume: idea.searchVolume || 0,
                    competition: idea.competition || 'UNKNOWN',
                    competitionIndex: idea.competitionIndex,
                    lowTopPageBidMicros: idea.lowTopPageBidMicros,
                    highTopPageBidMicros: idea.highTopPageBidMicros,
                    avgCpcMicros: idea.avgCpcMicros,
                    sourceKeyword,
                  });
                }
              });
            }
          } catch (error) {
            console.error(`Error finding similar keywords for "${sourceKeyword}":`, error);
            // Continue with other keywords
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Convert map to array and sort by search volume (descending)
    const similarKeywords = Array.from(keywordMap.values())
      .sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));

    console.log(`✅ Found ${similarKeywords.length} similar keywords`);

    return res.status(200).json({
      success: true,
      similarKeywords,
      totalKeywords: similarKeywords.length,
      metadata: {
        countryCode,
        languageCode,
        inputKeywords: keywords.length,
        suggestionsFound: similarKeywords.length,
      },
    });

  } catch (error) {
    console.error('Error finding similar keywords:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to find similar keywords',
    });
  }
}

