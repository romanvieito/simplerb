import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

interface CampaignDraft {
  id?: string;
  userId: string;
  campaignData: {
    type: 'SEARCH' | 'PMAX';
    brand: string;
    url: string;
    keywords: string[];
    locations: string[];
    languages: string[];
    budgetDaily: number;
    campaignNameSuffix: string;
  };
  generatedCopy: {
    headlines: string[];
    descriptions: string[];
    longHeadlines?: string[];
  };
  status: 'draft' | 'ready' | 'exported';
  name: string;
  industry?: string;
}

interface SaveDraftRequest {
  campaignData: CampaignDraft['campaignData'];
  generatedCopy: CampaignDraft['generatedCopy'];
  name: string;
  industry?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    const { campaignData, generatedCopy, name, industry }: SaveDraftRequest = req.body;

    // Validate required fields
    if (!campaignData || !generatedCopy || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user ID from email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `;
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;

    // Save campaign draft
    const result = await sql`
      INSERT INTO campaign_drafts (
        user_id,
        name,
        industry,
        campaign_data,
        generated_copy,
        status,
        created_at,
        updated_at
      ) VALUES (
        ${userId},
        ${name},
        ${industry || null},
        ${JSON.stringify(campaignData)},
        ${JSON.stringify(generatedCopy)},
        'draft',
        NOW(),
        NOW()
      )
      RETURNING id, created_at
    `;

    const draftId = result.rows[0].id;
    const createdAt = result.rows[0].created_at;

    res.status(200).json({
      success: true,
      draftId,
      message: 'Campaign draft saved successfully',
      createdAt
    });

  } catch (error) {
    console.error('Error saving campaign draft:', error);
    res.status(500).json({ 
      error: 'Failed to save campaign draft',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
