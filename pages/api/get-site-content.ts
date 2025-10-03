import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user ID from the authorization header
    const userId = req.headers.authorization?.split(' ')[1];
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { subdomain } = req.query;

    if (!subdomain || typeof subdomain !== 'string') {
      return res.status(400).json({ message: 'Subdomain is required' });
    }

    // Fetch the site content (only if it belongs to the user)
    const result = await sql`
      SELECT html, description
      FROM sites 
      WHERE subdomain = ${subdomain} AND user_id = ${userId}
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Site not found or not authorized' });
    }

    return res.status(200).json({ 
      success: true, 
      html: result.rows[0].html,
      description: result.rows[0].description
    });
  } catch (error) {
    console.error('Error fetching site content:', error);
    return res.status(500).json({ 
      message: 'Error fetching site content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
