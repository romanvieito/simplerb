import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

interface ExportRequest {
  draftId: string;
  format: 'google-ads-editor' | 'csv' | 'json';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userEmail = req.headers['x-user-email'] as string;
    if (!userEmail) {
      return res.status(401).json({ error: 'User email required' });
    }

    const { draftId, format }: ExportRequest = req.body;

    if (!draftId || !format) {
      return res.status(400).json({ error: 'Missing draftId or format' });
    }

    // Get user ID from email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `;
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;

    // Get campaign draft
    const draftResult = await sql`
      SELECT 
        id,
        name,
        campaign_data,
        generated_copy
      FROM campaign_drafts 
      WHERE id = ${draftId} AND user_id = ${userId}
    `;

    if (draftResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign draft not found' });
    }

    const draft = draftResult.rows[0];
    const campaignData = draft.campaign_data;
    const generatedCopy = draft.generated_copy;

    let exportData: string;
    let filename: string;
    let contentType: string;

    switch (format) {
      case 'google-ads-editor':
        // Generate Google Ads Editor CSV format
        const csvData = generateGoogleAdsEditorCSV(campaignData, generatedCopy);
        exportData = csvData;
        filename = `${draft.name.replace(/[^a-zA-Z0-9]/g, '_')}_google_ads.csv`;
        contentType = 'text/csv';
        break;

      case 'csv':
        // Generate simple CSV format
        const simpleCsv = generateSimpleCSV(campaignData, generatedCopy);
        exportData = simpleCsv;
        filename = `${draft.name.replace(/[^a-zA-Z0-9]/g, '_')}_campaign.csv`;
        contentType = 'text/csv';
        break;

      case 'json':
        // Generate JSON format
        exportData = JSON.stringify({
          campaign: campaignData,
          copy: generatedCopy,
          exportedAt: new Date().toISOString()
        }, null, 2);
        filename = `${draft.name.replace(/[^a-zA-Z0-9]/g, '_')}_campaign.json`;
        contentType = 'application/json';
        break;

      default:
        return res.status(400).json({ error: 'Invalid export format' });
    }

    // Update draft status to exported
    await sql`
      UPDATE campaign_drafts 
      SET status = 'exported', updated_at = NOW()
      WHERE id = ${draftId}
    `;

    res.status(200).json({
      success: true,
      data: exportData,
      filename,
      contentType,
      message: 'Campaign exported successfully'
    });

  } catch (error) {
    console.error('Error exporting campaign:', error);
    res.status(500).json({ 
      error: 'Failed to export campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function generateGoogleAdsEditorCSV(campaignData: any, generatedCopy: any): string {
  const rows = [];
  
  // Campaign row
  rows.push([
    'Campaign',
    `${campaignData.brand} – ${campaignData.type} – ${new Date().toLocaleDateString()}${campaignData.campaignNameSuffix ? ' ' + campaignData.campaignNameSuffix : ''}`,
    'Enabled',
    'Search',
    campaignData.budgetDaily,
    campaignData.url,
    campaignData.languages.join(',')
  ]);

  // Ad Group row
  rows.push([
    'Ad Group',
    'Main Ad Group',
    'Enabled'
  ]);

  // Keywords
  campaignData.keywords.forEach((keyword: string) => {
    rows.push([
      'Keyword',
      keyword,
      'Enabled',
      'Exact',
      '1.00' // Default bid
    ]);
  });

  // Ads
  generatedCopy.headlines.forEach((headline: string, index: number) => {
    if (index < 3) { // Google Ads allows max 3 headlines for responsive search ads
      rows.push([
        'Ad',
        headline,
        'Enabled',
        'Responsive Search Ad'
      ]);
    }
  });

  // Headers
  const headers = ['Type', 'Name', 'Status', 'Campaign Type', 'Budget', 'Final URL', 'Languages'];
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function generateSimpleCSV(campaignData: any, generatedCopy: any): string {
  const rows = [];
  
  rows.push(['Field', 'Value']);
  rows.push(['Campaign Type', campaignData.type]);
  rows.push(['Brand', campaignData.brand]);
  rows.push(['URL', campaignData.url]);
  rows.push(['Daily Budget', campaignData.budgetDaily]);
  rows.push(['Keywords', campaignData.keywords.join('; ')]);
  rows.push(['Languages', campaignData.languages.join(', ')]);
  rows.push(['Headlines', generatedCopy.headlines.join('; ')]);
  rows.push(['Descriptions', generatedCopy.descriptions.join('; ')]);
  
  return rows.map(row => row.join(',')).join('\n');
}
