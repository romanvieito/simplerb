import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import Papa from 'papaparse';

interface ParsedRow {
  [key: string]: string;
}

interface AnalysisResult {
  id: number;
  campaignCount: number;
  adGroupCount: number;
  keywordCount: number;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  avgCTR: number;
  previewRows: ParsedRow[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, csv, userEmail } = req.body;

    if (!fileName || !csv || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }


    // Parse CSV
    const parseResult = Papa.parse(csv, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim()
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV parsing failed', 
        details: parseResult.errors[0].message 
      });
    }

    const rows = parseResult.data as ParsedRow[];
    const headers = parseResult.meta.fields || [];

    // Validate required columns (case-insensitive)
    const requiredColumns = ['campaign', 'ad group', 'impressions', 'clicks', 'cost'];
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    const missingColumns = requiredColumns.filter(col => !normalizedHeaders.includes(col.toLowerCase()));
    
    if (missingColumns.length > 0) {
      return res.status(400).json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      });
    }

    // Check for at least one of Keyword or Ad (case-insensitive)
    if (!normalizedHeaders.includes('keyword') && !normalizedHeaders.includes('ad')) {
      return res.status(400).json({ 
        error: 'Must have either "Keyword" or "Ad" column' 
      });
    }

    // Calculate aggregates
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCost = 0;
    const campaigns = new Set<string>();
    const adGroups = new Set<string>();
    const keywords = new Set<string>();

    rows.forEach(row => {
      // Find column values using case-insensitive matching
      const impressions = parseInt(row.Impressions || row.impressions || '0');
      const clicks = parseInt(row.Clicks || row.clicks || '0');
      const cost = parseFloat(row.Cost || row.cost || '0');

      totalImpressions += impressions;
      totalClicks += clicks;
      totalCost += cost;

      if (row.Campaign || row.campaign) campaigns.add(row.Campaign || row.campaign);
      if (row['Ad group'] || row['Ad Group'] || row['ad group']) adGroups.add(row['Ad group'] || row['Ad Group'] || row['ad group']);
      if (row.Keyword || row.keyword) keywords.add(row.Keyword || row.keyword);
      if (row.Ad || row.ad) keywords.add(row.Ad || row.ad); // Treat ads as keywords for counting
    });

    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Insert analysis record
    const analysisResult = await sql`
      INSERT INTO campaign_analyses (
        user_email, file_name, campaign_count, analysis_status
      ) VALUES (
        ${userEmail}, ${fileName}, ${campaigns.size}, 'completed'
      ) RETURNING id
    `;

    const analysisId = analysisResult.rows[0].id;

    // Separate data by entity type and insert into appropriate tables
    const keywordsToInsert = [];
    const adsToInsert = [];
    const geographyToInsert = [];


    rows.forEach(row => {
      const campaignName = row.Campaign || row.campaign || '';
      const adGroupName = row['Ad group'] || row['Ad Group'] || row['ad group'] || null;
      const clicks = parseInt(row.Clicks || row.clicks || '0');
      const impressions = parseInt(row.Impressions || row.impressions || '0');
      const cost = parseFloat(row.Cost || row.cost || '0');
      const ctr = impressions > 0 ? (clicks / impressions) : 0;

      // Check if this row represents a keyword
      if (row.Keyword || row.keyword) {
        keywordsToInsert.push({
          analysis_id: analysisId,
          campaign_name: campaignName,
          ad_group_name: adGroupName,
          keyword: row.Keyword || row.keyword,
          match_type: row['Match type'] || row['match type'] || row['Match Type'] || null,
          clicks,
          impressions,
          cost,
          ctr,
          quality_score: row['Quality score'] || row['quality score'] || row['Quality Score'] || null
        });
      }

      // Check if this row represents an ad (either explicit Ad column or if no keyword but has ad-related data)
      const hasAdColumn = row.Ad || row.ad;
      const hasAdStrength = row['Ad strength'] || row['ad strength'] || row['Ad Strength'];
      const hasKeyword = row.Keyword || row.keyword;
      
      if (hasAdColumn || (!hasKeyword && hasAdStrength)) {
        // Use Ad column if available, otherwise try to construct from other fields
        const adText = hasAdColumn 
          ? (row.Ad || row.ad)
          : `Ad for ${campaignName}${adGroupName ? ` - ${adGroupName}` : ''}`;
          
        adsToInsert.push({
          analysis_id: analysisId,
          campaign_name: campaignName,
          ad_group_name: adGroupName,
          ad_text: adText,
          clicks,
          impressions,
          cost,
          ctr,
          ad_strength: hasAdStrength || null
        });
      }

      // Check if this row has geographic data
      if (row.Location || row.location || row.Geo || row.geo) {
        geographyToInsert.push({
          analysis_id: analysisId,
          campaign_name: campaignName,
          location: row.Location || row.location || row.Geo || row.geo,
          clicks,
          impressions,
          cost,
          ctr
        });
      }
    });

    // Insert keywords
    for (const keyword of keywordsToInsert) {
      await sql`
        INSERT INTO campaign_keywords (
          analysis_id, campaign_name, ad_group_name, keyword, match_type,
          clicks, impressions, cost, ctr, quality_score
        ) VALUES (
          ${keyword.analysis_id}, ${keyword.campaign_name}, ${keyword.ad_group_name},
          ${keyword.keyword}, ${keyword.match_type}, ${keyword.clicks}, ${keyword.impressions},
          ${keyword.cost}, ${keyword.ctr}, ${keyword.quality_score}
        )
      `;
    }

    // Insert ads
    for (const ad of adsToInsert) {
      await sql`
        INSERT INTO campaign_ads (
          analysis_id, campaign_name, ad_group_name, ad_text,
          clicks, impressions, cost, ctr, ad_strength
        ) VALUES (
          ${ad.analysis_id}, ${ad.campaign_name}, ${ad.ad_group_name},
          ${ad.ad_text}, ${ad.clicks}, ${ad.impressions},
          ${ad.cost}, ${ad.ctr}, ${ad.ad_strength}
        )
      `;
    }

    // Insert geography data
    for (const geo of geographyToInsert) {
      await sql`
        INSERT INTO campaign_geography (
          analysis_id, campaign_name, location,
          clicks, impressions, cost, ctr
        ) VALUES (
          ${geo.analysis_id}, ${geo.campaign_name}, ${geo.location},
          ${geo.clicks}, ${geo.impressions}, ${geo.cost}, ${geo.ctr}
        )
      `;
    }

    const result: AnalysisResult = {
      id: analysisId,
      campaignCount: campaigns.size,
      adGroupCount: adGroups.size,
      keywordCount: keywords.size,
      totalImpressions,
      totalClicks,
      totalCost,
      avgCTR,
      previewRows: rows.slice(0, 10)
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze CSV',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
