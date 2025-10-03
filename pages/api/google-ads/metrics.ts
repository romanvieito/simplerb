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

    // Build the query
    let query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      AND campaign.labels CONTAINS '${adpilotLabel}'
    `;

    if (campaignId) {
      query += ` AND campaign.id = ${campaignId}`;
    }

    // Add date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    query += `
      AND segments.date BETWEEN '${startDate.toISOString().split('T')[0]}' 
      AND '${endDate.toISOString().split('T')[0]}'
    `;

    query += ` ORDER BY metrics.cost_micros DESC`;

    console.log('Metrics query:', query);

    const response = await customer.query(query);
    const rows = response.rows || [];

    // Aggregate metrics
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCost = 0;
    let totalConversions = 0;
    let totalCtr = 0;
    let totalCpc = 0;
    let totalConversionRate = 0;
    let campaignCount = 0;

    const campaigns: any[] = [];

    // Group by campaign
    const campaignMap = new Map();

    rows.forEach((row: any) => {
      const campaignId = row.campaign?.id;
      const campaignName = row.campaign?.name || 'Unknown';
      const campaignStatus = row.campaign?.status || 'UNKNOWN';

      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          id: campaignId,
          name: campaignName,
          status: campaignStatus,
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          conversionRate: 0,
          rowCount: 0
        });
      }

      const campaign = campaignMap.get(campaignId);
      campaign.impressions += parseInt(row.metrics?.impressions || 0);
      campaign.clicks += parseInt(row.metrics?.clicks || 0);
      campaign.cost += parseInt(row.metrics?.cost_micros || 0);
      campaign.conversions += parseFloat(row.metrics?.conversions || 0);
      campaign.ctr += parseFloat(row.metrics?.ctr || 0);
      campaign.cpc += parseFloat(row.metrics?.average_cpc || 0);
      campaign.conversionRate += parseFloat(row.metrics?.conversions_from_interactions_rate || 0);
      campaign.rowCount += 1;
    });

    // Calculate averages and totals
    campaignMap.forEach((campaign) => {
      if (campaign.rowCount > 0) {
        campaign.ctr = campaign.ctr / campaign.rowCount;
        campaign.cpc = campaign.cpc / campaign.rowCount;
        campaign.conversionRate = campaign.conversionRate / campaign.rowCount;
        campaign.cost = campaign.cost / 1000000; // Convert from micros to dollars
        campaign.cpc = campaign.cpc / 1000000; // Convert from micros to dollars

        totalImpressions += campaign.impressions;
        totalClicks += campaign.clicks;
        totalCost += campaign.cost;
        totalConversions += campaign.conversions;
        totalCtr += campaign.ctr;
        totalCpc += campaign.cpc;
        totalConversionRate += campaign.conversionRate;
        campaignCount += 1;

        campaigns.push(campaign);
      }
    });

    // Calculate overall averages
    const averageCtr = campaignCount > 0 ? totalCtr / campaignCount : 0;
    const averageCpc = campaignCount > 0 ? totalCpc / campaignCount : 0;
    const averageConversionRate = campaignCount > 0 ? totalConversionRate / campaignCount : 0;

    res.status(200).json({
      success: true,
      metrics: {
        totalImpressions,
        totalClicks,
        totalCost,
        totalConversions,
        averageCtr,
        averageCpc,
        averageConversionRate,
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
