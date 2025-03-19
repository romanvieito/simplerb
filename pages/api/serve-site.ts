import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get the hostname and log it for debugging
    const hostname = req.headers.host || '';
    console.log('Incoming request hostname:', hostname);

    // Extract subdomain (everything before .simplerb.com)
    const subdomain = hostname.split('.')[0];
    console.log('Attempting to serve site for subdomain:', subdomain);

    // Fetch the site content
    const result = await sql`
      SELECT html 
      FROM sites 
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

    if (result.rows.length === 0) {
      console.log('No site found for subdomain:', subdomain);
      return res.status(404).send('Site not found');
    }

    // Set headers for HTML content
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate');

    // Send the HTML content
    return res.send(result.rows[0].html);
  } catch (error) {
    console.error('Error serving site:', error);
    return res.status(500).send('Error serving site');
  }
} 