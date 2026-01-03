import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';

interface CustomerIdResponse {
  customerId?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CustomerIdResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get customer ID from oauth_tokens table
    const { sql } = await import('@vercel/postgres');

    const result = await sql`
      SELECT customer_id
      FROM oauth_tokens
      WHERE service = 'google_ads' AND user_id = ${userId}
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    if (result.rows.length > 0 && result.rows[0].customer_id) {
      return res.status(200).json({
        customerId: result.rows[0].customer_id
      });
    }

    // No customer ID found
    return res.status(200).json({});

  } catch (error) {
    console.error('Error fetching Google Ads customer ID:', error);
    return res.status(500).json({
      error: 'Failed to fetch customer ID'
    });
  }
}
