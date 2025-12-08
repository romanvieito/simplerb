import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { saveKeywordSearchHistory } from '../../../utils/keywordHistory';
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
    dataSource: 'openai_generated' | 'google_ads_api';
    reason?: string;
    cached?: boolean;
    generatedViaAI?: boolean;
  };
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const systemPrompt = `You generate keyword ideas only. Return 20 diverse, high-intent keywords relevant to the user's prompt as a pure JSON array of strings. No objects. No extra text.`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { userId } = getAuth(req);

  try {
    const { prompt, countryCode = 'US', languageCode = 'en', useCache = true } = req.body as {
      prompt?: string;
      countryCode?: string;
      languageCode?: string;
      useCache?: boolean;
    };

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, error: 'Prompt is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY not set; returning deterministic AI keyword suggestions.');
      const seed = `${prompt}|${countryCode}|${languageCode}`;

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

      const mockKeywords = baseKeywords.map((base, idx) => {
        return `${prompt.split(' ')[0] ?? 'target'} ${base}`.toLowerCase();
      });

      // Cap to 20 and deduplicate
      const uniqueKeywords = Array.from(new Set(mockKeywords)).slice(0, 20);

      try {
        const results = await runGoogleKeywordResearch({
          keywords: uniqueKeywords,
          countryCode,
          languageCode,
          useCache,
          userPrompt: prompt,
          userId: userId || undefined,
          generatedViaAI: true,
        });

        if (userId) {
          await saveKeywordSearchHistory({
            userId,
            userPrompt: prompt,
            countryCode,
            languageCode,
            results,
            source: results[0]?._meta?.dataSource === 'google_ads_api' ? 'google_ads_api' : 'openai_generated',
          });
        }

        return res.status(200).json(results);
      } catch (error) {
        console.error('Google Ads enrichment failed in mock mode:', error);
        // Fallback to AI-only results
        const mockResults: GeneratedKeywordResult[] = uniqueKeywords.map((keyword) => ({
          keyword,
          searchVolume: 0,
          competition: 'UNKNOWN',
          _meta: {
            dataSource: 'openai_generated',
            reason: 'Generated via deterministic OpenAI fallback (API key not configured)',
            cached: false,
          },
        }));

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
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano',
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

    let keywords: string[];
    try {
      const parsed = JSON.parse(rawText);

      // Handle both array of strings and object with keywords array
      if (Array.isArray(parsed)) {
        keywords = parsed.filter((item: any) => typeof item === 'string' && item.trim()).map((item: any) => item.trim());
      } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.keywords)) {
        keywords = parsed.keywords.filter((item: any) => typeof item === 'string' && item.trim()).map((item: any) => item.trim());
      } else {
        throw new Error('OpenAI response was not an array of strings or object with keywords array');
      }
    } catch (error) {
      throw new Error('OpenAI response was not valid JSON');
    }

    // Deduplicate and cap to 20 keywords
    const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 20);

    if (uniqueKeywords.length === 0) {
      return res.status(200).json([]);
    }

    // Enrich AI-generated keywords with Google Ads API data.
    // Prefer the same internal REST path used by the "Find Keywords" tab for consistent prod behavior.
    try {
      // Construct base URL robustly (works in prod and dev)
      const baseUrl =
        req.headers.origin ||
        (req.headers.host
          ? `${(req.headers['x-forwarded-proto'] as string) || 'https'}://${req.headers.host}`
          : process.env.NEXT_PUBLIC_APP_URL ||
            (process.env.NODE_ENV === 'production'
              ? `https://${req.headers.host || 'localhost'}`
              : 'http://127.0.0.1:3000'));

      const internalApiUrl = `${baseUrl}/api/google-ads/keyword-planning-rest`;

      const controller = new AbortController();
      const timeoutMs = process.env.NODE_ENV === 'production' ? 30000 : 10000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const forwardHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (req.headers.cookie) {
        forwardHeaders.cookie = req.headers.cookie as string;
      }
      // Forward identifiers for user-scoped tokens
      if (userId) forwardHeaders['x-user-id'] = userId;
      if (req.headers['x-user-email']) {
        forwardHeaders['x-user-email'] = String(req.headers['x-user-email']);
      }

      const resp = await fetch(internalApiUrl, {
        method: 'POST',
        headers: forwardHeaders,
        body: JSON.stringify({ keywords: uniqueKeywords, countryCode, languageCode }),
        signal: controller.signal,
      }).catch((e) => {
        throw e;
      });
      clearTimeout(timeout);

      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && Array.isArray(data.keywords) && data.keywords.length > 0) {
          const results: GeneratedKeywordResult[] = data.keywords.map((idea: any) => ({
            keyword: idea.keyword,
            searchVolume: idea.searchVolume ?? 0,
            competition: idea.competition ?? 'UNKNOWN',
            competitionIndex: idea.competitionIndex,
            lowTopPageBidMicros: idea.lowTopPageBidMicros,
            highTopPageBidMicros: idea.highTopPageBidMicros,
            avgCpcMicros: idea.avgCpcMicros,
            monthlySearchVolumes: idea.monthlySearchVolumes,
            _meta: {
              dataSource: 'google_ads_api',
              reason: 'AI-generated keywords enriched with Google Ads metrics',
              cached: false,
              generatedViaAI: true,
            },
          }));

          if (userId) {
            await saveKeywordSearchHistory({
              userId,
              userPrompt: prompt,
              countryCode,
              languageCode,
              results,
              source: 'google_ads_api',
            });
          }

          return res.status(200).json(results);
        }
        // If internal API responded but without keywords, fall through to util-based enrichment
      } else {
        const errorData = await resp.json().catch(() => ({}));
        // If token expired, fall back to AI-only later
        if (errorData?.isTokenExpired) {
          throw new Error('Google Ads API authentication failed (token expired)');
        }
        // Fall through to util-based enrichment
      }

      // Fallback path: use shared util (direct Google API) in case internal path fails
      const results = await runGoogleKeywordResearch({
        keywords: uniqueKeywords,
        countryCode,
        languageCode,
        useCache,
        userPrompt: prompt,
        userId: userId || undefined,
        generatedViaAI: true,
      });

      if (userId) {
        await saveKeywordSearchHistory({
          userId,
          userPrompt: prompt,
          countryCode,
          languageCode,
          results,
          source: results[0]?._meta?.dataSource === 'google_ads_api' ? 'google_ads_api' : 'openai_generated',
        });
      }

      return res.status(200).json(results);
    } catch (enrichmentError) {
      console.error('⚠️ Error enriching with Google Ads data:', enrichmentError);

      // Check if the enrichment error contains token expiration info
      const errorMessage = enrichmentError instanceof Error ? enrichmentError.message : String(enrichmentError);
      const isTokenExpired = errorMessage.toLowerCase().includes('token') ||
                            errorMessage.toLowerCase().includes('authenticate') ||
                            errorMessage.toLowerCase().includes('invalid_grant') ||
                            errorMessage.includes('credentials have expired');

      if (isTokenExpired) {
        console.log('⚠️ Google Ads authentication error - falling back to AI-only results');
        // For AI-generated keywords, we fall back to AI-only results instead of showing an error
        // This allows the AI feature to work even when Google Ads credentials are expired
        const aiOnlyResults: GeneratedKeywordResult[] = uniqueKeywords.map((keyword) => ({
          keyword,
          searchVolume: 0,
          competition: 'UNKNOWN',
          _meta: {
            dataSource: 'openai_generated',
            reason: 'Generated via OpenAI (Google Ads API credentials expired - using AI-only data)',
            cached: false,
          },
        }));

        if (userId) {
          await saveKeywordSearchHistory({
            userId,
            userPrompt: prompt,
            countryCode,
            languageCode,
            results: aiOnlyResults,
            source: 'openai_generated',
          });
        }

        return res.status(200).json(aiOnlyResults);
      }

      // Fallback to AI-only results for other errors
      const aiOnlyResults: GeneratedKeywordResult[] = uniqueKeywords.map((keyword) => ({
        keyword,
        searchVolume: 0,
        competition: 'UNKNOWN',
        _meta: {
          dataSource: 'openai_generated',
          reason: 'Generated via OpenAI (Google Ads data unavailable)',
          cached: false,
        },
      }));

      if (userId) {
        await saveKeywordSearchHistory({
          userId,
          userPrompt: prompt,
          countryCode,
          languageCode,
          results: aiOnlyResults,
          source: 'openai_generated',
        });
      }

      return res.status(200).json(aiOnlyResults);
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

