// pages/api/register-domain-godaddy.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const GODADDY_API_URL = process.env.GODADDY_API_URL || 'https://api.godaddy.com/v1';
const GODADDY_API_KEY = process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_API_SECRET;

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
  console.log('🚀 API called: register-domain-godaddy');
  console.log('📨 Request method:', req.method);
  console.log('📨 Request headers:', req.headers);
  console.log('🌍 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    GODADDY_API_URL: process.env.GODADDY_API_URL,
    hasApiKey: !!GODADDY_API_KEY,
    hasApiSecret: !!GODADDY_API_SECRET,
    apiKeyPrefix: GODADDY_API_KEY ? GODADDY_API_KEY.substring(0, 8) + '...' : 'none'
  });

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
    console.log('✅ Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).end('Method Not Allowed');
  }

  console.log('✅ Method is POST, proceeding...');

  console.log('📦 Raw request body:', req.body);

  const { domain, contactInfo }: DomainRegistrationData = req.body;

  console.log('📦 Parsed domain:', domain);
  console.log('📦 Parsed contactInfo exists:', !!contactInfo);

  if (!domain || !contactInfo) {
    console.log('❌ Missing domain or contactInfo');
    return res.status(400).json({ error: 'Domain and contact information are required' });
  }

  try {
    console.log('Domain registration attempt for:', domain);
    console.log('Contact info received:', JSON.stringify(contactInfo, null, 2));

    // Step 1: Validate domain is available (double-check) - Skip in test mode
    const isTestMode = process.env.NODE_ENV !== 'production' || GODADDY_API_URL.includes('ote-godaddy') || !GODADDY_API_KEY || !GODADDY_API_SECRET;

    console.log('🔍 Test mode determination:', {
      nodeEnvNotProd: process.env.NODE_ENV !== 'production',
      urlIncludesOte: GODADDY_API_URL.includes('ote-godaddy'),
      hasApiKey: !!GODADDY_API_KEY,
      hasApiSecret: !!GODADDY_API_SECRET,
      isTestMode: isTestMode
    });

    if (!isTestMode) {
      console.log('PRODUCTION MODE: Checking availability for domain:', domain);
      const availabilityResponse = await fetch(`${GODADDY_API_URL}/domains/available?domain=${domain}`, {
        method: 'GET',
        headers: {
          'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
          'Accept': 'application/json'
        },
      });

      console.log('Availability response status:', availabilityResponse.status);
      console.log('Availability response ok:', availabilityResponse.ok);

      if (!availabilityResponse.ok) {
        const errorText = await availabilityResponse.text();
        console.log('Availability check failed:', {
          status: availabilityResponse.status,
          statusText: availabilityResponse.statusText,
          errorText: errorText,
          headers: Object.fromEntries(availabilityResponse.headers.entries())
        });
        throw new Error(`Failed to check domain availability: ${availabilityResponse.status} ${availabilityResponse.statusText}`);
      }

      const availabilityData = await availabilityResponse.json();
      console.log('Availability data received:', JSON.stringify(availabilityData, null, 2));

      if (!availabilityData.available) {
        console.log('Domain not available:', domain);
        return res.status(400).json({ error: 'Domain is not available for registration' });
      }

      console.log('Domain is available, proceeding with registration');
    } else {
      console.log('TEST MODE: Skipping availability check for:', domain);
    }

    // Step 2: Register the domain
    const registrationData = {
      domain,
      nameServers: [
        'ns1.simpleserver.com',
        'ns2.simpleserver.com'
      ],
      period: 1, // 1 year registration
      renewAuto: false,
      privacy: false, // No privacy protection for simplicity
      consent: {
        agreementKeys: ['DNRA'],
        agreedBy: contactInfo.address.address1,
        agreedAt: new Date().toISOString()
      },
      contactAdmin: {
        nameFirst: contactInfo.firstName,
        nameLast: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone,
        addressMailing: contactInfo.address
      },
      contactBilling: {
        nameFirst: contactInfo.firstName,
        nameLast: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone,
        addressMailing: contactInfo.address
      },
      contactRegistrant: {
        nameFirst: contactInfo.firstName,
        nameLast: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone,
        addressMailing: contactInfo.address
      },
      contactTech: {
        nameFirst: contactInfo.firstName,
        nameLast: contactInfo.lastName,
        email: contactInfo.email,
        phone: contactInfo.phone,
        addressMailing: contactInfo.address
      }
    };

    // For OTE testing, we can use a dry-run approach
    if (isTestMode) {
      console.log('TEST MODE: Simulating domain registration (no real purchase)');

      // Validate the request data without actually purchasing (allow empty for testing)
      console.log('Validating contact info:', {
        hasFirstName: !!contactInfo.firstName,
        hasLastName: !!contactInfo.lastName,
        hasEmail: !!contactInfo.email
      });

      // For testing, allow partial data
      if (!contactInfo.email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Return mock success response for testing
    res.status(200).json({
      success: true,
      domain: domain,
      orderId: 'OTE-' + Date.now(),
      total: 12.99,
      pricing: {
        registration: 12.99,
        currency: 'USD',
        period: 1,
        periodUnit: 'year'
      },
      testMode: true,
      message: 'Domain registration validated successfully (OTE test mode - no real purchase)'
    });
      return;
    }

    const registrationResponse = await fetch(`${GODADDY_API_URL}/domains/purchase`, {
      method: 'POST',
      headers: {
        'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(registrationData)
    });

    if (!registrationResponse.ok) {
      const errorData = await registrationResponse.json();
      throw new Error(errorData.message || 'Domain registration failed');
    }

    const registrationResult = await registrationResponse.json();

    res.status(200).json({
      success: true,
      domain: registrationResult.domain,
      orderId: registrationResult.orderId,
      total: registrationResult.total,
      pricing: {
        registration: registrationResult.total || 12.99,
        currency: registrationResult.currency || 'USD',
        period: 1,
        periodUnit: 'year'
      }
    });

  } catch (error) {
    console.error('Domain registration error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Domain registration failed'
    });
  }
}