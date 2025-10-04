import { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, validateAdPilotAccess } from './client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate admin access
    const userEmail = req.headers['x-user-email'] as string;
    if (!validateAdPilotAccess(userEmail)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const customer = getGoogleAdsCustomer();
    const validateOnly = process.env.ADPILOT_VALIDATE_ONLY === 'true';

    console.log('Test create - validateOnly:', validateOnly);
    console.log('Test create - customer ID:', process.env.GADS_LOGIN_CUSTOMER_ID);

    // Test with a simple campaign budget creation
    const budgetResourceName = `customers/${process.env.GADS_LOGIN_CUSTOMER_ID}/campaignBudgets/-1`;
    
    const operations = [{
      create: {
        campaign_budget: {
          resource_name: budgetResourceName,
          name: 'Test Budget - AdPilot',
          amount_micros: 10000000, // $10
          delivery_method: 'STANDARD',
          period: 'DAILY'
        }
      }
    }];

    console.log('Test operations:', JSON.stringify(operations, null, 2));

    if (validateOnly) {
      return res.status(200).json({
        success: true,
        message: 'DRY RUN: Would create test budget',
        validateOnly: true,
        operations: operations.length
      });
    }

    // Try to create the budget
    console.log('Attempting to create test budget...');
    const response = await customer.mutateResources(operations);
    console.log('Test budget creation response:', response);

    res.status(200).json({
      success: true,
      message: 'Test budget created successfully',
      response: response
    });

  } catch (error) {
    console.error('Test create error:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      validateOnly: process.env.ADPILOT_VALIDATE_ONLY === 'true',
      customerId: process.env.GADS_LOGIN_CUSTOMER_ID,
      envVars: {
        GADS_DEVELOPER_TOKEN: !!process.env.GADS_DEVELOPER_TOKEN,
        GADS_CLIENT_ID: !!process.env.GADS_CLIENT_ID,
        GADS_CLIENT_SECRET: !!process.env.GADS_CLIENT_SECRET,
        GADS_REFRESH_TOKEN: !!process.env.GADS_REFRESH_TOKEN,
        GADS_LOGIN_CUSTOMER_ID: !!process.env.GADS_LOGIN_CUSTOMER_ID,
        ADPILOT_VALIDATE_ONLY: process.env.ADPILOT_VALIDATE_ONLY
      }
    });
  }
}
