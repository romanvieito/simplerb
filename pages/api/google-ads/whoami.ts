import type { NextApiRequest, NextApiResponse } from 'next';
import { getGoogleAdsCustomer, getGoogleAdsCustomerById, formatCustomerId } from './client';

interface WhoAmIResponse {
  success: boolean;
  loginCustomerId: string | null;
  customerId: string | null;
  accessibleClients?: Array<{
    clientCustomerId: string;
    level: number;
    manager: boolean;
    name: string;
  }>;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<WhoAmIResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, loginCustomerId: null, customerId: null, error: 'Method not allowed' });
  }

  try {
    const loginIdRaw = process.env.GADS_LOGIN_CUSTOMER_ID || null;
    const customerIdRaw = (process.env.GADS_CUSTOMER_ID || process.env.GADS_LOGIN_CUSTOMER_ID) || null;

    const loginCustomerId = loginIdRaw ? formatCustomerId(loginIdRaw) : null;
    const customerId = customerIdRaw ? formatCustomerId(customerIdRaw) : null;

    // For tree listing, use the MCC as the effective customer
    const customer = loginCustomerId ? getGoogleAdsCustomerById(loginCustomerId) : getGoogleAdsCustomer();

    // Use GAQL against customer_client to enumerate accessible accounts under the login CID
    const query = `
      SELECT 
        customer_client.client_customer,
        customer_client.level,
        customer_client.manager,
        customer_client.descriptive_name
      FROM customer_client
      WHERE customer_client.level >= 0
    `;

    let accessibleClients: WhoAmIResponse['accessibleClients'] = [];
    try {
      const resp = await customer.query(query);
      const rows = resp?.rows || [];
      accessibleClients = rows.map((row: any) => ({
        clientCustomerId: String(row.customer_client?.client_customer || ''),
        level: Number(row.customer_client?.level || 0),
        manager: Boolean(row.customer_client?.manager || false),
        name: String(row.customer_client?.descriptive_name || ''),
      }));
    } catch (e: any) {
      // If listing fails, still return IDs to verify header setup
      return res.status(200).json({
        success: false,
        loginCustomerId,
        customerId,
        error: e?.message || 'Failed to list accessible customers',
      });
    }

    return res.status(200).json({
      success: true,
      loginCustomerId,
      customerId,
      accessibleClients,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      loginCustomerId: null,
      customerId: null,
      error: error?.message || 'Unknown error',
    });
  }
}


