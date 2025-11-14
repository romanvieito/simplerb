import { sql } from '@vercel/postgres';

export default async function handler() {
  try {
    // Create users_domain_favorite table
    await sql`
      CREATE TABLE IF NOT EXISTS users_domain_favorite (
        id SERIAL PRIMARY KEY,
        namedomain VARCHAR(255) NOT NULL,
        available BOOLEAN,
        favorite BOOLEAN DEFAULT false,
        rate INTEGER,
        users_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(namedomain, users_id)
      );
    `;

    // Create index for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_domain_favorite_users_id
      ON users_domain_favorite(users_id);
    `;

    console.log('Domain favorites table created successfully');
  } catch (error) {
    console.error('Error creating domain favorites table:', error);
    throw error;
  }
}
