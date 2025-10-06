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

    if (req.method === 'POST') {
      const { sessionId, title, content } = req.body;

      if (!sessionId || !title || !content) {
        return res.status(400).json({ error: 'Session ID, title, and content required' });
      }

      // Verify session belongs to user
      const sessionCheck = await sql`
        SELECT id FROM smart_pilot_sessions 
        WHERE id = ${sessionId} AND user_id = ${userId}
      `;

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Save idea
      const result = await sql`
        INSERT INTO smart_pilot_ideas (session_id, title, content)
        VALUES (${sessionId}, ${title}, ${content})
        RETURNING id, title, content, created_at
      `;

      return res.status(201).json({ idea: result.rows[0] });

    } else if (req.method === 'GET') {
      const { sessionId } = req.query;
      
      if (!sessionId || Array.isArray(sessionId)) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const sessionIdNum = parseInt(sessionId);

      // Verify session belongs to user
      const sessionCheck = await sql`
        SELECT id FROM smart_pilot_sessions 
        WHERE id = ${sessionIdNum} AND user_id = ${userId}
      `;

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Get ideas for session
      const ideas = await sql`
        SELECT id, title, content, created_at
        FROM smart_pilot_ideas 
        WHERE session_id = ${sessionIdNum}
        ORDER BY created_at DESC
      `;

      return res.status(200).json({ ideas: ideas.rows });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Error in ideas API:', error);
    return res.status(500).json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
