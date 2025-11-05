import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { saveKeywordSearchHistory } from '../../../utils/keywordHistory';

interface GeneratedKeywordResult {
  keyword: string;
  searchVolume: number | string;
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
    dataSource: 'openai_generated' | 'google_ads_api';
    reason?: string;
    cached?: boolean;
    generatedViaAI?: boolean;
  };
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = `You generate keyword ideas for digital marketing.
Return 15-25 high-quality keyword suggestions relevant to the user's prompt.
Output must be JSON array of objects with fields:
- keyword (string)
- searchVolume (number, optional; use null if unknown)
- competition (one of LOW, MEDIUM, HIGH, UNKNOWN)
- competitionIndex (number 0-100, optional)
- monthlySearchVolumes (optional array of last 12 months with { monthLabel, monthlySearches })
Leave numeric fields null if unavailable.
Do not include any text outside JSON.
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = getAuth(req);

  try {
    const { prompt, countryCode = 'US', languageCode = 'en' } = req.body as {
      prompt?: string;
      countryCode?: string;
      languageCode?: string;
    };

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set; returning deterministic AI keyword suggestions.');
      const seed = `${prompt}|${countryCode}|${languageCode}`;
      const deterministic = (text: string) => {
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
          hash = (hash * 31 + text.charCodeAt(i)) | 0;
        }
        const positiveHash = Math.abs(hash);
        return {
          volume: (positiveHash % 9000) + 100,
          competitionIndex: positiveHash % 100,
        };
      };

      const baseKeywords = [
        'keyword ideas',
        'market research',
        'seo strategy',
        'marketing tips',
        'product promotion',
        'customer acquisition',
        'digital campaigns',
        'content optimization',
        'growth hacking',
        'conversion funnel',
      ];

      const mockResults: GeneratedKeywordResult[] = baseKeywords.map((base, idx) => {
        const key = `${seed}|${base}|${idx}`;
        const { volume, competitionIndex } = deterministic(key);
        const competition = competitionIndex > 70 ? 'HIGH' : competitionIndex > 40 ? 'MEDIUM' : 'LOW';
        return {
          keyword: `${prompt.split(' ')[0] ?? 'target'} ${base}`.toLowerCase(),
          searchVolume: volume,
          competition,
          competitionIndex,
          _meta: {
            dataSource: 'openai_generated',
            reason: 'Generated via deterministic OpenAI fallback (API key not configured)',
            cached: false,
          },
        };
      });

      if (userId) {
        await saveKeywordSearchHistory({
          userId,
          userPrompt: prompt,
          countryCode,
          languageCode,
          results: mockResults,
          source: 'openai_generated',
        });
      }

      return res.status(200).json(mockResults);
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Prompt: ${prompt}\nCountry: ${countryCode}\nLanguage: ${languageCode}`
        }
      ],
    });

    const rawText = completion.choices?.[0]?.message?.content?.trim() ?? '';

    if (!rawText) {
      throw new Error('No response from OpenAI');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new Error('OpenAI response was not valid JSON');
    }

    let normalizedArray: any[];
    if (Array.isArray(parsed)) {
      normalizedArray = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.keywords)) {
      normalizedArray = parsed.keywords;
    } else {
      throw new Error('OpenAI response was not an array or object with keywords array');
    }

    const aiResults: GeneratedKeywordResult[] = normalizedArray
      .map((item: any) => {
        const keyword = String(item.keyword ?? '').trim();
        if (!keyword) {
          return null;
        }

        const searchVolume = item.searchVolume ?? item.volume ?? null;
        const competition = String(item.competition ?? 'UNKNOWN').toUpperCase();
        const competitionIndex = item.competitionIndex ?? item.competition_score ?? null;

        let monthlySearchVolumes;
        if (Array.isArray(item.monthlySearchVolumes)) {
          monthlySearchVolumes = item.monthlySearchVolumes
            .map((entry: any) => {
              const monthLabel = String(entry.monthLabel ?? entry.month ?? '').trim();
              const monthlySearches = Number(entry.monthlySearches ?? entry.volume ?? 0);
              if (!monthLabel) {
                return null;
              }
              return {
                month: monthLabel,
                year: Number(entry.year ?? new Date().getFullYear()),
                monthIndex: 0,
                monthLabel,
                dateKey: monthLabel.replace(' ', '-') ?? '',
                monthlySearches: Number.isFinite(monthlySearches) ? monthlySearches : 0,
              };
            })
            .filter(Boolean);
        }

        return {
          keyword,
          searchVolume: typeof searchVolume === 'number' ? searchVolume : null,
          competition,
          competitionIndex: competitionIndex !== null ? Number(competitionIndex) : undefined,
          monthlySearchVolumes,
          _meta: {
            dataSource: 'openai_generated' as const,
            reason: 'Generated via OpenAI',
            cached: false,
          },
        } as GeneratedKeywordResult;
      })
      .filter((item): item is GeneratedKeywordResult => item !== null);

    if (aiResults.length === 0) {
      return res.status(200).json([]);
    }

    // Enrich AI-generated keywords with Google Ads API data
    const keywordList = aiResults.map(r => r.keyword);
    let enrichedResults: GeneratedKeywordResult[] = aiResults;

    try {
      console.log('🔍 Enriching AI-generated keywords with Google Ads data...');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const keywordPlanningResponse = await fetch(`${req.headers.origin || 'http://127.0.0.1:3000'}/api/google-ads/keyword-planning-rest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: keywordList, countryCode, languageCode }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (keywordPlanningResponse.ok) {
        const keywordPlanningData = await keywordPlanningResponse.json();
        
        if (keywordPlanningData.success && Array.isArray(keywordPlanningData.keywords) && keywordPlanningData.keywords.length > 0) {
          console.log(`✅ Enriched ${keywordPlanningData.keywords.length} keywords with Google Ads data`);
          
          // Create a map of Google Ads data by keyword
          const googleAdsMap = new Map<string, any>();
          keywordPlanningData.keywords.forEach((idea: any) => {
            googleAdsMap.set(idea.keyword.toLowerCase(), idea);
          });

          // Merge AI competition data with Google Ads metrics
          enrichedResults = aiResults.map((aiResult) => {
            const googleAdsData = googleAdsMap.get(aiResult.keyword.toLowerCase());
            
            if (googleAdsData) {
              // Use Google Ads data for volume, CPC, trends, but keep AI competition if it's more detailed
              return {
                ...aiResult,
                searchVolume: googleAdsData.searchVolume ?? aiResult.searchVolume ?? 0,
                competition: googleAdsData.competition || aiResult.competition,
                competitionIndex: googleAdsData.competitionIndex ?? aiResult.competitionIndex,
                lowTopPageBidMicros: googleAdsData.lowTopPageBidMicros,
                highTopPageBidMicros: googleAdsData.highTopPageBidMicros,
                avgCpcMicros: googleAdsData.avgCpcMicros,
                monthlySearchVolumes: googleAdsData.monthlySearchVolumes ?? aiResult.monthlySearchVolumes,
                _meta: {
                  dataSource: 'google_ads_api',
                  reason: 'AI-generated keywords enriched with Google Ads metrics',
                  cached: false,
                  generatedViaAI: true,
                },
              };
            }
            
            // If no Google Ads data, keep AI result but mark as AI-only
            return {
              ...aiResult,
              _meta: {
                dataSource: aiResult._meta?.dataSource || 'openai_generated',
                reason: 'Generated via OpenAI (Google Ads data unavailable)',
                cached: aiResult._meta?.cached || false,
              },
            };
          });
        } else {
          console.log('⚠️ Google Ads API returned no data for enrichment');
        }
      } else {
        console.log('⚠️ Google Ads API enrichment failed, using AI-only data');
      }
    } catch (enrichmentError) {
      console.error('⚠️ Error enriching with Google Ads data:', enrichmentError);
      // Continue with AI-only results if enrichment fails
    }

    if (userId) {
      await saveKeywordSearchHistory({
        userId,
        userPrompt: prompt,
        countryCode,
        languageCode,
        results: enrichedResults,
        source: enrichedResults[0]?._meta?.dataSource === 'google_ads_api' ? 'google_ads_api' : 'openai_generated',
      });
    }

    return res.status(200).json(enrichedResults);
  } catch (error) {
    console.error('OpenAI keyword generation error:', error);
    let message = 'Failed to generate keywords with AI';
    if (error instanceof Error) {
      message = error.message;
    }
    return res.status(500).json({ success: false, error: message });
  }
}

