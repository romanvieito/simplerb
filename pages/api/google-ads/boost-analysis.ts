import { NextApiRequest, NextApiResponse } from 'next';

interface BoostRequest {
  timePeriod: string;
  visibleColumns: string[];
  campaigns: any[];
  summary: {
    totalSpend: number;
    totalConversions: number;
    totalConversionValue: number;
    averageCtr: number;
    averageCpc: number;
    averageConversionRate: number;
    averageCpa: number;
    averageRoas: number;
    totalBudget: number;
    budgetUtilization: number;
    totalImpressions: number;
    totalClicks: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { timePeriod, visibleColumns, campaigns, summary } = req.body as BoostRequest;

    console.log('Boost analysis request received:', {
      timePeriod,
      visibleColumnsCount: visibleColumns?.length,
      campaignsCount: campaigns?.length,
      hasSummary: !!summary
    });

    if (!campaigns || campaigns.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No campaign data provided' 
      });
    }

    // Format the data for the prompt
    const campaignsData = campaigns.map((campaign, idx) => {
      const parts = [`Campaign ${idx + 1}:`];
      Object.entries(campaign).forEach(([key, value]) => {
        parts.push(`  ${key}: ${JSON.stringify(value)}`);
      });
      return parts.join('\n');
    }).join('\n\n');

    // Build the prompt
    const prompt = `You are an expert Google Ads consultant analyzing campaign performance data. Provide comprehensive, actionable analysis.

TIME PERIOD: ${timePeriod}

VISIBLE METRICS: ${visibleColumns.join(', ')}

SUMMARY METRICS:
- Total Spend: $${summary.totalSpend.toFixed(2)}
- Total Budget: $${summary.totalBudget.toFixed(2)}
- Budget Utilization: ${summary.budgetUtilization.toFixed(2)}%
- Total Impressions: ${summary.totalImpressions.toLocaleString()}
- Total Clicks: ${summary.totalClicks.toLocaleString()}
- Total Conversions: ${summary.totalConversions}
- Total Conversion Value: $${summary.totalConversionValue.toFixed(2)}
- Average CTR: ${summary.averageCtr.toFixed(2)}%
- Average CPC: $${summary.averageCpc.toFixed(2)}
- Average Conversion Rate: ${summary.averageConversionRate.toFixed(2)}%
- Average CPA: $${summary.averageCpa.toFixed(2)}
- Average ROAS: ${summary.averageRoas.toFixed(2)}x

CAMPAIGN DATA:
${campaignsData}

Based on this data, provide a comprehensive analysis with the following sections:

1. EXECUTIVE SUMMARY
   - Overall performance assessment
   - Key findings (2-3 bullet points)

2. KEY PERFORMANCE INSIGHTS
   - What's working well
   - Areas of concern
   - Notable trends or patterns

3. OPTIMIZATION RECOMMENDATIONS
   - Specific, actionable recommendations (prioritized)
   - Expected impact of each recommendation
   - Quick wins vs. long-term improvements

4. BUDGET OPTIMIZATION
   - Budget allocation suggestions
   - Campaigns to scale up or down
   - ROI improvement opportunities

5. CAMPAIGN-SPECIFIC INSIGHTS
   - Best performing campaigns and why
   - Underperforming campaigns and how to fix them
   - Comparison insights

6. STRATEGIC SUGGESTIONS
   - Testing opportunities
   - New targeting or messaging angles
   - Competitive positioning ideas

7. RED FLAGS & CONCERNS
   - Any anomalies or urgent issues
   - Risk factors to address

Format your response with clear section headers and bullet points. Be specific with numbers and percentages. Focus on actionable insights.

You are an expert Google Ads consultant with deep knowledge of campaign optimization, bidding strategies, and performance marketing. Provide clear, actionable, data-driven recommendations.`;

    // Direct call to OpenAI API (server-side)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return res.status(500).json({
        success: false,
        error: 'Server misconfiguration: OPENAI_API_KEY is not set'
      });
    }

    const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        n: 1,
        stream: false,
      }),
    });

    if (!oaRes.ok) {
      const errorText = await oaRes.text();
      console.error('OpenAI API Error:', {
        status: oaRes.status,
        statusText: oaRes.statusText,
        errorText: errorText.substring(0, 500)
      });

      let errorMessage = `Failed to get AI analysis: ${oaRes.statusText}`;
      if (oaRes.status === 401) {
        errorMessage = 'OpenAI API key is missing or invalid. Please check your OPENAI_API_KEY in .env.local';
      } else if (oaRes.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
      } else if (oaRes.status >= 500) {
        errorMessage = 'OpenAI API server error. Please try again later.';
      }

      return res.status(oaRes.status).json({
        success: false,
        error: errorMessage
      });
    }

    const oaJson = await oaRes.json();
    const analysis: string = oaJson?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!analysis) {
      console.error('No analysis text generated');
      return res.status(500).json({
        success: false,
        error: 'No analysis generated from AI'
      });
    }

    console.log('Analysis generated successfully, length:', analysis.length);

    return res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Boost analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

