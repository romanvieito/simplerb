import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

interface CampaignDraft {
  id: string;
  name: string;
  industry?: string;
  campaignData: {
    type: 'SEARCH' | 'PMAX';
    brand: string;
    url: string;
    keywords: string[];
    budgetDaily: number;
  };
  generatedCopy: {
    headlines: string[];
    descriptions: string[];
  };
  status: 'draft' | 'ready' | 'exported';
  createdAt: string;
  updatedAt: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    // Get user ID from email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `;
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;

    // Get user's campaign drafts
    const result = await sql`
      SELECT 
        id,
        name,
        industry,
        campaign_data,
        generated_copy,
        status,
        created_at,
        updated_at
      FROM campaign_drafts 
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;

    const drafts: CampaignDraft[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      industry: row.industry,
      campaignData: row.campaign_data,
      generatedCopy: row.generated_copy,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.status(200).json({
      success: true,
      drafts,
      count: drafts.length
    });

  } catch (error) {
    console.error('Error fetching campaign drafts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch campaign drafts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
