import { sql } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  try {
    if (request.method !== 'PUT') {
      return response.status(405).json({ error: 'Method not allowed' });
    }

    // const { email } = request.query;
    const email = Array.isArray(request.query.email) ? request.query.email[0] : request.query.email;

    const { credits } = request.body;

    if (!email) throw new Error('email required');
    if (credits === undefined) throw new Error('Credits required');

    // Convert id to a number or string as required by your database schema.
    // Be cautious with direct string interpolation to prevent SQL injection.
    // It's important to validate and sanitize `id` and `credits`.
    await sql`UPDATE users SET credits = ${credits} WHERE email = ${email}`;

    // Ideally, you'd return the updated user data or a success message.
    return response.status(200).json({ message: 'Update successful' });

  } catch (error: unknown) {
    // Check if 'error' is an instance of 'Error' and has a 'message' property
    if (error instanceof Error) {
      console.error('Error updating user:', error.message);
      return response.status(500).json({ error: error.message });
    }
  
    // If it's not an Error instance or doesn't have a 'message', handle it as a generic error
    console.error('Error updating user:', error);
    return response.status(500).json({ error: 'An unexpected error occurred' });
  }
}
