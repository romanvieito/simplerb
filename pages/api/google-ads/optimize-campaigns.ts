import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

interface Recommendation {
  type: 'pause' | 'bid_increase' | 'bid_decrease' | 'ad_copy' | 'negative_keyword' | 'budget' | 'geography' | 'targeting' | 'tracking' | 'cta_improvement' | 'budget_boost' | 'audience_exclusion';
  entity: 'keyword' | 'ad' | 'campaign' | 'ad_group';
  campaign: string;
  ad_group?: string;
  keyword_or_ad: string;
  issue: string;
  suggestion: string;
  evidence: string;
  priority: 'high' | 'medium' | 'low';
  impact: 'high' | 'medium' | 'low';
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

    // Fetch data from normalized tables
    const [keywordsResult, adsResult, geographyResult] = await Promise.all([
      sql`
        SELECT * FROM campaign_keywords 
        WHERE analysis_id = ${analysisId}
        ORDER BY campaign_name, ad_group_name, keyword
      `,
      sql`
        SELECT * FROM campaign_ads 
        WHERE analysis_id = ${analysisId}
        ORDER BY campaign_name, ad_group_name, ad_text
      `,
      sql`
        SELECT * FROM campaign_geography 
        WHERE analysis_id = ${analysisId}
        ORDER BY campaign_name, location
      `
    ]);

    const keywords = keywordsResult.rows;
    const ads = adsResult.rows;
    const geography = geographyResult.rows;
    const recommendations: Recommendation[] = [];

    // Analysis thresholds
    const HIGH_IMPRESSIONS_THRESHOLD = 500;
    const LOW_CTR_THRESHOLD = 1.0; // 1%
    const LOW_QUALITY_SCORE_THRESHOLD = 3;
    const HIGH_CPC_THRESHOLD = 2.0; // $2.00
    const LOW_CPC_THRESHOLD = 0.5; // $0.50
    const BUDGET_UTILIZATION_THRESHOLD = 0.8; // 80%

    // Group keywords by campaign for analysis
    const campaignKeywordGroups = new Map<string, any[]>();
    keywords.forEach(keyword => {
      if (!campaignKeywordGroups.has(keyword.campaign_name)) {
        campaignKeywordGroups.set(keyword.campaign_name, []);
      }
      campaignKeywordGroups.get(keyword.campaign_name)!.push(keyword);
    });

    // Group ads by campaign for analysis
    const campaignAdGroups = new Map<string, any[]>();
    ads.forEach(ad => {
      if (!campaignAdGroups.has(ad.campaign_name)) {
        campaignAdGroups.set(ad.campaign_name, []);
      }
      campaignAdGroups.get(ad.campaign_name)!.push(ad);
    });

    // Analyze keywords for each campaign
    campaignKeywordGroups.forEach((campaignKeywords, campaignName) => {
      // Calculate campaign-level metrics from keywords
      const totalImpressions = campaignKeywords.reduce((sum: number, k: any) => sum + (k.impressions || 0), 0);
      const totalClicks = campaignKeywords.reduce((sum: number, k: any) => sum + (k.clicks || 0), 0);
      const totalCost = campaignKeywords.reduce((sum: number, k: any) => sum + (k.cost || 0), 0);
      const campaignCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      // Group keywords by ad group for analysis
      const adGroupGroups = new Map<string, any[]>();
      campaignKeywords.forEach((keyword: any) => {
        const adGroup = keyword.ad_group_name || 'No Ad Group';
        if (!adGroupGroups.has(adGroup)) {
          adGroupGroups.set(adGroup, []);
        }
        adGroupGroups.get(adGroup)!.push(keyword);
      });

      // Analyze keywords
      campaignKeywords.forEach((keyword: any) => {
        const impressions = keyword.impressions || 0;
        const clicks = keyword.clicks || 0;
        const ctr = keyword.ctr || 0;
        const qualityScore = keyword.quality_score;
        const keywordText = keyword.keyword || 'Unknown';

        // Rule 1: High impressions, zero clicks - suggest pausing
        if (impressions >= HIGH_IMPRESSIONS_THRESHOLD && clicks === 0) {
          recommendations.push({
            type: 'pause',
            entity: 'keyword',
            campaign: campaignName,
            ad_group: keyword.ad_group_name || undefined,
            keyword_or_ad: keywordText,
            issue: `High impressions (${impressions.toLocaleString()}) but zero clicks`,
            suggestion: 'Pause this keyword immediately to avoid wasted spend',
            evidence: `${impressions.toLocaleString()} impressions, 0 clicks`,
            priority: 'high',
            impact: 'high'
          });
        }

        // Rule 2: Low quality score
        if (qualityScore && (parseInt(qualityScore) <= LOW_QUALITY_SCORE_THRESHOLD || qualityScore.toLowerCase().includes('poor'))) {
          recommendations.push({
            type: 'bid_decrease',
            entity: 'keyword',
            campaign: campaignName,
            ad_group: keyword.ad_group_name || undefined,
            keyword_or_ad: keywordText,
            issue: `Low quality score: ${qualityScore}`,
            suggestion: 'Lower bids by 20-30% and improve ad relevance, landing page experience, and expected CTR',
            evidence: `Quality score: ${qualityScore}`,
            priority: 'high',
            impact: 'medium'
          });
        }

        // Rule 3: Low CTR with decent impressions
        if (impressions >= 100 && ctr < LOW_CTR_THRESHOLD) {
          recommendations.push({
            type: 'ad_copy',
            entity: 'keyword',
            campaign: campaignName,
            ad_group: keyword.ad_group_name || undefined,
            keyword_or_ad: keywordText,
            issue: `Low CTR: ${(ctr * 100).toFixed(2)}% with ${impressions.toLocaleString()} impressions`,
            suggestion: 'Test 2-3 new responsive ads with stronger CTAs and more relevant headlines',
            evidence: `CTR: ${(ctr * 100).toFixed(2)}%, Impressions: ${impressions.toLocaleString()}`,
            priority: 'medium',
            impact: 'medium'
          });
        }

        // Rule 4: High CTR with low impressions - suggest bid increase
        if (impressions >= 50 && ctr >= 3.0 && clicks >= 5) {
          const cost = keyword.cost || 0;
          const avgCPC = cost / clicks;
          recommendations.push({
            type: 'bid_increase',
            entity: 'keyword',
            campaign: campaignName,
            ad_group: keyword.ad_group_name || undefined,
            keyword_or_ad: keywordText,
            issue: `High performing keyword with limited reach`,
            suggestion: `Increase Max CPC to $${(avgCPC * 1.5).toFixed(2)}-$${(avgCPC * 2).toFixed(2)} to capture more impressions`,
            evidence: `CTR: ${(ctr * 100).toFixed(2)}%, Avg CPC: $${avgCPC.toFixed(2)}, Impressions: ${impressions.toLocaleString()}`,
            priority: 'medium',
            impact: 'high'
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
            suggestion: 'Create 2-3 new responsive ads with stronger CTAs and test different headlines',
            evidence: `Ad group CTR: ${adGroupCTR.toFixed(2)}%, Impressions: ${adGroupImpressions.toLocaleString()}`,
            priority: 'high',
            impact: 'medium'
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
              suggestion: 'Lower Max CPC bids by 20-30% and focus on long-tail keywords for better cost efficiency',
              evidence: `Avg CPC: $${avgCPC.toFixed(2)}, Total cost: $${totalCost.toFixed(2)}`,
              priority: 'high',
              impact: 'high'
            });
          }
        }
      }
    });

    // Geographic analysis
    if (geography.length > 0) {
      const locationGroups = new Map<string, any[]>();
      geography.forEach((geo: any) => {
        const location = geo.location;
        if (!locationGroups.has(location)) {
          locationGroups.set(location, []);
        }
        locationGroups.get(location)!.push(geo);
      });

      locationGroups.forEach((locationData, location) => {
        const locationImpressions = locationData.reduce((sum: number, g: any) => sum + (g.impressions || 0), 0);
        const locationClicks = locationData.reduce((sum: number, g: any) => sum + (g.clicks || 0), 0);
        const locationCTR = locationImpressions > 0 ? (locationClicks / locationImpressions) * 100 : 0;

        if (locationImpressions >= 500 && locationCTR < 0.5) {
          recommendations.push({
            type: 'geography',
            entity: 'campaign',
            campaign: 'Multiple Campaigns',
            keyword_or_ad: location,
            issue: `Location underperforming: ${location}`,
            suggestion: `Exclude ${location} from targeting or reduce location bid adjustments by 50-70%`,
            evidence: `Location CTR: ${locationCTR.toFixed(2)}%, Impressions: ${locationImpressions.toLocaleString()}`,
            priority: 'medium',
            impact: 'medium'
          });
        }
      });
    }

    // Add budget boost recommendations for high-performing campaigns
    const campaignGroups = new Map<string, any[]>();
    keywords.forEach((keyword: any) => {
      if (!campaignGroups.has(keyword.campaign_name)) {
        campaignGroups.set(keyword.campaign_name, []);
      }
      campaignGroups.get(keyword.campaign_name)!.push(keyword);
    });

    campaignGroups.forEach((campaignKeywords, campaignName) => {
      const totalImpressions = campaignKeywords.reduce((sum: number, k: any) => sum + (k.impressions || 0), 0);
      const totalClicks = campaignKeywords.reduce((sum: number, k: any) => sum + (k.clicks || 0), 0);
      const totalCost = campaignKeywords.reduce((sum: number, k: any) => sum + (k.cost || 0), 0);
      const campaignCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0;
      const avgCPC = totalClicks > 0 ? totalCost / totalClicks : 0;

      // Rule 9: Budget boost for high-performing campaigns
      if (totalImpressions >= 1000 && campaignCTR >= 2.0 && avgCPC <= 1.5) {
        recommendations.push({
          type: 'budget_boost',
          entity: 'campaign',
          campaign: campaignName,
          keyword_or_ad: campaignName,
          issue: `High-performing campaign with good cost efficiency`,
          suggestion: `Raise daily budget to $${(totalCost * 1.5).toFixed(0)}+ and Max CPC to $${(avgCPC * 1.5).toFixed(2)}-$${(avgCPC * 2).toFixed(2)} for more impressions`,
          evidence: `Campaign CTR: ${(campaignCTR * 100).toFixed(2)}%, Avg CPC: $${avgCPC.toFixed(2)}, Total cost: $${totalCost.toFixed(2)}`,
          priority: 'high',
          impact: 'high'
        });
      }
    });

    // Add negative keyword suggestions
    const zeroClickKeywords = keywords.filter((k: any) => (k.impressions || 0) >= 100 && (k.clicks || 0) === 0);
    if (zeroClickKeywords.length > 0) {
      const topZeroClickKeywords = zeroClickKeywords.slice(0, 5);
      topZeroClickKeywords.forEach((keyword: any) => {
        recommendations.push({
          type: 'negative_keyword',
          entity: 'keyword',
          campaign: keyword.campaign_name,
          ad_group: keyword.ad_group_name || undefined,
          keyword_or_ad: keyword.keyword,
          issue: `Zero clicks with ${keyword.impressions} impressions`,
          suggestion: `Add "${keyword.keyword}" as negative keyword to avoid irrelevant traffic`,
          evidence: `${keyword.impressions} impressions, 0 clicks`,
          priority: 'medium',
          impact: 'medium'
        });
      });
    }

    // Add tracking recommendations
    const campaignsWithoutTracking = Array.from(new Set(keywords.map((k: any) => k.campaign_name)));
    campaignsWithoutTracking.forEach(campaignName => {
      recommendations.push({
        type: 'tracking',
        entity: 'campaign',
        campaign: campaignName,
        keyword_or_ad: campaignName,
        issue: 'Missing conversion tracking setup',
        suggestion: 'Enable conversion tracking to measure ROI and optimize for conversions',
        evidence: 'No conversion data available for analysis',
        priority: 'high',
        impact: 'high'
      });
    });

    // Calculate summary
    const summary = {
      totalRecommendations: recommendations.length,
      pauseRecommendations: recommendations.filter(r => r.type === 'pause').length,
      bidRecommendations: recommendations.filter(r => r.type.includes('bid')).length,
      budgetRecommendations: recommendations.filter(r => r.type.includes('budget')).length,
      adCopyRecommendations: recommendations.filter(r => r.type === 'ad_copy').length,
      negativeKeywordRecommendations: recommendations.filter(r => r.type === 'negative_keyword').length,
      geographyRecommendations: recommendations.filter(r => r.type === 'geography').length,
      trackingRecommendations: recommendations.filter(r => r.type === 'tracking').length,
      otherRecommendations: recommendations.filter(r => !['pause', 'bid_increase', 'bid_decrease', 'budget', 'ad_copy', 'negative_keyword', 'geography', 'tracking'].includes(r.type)).length
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
