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

    const { siteId, favorite } = req.body;

    // Validate required fields
    if (!siteId || typeof favorite !== 'boolean') {
      return res.status(400).json({ message: 'Missing required fields: siteId and favorite' });
    }

    // Update the site's favorite status
    const result = await sql`
      UPDATE sites
      SET favorite = ${favorite}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${siteId} AND user_id = ${userId}
      RETURNING id, subdomain, favorite
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found or not authorized' });
    }

    return res.status(200).json({
      success: true,
      site: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling site favorite:', error);
    return res.status(500).json({
      message: 'Error toggling site favorite',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
