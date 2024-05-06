// pages/api/check-availability.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const DNSIMPLE_API_URL = 'https://api.dnsimple.com/v2/';
const DNSIMPLE_ACCOUNT_ID = process.env.DNSIMPLE_ACCOUNT_ID; // Your DNSimple Account ID
const DNSIMPLE_API_TOKEN = process.env.DNSIMPLE_API_TOKEN; // Your DNSimple API Token

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { domains }: { domains: string[] } = req.body;
  const availabilityResults = [];

  for (const domain of domains) {
    const response = await fetch(`${DNSIMPLE_API_URL}${DNSIMPLE_ACCOUNT_ID}/registrar/domains/${domain}/check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DNSIMPLE_API_TOKEN}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If the HTTP request fails, add the error to the results
      availabilityResults.push({
        domain,
        available: false,
        error: `Error checking domain: ${domain}`
      });
      continue;
    }

    const data = await response.json();
    availabilityResults.push({
      domain,
      available: data.data.available,
    });
  }

  res.status(200).json(availabilityResults);
}
