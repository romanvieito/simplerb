import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { runGoogleKeywordResearch } from '../../../utils/googleKeywordResearch';

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
    dataSource: 'openai_generated';
    reason?: string;
    cached?: boolean;
  };
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = `You are a keyword research expert. Generate 15-20 high-quality keyword suggestions for digital marketing based on the user's prompt.

IMPORTANT: Respond ONLY with a valid JSON array. No explanations, no markdown, no additional text.

Each array element must be an object with these exact fields:
- keyword: string (the keyword phrase)
- searchVolume: number or null (estimated monthly searches, or null if unknown)
- competition: string (one of: "LOW", "MEDIUM", "HIGH", "UNKNOWN")
- competitionIndex: number or null (0-100 scale, or null if unknown)
- monthlySearchVolumes: array or null (last 12 months as array of objects with monthLabel and monthlySearches, or null)

Example format:
[{"keyword":"example keyword","searchVolume":1000,"competition":"MEDIUM","competitionIndex":45,"monthlySearchVolumes":null}]

Generate keywords relevant to: `;

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
        'brand awareness',
        'customer engagement',
        'lead generation',
        'conversion rate',
        'target audience',
        'marketing campaign',
        'content marketing',
        'social media',
        'email marketing',
        'paid advertising',
      ];

      const mockResults: GeneratedKeywordResult[] = baseKeywords.slice(0, 20).map((base, idx) => {
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
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${prompt} (Country: ${countryCode}, Language: ${languageCode})`
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

    if (!Array.isArray(parsed)) {
      throw new Error('OpenAI response was not an array');
    }

    const normalizedArray = Array.isArray(parsed)
      ? parsed
      : (Array.isArray(parsed.keywords) ? parsed.keywords : []);

    const results: GeneratedKeywordResult[] = normalizedArray
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
            dataSource: 'openai_generated',
            reason: 'Generated via OpenAI',
            cached: false,
          },
        } as GeneratedKeywordResult;
      })
      .filter(Boolean);

    if (results.length === 0) {
      return res.status(200).json([]);
    }

    // Try to enrich with Google Ads data (cap to 20 keywords)
    const keywordsToEnrich = results.slice(0, 20);
    console.log(`Attempting to enrich ${keywordsToEnrich.length} AI-generated keywords with Google Ads data`);

    if (keywordsToEnrich.length === 0) {
      console.log('No keywords to enrich, returning AI results');
      return res.status(200).json(results);
    }

    try {
      console.log('Calling runGoogleKeywordResearch...');
      const enrichedResults = await runGoogleKeywordResearch({
        keywords: keywordsToEnrich.map((r) => r.keyword),
        countryCode,
        languageCode,
        useCache: true,
        userPrompt: prompt,
        userId: userId || undefined,
        generatedViaAI: true,
      });
      console.log(`Google Ads enrichment successful, returning ${enrichedResults.length} results`);
      return res.status(200).json(enrichedResults);
    } catch (enrichmentError) {
      console.error('Google Ads enrichment failed:', enrichmentError);
      console.log('Returning AI-generated results without enrichment');
      return res.status(200).json(results);
    }
  } catch (error) {
    console.error('OpenAI keyword generation error:', error);
    let message = 'Failed to generate keywords with AI';
    if (error instanceof Error) {
      message = error.message;
    }
    return res.status(500).json({ success: false, error: message });
  }
}

