import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

/**
 * Migration: add per-user columns to oauth_tokens for Google Ads
 * - user_id: Clerk user id
 * - user_email: email for easier joins/debugging
 * - customer_id: Google Ads customer id for the user
 * Adds a partial unique index on (service, user_id) when user_id is present.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sql`ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS user_id VARCHAR(128)`;
    await sql`ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS user_email TEXT`;
    await sql`ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS customer_id TEXT`;

    // Index for faster lookups by user
    await sql`
      CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user
      ON oauth_tokens (user_id)
      WHERE user_id IS NOT NULL
    `;

    // Partial unique index to avoid duplicate rows per user/service
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_tokens_service_user
      ON oauth_tokens (service, user_id)
      WHERE user_id IS NOT NULL
    `;

    return res.status(200).json({ success: true, message: 'OAuth tokens table updated for per-user storage' });
  } catch (error) {
    console.error('Error updating oauth_tokens table:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

