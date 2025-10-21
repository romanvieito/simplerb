import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { runGoogleKeywordResearch } from '../../utils/googleKeywordResearch';

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

  const { userId } = getAuth(req);
  // Public endpoint: allow both signed-in and anonymous users

  const {
    keywords,
    countryCode = 'US',
    languageCode = 'en',
    useCache = true,
    userPrompt,
    generatedViaAI,
  } = req.body;

  if (process.env.NODE_ENV !== 'production') {
    console.log('Received request:', req.body);
  }

  try {
    const keywordList: string[] = Array.isArray(keywords)
      ? (keywords as string[]).map((k) => String(k).trim()).filter(Boolean)
      : String(keywords)
          .split(/\r?\n|,|;/)
          .map((k) => k.trim())
          .filter(Boolean);

    if (keywordList.length === 0) {
      return res.status(400).json({ message: 'Provide at least one keyword' });
    }

    const results = await runGoogleKeywordResearch({
      keywords: keywordList,
      countryCode,
      languageCode,
      useCache,
      userPrompt,
      userId: userId || undefined,
      generatedViaAI,
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during keyword research';
    res.status(500).json({ message: errorMessage });
  }
}