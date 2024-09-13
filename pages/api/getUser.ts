import { sql } from '@vercel/postgres';
import { NextApiResponse, NextApiRequest } from 'next';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const email = request.query.email as string;
    if (!email) {
      return response.status(400).json({ error: 'Email parameter is required' });
    }

    const result = await sql`SELECT * FROM users WHERE email=${email}`;

    if (result.rowCount === 0) {
      return response.status(404).json({ error: 'User not found' });
    }

    return response.status(200).json({ user: result.rows[0] });
  } catch (error: unknown) {
    console.error('Error in getUser API:', error);
    if (error instanceof Error) {
      return response.status(500).json({ error: 'Internal Server Error', details: error.message });
    } else {
      return response.status(500).json({ error: 'Internal Server Error', details: 'An unknown error occurred' });
    }
  }
}

// export default async function setCreditsUserById(req, res) {
//   if (req.method === 'PUT') {
//     const { id, updatedData } = req.body;
//     try {
//       const result = await pool.query('UPDATE Users SET credits = $1 WHERE id = $2 RETURNING *', [updatedData.credits, id]);
//       res.status(200).json(result.rows[0]);
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   }
// }