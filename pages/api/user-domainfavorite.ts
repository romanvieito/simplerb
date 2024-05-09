import { sql } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  let option = '';
  try {
    if (request.method !== 'PUT') {
      return response.status(405).json({ error: 'Method not allowed' });
    }

    const { namedomain, available, favorite, rate, users_id } = request.body;

    if ([namedomain, favorite, rate, users_id].some(value => value === undefined)) {
      throw new Error('Data required');
    }

    const user_domain_favorite = await sql`SELECT * FROM users_domain_favorite WHERE namedomain=${namedomain} and users_id=${users_id}`;

    if(user_domain_favorite.rows.length === 1) {
      option = 'update';
      await sql`UPDATE users_domain_favorite SET favorite = ${favorite} WHERE id = ${user_domain_favorite.rows[0].id}`;
    } else {
      option = 'insert';
      await sql`INSERT INTO users_domain_favorite (namedomain, available, favorite, rate, users_id) VALUES (${namedomain}, ${available}, ${favorite}, ${rate}, ${users_id});`;
    }

    // Ideally, you'd return the updated user data or a success message.
    return response.status(200).json({ message: `${option} successful` });

  } catch (error: unknown) {
    // Check if 'error' is an instance of 'Error' and has a 'message' property
    if (error instanceof Error) {
      console.error(`Error ${option} users_domain_favorite:`, error.message);
      return response.status(500).json({ error: error.message });
    }
  
    // If it's not an Error instance or doesn't have a 'message', handle it as a generic error
    console.error(`Error ${option} users_domain_favorite:`, error);
    return response.status(500).json({ error: 'An unexpected error occurred' });
  }
}