import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Sample campaign data for testing the dashboard
  const sampleMetrics = {
    totalImpressions: 125000,
    totalClicks: 2500,
    totalCost: 1250.50,
    totalConversions: 45,
    totalConversionValue: 2250.00,
    averageCtr: 2.0,
    averageCpc: 0.50,
    averageConversionRate: 1.8,
    averageCpa: 27.78,
    averageRoas: 1.8,
    totalBudget: 2000.00,
    budgetUtilization: 62.5,
    campaigns: [
      {
        id: '1',
        name: 'E-commerce Search Campaign',
        status: 'ENABLED',
        type: 'SEARCH',
        impressions: 50000,
        clicks: 1200,
        cost: 600.25,
        conversions: 22,
        conversionValue: 1100.00,
        ctr: 2.4,
        cpc: 0.50,
        conversionRate: 1.83,
        cpa: 27.28,
        roas: 1.83,
        budget: 1000.00,
        budgetUtilization: 60.0,
        qualityScore: 8
      },
      {
        id: '2',
        name: 'Brand Awareness Display',
        status: 'ENABLED',
        type: 'DISPLAY',
        impressions: 75000,
        clicks: 1300,
        cost: 650.25,
        conversions: 23,
        conversionValue: 1150.00,
        ctr: 1.73,
        cpc: 0.50,
        conversionRate: 1.77,
        cpa: 28.27,
        roas: 1.77,
        budget: 1000.00,
        budgetUtilization: 65.0,
        qualityScore: 7
      }
    ],
    performance: {
      bestPerformingCampaign: 'E-commerce Search Campaign',
      worstPerformingCampaign: 'Brand Awareness Display',
      topKeywords: [
        { keyword: 'buy shoes online', impressions: 15000, clicks: 450, cost: 225.00, conversions: 8, ctr: 3.0, cpc: 0.50, qualityScore: 9 },
        { keyword: 'running shoes', impressions: 12000, clicks: 300, cost: 150.00, conversions: 6, ctr: 2.5, cpc: 0.50, qualityScore: 8 },
        { keyword: 'sneakers', impressions: 8000, clicks: 160, cost: 80.00, conversions: 3, ctr: 2.0, cpc: 0.50, qualityScore: 7 }
      ],
      recommendations: [
        'Increase bids for "buy shoes online" - high quality score and conversion rate',
        'Pause "Brand Awareness Display" - low CTR and high CPA',
        'Add negative keywords to reduce irrelevant traffic',
        'Consider increasing budget for Search campaign - good performance'
      ]
    }
  };

  res.status(200).json({
    success: true,
    metrics: sampleMetrics,
    note: 'Sample data for dashboard testing'
  });
}
