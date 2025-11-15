import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const hostname = req.headers.host || '';
  const url = req.url;

  console.log('Subdomain handler called:', { hostname, url });

  // Check if this is a subdomain request
  const isSubdomain = hostname.includes('.simplerb.com') && !hostname.startsWith('www.') && hostname !== 'simplerb.com';

  console.log('Is subdomain:', isSubdomain, { hostname });

  // If not a subdomain, return 404 (middleware should handle routing)
  if (!isSubdomain) {
    console.log('Not a subdomain, returning 404');
    return res.status(404).json({ error: 'Not found' });
  }

  // Extract subdomain
  const subdomain = hostname.split('.')[0];

  console.log('Extracted subdomain:', subdomain);

  try {
    console.log('Querying database for subdomain:', subdomain);
    const result = await sql`
      SELECT html FROM sites
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    console.log('Database query result:', { rowCount: result.rows.length });

    if (result.rows.length === 0) {
      console.log('Site not found for subdomain:', subdomain);
      return res.status(404).send('Site not found');
    }

    console.log('Site found, serving HTML content');
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(result.rows[0].html);
  } catch (error) {
    console.error('Error serving subdomain site:', error);
    return res.status(500).send('Error serving site');
  }
}
