import { sql } from '@vercel/postgres';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  let option = '';
  try {
    // Get user_id from request body for all methods
    const { user_id } = request.body;
    if (!user_id) {
      return response.status(400).json({ error: 'user_id is required' });
    }

    const internalUserId = user_id;

    if (request.method === 'GET' || request.method === 'POST') {
      // Get all favorite domains for the user
      try {
        const favorites = await sql`
          SELECT
            namedomain,
            available,
            favorite,
            rate,
            created_at
          FROM users_domain_favorite
          WHERE user_id = ${internalUserId} AND favorite = true
          ORDER BY created_at DESC
        `;

        return response.status(200).json({
          success: true,
          favorites: favorites.rows
        });
      } catch (error: any) {
        // If table doesn't exist, return empty array
        if (error.message && error.message.includes('does not exist')) {
          return response.status(200).json({
            success: true,
            favorites: []
          });
        }
        throw error;
      }
    }

    if (request.method === 'DELETE') {
      const { namedomain } = request.body;

      if (!namedomain || typeof namedomain !== 'string') {
        throw new Error('Domain name is required');
      }

      try {
        await sql`
          DELETE FROM users_domain_favorite
          WHERE user_id = ${internalUserId} AND namedomain = ${namedomain.trim()}
        `;

        return response.status(200).json({
          success: true,
          message: 'Favorite removed successfully'
        });
      } catch (error: any) {
        // If table doesn't exist, return success anyway
        if (error.message && error.message.includes('does not exist')) {
          return response.status(200).json({
            success: true,
            message: 'Favorite removed successfully'
          });
        }
        throw error;
      }
    }

    if (request.method === 'PUT') {
      const { namedomain, available, favorite, rate } = request.body;

      if ([namedomain, favorite, rate].some(value => value === undefined)) {
        throw new Error('Data required');
      }

      const user_domain_favorite = await sql`SELECT * FROM users_domain_favorite WHERE namedomain=${namedomain} and user_id=${internalUserId}`;

      if(user_domain_favorite.rows.length === 1) {
        option = 'update';
        await sql`UPDATE users_domain_favorite SET favorite = ${favorite} WHERE id = ${user_domain_favorite.rows[0].id}`;
      } else {
        option = 'insert';
        await sql`INSERT INTO users_domain_favorite (namedomain, available, favorite, rate, user_id) VALUES (${namedomain}, ${available}, ${favorite}, ${rate}, ${internalUserId});`;
      }

      // Ideally, you'd return the updated user data or a success message.
      return response.status(200).json({ message: `${option} successful` });
    }

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