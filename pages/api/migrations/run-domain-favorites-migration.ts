import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Drop table if it exists with wrong schema
    await sql`DROP TABLE IF EXISTS users_domain_favorite;`;

    // Create users_domain_favorite table
    await sql`
      CREATE TABLE users_domain_favorite (
        id SERIAL PRIMARY KEY,
        namedomain VARCHAR(255) NOT NULL,
        available BOOLEAN,
        favorite BOOLEAN DEFAULT false,
        rate INTEGER,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(namedomain, user_id)
      );
    `;

    // Create index for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_domain_favorite_user_id
      ON users_domain_favorite(user_id);
    `;

    res.status(200).json({
      success: true,
      message: 'Domain favorites table created successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      error: 'Failed to create domain favorites table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}