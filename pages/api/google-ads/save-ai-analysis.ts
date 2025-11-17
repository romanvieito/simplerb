import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userEmail = req.headers['x-user-email'] as string;
    
    if (!userEmail) {
      return res.status(401).json({ error: 'User email is required' });
    }

    const { analysisText, dateRangeStart, dateRangeEnd, campaignCount } = req.body;

    if (!analysisText || !dateRangeStart || !dateRangeEnd) {
      return res.status(400).json({ 
        error: 'Missing required fields: analysisText, dateRangeStart, dateRangeEnd' 
      });
    }

    // Insert the analysis into the database
    const result = await sql`
      INSERT INTO ai_campaign_analyses (
        user_email,
        analysis_text,
        date_range_start,
        date_range_end,
        campaign_count
      )
      VALUES (
        ${userEmail},
        ${analysisText},
        ${dateRangeStart},
        ${dateRangeEnd},
        ${campaignCount || 0}
      )
      RETURNING id, created_at
    `;

    res.status(200).json({
      success: true,
      analysisId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      message: 'AI campaign analysis saved successfully'
    });

  } catch (error) {
    console.error('Error saving AI campaign analysis:', error);
    res.status(500).json({ 
      error: 'Failed to save AI campaign analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

