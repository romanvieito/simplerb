import { sql } from '@vercel/postgres';

export type KeywordSource = 'google_ads_api' | 'openai_generated' | 'mock_fallback' | 'mock_deterministic';

export interface KeywordResultLike {
  keyword: string;
}

interface SaveKeywordHistoryParams {
  userId: string;
  userPrompt?: string;
  countryCode?: string;
  languageCode?: string;
  results: KeywordResultLike[];
  source: KeywordSource;
}

export async function saveKeywordSearchHistory({
  userId,
  userPrompt,
  countryCode = 'US',
  languageCode = 'en',
  results,
  source,
}: SaveKeywordHistoryParams) {
  if (!userPrompt || results.length === 0) {
    return;
  }

  try {
    const generatedKeywords = results.map((r) => r.keyword);

    await sql`
      INSERT INTO keyword_search_history (
        user_id,
        user_prompt,
        country_code,
        language_code,
        generated_keywords,
        keyword_count,
        source
      )
      VALUES (
        ${userId},
        ${userPrompt},
        ${countryCode},
        ${languageCode},
        ${generatedKeywords as any},
        ${generatedKeywords.length},
        ${source}
      )
    `;

    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `✅ Saved search history (${source}): "${userPrompt}" -> ${generatedKeywords.length} keywords`
      );
    }
  } catch (error) {
    console.error('⚠️ Failed to save search history:', error);
  }
}

