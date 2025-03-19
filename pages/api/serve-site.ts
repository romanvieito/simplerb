import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const hostname = req.headers.host || '';
    console.log('1. Incoming request:', {
      path: req.url,
      hostname,
      method: req.method
    });

    // Skip static assets
    if (req.url?.includes('.')) {
      console.log('2. Static asset request, passing through');
      return res.status(404).send('Not found');
    }

    // Extract subdomain
    const subdomain = hostname.split('.')[0];
    console.log('3. Processing subdomain:', subdomain);

    const result = await sql`
      SELECT html 
      FROM sites 
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

    console.log('4. Database result:', {
      found: result.rows.length > 0,
      contentLength: result.rows[0]?.html?.length || 0
    });

    if (result.rows.length === 0) {
      return res.status(404).send('Site not found');
    }

    // Set headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');

    // Log the first 100 characters of content
    console.log('5. Sending content preview:', result.rows[0].html.substring(0, 100));

    // Send the HTML content
    return res.send(result.rows[0].html);
  } catch (error) {
    console.error('Error in serve-site:', error);
    return res.status(500).send('Error serving site');
  }
} 