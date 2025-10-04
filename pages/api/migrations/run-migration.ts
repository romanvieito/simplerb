import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create campaign_drafts table
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_drafts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        campaign_data JSONB NOT NULL,
        generated_copy JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'exported')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes for better query performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_drafts_user_id ON campaign_drafts(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_drafts_status ON campaign_drafts(status)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_drafts_updated_at ON campaign_drafts(updated_at DESC)
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
      DROP TRIGGER IF EXISTS update_campaign_drafts_updated_at ON campaign_drafts
    `;
    
    await sql`
      CREATE TRIGGER update_campaign_drafts_updated_at 
          BEFORE UPDATE ON campaign_drafts 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `;

    res.status(200).json({
      success: true,
      message: 'Campaign drafts table created successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      error: 'Failed to create campaign drafts table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
