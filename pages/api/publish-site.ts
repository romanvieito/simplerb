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
    // Get the user ID from the authorization header
    const userId = req.headers.authorization?.split(' ')[1];
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { html, subdomain, description, originalSubdomain } = req.body;

    // Validate required fields
    if (!html || !subdomain) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain) || subdomain.length < 3 || subdomain.length > 50) {
      return res.status(400).json({ message: 'Invalid subdomain format' });
    }

    let result;

    // If subdomain is being changed, handle it differently
    if (originalSubdomain && originalSubdomain !== subdomain) {
      // Check if new subdomain is already taken
      const existingSite = await sql`
        SELECT id FROM sites WHERE subdomain = ${subdomain}
      `;

      if (existingSite.rows.length > 0) {
        return res.status(409).json({ message: 'Subdomain already taken' });
      }

      // Update the existing site with new subdomain
      result = await sql`
        UPDATE sites 
        SET subdomain = ${subdomain}, html = ${html}, description = ${description}, updated_at = CURRENT_TIMESTAMP
        WHERE subdomain = ${originalSubdomain} AND user_id = ${userId}
        RETURNING id, subdomain, created_at;
      `;

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Original site not found or not authorized' });
      }
    } else {
      // Use upsert (INSERT ... ON CONFLICT DO UPDATE)
      result = await sql`
        INSERT INTO sites (user_id, subdomain, html, description)
        VALUES (${userId}, ${subdomain}, ${html}, ${description})
        ON CONFLICT (subdomain) 
        DO UPDATE SET 
          html = EXCLUDED.html,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id, subdomain, created_at;
      `;
    }


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