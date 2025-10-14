import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, validateAdPilotAccess } from './client';

interface OptimizeRequest {
  dryRun?: boolean;
}

interface OptimizeResponse {
  success: boolean;
  optimizations?: Array<{
    type: string;
    campaignId: string;
    campaignName: string;
    action: string;
    reason: string;
    impact: string;
  }>;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<OptimizeResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!(await validateAdPilotAccess(userEmail))) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { dryRun = false }: OptimizeRequest = req.body;

    const customer = getGoogleAdsCustomer();

    const adpilotLabel = process.env.ADPILOT_LABEL || 'AdPilot';

    // Get campaign metrics for the last 7 days
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        campaign_budget.delivery_method,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate,
        campaign_bidding_strategy.type,
        campaign_bidding_strategy.maximize_clicks,
        campaign_bidding_strategy.target_cpa
      FROM campaign
      WHERE campaign.status = 'ENABLED'
      AND campaign.labels CONTAINS '${adpilotLabel}'
      AND segments.date BETWEEN '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}' 
      AND '${new Date().toISOString().split('T')[0]}'
    `;

    const response = await customer.query(query);
    const rows = response.rows || [];

    const optimizations: any[] = [];
    const operations: any[] = [];

    // Group by campaign
    const campaignMap = new Map();

    rows.forEach((row: any) => {
      const campaignId = row.campaign?.id;
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          id: campaignId,
          name: row.campaign?.name || 'Unknown',
          status: row.campaign?.status || 'UNKNOWN',
          budgetAmount: parseInt(row.campaign_budget?.amount_micros || 0),
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          ctr: 0,
          cpc: 0,
          conversionRate: 0,
          rowCount: 0,
          biddingStrategy: row.campaign_bidding_strategy?.type || 'UNKNOWN'
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

    // Apply optimization rules
    campaignMap.forEach((campaign) => {
      if (campaign.rowCount > 0) {
        // Calculate averages
        campaign.ctr = campaign.ctr / campaign.rowCount;
        campaign.cpc = campaign.cpc / campaign.rowCount;
        campaign.conversionRate = campaign.conversionRate / campaign.rowCount;
        campaign.cost = campaign.cost / 1000000; // Convert to dollars
        campaign.cpc = campaign.cpc / 1000000; // Convert to dollars

        const dailyBudget = campaign.budgetAmount / 1000000; // Convert to dollars
        const avgDailySpend = campaign.cost / 7; // 7 days
        const budgetUtilization = (avgDailySpend / dailyBudget) * 100;

        // Rule 1: Low budget utilization
        if (budgetUtilization < 60 && campaign.impressions > 1000) {
          optimizations.push({
            type: 'BUDGET_UTILIZATION',
            campaignId: campaign.id,
            campaignName: campaign.name,
            action: 'Switch to MAXIMIZE_CLICKS',
            reason: `Budget utilization is ${budgetUtilization.toFixed(1)}% (below 60% threshold)`,
            impact: 'Expected to increase traffic and budget utilization'
          });

          if (!dryRun && campaign.biddingStrategy !== 'MAXIMIZE_CLICKS') {
            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaigns/${campaign.id}`,
                maximize_clicks: {
                  cpc_bid_ceiling_micros: Math.max(campaign.cpc * 1.5 * 1000000, 500000) // 1.5x current CPC, min $0.50
                }
              }
            });
          }
        }

        // Rule 2: Low CTR with good impressions
        if (campaign.ctr < 0.01 && campaign.impressions > 200) {
          optimizations.push({
            type: 'LOW_CTR',
            campaignId: campaign.id,
            campaignName: campaign.name,
            action: 'Reduce CPC bids by 10%',
            reason: `CTR is ${(campaign.ctr * 100).toFixed(2)}% (below 1% threshold)`,
            impact: 'May improve CTR by reducing competition for low-performing keywords'
          });

          if (!dryRun) {
            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaigns/${campaign.id}`,
                manual_cpc: {
                  enhanced_cpc_enabled: true
                }
              }
            });
          }
        }

        // Rule 3: High CPC with low conversions
        if (campaign.cpc > 2.0 && campaign.conversions < 2 && campaign.clicks > 50) {
          optimizations.push({
            type: 'HIGH_CPC_LOW_CONVERSIONS',
            campaignId: campaign.id,
            campaignName: campaign.name,
            action: 'Switch to TARGET_CPA bidding',
            reason: `CPC is $${campaign.cpc.toFixed(2)} with only ${campaign.conversions} conversions`,
            impact: 'Should improve conversion efficiency'
          });

          if (!dryRun && campaign.biddingStrategy !== 'TARGET_CPA') {
            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaigns/${campaign.id}`,
                target_cpa: {
                  target_cpa_micros: Math.max(campaign.cpc * 10 * 1000000, 20000000) // 10x CPC as target CPA, min $20
                }
              }
            });
          }
        }

        // Rule 4: Good performance - increase budget
        if (budgetUtilization > 90 && campaign.conversionRate > 0.02 && campaign.cost > 100) {
          optimizations.push({
            type: 'SCALE_UP',
            campaignId: campaign.id,
            campaignName: campaign.name,
            action: 'Increase daily budget by 20%',
            reason: `High budget utilization (${budgetUtilization.toFixed(1)}%) with good conversion rate (${(campaign.conversionRate * 100).toFixed(2)}%)`,
            impact: 'Should scale successful campaigns'
          });

          if (!dryRun) {
            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaignBudgets/${campaign.id}`,
                amount_micros: Math.floor(campaign.budgetAmount * 1.2)
              }
            });
          }
        }
      }
    });

    // Execute optimizations if not dry run
    if (!dryRun && operations.length > 0) {
      try {
        await customer.mutateResources(operations);
        console.log(`Applied ${operations.length} optimizations`);
      } catch (error) {
        console.error('Error applying optimizations:', error);
        return res.status(500).json({
          success: false,
          error: `Failed to apply optimizations: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    res.status(200).json({
      success: true,
      optimizations
    });

  } catch (error) {
    console.error('Error running optimization:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to run optimization: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
