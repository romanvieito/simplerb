import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, validateAdPilotAccess, handleGoogleAdsError, formatCustomerId } from './client';

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
    totalConversionValue: number;
    averageCtr: number;
    averageCpc: number;
    averageConversionRate: number;
    averageCpa: number;
    averageRoas: number;
    totalBudget: number;
    budgetUtilization: number;
    campaigns: Array<{
      id: string;
      name: string;
      status: string;
      type: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversionValue: number;
      ctr: number;
      cpc: number;
      conversionRate: number;
      cpa: number;
      roas: number;
      budget: number;
      budgetUtilization: number;
      qualityScore?: number;
      adGroups?: Array<{
        id: string;
        name: string;
        impressions: number;
        clicks: number;
        cost: number;
        conversions: number;
        ctr: number;
        cpc: number;
        conversionRate: number;
      }>;
    }>;
    performance: {
      bestPerformingCampaign: string;
      worstPerformingCampaign: string;
      topKeywords: Array<{
        keyword: string;
        impressions: number;
        clicks: number;
        cost: number;
        conversions: number;
        ctr: number;
        cpc: number;
        qualityScore: number;
      }>;
      recommendations: string[];
    };
  };
  error?: string;
  errorCode?: string;
  errorDetails?: any;
  note?: string;
  queryError?: string;
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

    // Build the enhanced query with more detailed metrics
    let query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion,
        metrics.value_per_conversion,
        metrics.search_impression_share,
        metrics.search_rank_lost_impression_share,
        metrics.search_rank_lost_top_impression_share,
        metrics.quality_score
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `;

    if (campaignId) {
      query += ` AND campaign.id = ${campaignId}`;
    }

    console.log('Campaign query:', query);

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

    let response, rows;
    
    try {
      response = await customer.query(query);
      console.log('Metrics response:', response);
      rows = response.rows || [];
    } catch (queryError) {
      console.error('Metrics query error:', queryError);
      
      // If query fails, return empty metrics with error info
      return res.status(200).json({
        success: true,
        metrics: {
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0,
          totalConversions: 0,
          totalConversionValue: 0,
          averageCtr: 0,
          averageCpc: 0,
          averageConversionRate: 0,
          averageCpa: 0,
          averageRoas: 0,
          totalBudget: 0,
          budgetUtilization: 0,
          campaigns: [],
          performance: {
            bestPerformingCampaign: '',
            worstPerformingCampaign: '',
            topKeywords: [],
            recommendations: []
          }
        },
        note: 'Query failed but client works - may need campaigns or different query syntax',
        queryError: queryError instanceof Error ? queryError.message : 'Unknown query error'
      });
    }

    // If no campaigns found, return empty metrics
    if (rows.length === 0) {
      return res.status(200).json({
        success: true,
        metrics: {
          totalImpressions: 0,
          totalClicks: 0,
          totalCost: 0,
          totalConversions: 0,
          totalConversionValue: 0,
          averageCtr: 0,
          averageCpc: 0,
          averageConversionRate: 0,
          averageCpa: 0,
          averageRoas: 0,
          totalBudget: 0,
          budgetUtilization: 0,
          campaigns: [],
          performance: {
            bestPerformingCampaign: '',
            worstPerformingCampaign: '',
            topKeywords: [],
            recommendations: []
          }
        }
      });
    }

    // Aggregate metrics
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCost = 0;
    let totalConversions = 0;
    let totalConversionValue = 0;
    let totalBudget = 0;
    let totalCtr = 0;
    let totalCpc = 0;
    let totalConversionRate = 0;
    let totalCpa = 0;
    let totalRoas = 0;
    let campaignCount = 0;

    const campaigns: any[] = [];

    // Group by campaign
    const campaignMap = new Map();

    rows.forEach((row: any) => {
      const campaignId = row.campaign?.id;
      const campaignName = row.campaign?.name || 'Unknown';
      const campaignStatus = row.campaign?.status || 'UNKNOWN';
      const campaignType = row.campaign?.advertising_channel_type || 'UNKNOWN';
      const budget = parseInt(row.campaign_budget?.amount_micros || 0);

      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          id: campaignId,
          name: campaignName,
          status: campaignStatus,
          type: campaignType,
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionValue: 0,
          ctr: 0,
          cpc: 0,
          conversionRate: 0,
          cpa: 0,
          roas: 0,
          budget: budget,
          qualityScore: 0,
          rowCount: 0
        });
      }

      const campaign = campaignMap.get(campaignId);
      campaign.impressions += parseInt(row.metrics?.impressions || 0);
      campaign.clicks += parseInt(row.metrics?.clicks || 0);
      campaign.cost += parseInt(row.metrics?.cost_micros || 0);
      campaign.conversions += parseFloat(row.metrics?.conversions || 0);
      campaign.conversionValue += parseFloat(row.metrics?.conversions_value || 0);
      campaign.ctr += parseFloat(row.metrics?.ctr || 0);
      campaign.cpc += parseFloat(row.metrics?.average_cpc || 0);
      campaign.conversionRate += parseFloat(row.metrics?.conversions_from_interactions_rate || 0);
      campaign.cpa += parseFloat(row.metrics?.cost_per_conversion || 0);
      campaign.roas += parseFloat(row.metrics?.value_per_conversion || 0);
      campaign.qualityScore += parseFloat(row.metrics?.quality_score || 0);
      campaign.rowCount += 1;
    });

    // Calculate averages and totals
    campaignMap.forEach((campaign) => {
      if (campaign.rowCount > 0) {
        campaign.ctr = campaign.ctr / campaign.rowCount;
        campaign.cpc = campaign.cpc / campaign.rowCount;
        campaign.conversionRate = campaign.conversionRate / campaign.rowCount;
        campaign.cpa = campaign.cpa / campaign.rowCount;
        campaign.roas = campaign.roas / campaign.rowCount;
        campaign.qualityScore = campaign.qualityScore / campaign.rowCount;
        campaign.cost = campaign.cost / 1000000; // Convert from micros to dollars
        campaign.cpc = campaign.cpc / 1000000; // Convert from micros to dollars
        campaign.cpa = campaign.cpa / 1000000; // Convert from micros to dollars
        campaign.budget = campaign.budget / 1000000; // Convert from micros to dollars
        campaign.budgetUtilization = campaign.budget > 0 ? (campaign.cost / campaign.budget) * 100 : 0;

        totalImpressions += campaign.impressions;
        totalClicks += campaign.clicks;
        totalCost += campaign.cost;
        totalConversions += campaign.conversions;
        totalConversionValue += campaign.conversionValue;
        totalBudget += campaign.budget;
        totalCtr += campaign.ctr;
        totalCpc += campaign.cpc;
        totalConversionRate += campaign.conversionRate;
        totalCpa += campaign.cpa;
        totalRoas += campaign.roas;
        campaignCount += 1;

        campaigns.push(campaign);
      }
    });

    // Calculate overall averages
    const averageCtr = campaignCount > 0 ? totalCtr / campaignCount : 0;
    const averageCpc = campaignCount > 0 ? totalCpc / campaignCount : 0;
    const averageConversionRate = campaignCount > 0 ? totalConversionRate / campaignCount : 0;
    const averageCpa = campaignCount > 0 ? totalCpa / campaignCount : 0;
    const averageRoas = campaignCount > 0 ? totalRoas / campaignCount : 0;
    const budgetUtilization = totalBudget > 0 ? (totalCost / totalBudget) * 100 : 0;

    // Performance analysis
    const sortedCampaigns = campaigns.sort((a, b) => b.conversions - a.conversions);
    const bestPerformingCampaign = sortedCampaigns[0]?.name || '';
    const worstPerformingCampaign = sortedCampaigns[sortedCampaigns.length - 1]?.name || '';

    // Generate recommendations
    const recommendations: string[] = [];
    if (averageCtr < 2) {
      recommendations.push('Consider improving ad relevance and keywords to increase CTR');
    }
    if (averageConversionRate < 3) {
      recommendations.push('Optimize landing pages and ad copy to improve conversion rates');
    }
    if (budgetUtilization < 80) {
      recommendations.push('Consider increasing bids or expanding keyword coverage to utilize more budget');
    }
    if (averageCpa > 50) {
      recommendations.push('Review and optimize keywords with high CPA');
    }

    res.status(200).json({
      success: true,
      metrics: {
        totalImpressions,
        totalClicks,
        totalCost,
        totalConversions,
        totalConversionValue,
        averageCtr,
        averageCpc,
        averageConversionRate,
        averageCpa,
        averageRoas,
        totalBudget,
        budgetUtilization,
        campaigns,
        performance: {
          bestPerformingCampaign,
          worstPerformingCampaign,
          topKeywords: [], // Would need separate keyword query
          recommendations
        }
      }
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    
    const errorInfo = handleGoogleAdsError(error);
    
    res.status(500).json({ 
      success: false, 
      error: `Failed to fetch metrics: ${errorInfo.message}`,
      errorCode: errorInfo.code,
      errorDetails: errorInfo.details,
      troubleshooting: [
        'Check that your Google Ads account has campaigns with data',
        'Verify your date range is valid',
        'Ensure you have the necessary permissions to view metrics',
        'Check that your campaign IDs are correct'
      ]
    });
  }
}
