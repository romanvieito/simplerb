import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import { 
  getGoogleAdsCustomer, 
  validateAdPilotAccess, 
  handleGoogleAdsError,
  formatCustomerId 
} from './client';

interface OptimizeRequest {
  campaignId?: string;
  optimizationType: 'BIDS' | 'KEYWORDS' | 'ADS' | 'TARGETING' | 'BUDGET' | 'ALL';
  settings?: {
    maxCpcIncrease?: number; // Percentage increase
    minCpcDecrease?: number; // Percentage decrease
    targetCpa?: number;
    targetRoas?: number;
    pauseLowPerforming?: boolean;
    pauseThreshold?: {
      ctr?: number;
      conversionRate?: number;
      cpa?: number;
    };
    addNegativeKeywords?: string[];
    removeKeywords?: string[];
    adjustBidModifiers?: Array<{
      criterionType: 'DEVICE' | 'LOCATION' | 'TIME' | 'DEMOGRAPHIC';
      criterionId: string;
      bidModifier: number;
    }>;
  };
}

interface OptimizeResponse {
  success: boolean;
  optimizations?: {
    applied: Array<{
      type: string;
      description: string;
      impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      details: any;
    }>;
    recommendations: Array<{
      type: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      potentialImpact: string;
    }>;
    summary: {
      totalChanges: number;
      expectedImprovement: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    };
  };
  error?: string;
  errorCode?: string;
  errorDetails?: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<OptimizeResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Check authentication using Clerk
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized - please sign in' });
    }

    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'User email required' });
    }
    
    if (!(await validateAdPilotAccess(userEmail))) {
      return res.status(403).json({ success: false, error: 'Access denied - insufficient permissions' });
    }

    const { campaignId, optimizationType, settings = {} }: OptimizeRequest = req.body;

    if (!optimizationType) {
      return res.status(400).json({ 
        success: false, 
        error: 'optimizationType is required' 
      });
    }

    const customer = getGoogleAdsCustomer();
    const customerId = formatCustomerId(process.env.GADS_LOGIN_CUSTOMER_ID!);
    const validateOnly = process.env.ADPILOT_VALIDATE_ONLY === 'true';

    const operations: any[] = [];
    const appliedOptimizations: any[] = [];
    const recommendations: any[] = [];

    // Get campaign performance data first
    let campaignData: any[] = [];
    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions_from_interactions_rate,
          metrics.cost_per_conversion,
          metrics.quality_score
        FROM campaign
        WHERE campaign.status = 'ENABLED'
        ${campaignId ? `AND campaign.id = ${campaignId}` : ''}
        AND segments.date >= '${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}'
      `;
      
      const response = await customer.query(query);
      campaignData = response.rows || [];
    } catch (queryError) {
      console.log('Could not fetch campaign data for optimization:', queryError);
    }

    // Process each campaign
    for (const campaign of campaignData) {
      const campaignId = campaign.campaign?.id;
      const campaignName = campaign.campaign?.name;
      const impressions = parseInt(campaign.metrics?.impressions || 0);
      const clicks = parseInt(campaign.metrics?.clicks || 0);
      const cost = parseInt(campaign.metrics?.cost_micros || 0) / 1000000;
      const conversions = parseFloat(campaign.metrics?.conversions || 0);
      const ctr = parseFloat(campaign.metrics?.ctr || 0);
      const conversionRate = parseFloat(campaign.metrics?.conversions_from_interactions_rate || 0);
      const cpa = parseFloat(campaign.metrics?.cost_per_conversion || 0) / 1000000;
      const qualityScore = parseFloat(campaign.metrics?.quality_score || 0);

      // Bid Optimization
      if (optimizationType === 'BIDS' || optimizationType === 'ALL') {
        if (settings.maxCpcIncrease && ctr > 2 && conversionRate > 3) {
          const newBid = Math.min(cost / clicks * (1 + settings.maxCpcIncrease / 100), cost / clicks * 2);
          operations.push({
            update: {
              resource_name: `customers/${customerId}/campaigns/${campaignId}`,
              manual_cpc: {
                enhanced_cpc_enabled: true,
                cpc_bid_ceiling_micros: newBid * 1000000
              }
            }
          });
          appliedOptimizations.push({
            type: 'BID_INCREASE',
            description: `Increased max CPC for ${campaignName} by ${settings.maxCpcIncrease}%`,
            impact: 'POSITIVE',
            details: { oldBid: cost / clicks, newBid, campaignId }
          });
        }

        if (settings.minCpcDecrease && ctr < 1 && conversionRate < 2) {
          const newBid = Math.max(cost / clicks * (1 - settings.minCpcDecrease / 100), cost / clicks * 0.5);
          operations.push({
            update: {
              resource_name: `customers/${customerId}/campaigns/${campaignId}`,
              manual_cpc: {
                enhanced_cpc_enabled: true,
                cpc_bid_ceiling_micros: newBid * 1000000
              }
            }
          });
          appliedOptimizations.push({
            type: 'BID_DECREASE',
            description: `Decreased max CPC for ${campaignName} by ${settings.minCpcDecrease}%`,
            impact: 'POSITIVE',
            details: { oldBid: cost / clicks, newBid, campaignId }
          });
        }
      }

      // Keyword Optimization
      if (optimizationType === 'KEYWORDS' || optimizationType === 'ALL') {
        // Pause low-performing keywords
        if (settings.pauseLowPerforming && ctr < (settings.pauseThreshold?.ctr || 1)) {
          try {
            const keywordQuery = `
              SELECT ad_group_criterion.resource_name, ad_group_criterion.keyword.text
              FROM keyword_view
              WHERE campaign.id = ${campaignId}
              AND ad_group_criterion.status = 'ENABLED'
              AND metrics.ctr < ${settings.pauseThreshold?.ctr || 1}
            `;
            
            const keywordResponse = await customer.query(keywordQuery);
            keywordResponse.rows?.forEach((row: any) => {
              operations.push({
                update: {
                  resource_name: row.ad_group_criterion.resource_name,
                  status: 'PAUSED'
                }
              });
            });

            if (keywordResponse.rows?.length > 0) {
              appliedOptimizations.push({
                type: 'KEYWORD_PAUSE',
                description: `Paused ${keywordResponse.rows.length} low-performing keywords in ${campaignName}`,
                impact: 'POSITIVE',
                details: { campaignId, pausedCount: keywordResponse.rows.length }
              });
            }
          } catch (keywordError) {
            console.log('Could not optimize keywords:', keywordError);
          }
        }

        // Add negative keywords
        if (settings.addNegativeKeywords?.length) {
          for (const keyword of settings.addNegativeKeywords) {
            operations.push({
              create: {
                campaign: `customers/${customerId}/campaigns/${campaignId}`,
                type: 'KEYWORD',
                keyword: {
                  text: keyword,
                  match_type: 'BROAD'
                },
                status: 'ENABLED',
                negative: true
              }
            });
          }
          appliedOptimizations.push({
            type: 'NEGATIVE_KEYWORDS',
            description: `Added ${settings.addNegativeKeywords.length} negative keywords to ${campaignName}`,
            impact: 'POSITIVE',
            details: { campaignId, keywords: settings.addNegativeKeywords }
          });
        }
      }

      // Generate recommendations
      if (ctr < 2) {
        recommendations.push({
          type: 'CTR_IMPROVEMENT',
          description: `Improve CTR for ${campaignName} - currently ${ctr.toFixed(2)}%`,
          priority: 'HIGH',
          potentialImpact: 'Increase traffic quality and reduce costs'
        });
      }

      if (conversionRate < 3) {
        recommendations.push({
          type: 'CONVERSION_OPTIMIZATION',
          description: `Optimize conversion rate for ${campaignName} - currently ${conversionRate.toFixed(2)}%`,
          priority: 'HIGH',
          potentialImpact: 'Increase return on ad spend'
        });
      }

      if (qualityScore < 6) {
        recommendations.push({
          type: 'QUALITY_SCORE',
          description: `Improve quality score for ${campaignName} - currently ${qualityScore.toFixed(1)}`,
          priority: 'MEDIUM',
          potentialImpact: 'Lower costs and better ad positions'
        });
      }
    }

    // Execute optimizations
    if (validateOnly) {
      console.log('DRY RUN: Would apply', operations.length, 'optimizations');
      return res.status(200).json({
        success: true,
        optimizations: {
          applied: appliedOptimizations,
          recommendations,
          summary: {
            totalChanges: operations.length,
            expectedImprovement: 'Optimizations would be applied in production',
            riskLevel: 'LOW'
          }
        }
      });
    }

    // Apply optimizations
    if (operations.length > 0) {
      try {
        const response = await customer.mutateResources(operations);
        console.log('Optimizations applied:', response);
      } catch (optimizationError) {
        console.error('Error applying optimizations:', optimizationError);
        const errorInfo = handleGoogleAdsError(optimizationError);
        return res.status(500).json({
          success: false,
          error: `Failed to apply optimizations: ${errorInfo.message}`,
          errorCode: errorInfo.code,
          errorDetails: errorInfo.details
        });
      }
    }

    res.status(200).json({
      success: true,
      optimizations: {
        applied: appliedOptimizations,
        recommendations,
        summary: {
          totalChanges: operations.length,
          expectedImprovement: 'Applied optimizations should improve performance over time',
          riskLevel: operations.length > 10 ? 'MEDIUM' : 'LOW'
        }
      }
    });

  } catch (error) {
    console.error('Error in optimization:', error);
    
    const errorInfo = handleGoogleAdsError(error);
    
    res.status(500).json({
      success: false,
      error: `Optimization failed: ${errorInfo.message}`,
      errorCode: errorInfo.code,
      errorDetails: {
        ...errorInfo.details,
        troubleshooting: [
          'Check that your campaigns have sufficient data for optimization',
          'Verify your optimization settings are valid',
          'Ensure you have the necessary permissions to modify campaigns',
          'Check that campaign IDs are correct'
        ]
      }
    });
  }
}
