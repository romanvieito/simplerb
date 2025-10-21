import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sql`
      ALTER TABLE keyword_search_history
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'google_ads_api'
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_search_history_source
      ON keyword_search_history(source)
    `;

    return res.status(200).json({
      success: true,
      message: 'keyword_search_history source column ensured'
    });
  } catch (error) {
    console.error('Error ensuring keyword_search_history source column:', error);
    return res.status(500).json({
      error: 'Failed to ensure source column',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

