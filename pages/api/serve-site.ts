import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Debug logging
    console.log('Request headers:', req.headers);
    console.log('Request host:', req.headers.host);

    const hostname = req.headers.host || '';
    
    // Skip if it's the main domain
    if (hostname === 'simplerb.com' || hostname === 'www.simplerb.com') {
      console.log('Main domain detected, skipping');
      return res.status(404).send('Not found');
    }

    // Extract subdomain
    const subdomain = hostname.split('.')[0];
    console.log('Processing subdomain:', subdomain);

    const result = await sql`
      SELECT html 
      FROM sites 
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

    console.log('Database query result:', {
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
    res.setHeader('Vary', 'host');

    // Send the HTML content
    return res.send(result.rows[0].html);
  } catch (error) {
    console.error('Detailed serve-site error:', error);
    return res.status(500).send('Error serving site');
  }
} 