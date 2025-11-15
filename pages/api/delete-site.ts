import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user ID from Clerk authentication
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { siteId } = req.body;

    if (!siteId || typeof siteId !== 'string') {
      return res.status(400).json({ message: 'Site ID is required' });
    }

    // Delete the site (only if it belongs to the user)
    const result = await sql`
      DELETE FROM sites 
      WHERE id = ${siteId} AND user_id = ${userId}
      RETURNING subdomain
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found or not authorized' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Site deleted successfully',
      deletedSubdomain: result.rows[0].subdomain
    });
  } catch (error) {
    console.error('Error deleting site:', error);
    return res.status(500).json({ 
      message: 'Error deleting site',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
