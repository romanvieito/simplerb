import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create keyword_favorites table
    await sql`
      CREATE TABLE IF NOT EXISTS keyword_favorites (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        keyword VARCHAR(500) NOT NULL,
        country_code VARCHAR(10),
        language_code VARCHAR(10),
        search_volume INTEGER,
        competition VARCHAR(20),
        competition_index INTEGER,
        avg_cpc_micros BIGINT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create unique constraint to prevent duplicate favorites
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_keyword_favorites_unique
      ON keyword_favorites (user_id, keyword)
    `;

    // Create index for faster user-based queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_favorites_user_id
      ON keyword_favorites (user_id, created_at DESC)
    `;

    return res.status(200).json({
      success: true,
      message: 'Keyword favorites table and indexes created successfully'
    });
  } catch (error) {
    console.error('Error creating keyword favorites table:', error);
    return res.status(500).json({
      error: 'Failed to create keyword favorites table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
