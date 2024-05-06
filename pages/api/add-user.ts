import { sql } from '@vercel/postgres';
import { NextApiResponse, NextApiRequest } from 'next';
 
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  try {
    const name = request.query.name as string;
    const email = request.query.email as string;
    if (!name || !email) throw new Error('Name and email required');
    await sql`INSERT INTO Users (name, email, created_date) VALUES (${name}, ${email}, Date.now()});`;
  } catch (error) {
    return response.status(500).json({ error });
  }
 
  const users = await sql`SELECT * FROM Users;`;
  return response.status(200).json({ users });
}