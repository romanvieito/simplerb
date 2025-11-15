import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add favorite column to sites table
    await sql`
      ALTER TABLE sites
      ADD COLUMN IF NOT EXISTS favorite BOOLEAN DEFAULT false
    `;

    // Create index for faster queries on favorite sites
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sites_favorite
      ON sites (user_id, favorite, created_at DESC)
    `;

    return res.status(200).json({
      success: true,
      message: 'Favorite column added to sites table successfully'
    });
  } catch (error) {
    console.error('Error adding favorite column to sites table:', error);
    return res.status(500).json({
      error: 'Failed to add favorite column to sites table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
