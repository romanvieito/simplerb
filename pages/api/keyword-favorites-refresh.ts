import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/nextjs/server';

type KeywordPlanningKeyword = {
  keyword: string;
  searchVolume?: number;
  competition?: string;
  competitionIndex?: number;
  lowTopPageBidMicros?: number;
  highTopPageBidMicros?: number;
  avgCpcMicros?: number;
  monthlySearchVolumes?: any;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Auth: mirror existing keyword-favorites route behavior
  let userId: string | null = null;
  if (process.env.NODE_ENV === 'production') {
    const auth = getAuth(req);
    userId = auth.userId ?? null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - please sign in' });
    }
  } else {
    userId = 'test-user-dashboard';
  }

  try {
    // Fetch all favorites for the user
    const favoritesQuery = await sql`
      SELECT keyword, country_code, language_code
      FROM keyword_favorites
      WHERE user_id = ${userId}
    `;

    const favorites: Array<{ keyword: string; country_code: string | null; language_code: string | null }> =
      favoritesQuery.rows as any;

    if (favorites.length === 0) {
      return res.status(200).json({ success: true, refreshed: 0, message: 'No favorites to refresh' });
    }

    // Group favorites by country/language to minimize API calls
    const groups = new Map<string, { countryCode: string; languageCode: string; keywords: string[] }>();
    for (const fav of favorites) {
      const countryCode = (fav.country_code || 'US').trim();
      const languageCode = (fav.language_code || 'en').trim();
      const key = `${countryCode}|${languageCode}`;
      if (!groups.has(key)) {
        groups.set(key, { countryCode, languageCode, keywords: [] });
      }
      groups.get(key)!.keywords.push(fav.keyword);
    }

    // Resolve base URL similar to keyword-research.ts
    const baseUrl =
      req.headers.origin ||
      (req.headers.host
        ? `${(req.headers['x-forwarded-proto'] as string) || 'https'}://${req.headers.host}`
        : process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.NODE_ENV === 'production'
            ? 'https://' + (req.headers.host || 'localhost')
            : 'http://127.0.0.1:3000'));

    let totalRefreshed = 0;
    const updates: Array<Promise<any>> = [];

    for (const [, group] of groups) {
      // Call internal Google Ads planning endpoint
      const internalApiUrl = `${baseUrl}/api/google-ads/keyword-planning-rest`;
      const controller = new AbortController();
      const timeoutMs = process.env.NODE_ENV === 'production' ? 30000 : 6000;
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const resp = await fetch(internalApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: group.keywords,
          countryCode: group.countryCode,
          languageCode: group.languageCode
        }),
        signal: controller.signal
      }).catch((e) => {
        return { ok: false, status: 500, json: async () => ({ error: String(e) }) } as Response;
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        // Skip this group on failure, continue with others
        continue;
      }
      const data = (await resp.json()) as {
        success?: boolean;
        usedFallback?: boolean;
        keywords?: KeywordPlanningKeyword[];
      };

      if (!data || !Array.isArray(data.keywords)) {
        continue;
      }

      // Prepare updates for each keyword returned
      for (const k of data.keywords) {
        const keyword = k.keyword;
        const searchVolume = k.searchVolume ?? null;
        const competition = k.competition ?? null;
        const competitionIndex = k.competitionIndex ?? null;
        const lowTopPageBidMicros = k.lowTopPageBidMicros ?? null;
        const highTopPageBidMicros = k.highTopPageBidMicros ?? null;
        const avgCpcMicros = k.avgCpcMicros ?? null;
        const monthlySearchVolumes = k.monthlySearchVolumes ?? null;

        updates.push(sql`
          UPDATE keyword_favorites SET
            search_volume = ${searchVolume},
            competition = ${competition},
            competition_index = ${competitionIndex},
            avg_cpc_micros = ${avgCpcMicros},
            created_at = NOW()
          WHERE user_id = ${userId} AND keyword = ${keyword}
        `);

        // Upsert into keyword_cache so dashboard can read monthly trend data
        updates.push(sql`
          INSERT INTO keyword_cache (
            keyword, country_code, language_code, search_volume, competition,
            competition_index, low_top_page_bid_micros, high_top_page_bid_micros,
            avg_cpc_micros, monthly_search_volumes, data_source, expires_at
          ) VALUES (
            ${keyword}, ${group.countryCode}, ${group.languageCode}, ${searchVolume},
            ${competition}, ${competitionIndex}, ${lowTopPageBidMicros}, ${highTopPageBidMicros},
            ${avgCpcMicros}, ${JSON.stringify(monthlySearchVolumes)}, 'google_ads_refresh', NOW() + INTERVAL '30 days'
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
        `);
        totalRefreshed += 1;
      }
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    return res.status(200).json({
      success: true,
      refreshed: totalRefreshed
    });
  } catch (error) {
    console.error('Error refreshing keyword favorites:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refresh keyword favorites',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}


