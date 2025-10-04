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

    console.log('Client created successfully');

    // Test customer creation
    const customer = client.Customer({
      customer_id: GADS_LOGIN_CUSTOMER_ID,
      refresh_token: GADS_REFRESH_TOKEN,
    });

    console.log('Customer created successfully');

    // Test with the simplest possible query - just customer info
    console.log('Testing basic customer connection...');
    
    // Try a simple query with the updated library v20
    const query = `SELECT customer.id FROM customer LIMIT 1`;
    console.log('Executing query:', query);
    
    try {
      const response = await customer.query(query);
      console.log('Query response:', response);
      
      res.status(200).json({
        success: true,
        message: 'Google Ads API connection successful with v20',
        customerId: GADS_LOGIN_CUSTOMER_ID,
        response: response
      });
    } catch (queryError) {
      console.error('Query error:', queryError);
      res.status(200).json({
        success: true,
        message: 'Google Ads API client created successfully',
        customerId: GADS_LOGIN_CUSTOMER_ID,
        note: 'Query failed but client initialization works',
        queryError: queryError instanceof Error ? queryError.message : 'Unknown query error'
      });
    }

  } catch (error) {
    console.error('Google Ads API test error:', error);
    
    // Provide more detailed error information
    const errorDetails = {
      error: 'Google Ads API test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      envVars: {
        GADS_DEVELOPER_TOKEN: !!process.env.GADS_DEVELOPER_TOKEN,
        GADS_CLIENT_ID: !!process.env.GADS_CLIENT_ID,
        GADS_CLIENT_SECRET: !!process.env.GADS_CLIENT_SECRET,
        GADS_REFRESH_TOKEN: !!process.env.GADS_REFRESH_TOKEN,
        GADS_LOGIN_CUSTOMER_ID: !!process.env.GADS_LOGIN_CUSTOMER_ID
      }
    };
    
    res.status(500).json(errorDetails);
  }
}
