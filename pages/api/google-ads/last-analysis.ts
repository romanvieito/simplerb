import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

interface LastAnalysisResponse {
  success: boolean;
  analysisId?: number;
  totals?: {
    impressions: number;
    clicks: number;
    cost: number;
    avgCtr: number;
  };
  campaigns?: Array<{
    name: string;
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number;
  }>;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<LastAnalysisResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
      return res.status(400).json({ success: false, error: 'User email required' });
    }

    // Get the latest completed analysis for the user
    const analysisResult = await sql`
      SELECT id, file_name, created_at
      FROM campaign_analyses
      WHERE user_email = ${userEmail} AND analysis_status = 'completed'
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (analysisResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        analysisId: undefined,
        totals: undefined,
        campaigns: undefined
      });
    }

    const analysisId = analysisResult.rows[0].id;

    // Try to get data from keywords first, then fall back to ads
    let keywordData = await sql`
      SELECT 
        campaign_name,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(cost) as total_cost,
        CASE 
          WHEN SUM(impressions) > 0 THEN SUM(clicks)::float / SUM(impressions)
          ELSE 0 
        END as ctr
      FROM campaign_keywords
      WHERE analysis_id = ${analysisId}
      GROUP BY campaign_name
      ORDER BY total_impressions DESC
    `;

    let dataSource = 'keywords';
    let rows = keywordData.rows;

    // If no keyword data, try ads
    if (rows.length === 0) {
      const adData = await sql`
        SELECT 
          campaign_name,
          SUM(impressions) as total_impressions,
          SUM(clicks) as total_clicks,
          SUM(cost) as total_cost,
          CASE 
            WHEN SUM(impressions) > 0 THEN SUM(clicks)::float / SUM(impressions)
            ELSE 0 
          END as ctr
        FROM campaign_ads
        WHERE analysis_id = ${analysisId}
        GROUP BY campaign_name
        ORDER BY total_impressions DESC
      `;
      
      rows = adData.rows;
      dataSource = 'ads';
    }

    // Calculate totals
    const totals = rows.reduce((acc: { impressions: number; clicks: number; cost: number; avgCtr: number }, row: any) => {
      acc.impressions += parseInt(row.total_impressions || '0');
      acc.clicks += parseInt(row.total_clicks || '0');
      acc.cost += parseFloat(row.total_cost || '0');
      return acc;
    }, { impressions: 0, clicks: 0, cost: 0, avgCtr: 0 });

    // Calculate average CTR
    totals.avgCtr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;

    // Format campaigns data
    const campaigns = rows.map((row: any) => ({
      name: row.campaign_name,
      impressions: parseInt(row.total_impressions || '0'),
      clicks: parseInt(row.total_clicks || '0'),
      cost: parseFloat(row.total_cost || '0'),
      ctr: parseFloat(row.ctr || '0')
    }));

    res.status(200).json({
      success: true,
      analysisId,
      totals,
      campaigns
    });

  } catch (error) {
    console.error('Error fetching last analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: `Failed to fetch latest analysis: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
