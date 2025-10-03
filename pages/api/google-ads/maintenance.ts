import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, validateAdPilotAccess } from './client';

interface MaintenanceRequest {
  dryRun?: boolean;
}

interface MaintenanceResponse {
  success: boolean;
  actions?: Array<{
    type: string;
    entityId: string;
    entityName: string;
    action: string;
    reason: string;
  }>;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<MaintenanceResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!validateAdPilotAccess(userEmail)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { dryRun = false }: MaintenanceRequest = req.body;

    const customer = getGoogleAdsCustomer();

    const adpilotLabel = process.env.ADPILOT_LABEL || 'AdPilot';
    const underperformingLabel = `${adpilotLabel}_UNDERPERFORMING`;

    const actions: any[] = [];
    const operations: any[] = [];

    // 1. Find and pause underperforming ads
    const adsQuery = `
      SELECT 
        ad_group_ad.ad.id,
        ad_group_ad.ad.responsive_search_ad.headlines,
        ad_group.campaign.id,
        campaign.name,
        metrics.cost_micros,
        metrics.conversions,
        metrics.clicks,
        metrics.impressions
      FROM ad_group_ad
      WHERE ad_group.campaign.labels CONTAINS '${adpilotLabel}'
      AND ad_group_ad.status = 'ENABLED'
      AND segments.date BETWEEN '${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}' 
      AND '${new Date().toISOString().split('T')[0]}'
    `;

    const adsResponse = await customer.query(adsQuery);
    const adsRows = adsResponse.rows || [];

    // Group ads by ad_group_ad.ad.id
    const adsMap = new Map();

    adsRows.forEach((row: any) => {
      const adId = row.ad_group_ad?.ad?.id;
      if (!adsMap.has(adId)) {
        adsMap.set(adId, {
          id: adId,
          campaignId: row.ad_group?.campaign?.id,
          campaignName: row.campaign?.name || 'Unknown',
          headlines: row.ad_group_ad?.ad?.responsive_search_ad?.headlines || [],
          cost: 0,
          conversions: 0,
          clicks: 0,
          impressions: 0,
          rowCount: 0
        });
      }

      const ad = adsMap.get(adId);
      ad.cost += parseInt(row.metrics?.cost_micros || 0);
      ad.conversions += parseFloat(row.metrics?.conversions || 0);
      ad.clicks += parseInt(row.metrics?.clicks || 0);
      ad.impressions += parseInt(row.metrics?.impressions || 0);
      ad.rowCount += 1;
    });

    // Apply maintenance rules for ads
    adsMap.forEach((ad) => {
      if (ad.rowCount > 0) {
        ad.cost = ad.cost / 1000000; // Convert to dollars
        
        // Rule: Pause ads with high cost per conversion and sufficient clicks
        if (ad.conversions > 0 && ad.clicks >= 100) {
          const costPerConversion = ad.cost / ad.conversions;
          if (costPerConversion > 50) { // $50+ cost per conversion threshold
            const headline = ad.headlines[0]?.text || 'Unknown';
            
            actions.push({
              type: 'PAUSE_AD',
              entityId: ad.id,
              entityName: `${ad.campaignName} - ${headline}`,
              action: 'PAUSE',
              reason: `Cost per conversion $${costPerConversion.toFixed(2)} (threshold: $50)`
            });

            if (!dryRun) {
              operations.push({
                update: {
                  resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/adGroupAds/${ad.id}`,
                  status: 'PAUSED'
                }
              });
            }
          }
        }
      }
    });

    // 2. Find and archive underperforming keywords
    const keywordsQuery = `
      SELECT 
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group.campaign.id,
        campaign.name,
        metrics.quality_score,
        metrics.conversions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.impressions
      FROM keyword_view
      WHERE ad_group.campaign.labels CONTAINS '${adpilotLabel}'
      AND ad_group_criterion.status = 'ENABLED'
      AND segments.date BETWEEN '${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}' 
      AND '${new Date().toISOString().split('T')[0]}'
    `;

    const keywordsResponse = await customer.query(keywordsQuery);
    const keywordsRows = keywordsResponse.rows || [];

    // Group keywords by criterion_id
    const keywordsMap = new Map();

    keywordsRows.forEach((row: any) => {
      const criterionId = row.ad_group_criterion?.criterion_id;
      if (!keywordsMap.has(criterionId)) {
        keywordsMap.set(criterionId, {
          id: criterionId,
          campaignId: row.ad_group?.campaign?.id,
          campaignName: row.campaign?.name || 'Unknown',
          keyword: row.ad_group_criterion?.keyword?.text || 'Unknown',
          matchType: row.ad_group_criterion?.keyword?.match_type || 'UNKNOWN',
          qualityScore: 0,
          conversions: 0,
          clicks: 0,
          cost: 0,
          impressions: 0,
          rowCount: 0
        });
      }

      const keyword = keywordsMap.get(criterionId);
      keyword.qualityScore += parseInt(row.metrics?.quality_score || 0);
      keyword.conversions += parseFloat(row.metrics?.conversions || 0);
      keyword.clicks += parseInt(row.metrics?.clicks || 0);
      keyword.cost += parseInt(row.metrics?.cost_micros || 0);
      keyword.impressions += parseInt(row.metrics?.impressions || 0);
      keyword.rowCount += 1;
    });

    // Apply maintenance rules for keywords
    keywordsMap.forEach((keyword) => {
      if (keyword.rowCount > 0) {
        keyword.qualityScore = Math.round(keyword.qualityScore / keyword.rowCount);
        keyword.cost = keyword.cost / 1000000; // Convert to dollars
        
        // Rule: Archive keywords with low quality score and no conversions
        if (keyword.qualityScore <= 3 && keyword.conversions === 0 && keyword.clicks >= 10) {
          actions.push({
            type: 'ARCHIVE_KEYWORD',
            entityId: keyword.id,
            entityName: `${keyword.campaignName} - ${keyword.keyword} (${keyword.matchType})`,
            action: 'REMOVE',
            reason: `Quality score ${keyword.qualityScore}/10 with 0 conversions`
          });

          if (!dryRun) {
            operations.push({
              update: {
                resource_name: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/adGroupCriteria/${keyword.id}`,
                status: 'REMOVED'
              }
            });
          }
        }
      }
    });

    // 3. Add underperforming label to campaigns with poor performance
    const campaignsQuery = `
      SELECT 
        campaign.id,
        campaign.name,
        metrics.cost_micros,
        metrics.conversions,
        metrics.clicks,
        metrics.impressions
      FROM campaign
      WHERE campaign.labels CONTAINS '${adpilotLabel}'
      AND campaign.status = 'ENABLED'
      AND segments.date BETWEEN '${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}' 
      AND '${new Date().toISOString().split('T')[0]}'
    `;

    const campaignsResponse = await customer.query(campaignsQuery);
    const campaignsRows = campaignsResponse.rows || [];

    // Group campaigns by id
    const campaignsMap = new Map();

    campaignsRows.forEach((row: any) => {
      const campaignId = row.campaign?.id;
      if (!campaignsMap.has(campaignId)) {
        campaignsMap.set(campaignId, {
          id: campaignId,
          name: row.campaign?.name || 'Unknown',
          cost: 0,
          conversions: 0,
          clicks: 0,
          impressions: 0,
          rowCount: 0
        });
      }

      const campaign = campaignsMap.get(campaignId);
      campaign.cost += parseInt(row.metrics?.cost_micros || 0);
      campaign.conversions += parseFloat(row.metrics?.conversions || 0);
      campaign.clicks += parseInt(row.metrics?.clicks || 0);
      campaign.impressions += parseInt(row.metrics?.impressions || 0);
      campaign.rowCount += 1;
    });

    // Apply maintenance rules for campaigns
    campaignsMap.forEach((campaign) => {
      if (campaign.rowCount > 0) {
        campaign.cost = campaign.cost / 1000000; // Convert to dollars
        
        // Rule: Label campaigns with very poor performance
        if (campaign.conversions > 0 && campaign.cost > 200) {
          const costPerConversion = campaign.cost / campaign.conversions;
          if (costPerConversion > 100) { // $100+ cost per conversion
            actions.push({
              type: 'LABEL_CAMPAIGN',
              entityId: campaign.id,
              entityName: campaign.name,
              action: 'ADD_LABEL',
              reason: `Cost per conversion $${costPerConversion.toFixed(2)} (threshold: $100)`
            });

            if (!dryRun) {
              operations.push({
                create: {
                  campaign_label: {
                    campaign: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaigns/${campaign.id}`,
                    label: `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/labels/${underperformingLabel}`
                  }
                }
              });
            }
          }
        }
      }
    });

    // Execute maintenance actions if not dry run
    if (!dryRun && operations.length > 0) {
      try {
        await customer.mutateResources(operations);
        console.log(`Applied ${operations.length} maintenance actions`);
      } catch (error) {
        console.error('Error applying maintenance actions:', error);
        return res.status(500).json({
          success: false,
          error: `Failed to apply maintenance actions: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    res.status(200).json({
      success: true,
      actions
    });

  } catch (error) {
    console.error('Error running maintenance:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to run maintenance: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
