import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, validateAdPilotAccess } from './client';
import { getAccountTimezone } from './timezone-utils';

interface TimezoneResponse {
  success: boolean;
  timezone?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TimezoneResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!(await validateAdPilotAccess(userEmail))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Get account timezone (uses caching internally)
    const timezone = await getAccountTimezone();

    return res.status(200).json({
      success: true,
      timezone,
    });

  } catch (error: any) {
    console.error('Error fetching account timezone:', error);
    
    return res.status(500).json({
      success: false,
      error: `Failed to fetch account timezone: ${error?.message || 'Unknown error'}`,
    });
  }
}

