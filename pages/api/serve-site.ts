import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const hostname = req.headers.host || '';
    const path = req.url || '/';
    
    console.log('Request details:', {
      path,
      hostname,
      method: req.method
    });

    // Only serve HTML for the root path
    if (path !== '/' && path !== '/index' && path !== '/index.html') {
      console.log('Non-root path requested, skipping:', path);
      return res.status(404).send('Not found');
    }

    const subdomain = hostname.split('.')[0];
    console.log('Serving content for subdomain:', subdomain);

    const result = await sql`
      SELECT html 
      FROM sites 
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

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