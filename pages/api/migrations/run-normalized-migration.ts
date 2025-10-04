import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create campaign_keywords table
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_keywords (
        id SERIAL PRIMARY KEY,
        analysis_id INTEGER NOT NULL REFERENCES campaign_analyses(id) ON DELETE CASCADE,
        campaign_name VARCHAR(255) NOT NULL,
        ad_group_name VARCHAR(255),
        keyword TEXT NOT NULL,
        match_type VARCHAR(50),
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        cost DECIMAL(10,2) DEFAULT 0.00,
        ctr DECIMAL(5,4) DEFAULT 0.0000,
        quality_score VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create campaign_ads table
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_ads (
        id SERIAL PRIMARY KEY,
        analysis_id INTEGER NOT NULL REFERENCES campaign_analyses(id) ON DELETE CASCADE,
        campaign_name VARCHAR(255) NOT NULL,
        ad_group_name VARCHAR(255),
        ad_text TEXT NOT NULL,
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        cost DECIMAL(10,2) DEFAULT 0.00,
        ctr DECIMAL(5,4) DEFAULT 0.0000,
        ad_strength VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create campaign_geography table
    await sql`
      CREATE TABLE IF NOT EXISTS campaign_geography (
        id SERIAL PRIMARY KEY,
        analysis_id INTEGER NOT NULL REFERENCES campaign_analyses(id) ON DELETE CASCADE,
        campaign_name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        clicks INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        cost DECIMAL(10,2) DEFAULT 0.00,
        ctr DECIMAL(5,4) DEFAULT 0.0000,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes for campaign_keywords
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_keywords_analysis_id ON campaign_keywords(analysis_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_keywords_campaign_name ON campaign_keywords(campaign_name)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_keywords_keyword ON campaign_keywords(keyword)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_keywords_quality_score ON campaign_keywords(quality_score)
    `;

    // Create indexes for campaign_ads
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_ads_analysis_id ON campaign_ads(analysis_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_ads_campaign_name ON campaign_ads(campaign_name)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_ads_ad_group_name ON campaign_ads(ad_group_name)
    `;

    // Create indexes for campaign_geography
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_geography_analysis_id ON campaign_geography(analysis_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_geography_campaign_name ON campaign_geography(campaign_name)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_campaign_geography_location ON campaign_geography(location)
    `;

    res.status(200).json({
      success: true,
      message: 'Normalized campaign tables created successfully'
    });

  } catch (error) {
    console.error('Normalized migration error:', error);
    res.status(500).json({ 
      error: 'Failed to create normalized campaign tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
