// pages/api/check-availability.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const GODADDY_API_URL = 'https://api.ote-godaddy.com/v1';
const GODADDY_API_KEY = process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_API_SECRET;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const tldsResults = [];

  const response = await fetch(`${GODADDY_API_URL}/domains/tlds`, {
    method: 'GET',
    headers: {
      'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
      'Accept': 'application/json'
    },
  });

  if (response.ok) {
    const data = await response.json();
    for(const elem of data) {
      tldsResults.push({
        name: "."+elem.name,
        type: elem.type
      });      
    }
  }

  res.status(200).json(tldsResults);
}
