import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateCopyRequest {
  keywords: string[];
  brand?: string;
  landingUrl?: string;
  campaignType?: 'SEARCH' | 'PMAX';
}

interface GenerateCopyResponse {
  headlines: string[];
  descriptions: string[];
  longHeadlines?: string[]; // For Performance Max
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keywords, brand, landingUrl, campaignType = 'SEARCH' }: GenerateCopyRequest = req.body;

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords are required' });
    }

    const brandName = brand || 'Our Business';
    const landingPage = landingUrl || 'our website';

    // Generate headlines and descriptions using OpenAI
    const prompt = `
Create compelling Google Ads copy for ${campaignType} campaigns.

Brand: ${brandName}
Keywords: ${keywords.join(', ')}
Landing Page: ${landingPage}

Generate ${campaignType === 'PMAX' ? '15' : '15'} unique headlines (max 30 characters each) and 4 descriptions (max 90 characters each).

For Search campaigns:
- Focus on keyword relevance
- Include clear value propositions
- Use action words

For Performance Max campaigns:
- Make headlines more general and brand-focused
- Emphasize benefits and outcomes
- Include emotional triggers

Format as JSON:
{
  "headlines": ["headline1", "headline2", ...],
  "descriptions": ["desc1", "desc2", "desc3", "desc4"]
}${campaignType === 'PMAX' ? ',\n  "longHeadlines": ["long1", "long2", "long3"]' : ''}

Ensure all headlines are under 30 characters and descriptions under 90 characters.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert Google Ads copywriter. Generate high-converting ad copy that follows Google Ads best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let adCopy: GenerateCopyResponse;
    try {
      adCopy = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseText);
      // Fallback to basic copy generation
      adCopy = generateFallbackCopy(keywords, brandName, campaignType);
    }

    // Validate and clean the copy
    adCopy.headlines = adCopy.headlines
      .filter(headline => headline.length <= 30)
      .slice(0, 15);

    adCopy.descriptions = adCopy.descriptions
      .filter(desc => desc.length <= 90)
      .slice(0, 4);

    if (adCopy.longHeadlines) {
      adCopy.longHeadlines = adCopy.longHeadlines
        .filter(headline => headline.length <= 90)
        .slice(0, 5);
    }

    // Remove duplicates
    adCopy.headlines = Array.from(new Set(adCopy.headlines));
    adCopy.descriptions = Array.from(new Set(adCopy.descriptions));
    if (adCopy.longHeadlines) {
      adCopy.longHeadlines = Array.from(new Set(adCopy.longHeadlines));
    }

    res.status(200).json(adCopy);

  } catch (error) {
    console.error('Error generating ad copy:', error);
    res.status(500).json({ error: 'Failed to generate ad copy' });
  }
}

function generateFallbackCopy(keywords: string[], brand: string, campaignType: string): GenerateCopyResponse {
  const primaryKeyword = keywords[0] || 'products';
  
  const headlines = [
    `${brand} ${primaryKeyword}`,
    `Best ${primaryKeyword} Online`,
    `Quality ${primaryKeyword} Here`,
    `${brand} - ${primaryKeyword}`,
    `Shop ${primaryKeyword} Today`,
    `Premium ${primaryKeyword}`,
    `${primaryKeyword} Deals`,
    `Top ${primaryKeyword} Store`,
    `${brand} ${primaryKeyword} Sale`,
    `${primaryKeyword} Discount`,
    `Buy ${primaryKeyword} Now`,
    `${brand} ${primaryKeyword} Shop`,
    `${primaryKeyword} Online Store`,
    `Great ${primaryKeyword} Deals`,
    `${brand} Quality ${primaryKeyword}`
  ].slice(0, 15);

  const descriptions = [
    `Shop the best ${primaryKeyword} at ${brand}. Quality products, great prices, fast shipping.`,
    `Find premium ${primaryKeyword} at ${brand}. Expert service and competitive pricing.`,
    `Discover top-rated ${primaryKeyword} at ${brand}. Customer satisfaction guaranteed.`,
    `Get the best deals on ${primaryKeyword} at ${brand}. Free shipping available.`
  ];

  const result: GenerateCopyResponse = { headlines, descriptions };

  if (campaignType === 'PMAX') {
    result.longHeadlines = [
      `${brand} - Your Trusted Source for Premium ${primaryKeyword}`,
      `Shop ${primaryKeyword} at ${brand} - Quality & Service You Can Trust`,
      `Find the Best ${primaryKeyword} Deals at ${brand} Today`,
      `${brand} ${primaryKeyword} - Expert Service, Great Prices`,
      `Premium ${primaryKeyword} Selection at ${brand} - Shop Now`
    ];
  }

  return result;
}
