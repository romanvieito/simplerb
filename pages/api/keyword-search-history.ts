import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication using Clerk
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - please sign in' });
  }

  try {
    const { limit = 10, offset = 0 } = req.query;

    const result = await sql`
      SELECT
        id,
        user_prompt,
        country_code,
        language_code,
        generated_keywords,
        keyword_count,
        search_timestamp
      FROM keyword_search_history
      WHERE user_id = ${userId}
      ORDER BY search_timestamp DESC
      LIMIT ${parseInt(limit as string)}
      OFFSET ${parseInt(offset as string)}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as total FROM keyword_search_history WHERE user_id = ${userId}
    `;

    return res.status(200).json({
      searches: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Error fetching search history:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch search history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
