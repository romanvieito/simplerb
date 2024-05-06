
import { sql } from '@vercel/postgres';
import { NextApiResponse, NextApiRequest } from 'next';
 
export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  var user = null;
  try {
    const email = request.query.email as string;
    if (!email) throw new Error('Email required');
    user = await sql`SELECT * FROM users WHERE email=${email}`;
  } catch (error) {
    return response.status(500).json({ error });
  }
  return response.status(200).json({ user });
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