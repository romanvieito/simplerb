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

    const { namedomain, available, rate, user_id } = request.body;

    if ([namedomain, rate, user_id].some(value => value === undefined)) {
      throw new Error('Data required');
    }

    await sql`INSERT INTO users_domain_rating (namedomain, available, rate, user_id) VALUES (${namedomain}, ${available}, ${rate}, ${user_id});`;

    // Ideally, you'd return the updated user data or a success message.
    return response.status(200).json({ message: `${option} successful` });

  } catch (error: unknown) {
    // Check if 'error' is an instance of 'Error' and has a 'message' property
    if (error instanceof Error) {
      console.error(`Error ${option} users_domain_rating:`, error.message);
      return response.status(500).json({ error: error.message });
    }
  
    // If it's not an Error instance or doesn't have a 'message', handle it as a generic error
    console.error(`Error ${option} users_domain_rating:`, error);
    return response.status(500).json({ error: 'An unexpected error occurred' });
  }
}