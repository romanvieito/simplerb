import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userEmail = req.headers['x-user-email'] as string;
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User email required' });
  }

  try {
    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `;
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;

    if (req.method === 'GET') {
      // Get user's sessions
      const sessions = await sql`
        SELECT 
          id,
          title,
          created_at,
          updated_at,
          (
            SELECT COUNT(*) 
            FROM smart_pilot_messages 
            WHERE session_id = smart_pilot_sessions.id
          ) as message_count
        FROM smart_pilot_sessions 
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
      `;

      return res.status(200).json({ sessions: sessions.rows });

    } else if (req.method === 'POST') {
      // Create new session
      const { title } = req.body;
      const sessionTitle = title || 'Untitled';

      const result = await sql`
        INSERT INTO smart_pilot_sessions (user_id, title)
        VALUES (${userId}, ${sessionTitle})
        RETURNING id, title, created_at, updated_at
      `;

      return res.status(201).json({ session: result.rows[0] });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in sessions API:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
