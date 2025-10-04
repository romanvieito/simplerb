import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

interface Recommendation {
  type: 'pause' | 'bid_increase' | 'bid_decrease' | 'ad_copy' | 'negative_keyword' | 'budget' | 'geography';
  entity: 'keyword' | 'ad' | 'campaign' | 'ad_group';
  campaign: string;
  ad_group?: string;
  keyword_or_ad: string;
  issue: string;
  suggestion: string;
  evidence: string;
}

interface OptimizationResult {
  recommendations: Recommendation[];
  summary: {
    totalRecommendations: number;
    pauseRecommendations: number;
    bidRecommendations: number;
    otherRecommendations: number;
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { analysisId } = req.body;

    if (!analysisId) {
      return res.status(400).json({ error: 'Missing analysisId' });
    }

    // Fetch metrics for the analysis
    const metricsResult = await sql`
      SELECT * FROM campaign_metrics 
      WHERE analysis_id = ${analysisId}
      ORDER BY campaign_name, ad_group_name, keyword
    `;

    const metrics = metricsResult.rows;
    const recommendations: Recommendation[] = [];

    // Analysis thresholds
    const HIGH_IMPRESSIONS_THRESHOLD = 500;
    const LOW_CTR_THRESHOLD = 1.0; // 1%
    const LOW_QUALITY_SCORE_THRESHOLD = 3;

    // Group metrics by campaign for analysis
    const campaignGroups = new Map<string, any[]>();
    metrics.forEach(metric => {
      if (!campaignGroups.has(metric.campaign_name)) {
        campaignGroups.set(metric.campaign_name, []);
      }
      campaignGroups.get(metric.campaign_name)!.push(metric);
    });

    // Analyze each campaign
    campaignGroups.forEach((campaignMetrics, campaignName) => {
      // Calculate campaign-level metrics
      const totalImpressions = campaignMetrics.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0);
      const totalClicks = campaignMetrics.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0);
      const totalCost = campaignMetrics.reduce((sum: number, m: any) => sum + (m.cost || 0), 0);
      const campaignCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Group by ad group for ad copy analysis
      const adGroupGroups = new Map<string, any[]>();
      campaignMetrics.forEach((metric: any) => {
        const adGroup = metric.ad_group_name || 'No Ad Group';
        if (!adGroupGroups.has(adGroup)) {
          adGroupGroups.set(adGroup, []);
        }
        adGroupGroups.get(adGroup)!.push(metric);
      });

      // Analyze keywords/ads
      campaignMetrics.forEach((metric: any) => {
        const impressions = metric.impressions || 0;
        const clicks = metric.clicks || 0;
        const ctr = metric.ctr || 0;
        const qualityScore = metric.quality_score;
        const keyword = metric.keyword || 'Unknown';

        // Rule 1: High impressions, zero clicks - suggest pausing
        if (impressions >= HIGH_IMPRESSIONS_THRESHOLD && clicks === 0) {
          recommendations.push({
            type: 'pause',
            entity: 'keyword',
            campaign: campaignName,
            ad_group: metric.ad_group_name || undefined,
            keyword_or_ad: keyword,
            issue: `High impressions (${impressions.toLocaleString()}) but zero clicks`,
            suggestion: 'Consider pausing this keyword as it\'s not generating any traffic',
            evidence: `${impressions.toLocaleString()} impressions, 0 clicks`
          });
        }

        // Rule 2: Low quality score
        if (qualityScore && (parseInt(qualityScore) <= LOW_QUALITY_SCORE_THRESHOLD || qualityScore.toLowerCase().includes('poor'))) {
          recommendations.push({
            type: 'bid_decrease',
            entity: 'keyword',
            campaign: campaignName,
            ad_group: metric.ad_group_name || undefined,
            keyword_or_ad: keyword,
            issue: `Low quality score: ${qualityScore}`,
            suggestion: 'Consider lowering bids or improving ad relevance and landing page experience',
            evidence: `Quality score: ${qualityScore}`
          });
        }

        // Rule 3: Low CTR with decent impressions
        if (impressions >= 100 && ctr < LOW_CTR_THRESHOLD) {
          recommendations.push({
            type: 'ad_copy',
            entity: 'keyword',
            campaign: campaignName,
            ad_group: metric.ad_group_name || undefined,
            keyword_or_ad: keyword,
            issue: `Low CTR: ${(ctr * 100).toFixed(2)}% with ${impressions.toLocaleString()} impressions`,
            suggestion: 'Improve ad copy relevance and consider A/B testing different headlines',
            evidence: `CTR: ${(ctr * 100).toFixed(2)}%, Impressions: ${impressions.toLocaleString()}`
          });
        }

        // Rule 4: High CTR with low impressions - suggest bid increase
        if (impressions >= 50 && ctr >= 3.0 && clicks >= 5) {
          recommendations.push({
            type: 'bid_increase',
            entity: 'keyword',
            campaign: campaignName,
            ad_group: metric.ad_group_name || undefined,
            keyword_or_ad: keyword,
            issue: `High performing keyword with limited reach`,
            suggestion: 'Consider increasing bids to capture more impressions',
            evidence: `CTR: ${(ctr * 100).toFixed(2)}%, Clicks: ${clicks}, Impressions: ${impressions.toLocaleString()}`
          });
        }
      });

      // Ad group level analysis
      adGroupGroups.forEach((adGroupMetrics, adGroupName) => {
        const adGroupImpressions = adGroupMetrics.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0);
        const adGroupClicks = adGroupMetrics.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0);
        const adGroupCTR = adGroupImpressions > 0 ? (adGroupClicks / adGroupImpressions) * 100 : 0;

        // Rule 5: Ad group with very low performance
        if (adGroupImpressions >= 1000 && adGroupCTR < 0.5) {
          recommendations.push({
            type: 'ad_copy',
            entity: 'ad_group',
            campaign: campaignName,
            ad_group: adGroupName,
            keyword_or_ad: adGroupName,
            issue: `Ad group underperforming with very low CTR`,
            suggestion: 'Review and improve ad copy, consider restructuring keywords',
            evidence: `Ad group CTR: ${adGroupCTR.toFixed(2)}%, Impressions: ${adGroupImpressions.toLocaleString()}`
          });
        }
      });

      // Campaign level analysis
      if (totalImpressions >= 5000) {
        // Rule 6: Campaign budget utilization
        if (campaignCTR >= 2.0 && totalCost > 0) {
          const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;
          if (avgCPC > 5.0) {
            recommendations.push({
              type: 'budget',
              entity: 'campaign',
              campaign: campaignName,
              keyword_or_ad: campaignName,
              issue: `High cost per click: $${avgCPC.toFixed(2)}`,
              suggestion: 'Review keyword bids and consider optimizing for better cost efficiency',
              evidence: `Avg CPC: $${avgCPC.toFixed(2)}, Total cost: $${totalCost.toFixed(2)}`
            });
          }
        }
      }
    });

    // Geographic analysis (if location data available)
    const locationMetrics = metrics.filter((m: any) => m.location);
    if (locationMetrics.length > 0) {
      const locationGroups = new Map<string, any[]>();
      locationMetrics.forEach((metric: any) => {
        const location = metric.location;
        if (!locationGroups.has(location)) {
          locationGroups.set(location, []);
        }
        locationGroups.get(location)!.push(metric);
      });

      locationGroups.forEach((locationMetrics, location) => {
        const locationImpressions = locationMetrics.reduce((sum: number, m: any) => sum + (m.impressions || 0), 0);
        const locationClicks = locationMetrics.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0);
        const locationCTR = locationImpressions > 0 ? (locationClicks / locationImpressions) * 100 : 0;

        if (locationImpressions >= 500 && locationCTR < 0.5) {
          recommendations.push({
            type: 'geography',
            entity: 'campaign',
            campaign: 'Multiple Campaigns',
            keyword_or_ad: location,
            issue: `Location underperforming: ${location}`,
            suggestion: 'Consider excluding this location or adjusting bids',
            evidence: `Location CTR: ${locationCTR.toFixed(2)}%, Impressions: ${locationImpressions.toLocaleString()}`
          });
        }
      });
    }

    // Calculate summary
    const summary = {
      totalRecommendations: recommendations.length,
      pauseRecommendations: recommendations.filter(r => r.type === 'pause').length,
      bidRecommendations: recommendations.filter(r => r.type.includes('bid')).length,
      otherRecommendations: recommendations.filter(r => !r.type.includes('pause') && !r.type.includes('bid')).length
    };

    // Store recommendations in database
    await sql`
      UPDATE campaign_analyses 
      SET recommendations = ${JSON.stringify(recommendations)}::jsonb
      WHERE id = ${analysisId}
    `;

    const result: OptimizationResult = {
      recommendations,
      summary
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Optimization error:', error);
    res.status(500).json({ 
      error: 'Failed to generate optimization recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
