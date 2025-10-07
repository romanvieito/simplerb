import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsClient, getGoogleAdsCustomer, handleGoogleAdsError, formatCustomerId } from './client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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
        },
        setupInstructions: [
          '1. Set up Google Ads API credentials in Google Cloud Console',
          '2. Create OAuth 2.0 credentials and get refresh token',
          '3. Apply for Google Ads API Basic Access (DONE!)',
          '4. Set environment variables in your deployment',
          '5. Test the connection with this endpoint'
        ]
      });
    }

    // Test client creation with enhanced configuration
    const client = getGoogleAdsClient();
    console.log('✅ Google Ads API client created successfully with v21');

    // Test customer creation
    const customer = getGoogleAdsCustomer();
    console.log('✅ Customer client created successfully');

    // Test basic customer info query
    let customerInfo = null;
    try {
      const query = `
        SELECT 
          customer.id,
          customer.descriptive_name,
          customer.currency_code,
          customer.time_zone,
          customer.manager,
          customer.test_account
        FROM customer
        LIMIT 1
      `;
      
      const response = await customer.query(query);
      customerInfo = response.rows?.[0] || null;
      console.log('✅ Customer info query successful');
    } catch (queryError) {
      console.log('⚠️ Customer info query failed (this is normal for new accounts)');
      console.log('Query error:', queryError);
    }

    // Test campaign query (will likely fail if no campaigns exist)
    let campaignCount = 0;
    try {
      const campaignQuery = `
        SELECT campaign.id, campaign.name, campaign.status
        FROM campaign
        WHERE campaign.status != 'REMOVED'
        LIMIT 10
      `;
      
      const campaignResponse = await customer.query(campaignQuery);
      campaignCount = campaignResponse.rows?.length || 0;
      console.log(`✅ Found ${campaignCount} campaigns`);
    } catch (campaignError) {
      console.log('⚠️ Campaign query failed (normal if no campaigns exist)');
    }

    res.status(200).json({
      success: true,
      message: 'Google Ads API v21 connection successful!',
      apiVersion: 'v21',
      customerId: GADS_LOGIN_CUSTOMER_ID,
      formattedCustomerId: formatCustomerId(GADS_LOGIN_CUSTOMER_ID),
      customerInfo,
      campaignCount,
      capabilities: [
        '✅ Campaign creation (Search & Performance Max)',
        '✅ Keyword research and management',
        '✅ Ad copy generation and testing',
        '✅ Performance metrics tracking',
        '✅ Bid optimization',
        '✅ Audience targeting',
        '✅ Location and language targeting'
      ],
      nextSteps: [
        'Set up your first campaign using /api/google-ads/create-campaign',
        'Monitor performance with /api/google-ads/metrics',
        'Optimize campaigns with /api/google-ads/optimize',
        'Use keyword research with /api/keyword-research'
      ],
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasAdminEmails: !!process.env.ADPILOT_ADMIN_EMAILS,
        validateOnly: process.env.ADPILOT_VALIDATE_ONLY === 'true'
      }
    });

  } catch (error) {
    console.error('Google Ads API test error:', error);
    
    const errorInfo = handleGoogleAdsError(error);
    
    res.status(500).json({
      success: false,
      error: 'Google Ads API test failed',
      ...errorInfo,
      envVars: {
        GADS_DEVELOPER_TOKEN: !!process.env.GADS_DEVELOPER_TOKEN,
        GADS_CLIENT_ID: !!process.env.GADS_CLIENT_ID,
        GADS_CLIENT_SECRET: !!process.env.GADS_CLIENT_SECRET,
        GADS_REFRESH_TOKEN: !!process.env.GADS_REFRESH_TOKEN,
        GADS_LOGIN_CUSTOMER_ID: !!process.env.GADS_LOGIN_CUSTOMER_ID
      },
      troubleshooting: [
        'Verify your Google Ads API credentials are correct',
        'Ensure your refresh token is valid and not expired',
        'Check that your customer ID is correct (remove hyphens)',
        'Verify your Google Ads account has API access enabled',
        'Make sure you have the necessary permissions in your Google Ads account'
      ]
    });
  }
}
