import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create smart_pilot_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS smart_pilot_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create smart_pilot_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS smart_pilot_messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES smart_pilot_sessions(id) ON DELETE CASCADE,
        role VARCHAR(16) NOT NULL CHECK (role IN ('user','assistant','system')),
        content TEXT NOT NULL,
        model VARCHAR(64),
        tokens INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create smart_pilot_ideas table
    await sql`
      CREATE TABLE IF NOT EXISTS smart_pilot_ideas (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES smart_pilot_sessions(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes for smart_pilot_sessions
    await sql`
      CREATE INDEX IF NOT EXISTS idx_smart_pilot_sessions_user_id ON smart_pilot_sessions(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_smart_pilot_sessions_updated_at ON smart_pilot_sessions(updated_at DESC)
    `;

    // Create indexes for smart_pilot_messages
    await sql`
      CREATE INDEX IF NOT EXISTS idx_smart_pilot_messages_session_id ON smart_pilot_messages(session_id, created_at)
    `;

    // Create indexes for smart_pilot_ideas
    await sql`
      CREATE INDEX IF NOT EXISTS idx_smart_pilot_ideas_session_id ON smart_pilot_ideas(session_id, created_at)
    `;

    // Create trigger function if it doesn't exist
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    // Create trigger for smart_pilot_sessions
    await sql`
      DROP TRIGGER IF EXISTS update_smart_pilot_sessions_updated_at ON smart_pilot_sessions
    `;
    
    await sql`
      CREATE TRIGGER update_smart_pilot_sessions_updated_at 
          BEFORE UPDATE ON smart_pilot_sessions 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `;

    res.status(200).json({
      success: true,
      message: 'Smart Pilot tables created successfully'
    });

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      error: 'Failed to create Smart Pilot tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
