import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create ai_campaign_analyses table
    await sql`
      CREATE TABLE IF NOT EXISTS ai_campaign_analyses (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        analysis_text TEXT NOT NULL,
        date_range_start DATE NOT NULL,
        date_range_end DATE NOT NULL,
        campaign_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ai_campaign_analyses_user_email ON ai_campaign_analyses(user_email)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_ai_campaign_analyses_created_at ON ai_campaign_analyses(created_at DESC)
    `;

    // Create trigger function if it doesn't exist
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    // Create trigger if it doesn't exist
    await sql`
      DROP TRIGGER IF EXISTS update_ai_campaign_analyses_updated_at ON ai_campaign_analyses
    `;
    
    await sql`
      CREATE TRIGGER update_ai_campaign_analyses_updated_at 
          BEFORE UPDATE ON ai_campaign_analyses 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `;

    res.status(200).json({
      success: true,
      message: 'AI campaign analyses table created successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      error: 'Failed to create AI campaign analyses table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

