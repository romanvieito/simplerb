import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, validateAdPilotAccess } from './client';

interface MetricsRequest {
  campaignId?: string;
  days?: number;
}

interface MetricsResponse {
  success: boolean;
  metrics?: {
    totalImpressions: number;
    totalClicks: number;
    totalCost: number;
    totalConversions: number;
    averageCtr: number;
    averageCpc: number;
    averageConversionRate: number;
    campaigns: Array<{
      id: string;
      name: string;
      status: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      ctr: number;
      cpc: number;
      conversionRate: number;
    }>;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<MetricsResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!validateAdPilotAccess(userEmail)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { campaignId, days = 7 }: MetricsRequest = req.query;

    const customer = getGoogleAdsCustomer();

    const adpilotLabel = process.env.ADPILOT_LABEL || 'AdPilot';

    // Build the query - simplified to avoid GRPC issues
    let query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `;

    if (campaignId) {
      query += ` AND campaign.id = ${campaignId}`;
    }

    console.log('Campaign query:', query);

    const response = await customer.query(query);
    console.log('Campaigns response:', response);
    const rows = response.rows || [];

    // For now, return basic campaign info without metrics to test connection
    const campaigns = rows.map((row: any) => ({
      id: row.campaign?.id || 'Unknown',
      name: row.campaign?.name || 'Unknown',
      status: row.campaign?.status || 'UNKNOWN',
      impressions: 0,
      clicks: 0,
      cost: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      conversionRate: 0
    }));

    res.status(200).json({
      success: true,
      metrics: {
        totalImpressions: 0,
        totalClicks: 0,
        totalCost: 0,
        totalConversions: 0,
        averageCtr: 0,
        averageCpc: 0,
        averageConversionRate: 0,
        campaigns
      }
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to fetch metrics: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
