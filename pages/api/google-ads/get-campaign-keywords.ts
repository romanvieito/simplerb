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
  conversions: number;
  conversionValueMicros: number;
  conversionRate: number;
  costPerConversionMicros: number;
  valuePerConversionMicros: number;
  impressionShare?: number;
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

    // Optional: filter by date range from query params
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;

    const customer = getGoogleAdsCustomer();

    // Calculate date range for metrics (default to last 30 days if not provided)
    let startDateStr: string;
    let endDateStr: string;

    if (startDateParam && endDateParam) {
      // Use provided date range
      startDateStr = startDateParam;
      endDateStr = endDateParam;
    } else {
      // Default to last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);
      startDateStr = startDate.toISOString().split('T')[0];
      endDateStr = endDate.toISOString().split('T')[0];
    }

    // Query to get all keywords from enabled campaigns with metrics
    // Note: Metrics require a date range, so we use segments.date
    // When using segments.date in WHERE, we should include it in SELECT for proper aggregation
    // Note: Some metrics like quality_score and impression_share may not be available for all keywords
    // We try to include them but the query will handle gracefully if they're not available
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
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value,
        metrics.conversions_from_interactions_rate,
        metrics.cost_per_conversion,
        metrics.value_per_conversion,
        metrics.search_impression_share,
        metrics.quality_score
      FROM keyword_view
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_criterion.status = 'ENABLED'
        AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        ${campaignIds ? `AND campaign.id IN (${campaignIds.map(id => id.trim()).join(',')})` : ''}
      ORDER BY campaign.id, ad_group.id, ad_group_criterion.keyword.text, segments.date
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
      // Extract detailed error information from Google Ads API error
      let errorDetails = {
        message: queryError?.message,
        code: queryError?.code,
        details: queryError?.details,
      };
      
      // Google Ads API errors often have nested error structures
      if (queryError?.errors && Array.isArray(queryError.errors)) {
        errorDetails = {
          ...errorDetails,
          message: queryError.errors.map((e: any) => e.message || e.errorString || JSON.stringify(e)).join('; '),
          code: queryError.errors[0]?.errorCode?.errorCode || queryError.errors[0]?.errorCode || queryError.code,
        };
      } else if (queryError?.error?.errors && Array.isArray(queryError.error.errors)) {
        errorDetails = {
          ...errorDetails,
          message: queryError.error.errors.map((e: any) => e.message || e.errorString || JSON.stringify(e)).join('; '),
          code: queryError.error.errors[0]?.errorCode?.errorCode || queryError.error.errors[0]?.errorCode,
        };
      }
      
      console.error('Query error details:', errorDetails);
      console.error('Full error object:', JSON.stringify(queryError, null, 2));
      
      // If the query fails, try a query with only basic metrics (the ones we know work)
      console.log('Trying query with basic metrics only...');
      
      try {
        const basicMetricsQuery = `
          SELECT
            campaign.id,
            campaign.name,
            ad_group.id,
            ad_group.name,
            ad_group_criterion.keyword.text,
            ad_group_criterion.keyword.match_type,
            ad_group_criterion.cpc_bid_micros,
            ad_group_criterion.status,
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.conversions_value,
            metrics.conversions_from_interactions_rate,
            metrics.cost_per_conversion
          FROM keyword_view
          WHERE campaign.status = 'ENABLED'
            AND ad_group.status = 'ENABLED'
            AND ad_group_criterion.status = 'ENABLED'
            AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
            ${campaignIds ? `AND campaign.id IN (${campaignIds.map(id => id.trim()).join(',')})` : ''}
          ORDER BY campaign.id, ad_group.id, ad_group_criterion.keyword.text, segments.date
        `;
        
        const basicResponse = await customer.query(basicMetricsQuery);
        
        if (Array.isArray(basicResponse)) {
          rows = basicResponse;
        } else if (basicResponse && Array.isArray((basicResponse as any).rows)) {
          rows = (basicResponse as any).rows;
        } else if (basicResponse && Array.isArray((basicResponse as any).results)) {
          rows = (basicResponse as any).results;
        }
        
        console.log(`Basic metrics query returned ${rows.length} rows`);
      } catch (basicError) {
        console.error('Basic metrics query also failed:', basicError);
        throw queryError; // Throw original error
      }
    }

    // Aggregate metrics if we had multiple date rows per keyword
    // When using segments.date in SELECT, the API returns one row per day per keyword
    // We aggregate these to get total metrics for the date range
    const keywordMap = new Map<string, CampaignKeyword>();
    
    // Debug: log first row structure to understand data format
    if (rows.length > 0) {
      console.log('Sample row structure:', JSON.stringify(rows[0], null, 2));
      console.log('First row metrics:', rows[0]?.metrics);
    }
    
    rows.forEach((row: any) => {
      const keywordText = row.ad_group_criterion?.keyword?.text || '';
      const campaignId = row.campaign?.id?.toString() || '';
      const adGroupId = row.ad_group?.id?.toString() || '';
      
      if (!keywordText) {
        return; // Skip rows without keywords
      }
      
      // Create unique key for keyword aggregation
      const key = `${campaignId}_${adGroupId}_${keywordText}`;
      
      // Parse metrics with proper number conversion
      const impressions = parseInt(row.metrics?.impressions || 0, 10);
      const clicks = parseInt(row.metrics?.clicks || 0, 10);
      const costMicros = parseInt(row.metrics?.cost_micros || 0, 10);
      const conversions = parseFloat(row.metrics?.conversions || 0);
      const conversionValueMicros = parseFloat(row.metrics?.conversions_value || 0);
      
      if (keywordMap.has(key)) {
        // Aggregate metrics if multiple rows exist for the same keyword (multiple dates)
        const existing = keywordMap.get(key)!;
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.costMicros += costMicros;
        existing.conversions += conversions;
        existing.conversionValueMicros += conversionValueMicros;
        
        // Recalculate derived metrics from aggregated values
        existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
        existing.averageCpcMicros = existing.clicks > 0 ? existing.costMicros / existing.clicks : 0;
        existing.conversionRate = existing.clicks > 0 ? existing.conversions / existing.clicks : 0;
        existing.costPerConversionMicros = existing.conversions > 0 ? existing.costMicros / existing.conversions : 0;
        existing.valuePerConversionMicros = existing.conversions > 0 ? existing.conversionValueMicros / existing.conversions : 0;
        
        // Impression share and quality score: use average if multiple values, or keep first non-zero value
        if (row.metrics?.search_impression_share !== undefined && row.metrics?.search_impression_share !== null) {
          existing.impressionShare = existing.impressionShare !== undefined 
            ? (existing.impressionShare + row.metrics.search_impression_share) / 2 
            : row.metrics.search_impression_share;
        }
        if (row.metrics?.quality_score !== undefined && row.metrics?.quality_score !== null) {
          existing.qualityScore = existing.qualityScore !== undefined
            ? (existing.qualityScore + row.metrics.quality_score) / 2
            : row.metrics.quality_score;
        }
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
          impressions,
          clicks,
          costMicros,
          ctr: row.metrics?.ctr || (impressions > 0 ? clicks / impressions : 0),
          averageCpcMicros: row.metrics?.average_cpc || (clicks > 0 ? costMicros / clicks : 0),
          conversions,
          conversionValueMicros,
          conversionRate: clicks > 0 ? conversions / clicks : (row.metrics?.conversions_from_interactions_rate || 0),
          costPerConversionMicros: conversions > 0 
            ? costMicros / conversions 
            : (row.metrics?.cost_per_conversion ? parseFloat(row.metrics.cost_per_conversion) * 1000000 : 0),
          valuePerConversionMicros: conversions > 0 
            ? conversionValueMicros / conversions 
            : (row.metrics?.value_per_conversion ? parseFloat(row.metrics.value_per_conversion) * 1000000 : 0),
          impressionShare: row.metrics?.search_impression_share !== undefined && row.metrics?.search_impression_share !== null 
            ? row.metrics.search_impression_share 
            : undefined,
          qualityScore: row.metrics?.quality_score !== undefined && row.metrics?.quality_score !== null
            ? row.metrics.quality_score
            : undefined,
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

