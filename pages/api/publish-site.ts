import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the session header
    const sessionToken = req.headers.authorization?.split(' ')[1];
    if (!sessionToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { html, subdomain, description } = req.body;

    // Validate required fields
    if (!html || !subdomain) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Use upsert (INSERT ... ON CONFLICT DO UPDATE)
    const result = await sql`
      INSERT INTO sites (user_id, subdomain, html, description)
      VALUES (${sessionToken}, ${subdomain}, ${html}, ${description})
      ON CONFLICT (subdomain) 
      DO UPDATE SET 
        html = EXCLUDED.html,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, subdomain, created_at;
    `;

    return res.status(200).json({ 
      success: true, 
      site: result.rows[0],
      url: `https://${subdomain}.simplerb.com`
    });
  } catch (error) {
    console.error('Error publishing site:', error);
    return res.status(500).json({ 
      message: 'Error publishing site',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 