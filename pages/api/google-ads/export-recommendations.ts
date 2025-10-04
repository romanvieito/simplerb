import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

interface Recommendation {
  type: string;
  entity: string;
  campaign: string;
  ad_group?: string;
  keyword_or_ad: string;
  issue: string;
  suggestion: string;
  evidence: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { analysisId, format } = req.body;

    if (!analysisId || !format) {
      return res.status(400).json({ error: 'Missing analysisId or format' });
    }

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({ error: 'Format must be csv or json' });
    }

    // Fetch analysis and recommendations
    const analysisResult = await sql`
      SELECT file_name, recommendations 
      FROM campaign_analyses 
      WHERE id = ${analysisId}
    `;

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const analysis = analysisResult.rows[0];
    const recommendations: Recommendation[] = analysis.recommendations || [];

    const baseFileName = analysis.file_name.replace('.csv', '') || 'analysis';

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Type',
        'Entity',
        'Campaign',
        'Ad Group',
        'Keyword/Ad',
        'Issue',
        'Suggestion',
        'Evidence'
      ];

      const csvRows = recommendations.map(rec => [
        rec.type,
        rec.entity,
        rec.campaign,
        rec.ad_group || '',
        rec.keyword_or_ad,
        rec.issue,
        rec.suggestion,
        rec.evidence
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => 
          row.map(field => 
            // Escape fields that contain commas or quotes
            typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
              ? `"${field.replace(/"/g, '""')}"`
              : field
          ).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFileName}-recommendations.csv"`);
      
      return res.status(200).json({
        data: csvContent,
        contentType: 'text/csv',
        filename: `${baseFileName}-recommendations.csv`
      });

    } else if (format === 'json') {
      // Generate JSON
      const jsonData = {
        analysisId: parseInt(analysisId),
        fileName: analysis.file_name,
        exportDate: new Date().toISOString(),
        recommendations: recommendations.map(rec => ({
          type: rec.type,
          entity: rec.entity,
          campaign: rec.campaign,
          adGroup: rec.ad_group || null,
          keywordOrAd: rec.keyword_or_ad,
          issue: rec.issue,
          suggestion: rec.suggestion,
          evidence: rec.evidence
        })),
        summary: {
          totalRecommendations: recommendations.length,
          byType: recommendations.reduce((acc, rec) => {
            acc[rec.type] = (acc[rec.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byEntity: recommendations.reduce((acc, rec) => {
            acc[rec.entity] = (acc[rec.entity] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${baseFileName}-recommendations.json"`);
      
      return res.status(200).json({
        data: JSON.stringify(jsonData, null, 2),
        contentType: 'application/json',
        filename: `${baseFileName}-recommendations.json`
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Failed to export recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
