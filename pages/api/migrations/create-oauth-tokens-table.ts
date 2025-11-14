import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create oauth_tokens table to store Google Ads refresh tokens securely
    await sql`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        id SERIAL PRIMARY KEY,
        service VARCHAR(50) NOT NULL, -- 'google_ads', 'gmail', etc.
        refresh_token TEXT NOT NULL,
        access_token TEXT, -- Optional: for services that provide it
        token_expires_at TIMESTAMP, -- When access token expires
        refresh_token_expires_at TIMESTAMP, -- When refresh token expires (if applicable)
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(service) -- Only one token per service for now
      )
    `;

    // Create index for faster service lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_oauth_tokens_service
      ON oauth_tokens (service)
    `;

    // Insert initial Google Ads token if it exists in environment variables
    const refreshToken = process.env.GADS_REFRESH_TOKEN;
    if (refreshToken) {
      await sql`
        INSERT INTO oauth_tokens (service, refresh_token)
        VALUES ('google_ads', ${refreshToken})
        ON CONFLICT (service) DO UPDATE SET
          refresh_token = EXCLUDED.refresh_token,
          updated_at = NOW()
      `;
    }

    return res.status(200).json({
      success: true,
      message: 'OAuth tokens table created successfully',
      migratedExistingToken: !!refreshToken
    });
  } catch (error) {
    console.error('Error creating OAuth tokens table:', error);
    return res.status(500).json({
      error: 'Failed to create OAuth tokens table',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
