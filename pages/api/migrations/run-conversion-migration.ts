import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Add conversion columns to campaign_keywords table
    await sql`
      ALTER TABLE campaign_keywords 
      ADD COLUMN IF NOT EXISTS conversions DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
      ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2) DEFAULT 0.00
    `;

    // Add conversion columns to campaign_ads table
    await sql`
      ALTER TABLE campaign_ads 
      ADD COLUMN IF NOT EXISTS conversions DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
      ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2) DEFAULT 0.00
    `;

    // Add conversion columns to campaign_geography table
    await sql`
      ALTER TABLE campaign_geography 
      ADD COLUMN IF NOT EXISTS conversions DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS cost_per_conversion DECIMAL(10,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
      ADD COLUMN IF NOT EXISTS conversion_value DECIMAL(10,2) DEFAULT 0.00
    `;

    res.status(200).json({
      success: true,
      message: 'Conversion tracking columns added successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      error: 'Failed to add conversion tracking columns',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
