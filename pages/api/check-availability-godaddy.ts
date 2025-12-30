// pages/api/check-availability.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const GODADDY_API_URL = 'https://api.ote-godaddy.com/v1';
const GODADDY_API_KEY = process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_API_SECRET;

// Ensure the API handler correctly processes the domains array
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 check-availability-godaddy API called');
  console.log('Request method:', req.method);
  console.log('Request body:', req.body);

  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { domains }: { domains: string[] } = req.body;

  console.log('Parsed domains:', domains);

  if (!domains || !Array.isArray(domains)) {
    console.error('Invalid request body - domains is not an array:', domains);
    return res.status(400).json({ error: 'Invalid request body' });
  }

  console.log('GODADDY_API_KEY exists:', !!GODADDY_API_KEY);
  console.log('GODADDY_API_SECRET exists:', !!GODADDY_API_SECRET);

  const availabilityResults = [];

  for (const domain of domains) {
    console.log(`Checking availability for domain: ${domain}`);

    try {
      const response = await fetch(`${GODADDY_API_URL}/domains/available?domain=${domain}`, {
        method: 'GET',
        headers: {
          'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
          'Accept': 'application/json'
        },
      });

      console.log(`GoDaddy API response status for ${domain}:`, response.status);
      console.log(`GoDaddy API response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GoDaddy API error for ${domain}:`, errorText);
        // If the HTTP request fails, add the error to the results
        availabilityResults.push({
          domain,
          available: false,
          error: `Error checking domain: ${domain} - ${response.status} ${response.statusText}`
        });
        continue;
      }

      const data = await response.json();
      console.log(`GoDaddy API response data for ${domain}:`, data);

      availabilityResults.push({
        domain,
        available: data.available,
      });
    } catch (fetchError) {
      console.error(`Fetch error for domain ${domain}:`, fetchError);
      availabilityResults.push({
        domain,
        available: false,
        error: `Network error checking domain: ${domain}`
      });
    }
  }

  res.status(200).json(availabilityResults);
}
