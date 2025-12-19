import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

/**
 * Migration: fix oauth_tokens constraints to support BOTH:
 * - service-level row(s) where user_id IS NULL
 * - per-user rows keyed by (service, user_id)
 *
 * Older schema used UNIQUE(service), which breaks per-user inserts.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure columns exist (safe no-ops if already present)
    await sql`ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS user_id VARCHAR(128)`;
    await sql`ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS user_email TEXT`;
    await sql`ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS customer_id TEXT`;

    // Drop legacy UNIQUE(service) constraint if it exists (typical name from CREATE TABLE ... UNIQUE(service))
    await sql`ALTER TABLE oauth_tokens DROP CONSTRAINT IF EXISTS oauth_tokens_service_key`;

    // Create unique index for per-user tokens (allows multiple NULL user_id values, which is fine)
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_tokens_service_user_unq
      ON oauth_tokens (service, user_id)
    `;

    // Ensure only one service-level token row per service when user_id is NULL
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_tokens_service_null_user_unq
      ON oauth_tokens (service)
      WHERE user_id IS NULL
    `;

    return res.status(200).json({
      success: true,
      message: 'oauth_tokens constraints repaired successfully',
    });
  } catch (error: any) {
    console.error('Error fixing oauth_tokens constraints:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}


