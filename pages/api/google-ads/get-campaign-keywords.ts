import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, validateAdPilotAccess, handleGoogleAdsError } from './client';

interface CampaignKeyword {
  campaignId: string;
  campaignName: string;
  adGroupId: string;
  adGroupName: string;
  keyword: string;
  matchType: string;
  cpcBidMicros: number;
  status: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  ctr: number;
  averageCpcMicros: number;
  qualityScore?: number;
}

interface GetCampaignKeywordsResponse {
  success: boolean;
  keywords?: CampaignKeyword[];
  error?: string;
  totalKeywords?: number;
  campaigns?: string[];
  adGroups?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetCampaignKeywordsResponse>
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

    // Optional: filter by campaign IDs from query params
    const campaignIds = req.query.campaignIds 
      ? (typeof req.query.campaignIds === 'string' 
          ? req.query.campaignIds.split(',') 
          : req.query.campaignIds)
      : null;

    const customer = getGoogleAdsCustomer();

    // Calculate date range for metrics (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Query to get all keywords from enabled campaigns with metrics
    // Note: Metrics require a date range, so we use segments.date
    const query = `
      SELECT 
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.cpc_bid_micros,
        ad_group_criterion.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.quality_score
      FROM keyword_view
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_criterion.status = 'ENABLED'
        AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        ${campaignIds ? `AND campaign.id IN (${campaignIds.map(id => id.trim()).join(',')})` : ''}
      ORDER BY campaign.id, ad_group.id, ad_group_criterion.keyword.text
    `;

    console.log('Fetching keywords from Google Ads campaigns...');
    console.log('Query:', query);
    
    let response;
    let rows: any[] = [];
    
    try {
      response = await customer.query(query);
      
      // Normalize response: handle different response formats
      if (Array.isArray(response)) {
        rows = response;
      } else if (response && Array.isArray((response as any).rows)) {
        rows = (response as any).rows;
      } else if (response && Array.isArray((response as any).results)) {
        rows = (response as any).results;
      } else if (response && typeof response.forEach === 'function') {
        // If it's iterable but not an array
        rows = Array.from(response as any);
      } else {
        rows = [];
      }
      
      console.log(`Received ${rows.length} rows from API`);
    } catch (queryError: any) {
      console.error('Query error details:', {
        error: queryError,
        message: queryError?.message,
        code: queryError?.code,
        details: queryError?.details,
        stack: queryError?.stack
      });
      
      // If the query fails, try a simpler query without metrics first
      console.log('Trying simpler query without date range...');
      
      try {
        const simpleQuery = `
          SELECT 
            campaign.id,
            campaign.name,
            ad_group.id,
            ad_group.name,
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.cpc_bid_micros,
            ad_group_criterion.status
          FROM keyword_view
          WHERE campaign.status = 'ENABLED'
            AND ad_group.status = 'ENABLED'
            AND ad_group_criterion.status = 'ENABLED'
            ${campaignIds ? `AND campaign.id IN (${campaignIds.map(id => id.trim()).join(',')})` : ''}
          ORDER BY campaign.id, ad_group.id, ad_group_criterion.keyword.text
          LIMIT 1000
        `;
        
        const simpleResponse = await customer.query(simpleQuery);
        
        if (Array.isArray(simpleResponse)) {
          rows = simpleResponse;
        } else if (simpleResponse && Array.isArray((simpleResponse as any).rows)) {
          rows = (simpleResponse as any).rows;
        } else if (simpleResponse && Array.isArray((simpleResponse as any).results)) {
          rows = (simpleResponse as any).results;
        }
        
        console.log(`Simple query returned ${rows.length} rows`);
      } catch (simpleError) {
        console.error('Simple query also failed:', simpleError);
        throw queryError; // Throw original error
      }
    }

    // Aggregate metrics if we had multiple date rows per keyword
    const keywordMap = new Map<string, CampaignKeyword>();
    
    rows.forEach((row: any) => {
      const keywordText = row.ad_group_criterion?.keyword?.text || '';
      const campaignId = row.campaign?.id?.toString() || '';
      const adGroupId = row.ad_group?.id?.toString() || '';
      
      if (!keywordText) {
        return; // Skip rows without keywords
      }
      
      // Create unique key for keyword aggregation
      const key = `${campaignId}_${adGroupId}_${keywordText}`;
      
      if (keywordMap.has(key)) {
        // Aggregate metrics if multiple rows exist for the same keyword
        const existing = keywordMap.get(key)!;
        existing.impressions += row.metrics?.impressions || 0;
        existing.clicks += row.metrics?.clicks || 0;
        existing.costMicros += row.metrics?.cost_micros || 0;
        // Recalculate CTR from aggregated values
        existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
        existing.averageCpcMicros = existing.clicks > 0 ? existing.costMicros / existing.clicks : 0;
      } else {
        const keyword: CampaignKeyword = {
          campaignId,
          campaignName: row.campaign?.name || '',
          adGroupId,
          adGroupName: row.ad_group?.name || '',
          keyword: keywordText,
          matchType: row.ad_group_criterion?.keyword?.match_type || '',
          cpcBidMicros: row.ad_group_criterion?.cpc_bid_micros || 0,
          status: row.ad_group_criterion?.status || '',
          impressions: row.metrics?.impressions || 0,
          clicks: row.metrics?.clicks || 0,
          costMicros: row.metrics?.cost_micros || 0,
          ctr: row.metrics?.ctr || 0,
          averageCpcMicros: row.metrics?.average_cpc || 0,
          qualityScore: row.metrics?.quality_score || undefined,
        };
        
        keywordMap.set(key, keyword);
      }
    });
    
    // Convert map to array
    const keywords = Array.from(keywordMap.values());
    
    const campaignSet = new Set<string>();
    const adGroupSet = new Set<string>();
    
    keywords.forEach(keyword => {
      if (keyword.campaignId && keyword.campaignName) {
        campaignSet.add(`${keyword.campaignId}:${keyword.campaignName}`);
      }
      if (keyword.adGroupId && keyword.adGroupName) {
        adGroupSet.add(`${keyword.adGroupId}:${keyword.adGroupName}`);
      }
    });

    console.log(`✅ Fetched ${keywords.length} keywords from ${campaignSet.size} campaigns`);

    return res.status(200).json({
      success: true,
      keywords,
      totalKeywords: keywords.length,
      campaigns: Array.from(campaignSet),
      adGroups: Array.from(adGroupSet),
    });

  } catch (error: any) {
    console.error('Error fetching campaign keywords:', error);
    console.error('Error stack:', error?.stack);
    
    const errorInfo = handleGoogleAdsError(error);
    
    // Provide more detailed error information
    let errorMessage = `Failed to fetch keywords: ${errorInfo.message}`;
    
    if (error?.code) {
      errorMessage += ` (Code: ${error.code})`;
    }
    
    if (error?.message?.includes('PERMISSION_DENIED')) {
      errorMessage = 'Permission denied. Please check your Google Ads API access and customer ID.';
    } else if (error?.message?.includes('INVALID_ARGUMENT')) {
      errorMessage = 'Invalid query. Please check your Google Ads account has campaigns with keywords.';
    } else if (error?.message?.includes('NOT_FOUND')) {
      errorMessage = 'No campaigns found or customer ID is incorrect.';
    } else if (error?.message?.includes('invalid_grant')) {
      errorMessage = 'OAuth token expired. Please refresh your Google Ads API credentials.';
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}

