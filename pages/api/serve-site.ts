import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get subdomain from query parameter
    const { subdomain } = req.query;
    
    console.log('Serving site for subdomain:', subdomain);

    if (!subdomain) {
      console.log('No subdomain provided');
      return res.status(400).send('Subdomain is required');
    }

    const result = await sql`
      SELECT html 
      FROM sites 
      WHERE subdomain = ${subdomain as string}
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

    console.log('Query result:', {
      found: result.rows.length > 0,
      subdomain
    });

    if (result.rows.length === 0) {
      return res.status(404).send('Site not found');
    }

    // Set headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    // Send the HTML content
    return res.send(result.rows[0].html);
  } catch (error) {
    console.error('Error in serve-site:', error);
    return res.status(500).send('Error serving site');
  }
} 