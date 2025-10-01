import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleAdsApi } from 'google-ads-api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    const { keywords } = req.body;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Received request:', req.body);
    }

  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ message: 'Keywords are required' });
  }

  try {
    // Check if environment variables are set
    if (process.env.NODE_ENV !== 'production') {
      console.log('GOOGLE_ADS_CLIENT_ID:', process.env.GOOGLE_ADS_CLIENT_ID);
      console.log('GOOGLE_ADS_CLIENT_SECRET:', process.env.GOOGLE_ADS_CLIENT_SECRET);
      console.log('GOOGLE_ADS_DEVELOPER_TOKEN:', process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
      console.log('GOOGLE_ADS_REFRESH_TOKEN:', process.env.GOOGLE_ADS_REFRESH_TOKEN);
      console.log('GOOGLE_ADS_CUSTOMER_ID:', process.env.GOOGLE_ADS_CUSTOMER_ID);
    }
    if (!process.env.GOOGLE_ADS_CLIENT_ID || !process.env.GOOGLE_ADS_CLIENT_SECRET || !process.env.GOOGLE_ADS_DEVELOPER_TOKEN || !process.env.GOOGLE_ADS_REFRESH_TOKEN || !process.env.GOOGLE_ADS_CUSTOMER_ID) {
      throw new Error('Missing required environment variables');
    }

    // Remove hyphens from the customer ID
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, '');


    // Initialize the Google Ads API client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    });

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
    });

    const keywordList = keywords.split('\n').map((k: string) => k.trim());
    const keywordConditions = keywordList.map((k: string) => `keyword.text = '${k}'`).join(' OR ');

    const query = `
      SELECT
        keyword_view.keyword,
        keyword_view.avg_monthly_searches,
        keyword_view.competition
      FROM keyword_view
      WHERE ${keywordConditions}
    `;

    const response = await customer.query(query);

    // Process the response and format the results
    const results = response.map((row: any) => ({
      keyword: row.keyword_view?.keyword || 'N/A',
      searchVolume: row.keyword_view?.avg_monthly_searches || 'N/A',
      competition: row.keyword_view?.competition || 'N/A',
    }));

    res.status(200).json(results);
  } catch (error) {
    console.error('Error:', error);
    let errorMessage = 'An error occurred during keyword research';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({ message: errorMessage });
  }
}
