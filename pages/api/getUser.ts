import { sql } from '@vercel/postgres';
import { NextApiResponse, NextApiRequest } from 'next';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get user data from database
    const result = await sql`
      SELECT * FROM users 
      WHERE email = ${email as string}
    `;

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ 
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ 
      error: 'Error fetching user data'
    });
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