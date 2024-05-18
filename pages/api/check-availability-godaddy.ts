// pages/api/check-availability.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const GODADDY_API_URL = 'https://api.ote-godaddy.com/v1';
const GODADDY_API_KEY = process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_API_SECRET;

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
    const response = await fetch(`${GODADDY_API_URL}/domains/available?domain=${domain}`, {
      method: 'GET',
      headers: {
        'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
        'Accept': 'application/json'
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
      available: data.available,
    });
  }

  res.status(200).json(availabilityResults);
}
