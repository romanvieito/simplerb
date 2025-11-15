import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user ID from Clerk authentication
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { originalSubdomain, newSubdomain } = req.body;

    // Validate required fields
    if (!originalSubdomain || !newSubdomain) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(newSubdomain) || newSubdomain.length < 3 || newSubdomain.length > 50) {
      return res.status(400).json({ message: 'Invalid subdomain format' });
    }

    // Check if new subdomain is already taken
    const existingSite = await sql`
      SELECT id FROM sites WHERE subdomain = ${newSubdomain}
    `;

    if (existingSite.rows.length > 0) {
      return res.status(409).json({ message: 'Subdomain already taken' });
    }

    // Update the subdomain
    const result = await sql`
      UPDATE sites 
      SET subdomain = ${newSubdomain}, updated_at = CURRENT_TIMESTAMP
      WHERE subdomain = ${originalSubdomain} AND user_id = ${userId}
      RETURNING id, subdomain, created_at;
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found or not authorized' });
    }

    return res.status(200).json({ 
      success: true, 
      site: result.rows[0],
      url: `https://${newSubdomain}.simplerb.com`
    });
  } catch (error) {
    console.error('Error updating subdomain:', error);
    return res.status(500).json({ 
      message: 'Error updating subdomain',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
