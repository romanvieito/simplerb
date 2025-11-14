import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import https from 'https';

interface TokenHealthResponse {
  healthy: boolean;
  error?: string;
  details?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenHealthResponse>
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ healthy: false, error: 'Not authenticated' });
    }

    // Check if user is admin
    let isAdmin = false;
    try {
      const { sql } = await import('@vercel/postgres');
      const result = await sql`
        SELECT admin FROM users WHERE id = ${userId} LIMIT 1
      `;
      isAdmin = result.rows.length > 0 && result.rows[0].admin === true;
    } catch (error) {
      console.warn('Admin check failed:', error);
    }

    if (!isAdmin) {
      return res.status(403).json({ healthy: false, error: 'Admin access required' });
    }

    const clientId = process.env.GADS_CLIENT_ID;
    const clientSecret = process.env.GADS_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(200).json({
        healthy: false,
        error: 'Missing Google Ads environment variables'
      });
    }

    // Get refresh token from database
    let refreshToken: string | null = null;
    try {
      const { sql } = await import('@vercel/postgres');
      const result = await sql`
        SELECT refresh_token FROM oauth_tokens
        WHERE service = 'google_ads'
        LIMIT 1
      `;
      refreshToken = result.rows.length > 0 ? result.rows[0].refresh_token : null;
    } catch (dbError) {
      console.warn('Failed to get token from database, falling back to env:', dbError);
      refreshToken = process.env.GADS_REFRESH_TOKEN;
    }

    if (!refreshToken) {
      return res.status(200).json({
        healthy: false,
        error: 'No Google Ads refresh token found'
      });
    }

    // Test token by attempting to get an access token
    const postData = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString();

    const result = await new Promise<any>((resolve, reject) => {
      const options = {
        hostname: 'oauth2.googleapis.com',
        port: 443,
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const request = https.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Failed to parse OAuth response'));
          }
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.write(postData);
      request.end();
    });

    if (result.access_token) {
      return res.status(200).json({ healthy: true });
    } else {
      return res.status(200).json({
        healthy: false,
        error: result.error_description || result.error || 'Token validation failed',
        details: result
      });
    }

  } catch (error) {
    console.error('Token health check error:', error);
    return res.status(500).json({
      healthy: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
