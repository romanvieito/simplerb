import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth, clerkClient } from '@clerk/nextjs/server';

interface CheckAdminResponse {
  isAdmin: boolean;
  userId?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckAdminResponse>
) {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ isAdmin: false });
    }

    // Get user details from Clerk to get email
    let userEmail = null;
    try {
      const user = await clerkClient.users.getUser(userId);
      userEmail = user.emailAddresses[0]?.emailAddress;
    } catch (error) {
      console.warn('Failed to get user from Clerk:', error);
    }

    // Check if user is admin in database
    let isAdmin = false;
    try {
      const { sql } = await import('@vercel/postgres');

      if (userEmail) {
        // Try to find user by email first
        const result = await sql`
          SELECT admin FROM users WHERE email = ${userEmail} LIMIT 1
        `;
        if (result.rows.length > 0) {
          isAdmin = result.rows[0].admin === true;
        }
      }

      // If not found by email, try by clerk_id
      if (!isAdmin) {
        const result = await sql`
          SELECT admin FROM users WHERE clerk_id = ${userId} LIMIT 1
        `;
        isAdmin = result.rows.length > 0 && result.rows[0].admin === true;
      }
    } catch (error) {
      console.warn('Database check failed, falling back to env variable:', error);
    }

    // Fallback to environment variable check
    if (!isAdmin) {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
      const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
      isAdmin = adminEmails.includes(userEmail || '') || adminUserIds.includes(userId);
    }


    return res.status(200).json({ isAdmin, userId, email: userEmail });

  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ isAdmin: false });
  }
}
