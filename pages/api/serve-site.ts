import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const hostname = req.headers.host || '';
    console.log('Serving site for hostname:', hostname);

    // Only handle subdomain requests
    if (hostname === 'simplerb.com' || hostname === 'www.simplerb.com') {
      return res.status(404).send('Not found');
    }

    // Extract subdomain
    const subdomain = hostname.split('.')[0];
    console.log('Looking up site for subdomain:', subdomain);

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

    // Set headers to prevent caching of the main site
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'host');

    // Send the generated site HTML
    return res.send(result.rows[0].html);
  } catch (error) {
    console.error('Error serving site:', error);
    return res.status(500).send('Error serving site');
  }
} 