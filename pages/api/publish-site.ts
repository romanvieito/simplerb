import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Starting publish request...');

    const auth = getAuth(req);
    console.log('Auth result:', { userId: auth.userId });

    const { userId } = auth;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { html, subdomain, description } = req.body;
    console.log('Received data:', { 
      hasHtml: !!html, 
      subdomain, 
      descriptionLength: description?.length 
    });

    // Validate required fields
    if (!html || !subdomain) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
      // Use upsert (INSERT ... ON CONFLICT DO UPDATE)
      console.log('Inserting new site...');
      const result = await sql`
        INSERT INTO sites (user_id, subdomain, html, description)
        VALUES (${userId}, ${subdomain}, ${html}, ${description})
        ON CONFLICT (subdomain) 
        DO UPDATE SET 
          html = EXCLUDED.html,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, subdomain, created_at;
      `;

      return res.status(200).json({ 
        success: true, 
        site: result.rows[0]
      });
    } catch (error) {
      console.error('Error publishing site:', error);
      return res.status(500).json({ 
        message: 'Error publishing site',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error publishing site:', error);
    return res.status(500).json({ 
      message: 'Error publishing site',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 