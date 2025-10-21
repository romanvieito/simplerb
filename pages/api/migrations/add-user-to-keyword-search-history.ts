import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // First, create the keyword_search_history table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS keyword_search_history (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        user_prompt TEXT NOT NULL,
        country_code VARCHAR(10) NOT NULL,
        language_code VARCHAR(10) NOT NULL,
        generated_keywords JSONB NOT NULL,
        keyword_count INTEGER NOT NULL,
        search_timestamp TIMESTAMP DEFAULT NOW()
      )
    `;

    // Check if user_id column exists, if not add it
    const columnCheck = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'keyword_search_history' AND column_name = 'user_id'
    `;

    if (columnCheck.rows.length === 0) {
      // Add user_id column if it doesn't exist
      await sql`
        ALTER TABLE keyword_search_history ADD COLUMN user_id VARCHAR(255) NOT NULL DEFAULT ''
      `;

      // Create index for faster user-based queries
      await sql`
        CREATE INDEX IF NOT EXISTS idx_keyword_search_history_user_id
        ON keyword_search_history (user_id, search_timestamp DESC)
      `;

      console.log('✅ Added user_id column and index to keyword_search_history table');
    } else {
      console.log('✅ user_id column already exists in keyword_search_history table');
    }

    return res.status(200).json({
      success: true,
      message: 'Keyword search history table updated with user tracking'
    });
  } catch (error) {
    console.error('Error updating keyword search history table:', error);
    return res.status(500).json({
      error: 'Failed to update keyword search history table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
