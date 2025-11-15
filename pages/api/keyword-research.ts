import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';
import { saveKeywordSearchHistory } from '../../utils/keywordHistory';

interface KeywordResult {
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
    dataSource: 'google_ads_api' | 'mock_deterministic' | 'mock_fallback';
    reason?: string;
    cached?: boolean;
    generatedViaAI?: boolean;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check authentication using Clerk
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized - please sign in' });
  }

  const {
    keywords,
    countryCode = 'US',
    languageCode = 'en',
    useCache = true,
    userPrompt,
    generatedViaAI: generatedViaAIRaw,
  } = req.body;

  const generatedViaAI = Boolean(generatedViaAIRaw);

  const decorateResults = (list: KeywordResult[]): KeywordResult[] => {
    if (!generatedViaAI) return list;
    return list.map((result) => ({
      ...result,
      _meta: {
        dataSource: result._meta?.dataSource || 'google_ads_api',
        reason: result._meta?.reason,
        cached: result._meta?.cached,
        generatedViaAI: true,
      },
    }));
  };
  
  if (process.env.NODE_ENV !== 'production') {
    console.log('Received request:', req.body);
  }

  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ message: 'Keywords are required' });
  }

  try {
    // Normalize env vars to support both legacy GOOGLE_ADS_* and new GADS_*
    const CLIENT_ID = process.env.GADS_CLIENT_ID ?? process.env.GOOGLE_ADS_CLIENT_ID;
    const CLIENT_SECRET = process.env.GADS_CLIENT_SECRET ?? process.env.GOOGLE_ADS_CLIENT_SECRET;
    const DEVELOPER_TOKEN = process.env.GADS_DEVELOPER_TOKEN ?? process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const REFRESH_TOKEN = process.env.GADS_REFRESH_TOKEN ?? process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const CUSTOMER_ID_RAW = process.env.GADS_CUSTOMER_ID ?? process.env.GOOGLE_ADS_CUSTOMER_ID;
    const LOGIN_CUSTOMER_ID = process.env.GADS_LOGIN_CUSTOMER_ID ?? process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

    // Check if environment variables are set
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Checking Google Ads environment variables...');
      console.log('GADS_CLIENT_ID:', CLIENT_ID ? '✅ SET' : '❌ MISSING');
      console.log('GADS_CLIENT_SECRET:', CLIENT_SECRET ? '✅ SET' : '❌ MISSING');
      console.log('GADS_DEVELOPER_TOKEN:', DEVELOPER_TOKEN ? '✅ SET' : '❌ MISSING');
      console.log('GADS_REFRESH_TOKEN:', REFRESH_TOKEN ? '✅ SET' : '❌ MISSING');
      console.log('GADS_CUSTOMER_ID:', CUSTOMER_ID_RAW ? '✅ SET' : '❌ MISSING');
      console.log('GADS_LOGIN_CUSTOMER_ID:', LOGIN_CUSTOMER_ID ? '✅ SET' : '❌ MISSING');
    }

    const missingEnv = !CLIENT_ID || !CLIENT_SECRET || !DEVELOPER_TOKEN || !REFRESH_TOKEN || !CUSTOMER_ID_RAW || !LOGIN_CUSTOMER_ID;

    // Development fallback: if creds are missing locally, return mock data so the UI works
    if (missingEnv && process.env.NODE_ENV !== 'production') {
      const missingVars = [
        !CLIENT_ID && 'GADS_CLIENT_ID',
        !CLIENT_SECRET && 'GADS_CLIENT_SECRET',
        !DEVELOPER_TOKEN && 'GADS_DEVELOPER_TOKEN',
        !REFRESH_TOKEN && 'GADS_REFRESH_TOKEN',
        !CUSTOMER_ID_RAW && 'GADS_CUSTOMER_ID',
        !LOGIN_CUSTOMER_ID && 'GADS_LOGIN_CUSTOMER_ID',
      ].filter(Boolean).join(', ');
      console.warn(`⚠️ Missing environment variables: ${missingVars}. Returning mock data.`);
      const keywordListDev = keywords.split('\n').map((k: string) => k.trim()).filter(Boolean);
      const options = ['LOW', 'MEDIUM', 'HIGH'];
      const mock = keywordListDev.map((k: string, idx: number) => ({
        keyword: k,
        searchVolume: 100 + (idx * 37),
        competition: options[idx % options.length]
      }));
      return res.status(200).json(mock);
    }

    if (missingEnv) {
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

    // Convert keywords to array (accept string or array)
    const keywordList: string[] = Array.isArray(keywords)
      ? (keywords as string[]).map(k => String(k).trim()).filter(Boolean)
      : String(keywords).split(/\r?\n|,|;/).map(k => k.trim()).filter(Boolean);
    if (keywordList.length === 0) {
      return res.status(400).json({ message: 'Provide at least one keyword' });
    }

    // Decide whether to call Google service or return mock immediately
    const USE_KEYWORD_PLANNING = process.env.GADS_USE_KEYWORD_PLANNING?.trim() === 'true';
    console.log(`🔍 GADS_USE_KEYWORD_PLANNING is set to: "${process.env.GADS_USE_KEYWORD_PLANNING}"`);
    console.log(`🔍 GADS_USE_KEYWORD_PLANNING trimmed: "${process.env.GADS_USE_KEYWORD_PLANNING?.trim()}"`);
    console.log(`📊 Using ${USE_KEYWORD_PLANNING ? 'REAL GOOGLE API DATA' : 'MOCK DATA'}`);

    // Cache lookup logic - only for real API calls and when cache is enabled
    let cachedResults: KeywordResult[] = [];
    let uncachedKeywords: string[] = keywordList;
    
    if (USE_KEYWORD_PLANNING && useCache) {
      try {
        console.log('🔍 Checking cache for keywords...');
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
        
        const cachedKeywords = new Set<string>();
        cachedResults = cacheQuery.rows.map((row: any) => {
          cachedKeywords.add(row.keyword);
          return {
            keyword: row.keyword,
            searchVolume: row.search_volume,
            competition: row.competition,
            competitionIndex: row.competition_index,
            lowTopPageBidMicros: row.low_top_page_bid_micros,
            highTopPageBidMicros: row.high_top_page_bid_micros,
            avgCpcMicros: row.avg_cpc_micros,
            monthlySearchVolumes: row.monthly_search_volumes,
            _meta: {
              dataSource: row.data_source as 'google_ads_api' | 'mock_deterministic' | 'mock_fallback',
              reason: 'Cached data from previous Google Ads API call',
              cached: true
            }
          };
        });
        
        // Filter out cached keywords from the list to fetch
        uncachedKeywords = keywordList.filter(k => !cachedKeywords.has(k));
        
        console.log(`📦 Found ${cachedResults.length} cached keywords, ${uncachedKeywords.length} need fresh data`);
      } catch (cacheError) {
        console.error('⚠️ Cache lookup failed, proceeding without cache:', cacheError);
        uncachedKeywords = keywordList;
        cachedResults = [];
      }
    }
    
    if (!USE_KEYWORD_PLANNING) {
      console.log('⚠️ Returning mock data. Set GADS_USE_KEYWORD_PLANNING=true to use real Google Ads API data.');
      // Deterministic mock for fast, stable responses when external service is disabled
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
            dataSource: 'mock_deterministic',
            reason: 'GADS_USE_KEYWORD_PLANNING not enabled. Set to "true" in .env.local for real data.'
          }
        };
      });
      return res.status(200).json(mockResults);
    }

    // If all keywords are cached, return cached results immediately
    if (uncachedKeywords.length === 0) {
      console.log('✅ All keywords found in cache, returning cached results');
      
      if (cachedResults.length > 0) {
        await saveKeywordSearchHistory({
          userId,
          userPrompt,
          countryCode,
          languageCode,
          results: cachedResults,
          source: 'google_ads_api'
        });
      }
      
      return res.status(200).json(cachedResults);
    }

    // Use the new keyword planning service (with timeout)
    console.log('🚀 Attempting to fetch real Google Ads API data...');
    try {
      // Construct base URL more robustly for production
      const baseUrl = req.headers.origin ||
                     (req.headers.host ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}` : 
                      process.env.NEXT_PUBLIC_APP_URL || 
                      (process.env.NODE_ENV === 'production' ? 'https://' + (req.headers.host || 'localhost') : 'http://127.0.0.1:3000'));
      
      const internalApiUrl = `${baseUrl}/api/google-ads/keyword-planning-rest`;
      console.log(`🔗 Calling internal API: ${internalApiUrl}`);
      
      const controller = new AbortController();
      // Increased timeout to 30 seconds for production (Google Ads API can be slow)
      const timeoutMs = process.env.NODE_ENV === 'production' ? 30000 : 6000;
      const timeout = setTimeout(() => {
        console.error(`⏱️ Request timed out after ${timeoutMs}ms`);
        controller.abort();
      }, timeoutMs);
      
      const keywordPlanningResponse = await fetch(internalApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: uncachedKeywords, countryCode, languageCode }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (keywordPlanningResponse.ok) {
        const keywordPlanningData = await keywordPlanningResponse.json();
        
        // Check if this is fallback data from Google API (rare with Standard Access)
        if (keywordPlanningData.usedFallback && Array.isArray(keywordPlanningData.keywords)) {
          console.log(`⚠️ Google API returned fallback data despite Standard Access`);
          console.log(`📋 Reason: ${keywordPlanningData.reason || 'Unknown'}`);
          
          // If API returned 0 results but the call succeeded, this is still a real API response
          // Only mark as fallback if there's an actual error or the API explicitly says it's fallback
          const freshResults: KeywordResult[] = keywordPlanningData.keywords.map((idea: any) => ({
            keyword: idea.keyword,
            searchVolume: idea.searchVolume || 0,
            competition: idea.competition || 'UNKNOWN',
            competitionIndex: idea.competitionIndex,
            lowTopPageBidMicros: idea.lowTopPageBidMicros,
            highTopPageBidMicros: idea.highTopPageBidMicros,
            avgCpcMicros: idea.avgCpcMicros,
            monthlySearchVolumes: idea.monthlySearchVolumes,
            _meta: {
              dataSource: 'mock_fallback',
              reason: keywordPlanningData.reason || 'Google Ads API returned no data (unusual with Standard Access)',
              cached: false
            }
          }));
          
        // Combine cached and fresh results
        const combinedResults = [...cachedResults, ...freshResults];
        await saveKeywordSearchHistory({
          userId,
          userPrompt,
          countryCode,
          languageCode,
          results: combinedResults,
          source: 'mock_fallback'
        });
        return res.status(200).json(combinedResults);
        }
        
        // Real data from Google
        if (keywordPlanningData.success && Array.isArray(keywordPlanningData.keywords) && keywordPlanningData.keywords.length > 0) {
          console.log(`✅ Successfully fetched ${keywordPlanningData.keywords.length} keywords from Google Ads API`);
          const freshResults: KeywordResult[] = keywordPlanningData.keywords.map((idea: any) => ({
            keyword: idea.keyword,
            searchVolume: idea.searchVolume || 0,
            competition: idea.competition || 'UNKNOWN',
            competitionIndex: idea.competitionIndex,
            lowTopPageBidMicros: idea.lowTopPageBidMicros,
            highTopPageBidMicros: idea.highTopPageBidMicros,
            avgCpcMicros: idea.avgCpcMicros,
            monthlySearchVolumes: idea.monthlySearchVolumes,
            _meta: {
              dataSource: 'google_ads_api',
              reason: 'Real data from Google Ads Keyword Planning API',
              cached: false
            }
          }));
          
          // Cache the fresh results (only if cache is enabled)
          if (useCache) {
            try {
              console.log('💾 Caching fresh keyword data...');
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
              console.log(`✅ Cached ${freshResults.length} keywords`);
            } catch (cacheError) {
              console.error('⚠️ Failed to cache keyword data:', cacheError);
            }
          }
          
          // Combine cached and fresh results
          const combinedResults = [...cachedResults, ...freshResults];
          
          await saveKeywordSearchHistory({
            userId,
            userPrompt,
            countryCode,
            languageCode,
            results: combinedResults,
            source: 'google_ads_api'
          });
          
          return res.status(200).json(combinedResults);
        } else {
          console.log('⚠️ Google Ads API returned no keywords');
          // Return cached results if available, otherwise trigger mock fallback
          if (cachedResults.length > 0) {
            await saveKeywordSearchHistory({
              userId,
              userPrompt,
              countryCode,
              languageCode,
              results: cachedResults,
              source: 'google_ads_api'
            });
            return res.status(200).json(cachedResults);
          }
          // If no cached results and no fresh results, throw to trigger mock fallback
          throw new Error('Google Ads API returned no keywords and no cached results available');
        }
      } else {
        const errorData = await keywordPlanningResponse.json().catch(() => ({}));
        console.log(`❌ Google Ads API request failed with status: ${keywordPlanningResponse.status}`);
        console.log('Error details:', errorData);

        // If it's a token expiration error from the underlying Google Ads API
        if (errorData.isTokenExpired) {
          console.error('❌ Authentication error - token expired');
          return res.status(500).json({
            success: false,
            isTokenExpired: true,
            error: errorData.error || 'Google Ads API authentication failed',
            errorDetails: errorData.errorDetails,
            userMessage: errorData.userMessage || 'Your Google Ads API credentials have expired. Please refresh them in the admin panel.',
            message: 'Google Ads API authentication failed. Please check your OAuth credentials and refresh token.'
          });
        }
        // If it's not a token expiration error, throw to trigger mock fallback
        throw new Error(`Google Ads API request failed: ${keywordPlanningResponse.status}`);
      }
    } catch (keywordPlanningError) {
      // Check if it's a timeout error
      const isTimeout = keywordPlanningError instanceof Error && 
                       (keywordPlanningError.name === 'AbortError' || 
                        keywordPlanningError.message.includes('timeout') ||
                        keywordPlanningError.message.includes('aborted'));
      
      if (isTimeout) {
        console.error('⏱️ Keyword planning service timed out');
        console.error('Error details:', keywordPlanningError);
      } else {
        console.error('❌ Keyword planning service failed:', keywordPlanningError);
        if (keywordPlanningError instanceof Error) {
          console.error('Error name:', keywordPlanningError.name);
          console.error('Error message:', keywordPlanningError.message);
          console.error('Error stack:', keywordPlanningError.stack);
        }
      }
      console.log('⚠️ Falling back to mock data');

      // Optional deterministic mock fallback to avoid fluctuating values
      const USE_DETERMINISTIC_MOCK = true;
      if (USE_DETERMINISTIC_MOCK) {
        const keywordListDet = keywordList;
        const deterministic = (text: string) => {
          let hash = 0;
          for (let i = 0; i < text.length; i++) {
            hash = (hash * 31 + text.charCodeAt(i)) | 0;
          }
          const vol = Math.abs(hash % 90000) + 1000; // 1k - 91k stable range
          const compLevels = ['LOW', 'MEDIUM', 'HIGH'] as const;
          const comp = compLevels[Math.abs(hash) % compLevels.length];
          return { volume: vol, competition: comp } as const;
        };

        const mockResults: KeywordResult[] = keywordListDet.map((k) => {
          const { volume, competition } = deterministic(`${k}|${countryCode}|${languageCode}`);
          return { 
            keyword: k, 
            searchVolume: volume, 
            competition,
            _meta: {
              dataSource: 'mock_fallback',
              reason: isTimeout 
                ? 'Google Ads API request timed out. This may be due to slow network or API response times.'
                : 'Google Ads API failed or returned no data. With Standard Access, this may be due to network issues or very low-volume keywords.',
              cached: false
            }
          };
        });

        // Combine cached and mock results
        const combinedResults = [...cachedResults, ...mockResults];
        await saveKeywordSearchHistory({
          userId,
          userPrompt,
          countryCode,
          languageCode,
          results: combinedResults,
          source: 'mock_fallback'
        });
        return res.status(200).json(combinedResults);
      }

      // If deterministic mock is disabled, provide a helpful error message
      console.error('Keyword planning service unavailable and mock disabled');
      return res.status(503).json({ 
        message: 'Keyword planning service is currently unavailable. This may be due to API permission limitations or service restrictions. Please try again later or contact support.',
        error: 'SERVICE_UNAVAILABLE',
        details: 'Google Ads API keyword planning requires special permissions that may not be available with your current account access level.'
      });
    }
  } catch (error) {
    console.error('Error:', error);
    let errorMessage = 'An error occurred during keyword research';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({ message: errorMessage });
  }
}