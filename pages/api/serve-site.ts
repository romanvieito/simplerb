import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Debug: Log all request headers
    console.log('Request headers:', req.headers);
    
    // Get the hostname from the request
    const hostname = req.headers.host || '';
    console.log('Incoming request hostname:', hostname);

    // Extract subdomain
    const subdomain = hostname.split('.')[0];
    console.log('Attempting to serve site for subdomain:', subdomain);

    if (!subdomain) {
      console.log('No subdomain found in request');
      return res.status(404).send('Site not found - No subdomain');
    }

    // Debug: Log the SQL query we're about to execute
    console.log('Querying database for subdomain:', subdomain);

    const result = await sql`
      SELECT html, updated_at 
      FROM sites 
      WHERE subdomain = ${subdomain}
      ORDER BY created_at DESC 
      LIMIT 1;
    `;

    console.log('Query result count:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('No site found in database for subdomain:', subdomain);
      return res.status(404).send('Site not found - No content');
    }

    // Debug: Log that we found the site
    console.log('Found site, last updated:', result.rows[0].updated_at);

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');

    // Send the HTML content
    return res.send(result.rows[0].html);
  } catch (error) {
    console.error('Detailed error in serve-site:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return res.status(500).send('Error serving site');
  }
} 