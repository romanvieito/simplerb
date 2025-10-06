import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { description, image } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: 'Description is required' });
      }
      
      // Save the ad description and image to the database
      const result = await sql`
        INSERT INTO ad_info (description, image, status, created_at)
        VALUES (${description}, ${image || null}, 'pending', NOW())
        RETURNING id;
      `;
      
      console.log('Saved ad information to database:', result.rows[0].id);
      
      res.status(200).json({ 
        message: 'Ad information saved successfully. SimplerB will generate your ad and save it to your account...',
        adId: result.rows[0].id
      });
    } catch (error) {
      console.error('Error processing ad information:', error);
      res.status(500).json({ error: 'Failed to process ad information' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}