import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test basic Google Ads API connection
    const { GoogleAdsApi } = require('google-ads-api');
    
    const {
      GADS_DEVELOPER_TOKEN,
      GADS_CLIENT_ID,
      GADS_CLIENT_SECRET,
      GADS_REFRESH_TOKEN,
      GADS_LOGIN_CUSTOMER_ID
    } = process.env;

    if (!GADS_DEVELOPER_TOKEN || !GADS_CLIENT_ID || !GADS_CLIENT_SECRET || !GADS_REFRESH_TOKEN || !GADS_LOGIN_CUSTOMER_ID) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        missing: {
          GADS_DEVELOPER_TOKEN: !!GADS_DEVELOPER_TOKEN,
          GADS_CLIENT_ID: !!GADS_CLIENT_ID,
          GADS_CLIENT_SECRET: !!GADS_CLIENT_SECRET,
          GADS_REFRESH_TOKEN: !!GADS_REFRESH_TOKEN,
          GADS_LOGIN_CUSTOMER_ID: !!GADS_LOGIN_CUSTOMER_ID
        }
      });
    }

    // Test client creation
    const client = new GoogleAdsApi({
      client_id: GADS_CLIENT_ID,
      client_secret: GADS_CLIENT_SECRET,
      developer_token: GADS_DEVELOPER_TOKEN,
    });

    console.log('Client created:', typeof client);
    console.log('Client methods:', Object.getOwnPropertyNames(client));

    // Test customer creation
    const customer = client.customer({
      customer_id: GADS_LOGIN_CUSTOMER_ID,
      refresh_token: GADS_REFRESH_TOKEN,
    });

    console.log('Customer created:', typeof customer);

    // Simple test query
    const query = `SELECT customer.id, customer.descriptive_name FROM customer LIMIT 1`;
    
    const response = await customer.query(query);
    
    res.status(200).json({
      success: true,
      message: 'Google Ads API connection successful',
      customer: response.rows?.[0] || 'No customer data found'
    });

  } catch (error) {
    console.error('Google Ads API test error:', error);
    res.status(500).json({ 
      error: 'Google Ads API test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
