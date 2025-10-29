import type { NextApiRequest, NextApiResponse } from 'next';
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

    console.log(`🔍 Finding similar keywords for ${keywords.length} input keywords: ${keywords.join(', ')}`);
    console.log(`📋 Exclude list: ${excludeExisting.length} keywords - ${excludeExisting.slice(0, 5).join(', ')}${excludeExisting.length > 5 ? '...' : ''}`);

    // Use the existing keyword-planning API endpoint internally
    // Call it for each keyword and aggregate results
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

            const internalResponse = await fetch(`${baseUrl}/api/google-ads/keyword-planning-rest`, {
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

            console.log(`  📥 Response from keyword-planning for "${sourceKeyword}":`, {
              success: data.success,
              keywordsCount: data.keywords?.length || 0,
              usedFallback: data.usedFallback,
              error: data.error
            });

            if (data.success && data.keywords && data.keywords.length > 0) {
              let processedCount = 0;
              let skippedCount = 0;
              let similarCount = 0;

              // Process each suggested keyword
              data.keywords.forEach((idea: any) => {
                // Extract keyword - handle different possible field names
                const suggestedKeyword = (idea.keyword || idea.text || '').toString().toLowerCase().trim();

                // Skip if empty
                if (!suggestedKeyword) {
                  skippedCount++;
                  return;
                }

                // Skip if already processed (deduplicate)
                if (keywordMap.has(suggestedKeyword)) {
                  skippedCount++;
                  return;
                }

                // Skip if it's exactly in the input keywords list
                const keywordsLower = keywords.map(k => k.toLowerCase().trim());
                if (keywordsLower.includes(suggestedKeyword)) {
                  skippedCount++;
                  return;
                }

                // Skip if it's in the exclude list (but be case-insensitive)
                const excludeLower = excludeExisting.map(k => k.toLowerCase().trim());
                if (excludeLower.includes(suggestedKeyword)) {
                  skippedCount++;
                  return;
                }

                processedCount++;

                // Check similarity - now very lenient since Google's API already filters
                const isSimilar = (sourceKeyword: string, suggestedKeyword: string): boolean => {
                  const sourceLower = sourceKeyword.toLowerCase().trim();
                  const suggestedLower = suggestedKeyword.toLowerCase().trim();

                  // Skip if they're exactly the same (case-insensitive)
                  if (sourceLower === suggestedLower) {
                    return false;
                  }

                  // For Google Keyword Planning API results, accept everything that passes duplicate checks
                  // The API already filters for relevance, so we trust its suggestions
                  // Only reject if it's clearly not related (this is rare with Google's API)

                  // Extract significant words (non-stop words, length > 2)
                  const sourceWords = sourceLower.split(/\s+/).filter(w => w.length > 0 && !stopWords.has(w) && w.length > 2);
                  const suggestedWords = suggestedLower.split(/\s+/).filter(w => w.length > 0 && !stopWords.has(w) && w.length > 2);

                  // If both have significant words, check for overlap
                  if (sourceWords.length > 0 && suggestedWords.length > 0) {
                    // Check if there's any word overlap (exact match)
                    const hasWordOverlap = sourceWords.some(word => suggestedWords.includes(word));
                    if (hasWordOverlap) {
                      return true;
                    }

                    // Check if any significant word from source appears in suggested (substring match)
                    const hasSubstringMatch = sourceWords.some(word =>
                      word.length >= 3 && suggestedLower.includes(word)
                    );
                    if (hasSubstringMatch) {
                      return true;
                    }

                    // Check reverse: any significant word from suggested appears in source
                    const hasReverseMatch = suggestedWords.some(word =>
                      word.length >= 3 && sourceLower.includes(word)
                    );
                    if (hasReverseMatch) {
                      return true;
                    }
                  }

                  // If one has significant words but the other doesn't, check substring match
                  if (sourceWords.length === 0 || suggestedWords.length === 0) {
                    // Check if any significant word appears as substring
                    const allSourceWords = sourceLower.split(/\s+/).filter(w => w.length >= 3);
                    const allSuggestedWords = suggestedLower.split(/\s+/).filter(w => w.length >= 3);

                    if (allSourceWords.some(word => suggestedLower.includes(word)) ||
                        allSuggestedWords.some(word => sourceLower.includes(word))) {
                      return true;
                    }
                  }

                  // Be very lenient: if Google's API suggested it, it's probably relevant
                  // Only reject if completely unrelated (different root words, no overlap)
                  // This should rarely happen with Google's filtering
                  return true; // Accept by default - trust Google's API
                };

                const isSimilarResult = isSimilar(sourceKeyword, suggestedKeyword);

                if (isSimilarResult) {
                  similarCount++;
                  // Use original keyword casing from idea, fallback to suggestedKeyword if not available
                  const originalKeyword = idea.keyword || idea.text || suggestedKeyword;
                  keywordMap.set(suggestedKeyword, {
                    keyword: originalKeyword,
                    searchVolume: idea.searchVolume || 0,
                    competition: idea.competition || 'UNKNOWN',
                    competitionIndex: idea.competitionIndex,
                    lowTopPageBidMicros: idea.lowTopPageBidMicros,
                    highTopPageBidMicros: idea.highTopPageBidMicros,
                    avgCpcMicros: idea.avgCpcMicros,
                    sourceKeyword,
                  });
                } else {
                  // Log rejected keywords for debugging (should be rare now)
                  console.log(`  ⚠️ Rejected: "${suggestedKeyword}" (source: "${sourceKeyword}") - not similar`);
                }
              });

              console.log(`  📊 Processed ${processedCount} suggestions from "${sourceKeyword}": ${similarCount} similar, ${skippedCount} skipped`);
            } else {
              console.warn(`  ⚠️ No keywords returned for "${sourceKeyword}" (success: ${data.success}, usedFallback: ${data.usedFallback})`);
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
    if (similarKeywords.length === 0) {
      console.log(`🔍 Debug: keywordMap.size = ${keywordMap.size}`);
      console.log(`🔍 Debug: keywords input = ${JSON.stringify(keywords)}`);
      console.log(`🔍 Debug: excludeExisting length = ${excludeExisting.length}`);
    }

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

// Stop words to filter out when checking similarity
const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been']);
