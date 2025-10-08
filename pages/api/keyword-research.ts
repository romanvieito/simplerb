import { NextApiRequest, NextApiResponse } from 'next';

interface KeywordResult {
  keyword: string;
  searchVolume: number;
  competition: string;
  _meta?: {
    dataSource: 'google_ads_api' | 'mock_deterministic' | 'mock_fallback';
    reason?: string;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  
  const { keywords, countryCode = 'US', languageCode = 'en' } = req.body;
  
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

    // Check if environment variables are set
    if (process.env.NODE_ENV !== 'production') {
      console.log('GADS_CLIENT_ID:', CLIENT_ID);
      console.log('GADS_CLIENT_SECRET:', CLIENT_SECRET);
      console.log('GADS_DEVELOPER_TOKEN:', DEVELOPER_TOKEN);
      console.log('GADS_REFRESH_TOKEN:', REFRESH_TOKEN);
      console.log('GADS_CUSTOMER_ID:', CUSTOMER_ID_RAW);
    }

    const missingEnv = !CLIENT_ID || !CLIENT_SECRET || !DEVELOPER_TOKEN || !REFRESH_TOKEN || !CUSTOMER_ID_RAW;

    // Development fallback: if creds are missing locally, return mock data so the UI works
    if (missingEnv && process.env.NODE_ENV !== 'production') {
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
      throw new Error('Missing required environment variables');
    }

    // Convert keywords to array (accept string or array)
    const keywordList: string[] = Array.isArray(keywords)
      ? (keywords as string[]).map(k => String(k).trim()).filter(Boolean)
      : String(keywords).split(/\r?\n|,|;/).map(k => k.trim()).filter(Boolean);
    if (keywordList.length === 0) {
      return res.status(400).json({ message: 'Provide at least one keyword' });
    }

    // Decide whether to call Google service or return mock immediately
    const USE_KEYWORD_PLANNING = process.env.GADS_USE_KEYWORD_PLANNING === 'true';
    console.log(`🔍 GADS_USE_KEYWORD_PLANNING is set to: ${process.env.GADS_USE_KEYWORD_PLANNING}`);
    console.log(`📊 Using ${USE_KEYWORD_PLANNING ? 'REAL GOOGLE API DATA' : 'MOCK DATA'}`);
    
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

    // Use the new keyword planning service (with timeout)
    console.log('🚀 Attempting to fetch real Google Ads API data...');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const keywordPlanningResponse = await fetch(`${req.headers.origin || 'http://127.0.0.1:3000'}/api/google-ads/keyword-planning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywordList, countryCode, languageCode }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (keywordPlanningResponse.ok) {
        const keywordPlanningData = await keywordPlanningResponse.json();
        
        // Check if this is fallback data from Google API
        if (keywordPlanningData.usedFallback && Array.isArray(keywordPlanningData.keywords)) {
          console.log(`⚠️ Google API returned fallback mock data`);
          const results: KeywordResult[] = keywordPlanningData.keywords.map((idea: any) => ({
            keyword: idea.keyword,
            searchVolume: idea.searchVolume || 0,
            competition: idea.competition || 'UNKNOWN',
            _meta: {
              dataSource: 'mock_fallback',
              reason: keywordPlanningData.reason || 'Google Ads API returned no data'
            }
          }));
          return res.status(200).json(results);
        }
        
        // Real data from Google
        if (keywordPlanningData.success && Array.isArray(keywordPlanningData.keywords) && keywordPlanningData.keywords.length > 0) {
          console.log(`✅ Successfully fetched ${keywordPlanningData.keywords.length} keywords from Google Ads API`);
          const results: KeywordResult[] = keywordPlanningData.keywords.map((idea: any) => ({
            keyword: idea.keyword,
            searchVolume: idea.searchVolume || 0,
            competition: idea.competition || 'UNKNOWN',
            _meta: {
              dataSource: 'google_ads_api',
              reason: 'Real data from Google Ads Keyword Planning API'
            }
          }));
          return res.status(200).json(results);
        } else {
          console.log('⚠️ Google Ads API returned no keywords');
        }
      } else {
        console.log(`❌ Google Ads API request failed with status: ${keywordPlanningResponse.status}`);
      }
    } catch (keywordPlanningError) {
      console.error('❌ Keyword planning service failed:', keywordPlanningError);
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
              reason: 'Google Ads API failed or returned no data. Likely due to API access level (Basic vs Standard) or account permissions.'
            }
          };
        });

        return res.status(200).json(mockResults);
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