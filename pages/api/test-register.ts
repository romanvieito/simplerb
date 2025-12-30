// pages/api/test-register.ts
import type { NextApiRequest, NextApiResponse } from 'next';

interface DomainRegistrationData {
  domain: string;
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: {
      address1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { domain, contactInfo }: DomainRegistrationData = req.body;

    console.log('🎯 TEST API called - Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      GODADDY_API_URL: process.env.GODADDY_API_URL,
      GODADDY_API_KEY: process.env.GODADDY_API_KEY ? 'SET' : 'NOT SET',
      GODADDY_API_SECRET: process.env.GODADDY_API_SECRET ? 'SET' : 'NOT SET'
    });

    // For now, just return a mock success response to test the API endpoint
    res.status(200).json({
      success: true,
      domain: domain,
      orderId: 'MOCK-' + Date.now(),
      total: 12.99,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        GODADDY_API_URL: process.env.GODADDY_API_URL,
        hasApiKey: !!process.env.GODADDY_API_KEY,
        hasApiSecret: !!process.env.GODADDY_API_SECRET
      },
      message: 'Environment variables check'
    });
  } catch (error) {
    console.error('Domain registration error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Domain registration failed'
    });
  }
}