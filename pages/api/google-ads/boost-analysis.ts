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

    // Call internal OpenAI API endpoint (streams via SSE) using gpt-5-nano
    const baseUrl = req.headers.host?.includes('localhost') 
      ? 'http://localhost:3000' 
      : `https://${req.headers.host}`;

    const response = await fetch(`${baseUrl}/api/openai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI internal API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500)
      });

      let errorMessage = `Failed to get AI analysis: ${response.statusText}`;
      if (response.status === 401) {
        errorMessage = 'OpenAI API key is missing or invalid. Please check your OPENAI_API_KEY in .env.local';
      } else if (response.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
      } else if (response.status >= 500) {
        errorMessage = 'OpenAI API server error. Please try again later.';
      }

      return res.status(response.status).json({
        success: false,
        error: errorMessage
      });
    }

    const reader = response.body?.getReader();
    if (!reader) {
      return res.status(500).json({ success: false, error: 'No response body' });
    }

    const decoder = new TextDecoder();
    let analysis = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const parsed = JSON.parse(jsonStr);
              if (parsed.text) {
                analysis += parsed.text;
              }
            } catch (_) {
              if (line !== 'data: [DONE]') {
                // ignore malformed lines
              }
            }
          }
        }
      }
    } catch (streamError) {
      console.error('Stream reading error:', streamError);
      return res.status(500).json({ success: false, error: 'Error reading AI response stream' });
    }

    if (!analysis || analysis.trim().length === 0) {
      return res.status(500).json({ success: false, error: 'No analysis generated from AI' });
    }

    return res.status(200).json({ success: true, analysis: analysis.trim() });

  } catch (error) {
    console.error('Boost analysis error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}

