import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userEmail = req.headers['x-user-email'] as string;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'User email is required' });
    }

    // Get query parameters for pagination
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Fetch analyses for the user, ordered by most recent first
    const result = await sql`
      SELECT 
        id,
        analysis_text,
        date_range_start,
        date_range_end,
        campaign_count,
        created_at,
        updated_at
      FROM ai_campaign_analyses
      WHERE user_email = ${userEmail}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Get total count for pagination
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM ai_campaign_analyses
      WHERE user_email = ${userEmail}
    `;

    const total = parseInt(countResult.rows[0].total);

    res.status(200).json({
      success: true,
      analyses: result.rows.map(row => ({
        id: row.id,
        analysisText: row.analysis_text,
        dateRangeStart: row.date_range_start,
        dateRangeEnd: row.date_range_end,
        campaignCount: row.campaign_count,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching AI analyses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch AI analyses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

