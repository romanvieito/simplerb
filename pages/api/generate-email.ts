import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { content, audience } = req.body;
      
      if (!content || !audience) {
        return res.status(400).json({ error: 'Content and audience are required' });
      }
      
      // Save the email campaign information to the database
      const result = await sql`
        INSERT INTO email_campaigns (content_brief, target_audience, created_at)
        VALUES (${content}, ${audience}, NOW())
        RETURNING id;
      `;
      
      console.log('Saved email campaign information to database:', result.rows[0].id);
      
      res.status(200).json({ 
        message: 'Email campaign information saved successfully. SimplerB will generate your email content and save it to your account...',
        campaignId: result.rows[0].id
      });
    } catch (error) {
      console.error('Error processing email campaign information:', error);
      res.status(500).json({ error: 'Failed to process email campaign information' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 