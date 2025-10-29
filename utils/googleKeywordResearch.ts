import { sql } from '@vercel/postgres';
import { saveKeywordSearchHistory, KeywordSource } from './keywordHistory';

export interface KeywordResult {
  keyword: string;
  searchVolume: number;
  competition: string;
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  avgCpcMicros?: number;
  monthlySearchVolumes?: Array<{
    month: string;
    year: number;
    monthIndex: number;
    monthLabel: string;
    dateKey: string;
    monthlySearches: number;
  }>;
  _meta?: {
    dataSource: 'google_ads_api' | 'mock_deterministic' | 'mock_fallback' | 'openai_generated';
    reason?: string;
    cached?: boolean;
    generatedViaAI?: boolean;
  };
}

interface GoogleKeywordResearchParams {
  keywords: string[];
  countryCode?: string;
  languageCode?: string;
  useCache?: boolean;
  userPrompt?: string;
  userId?: string;
  generatedViaAI?: boolean;
}

interface KeywordPlanningApiKeyword {
  keyword: string;
  searchVolume: number;
  competition: string;
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  avgCpcMicros?: number;
  monthlySearchVolumes?: Array<{
    month: string;
    year: number;
    monthIndex: number;
    monthLabel: string;
    dateKey: string;
    monthlySearches: number;
  }>;
}

const DEFAULT_COUNTRY = 'US';
const DEFAULT_LANGUAGE = 'en';

const GADS_USES_REAL_DATA = process.env.GADS_USE_KEYWORD_PLANNING?.trim() === 'true';

export async function runGoogleKeywordResearch({
  keywords,
  countryCode = DEFAULT_COUNTRY,
  languageCode = DEFAULT_LANGUAGE,
  useCache = true,
  userPrompt,
  userId,
  generatedViaAI = false,
}: GoogleKeywordResearchParams): Promise<KeywordResult[]> {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new Error('Provide at least one keyword');
  }

  const uniqueKeywords = Array.from(new Set(keywords.map((k) => String(k).trim()).filter(Boolean)));
  if (uniqueKeywords.length === 0) {
    throw new Error('Provide at least one keyword');
  }

  const MAX_KEYWORDS = 50;
  const keywordList = uniqueKeywords.slice(0, MAX_KEYWORDS);

  const decorateResults = (list: KeywordResult[]): KeywordResult[] => {
    if (!generatedViaAI) return list;
    return list.map((result) => {
      const enrichedReason =
        result._meta?.dataSource === 'google_ads_api'
          ? 'AI-generated keywords enriched with Google Ads metrics'
          : result._meta?.reason ?? 'AI-generated keywords (fallback data)';

      return {
        ...result,
        _meta: {
          dataSource: result._meta?.dataSource || 'google_ads_api',
          reason: enrichedReason,
          cached: result._meta?.cached,
          generatedViaAI: true,
        },
      };
    });
  };

  const CLIENT_ID = process.env.GADS_CLIENT_ID ?? process.env.GOOGLE_ADS_CLIENT_ID;
  const CLIENT_SECRET = process.env.GADS_CLIENT_SECRET ?? process.env.GOOGLE_ADS_CLIENT_SECRET;
  const DEVELOPER_TOKEN = process.env.GADS_DEVELOPER_TOKEN ?? process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const REFRESH_TOKEN = process.env.GADS_REFRESH_TOKEN ?? process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const CUSTOMER_ID_RAW = process.env.GADS_CUSTOMER_ID ?? process.env.GOOGLE_ADS_CUSTOMER_ID;
  const LOGIN_CUSTOMER_ID = process.env.GADS_LOGIN_CUSTOMER_ID ?? process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

  const missingEnv = !CLIENT_ID || !CLIENT_SECRET || !DEVELOPER_TOKEN || !REFRESH_TOKEN || !CUSTOMER_ID_RAW || !LOGIN_CUSTOMER_ID;

  if (missingEnv && process.env.NODE_ENV === 'production') {
    const missingVars = [
      !CLIENT_ID && 'GADS_CLIENT_ID',
      !CLIENT_SECRET && 'GADS_CLIENT_SECRET',
      !DEVELOPER_TOKEN && 'GADS_DEVELOPER_TOKEN',
      !REFRESH_TOKEN && 'GADS_REFRESH_TOKEN',
      !CUSTOMER_ID_RAW && 'GADS_CUSTOMER_ID',
      !LOGIN_CUSTOMER_ID && 'GADS_LOGIN_CUSTOMER_ID',
    ].filter(Boolean).join(', ');
    throw new Error(`Missing required Google Ads environment variables: ${missingVars}`);
  }

  if (!GADS_USES_REAL_DATA || missingEnv) {
    const deterministic = (text: string) => {
      let hash = 0;
      for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
      const volume = Math.abs(hash % 90000) + 1000;
      const options = ['LOW', 'MEDIUM', 'HIGH'] as const;
      const competition = options[Math.abs(hash) % options.length];
      return { volume, competition } as const;
    };

    const mockResults: KeywordResult[] = keywordList.map((k) => {
      const { volume, competition } = deterministic(`${k}|${countryCode}|${languageCode}`);
      return {
        keyword: k,
        searchVolume: volume,
        competition,
        _meta: {
          dataSource: missingEnv ? 'mock_fallback' : 'mock_deterministic',
          reason: missingEnv
            ? 'Google Ads API credentials missing. Returning deterministic mock data.'
            : 'GADS_USE_KEYWORD_PLANNING not enabled. Set to "true" in environment for real data.',
          cached: false,
        },
      };
    });

    return decorateResults(mockResults);
  }

  const USE_KEYWORD_PLANNING = true;

  const fetchCachedResults = async () => {
    const cacheQuery = await sql`
      SELECT keyword, search_volume, competition, competition_index,
             low_top_page_bid_micros, high_top_page_bid_micros, avg_cpc_micros,
             monthly_search_volumes, data_source
      FROM keyword_cache
      WHERE keyword = ANY(${keywordList as any})
        AND country_code = ${countryCode}
        AND language_code = ${languageCode}
        AND expires_at > NOW()
    `;

    return cacheQuery.rows.map((row: any) => ({
      keyword: row.keyword,
      searchVolume: row.search_volume,
      competition: row.competition,
      competitionIndex: row.competition_index,
      lowTopPageBidMicros: row.low_top_page_bid_micros,
      highTopPageBidMicros: row.high_top_page_bid_micros,
      avgCpcMicros: row.avg_cpc_micros,
      monthlySearchVolumes: row.monthly_search_volumes,
      _meta: {
        dataSource: (row.data_source as string | null) ?? 'google_ads_api',
        reason: 'Cached data from previous Google Ads API call',
        cached: true,
      },
    })) as KeywordResult[];
  };

  let cachedResults: KeywordResult[] = [];
  let uncachedKeywords: string[] = keywordList;

  if (USE_KEYWORD_PLANNING && useCache) {
    try {
      cachedResults = await fetchCachedResults();
      const cachedKeywordSet = new Set(cachedResults.map((item) => item.keyword));
      uncachedKeywords = keywordList.filter((k) => !cachedKeywordSet.has(k));
    } catch (error) {
      console.error('Cache lookup failed, proceeding without cache:', error);
      cachedResults = [];
      uncachedKeywords = keywordList;
    }
  }

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
    WORLD: 2840,
  };
  const geoId = geoIdMap[countryCode] ?? 2840;

  if (uncachedKeywords.length === 0) {
    return decorateResults(cachedResults);
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      refresh_token: REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.text();
    console.error('Failed to get access token:', errorData);
    let errorMessage = 'Failed to authenticate with Google Ads API';
    try {
      const errorJson = JSON.parse(errorData);
      if (errorJson.error_description) {
        errorMessage = `Failed to authenticate with Google Ads API: ${errorJson.error_description}`;
      } else if (errorJson.error) {
        errorMessage = `Failed to authenticate with Google Ads API: ${errorJson.error}`;
      }
    } catch {
      // If errorData is not JSON, include it as-is
      if (errorData) {
        errorMessage = `Failed to authenticate with Google Ads API: ${errorData}`;
      }
    }
    throw new Error(errorMessage);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  const requestBody: any = {
    language: `languageConstants/${languageId}`,
    includeAdultKeywords: false,
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    keywordSeed: {
      keywords: uncachedKeywords,
    },
    historicalMetricsOptions: {
      includeAverageCpc: true,
    },
  };

  if (countryCode !== 'WORLD') {
    requestBody.geoTargetConstants = [`geoTargetConstants/${geoId}`];
  }

  const loginCustomerId = LOGIN_CUSTOMER_ID;
  const customerId = CUSTOMER_ID_RAW || loginCustomerId;

  if (!loginCustomerId) {
    throw new Error('GADS_LOGIN_CUSTOMER_ID is required for Google Ads API calls');
  }

  if (!customerId) {
    throw new Error('GADS_CUSTOMER_ID or GADS_LOGIN_CUSTOMER_ID is required for Google Ads API calls');
  }

  // Guard: Google supports up to 20 seed keywords
  const seeds = uncachedKeywords.slice(0, 20);

  const apiResponse = await fetch(`https://googleads.googleapis.com/v20/customers/${customerId}:generateKeywordIdeas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'developer-token': DEVELOPER_TOKEN!,
      'login-customer-id': loginCustomerId,
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ ...requestBody, keywordSeed: { keywords: seeds } }),
  });

  if (!apiResponse.ok) {
    const errorData = await apiResponse.text();
    console.error('Google Ads API error:', errorData);
    let errorMessage = `Google Ads API error: ${apiResponse.status}`;
    try {
      const errorJson = JSON.parse(errorData);
      if (errorJson.error?.message) {
        errorMessage = `Google Ads API error: ${errorJson.error.message}`;
      } else if (errorJson.message) {
        errorMessage = `Google Ads API error: ${errorJson.message}`;
      } else if (errorData) {
        errorMessage = `Google Ads API error (${apiResponse.status}): ${errorData.substring(0, 200)}`;
      }
    } catch {
      // If errorData is not JSON, include it as-is
      if (errorData) {
        errorMessage = `Google Ads API error (${apiResponse.status}): ${errorData.substring(0, 200)}`;
      }
    }
    throw new Error(errorMessage);
  }

  const responseData = await apiResponse.json();
  const ideas = Array.isArray(responseData.results) ? responseData.results : [];
  const apiKeywords: KeywordPlanningApiKeyword[] = ideas.map((idea: any) => {
    const metrics = idea.keywordIdeaMetrics || {};
    const searchVolume = metrics.avgMonthlySearches || 0;
    const competitionIndex = metrics.competitionIndex || 0;

    let competition: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' = 'UNKNOWN';
    if (competitionIndex >= 70) {
      competition = 'HIGH';
    } else if (competitionIndex >= 30) {
      competition = 'MEDIUM';
    } else if (competitionIndex >= 0) {
      competition = 'LOW';
    }

    return {
      keyword: idea.text || '',
      searchVolume,
      competition,
      competitionIndex,
      lowTopPageBidMicros: metrics.lowTopOfPageBidMicros,
      highTopPageBidMicros: metrics.highTopOfPageBidMicros,
      avgCpcMicros: metrics.avgCpcMicros,
      monthlySearchVolumes: metrics.monthlySearchVolumes,
    };
  });

  const transformResults = (source: 'google_ads_api' | 'mock_fallback'): KeywordResult[] =>
    apiKeywords.map((idea) => ({
      keyword: idea.keyword,
      searchVolume: idea.searchVolume || 0,
      competition: idea.competition || 'UNKNOWN',
      competitionIndex: idea.competitionIndex,
      lowTopPageBidMicros: idea.lowTopPageBidMicros,
      highTopPageBidMicros: idea.highTopPageBidMicros,
      avgCpcMicros: idea.avgCpcMicros,
      monthlySearchVolumes: idea.monthlySearchVolumes,
      _meta: {
        dataSource: source,
        reason:
          source === 'google_ads_api'
            ? 'Real data from Google Ads Keyword Planning API'
            : 'Google Ads API returned no data (unusual with Standard Access)',
        cached: false,
      },
    }));

  let freshResults: KeywordResult[] = [];

  if (apiKeywords.length > 0) {
    freshResults = transformResults('google_ads_api');

    if (useCache) {
      try {
        for (const result of freshResults) {
          await sql`
            INSERT INTO keyword_cache (
              keyword, country_code, language_code, search_volume, competition,
              competition_index, low_top_page_bid_micros, high_top_page_bid_micros,
              avg_cpc_micros, monthly_search_volumes, data_source, expires_at
            ) VALUES (
              ${result.keyword}, ${countryCode}, ${languageCode}, ${result.searchVolume},
              ${result.competition}, ${result.competitionIndex}, ${result.lowTopPageBidMicros},
              ${result.highTopPageBidMicros}, ${result.avgCpcMicros}, ${JSON.stringify(result.monthlySearchVolumes)},
              ${result._meta?.dataSource}, NOW() + INTERVAL '30 days'
            ) ON CONFLICT (keyword, country_code, language_code) DO UPDATE SET
              search_volume = EXCLUDED.search_volume,
              competition = EXCLUDED.competition,
              competition_index = EXCLUDED.competition_index,
              low_top_page_bid_micros = EXCLUDED.low_top_page_bid_micros,
              high_top_page_bid_micros = EXCLUDED.high_top_page_bid_micros,
              avg_cpc_micros = EXCLUDED.avg_cpc_micros,
              monthly_search_volumes = EXCLUDED.monthly_search_volumes,
              data_source = EXCLUDED.data_source,
              expires_at = EXCLUDED.expires_at,
              created_at = NOW()
          `;
        }
      } catch (cacheError) {
        console.error('Failed to cache keyword data:', cacheError);
      }
    }
  } else {
    freshResults = [];
  }

  const combinedResults = decorateResults([...cachedResults, ...freshResults]);

  // Skip history saving for public endpoints
  if (false && userId) {
    await saveKeywordSearchHistory({
      userId: userId!,
      userPrompt,
      countryCode,
      languageCode,
      results: combinedResults,
      source: (freshResults.length > 0 && freshResults[0]._meta?.dataSource) ? freshResults[0]._meta!.dataSource : 'google_ads_api',
    });
  }

  return combinedResults;
}

