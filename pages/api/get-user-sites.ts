import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('get-user-sites API called');
  console.log('Headers:', req.headers);
  console.log('Method:', req.method);

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the user ID from the authorization header
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);
    const userId = authHeader?.split(' ')[1];
    console.log('Extracted userId:', userId);

    if (!userId) {
      console.log('No userId found, returning 401');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // First, let's check if there are ANY sites in the database
    const allSitesResult = await sql`
      SELECT COUNT(*) as total_sites FROM sites
    `;
    console.log('Total sites in database:', allSitesResult.rows[0].total_sites);

    // Fetch all sites for the user
    console.log('Querying database for user:', userId);
    const result = await sql`
      SELECT
        id,
        subdomain,
        description,
        created_at,
        updated_at
      FROM sites
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    console.log('Database query result:', result);
    console.log('Number of rows returned:', result.rows.length);

    // Also show all sites for debugging
    const allUserSites = await sql`
      SELECT user_id, subdomain, description FROM sites ORDER BY created_at DESC LIMIT 10
    `;
    console.log('Recent sites in database:', allUserSites.rows);

    // Add the full URL to each site (screenshots will be null until database is updated)
    const sitesWithUrls = result.rows.map(site => ({
      ...site,
      url: `https://${site.subdomain}.simplerb.com`,
      screenshot: null // Will be populated once screenshot column is added to database
    }));

    console.log('Sites with URLs:', sitesWithUrls);

    return res.status(200).json({
      success: true,
      sites: sitesWithUrls
    });
  } catch (error) {
    console.error('Error fetching user sites:', error);
    return res.status(500).json({ 
      message: 'Error fetching sites',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
