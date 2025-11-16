import { sql } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  // Skip authentication in development for testing
  let userId = null;
  if (process.env.NODE_ENV === 'production') {
    const auth = getAuth(request);
    userId = auth.userId;
    if (!userId) {
      return response.status(401).json({ error: 'Unauthorized - please sign in' });
    }
  } else {
    // Use mock user ID for development testing
    userId = 'test-user-dashboard';
  }

  let option = '';
  try {
    if (request.method === 'GET') {
      // Get all favorites for the user, along with latest monthly trend from keyword_cache when available
      const favorites = await sql`
        SELECT
          kf.keyword,
          kf.country_code,
          kf.language_code,
          kf.search_volume,
          kf.competition,
          kf.competition_index,
          kf.avg_cpc_micros,
          kf.created_at,
          kc.monthly_search_volumes
        FROM keyword_favorites kf
        LEFT JOIN LATERAL (
          SELECT monthly_search_volumes
          FROM keyword_cache
          WHERE keyword = kf.keyword
            AND country_code = COALESCE(kf.country_code, 'US')
            AND language_code = COALESCE(kf.language_code, 'en')
            AND expires_at > NOW()
          ORDER BY expires_at DESC
          LIMIT 1
        ) kc ON TRUE
        WHERE kf.user_id = ${userId}
        ORDER BY kf.created_at DESC
      `;

      return response.status(200).json({
        success: true,
        favorites: favorites.rows
      });
    }

    if (request.method === 'PUT') {
      const {
        keyword,
        countryCode,
        languageCode,
        searchVolume,
        competition,
        competitionIndex,
        avgCpcMicros
      } = request.body;

      if (!keyword || !keyword.trim()) {
        throw new Error('Keyword is required');
      }

      // Check if favorite already exists
      const existingFavorite = await sql`
        SELECT id FROM keyword_favorites
        WHERE user_id = ${userId} AND keyword = ${keyword.trim()}
      `;

      if (existingFavorite.rows.length === 1) {
        option = 'update';
        // Update existing favorite
        await sql`
          UPDATE keyword_favorites SET
            country_code = ${countryCode || null},
            language_code = ${languageCode || null},
            search_volume = ${searchVolume || null},
            competition = ${competition || null},
            competition_index = ${competitionIndex || null},
            avg_cpc_micros = ${avgCpcMicros || null},
            created_at = NOW()
          WHERE id = ${existingFavorite.rows[0].id}
        `;
      } else {
        option = 'insert';
        // Insert new favorite
        await sql`
          INSERT INTO keyword_favorites (
            user_id,
            keyword,
            country_code,
            language_code,
            search_volume,
            competition,
            competition_index,
            avg_cpc_micros
          ) VALUES (
            ${userId},
            ${keyword.trim()},
            ${countryCode || null},
            ${languageCode || null},
            ${searchVolume || null},
            ${competition || null},
            ${competitionIndex || null},
            ${avgCpcMicros || null}
          )
        `;
      }

      return response.status(200).json({
        success: true,
        message: `${option} successful`,
        operation: option
      });
    }

    if (request.method === 'DELETE') {
      const { keyword } = request.body;

      if (!keyword || typeof keyword !== 'string') {
        throw new Error('Keyword parameter is required');
      }

      await sql`
        DELETE FROM keyword_favorites
        WHERE user_id = ${userId} AND keyword = ${keyword.trim()}
      `;

      return response.status(200).json({
        success: true,
        message: 'Favorite removed successfully'
      });
    }

    return response.status(405).json({ error: 'Method not allowed' });

  } catch (error: unknown) {
    // Check if 'error' is an instance of 'Error' and has a 'message' property
    if (error instanceof Error) {
      console.error(`Error ${option} keyword favorite:`, error.message);
      return response.status(500).json({ error: error.message });
    }

    // If it's not an Error instance or doesn't have a 'message', handle it as a generic error
    console.error(`Error ${option} keyword favorite:`, error);
    return response.status(500).json({ error: 'An unexpected error occurred' });
  }
}
