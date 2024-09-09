import type { NextApiRequest, NextApiResponse } from 'next'
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { description, image } = req.body;
      
      if (!description) {
        return res.status(400).json({ error: 'Description is required' });
      }
      
      // Save the description and image to the database
      const result = await sql`
        INSERT INTO website_info (description, image)
        VALUES (${description}, ${image || null})
        RETURNING id;
      `;
      
      console.log('Saved information to database:', result.rows[0].id);
      
      res.status(200).json({ message: 'Information saved successfully. Please wait while we generate your website.' });
    } catch (error) {
      console.error('Error processing information:', error);
      res.status(500).json({ error: 'Failed to process information' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}