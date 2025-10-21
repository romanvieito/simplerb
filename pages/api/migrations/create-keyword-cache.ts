import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create keyword_cache table
    await sql`
      CREATE TABLE IF NOT EXISTS keyword_cache (
        id SERIAL PRIMARY KEY,
        keyword VARCHAR(500) NOT NULL,
        country_code VARCHAR(10) NOT NULL,
        language_code VARCHAR(10) NOT NULL,
        search_volume INTEGER,
        competition VARCHAR(20),
        competition_index INTEGER,
        low_top_page_bid_micros BIGINT,
        high_top_page_bid_micros BIGINT,
        avg_cpc_micros BIGINT,
        monthly_search_volumes JSONB,
        data_source VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      )
    `;

    // Create composite index for fast lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_cache_lookup 
      ON keyword_cache (keyword, country_code, language_code, expires_at)
    `;

    // Create index for cleanup of expired entries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_keyword_cache_expires_at 
      ON keyword_cache (expires_at)
    `;

    // Create unique constraint to prevent duplicate entries for the same keyword+country+language
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_keyword_cache_unique 
      ON keyword_cache (keyword, country_code, language_code)
    `;

    return res.status(200).json({ 
      success: true, 
      message: 'Keyword cache table and indexes created successfully' 
    });
  } catch (error) {
    console.error('Error creating keyword cache table:', error);
    return res.status(500).json({ 
      error: 'Failed to create keyword cache table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
