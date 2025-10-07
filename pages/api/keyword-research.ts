import { NextApiRequest, NextApiResponse } from 'next';

interface KeywordResult {
  keyword: string;
  searchVolume: number;
  competition: string;
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

    // Convert keywords string to array
    const keywordList = keywords.split('\n').map((k: string) => k.trim()).filter(Boolean);

    // Use the new keyword planning service
    try {
      const keywordPlanningResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/google-ads/keyword-planning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywordList,
          countryCode,
          languageCode
        }),
      });

      if (keywordPlanningResponse.ok) {
        const keywordPlanningData = await keywordPlanningResponse.json();
        if (keywordPlanningData.success && keywordPlanningData.keywords) {
          // Transform the data to match the expected format
          const results: KeywordResult[] = keywordPlanningData.keywords.map((idea: any) => ({
            keyword: idea.keyword,
            searchVolume: idea.searchVolume || 0,
            competition: idea.competition || 'UNKNOWN'
          }));
          
          return res.status(200).json(results);
        }
      }
    } catch (keywordPlanningError) {
      console.warn('Keyword planning service failed:', keywordPlanningError);

      // Optional deterministic mock fallback to avoid fluctuating values
      const USE_DETERMINISTIC_MOCK = process.env.GADS_ENABLE_DETERMINISTIC_MOCK === 'true' || process.env.NODE_ENV !== 'production';
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
          return { keyword: k, searchVolume: volume, competition };
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