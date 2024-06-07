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

    const email = Array.isArray(request.query.email) ? request.query.email[0] : request.query.email;

    const { substplan, subscancel } = request.body;

    if (!email) throw new Error('email required');
    if (substplan === undefined) throw new Error('Subscription required');

    await sql`UPDATE users SET subs_tplan = ${substplan}, subs_cancel = ${subscancel} WHERE email = ${email}`;

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
