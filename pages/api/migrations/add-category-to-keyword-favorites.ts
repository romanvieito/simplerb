import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sql`ALTER TABLE keyword_favorites ADD COLUMN IF NOT EXISTS category VARCHAR(100);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_keyword_favorites_user_category ON keyword_favorites (user_id, category);`;

    return res.status(200).json({
      success: true,
      message: 'Category column ensured on keyword_favorites'
    });
  } catch (error) {
    console.error('Error ensuring category column:', error);
    return res.status(500).json({
      error: 'Failed to ensure category column',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

