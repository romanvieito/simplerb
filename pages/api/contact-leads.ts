import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { getAuth } from '@clerk/nextjs/server';

// Disable Next.js default body parsing so we can safely handle form posts
export const config = {
  api: {
    bodyParser: false,
  },
};

const ensureTable = async () => {
  await sql`
    CREATE TABLE IF NOT EXISTS site_leads (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      subdomain TEXT NOT NULL,
      name TEXT,
      email TEXT,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_site_leads_user_id ON site_leads(user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_site_leads_subdomain ON site_leads(subdomain);`;
};

const getSubdomainFromHost = (host?: string | null) => {
  if (!host) return null;
  // Strip port if present
  const cleanHost = host.split(':')[0];
  const parts = cleanHost.split('.');
  if (parts.length < 3) return null; // e.g., localhost or bare domain
  return parts[0];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const rawBody = await new Promise<string>((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
          data += chunk;
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });

      let parsed: Record<string, string | undefined> = {};
      const contentType = req.headers['content-type'] || '';
      try {
        if (contentType.includes('application/json')) {
          parsed = JSON.parse(rawBody || '{}');
        } else {
          const params = new URLSearchParams(rawBody);
          params.forEach((value, key) => {
            parsed[key] = value;
          });
        }
      } catch (parseErr) {
        console.error('Failed to parse contact body', parseErr);
        return res.status(400).json({ success: false, message: 'Invalid request body' });
      }

      const { name, email, message, subdomain } = parsed;

      const hostSubdomain = getSubdomainFromHost(req.headers.host);
      const targetSubdomain = (subdomain || hostSubdomain || '').trim().toLowerCase();

      if (!targetSubdomain) {
        return res.status(400).json({ success: false, message: 'Missing subdomain' });
      }

      if (!message || message.trim().length < 5) {
        return res.status(400).json({ success: false, message: 'Message is too short' });
      }

      await ensureTable();

      // Try to find owner of the site
      const siteResult = await sql`
        SELECT user_id FROM sites WHERE subdomain = ${targetSubdomain} LIMIT 1
      `;
      const ownerId = siteResult.rows[0]?.user_id ?? null;

      const insertResult = await sql`
        INSERT INTO site_leads (user_id, subdomain, name, email, message)
        VALUES (${ownerId}, ${targetSubdomain}, ${name || null}, ${email || null}, ${message.trim()})
        RETURNING id, created_at
      `;

      return res.status(200).json({
        success: true,
        lead: {
          id: insertResult.rows[0].id,
          created_at: insertResult.rows[0].created_at,
        },
      });
    } catch (error) {
      console.error('Error saving lead:', error);
      return res.status(500).json({ success: false, message: 'Error saving lead' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { userId } = getAuth(req);
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      await ensureTable();

      const leads = await sql`
        SELECT id, subdomain, name, email, message, created_at
        FROM site_leads
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 100
      `;

      return res.status(200).json({ success: true, leads: leads.rows });
    } catch (error) {
      console.error('Error fetching leads:', error);
      return res.status(500).json({ success: false, message: 'Error fetching leads' });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

