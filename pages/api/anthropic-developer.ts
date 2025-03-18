import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

export const config = {
  maxDuration: 300,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const API_TOKEN = process.env.ANTHROPIC_API_KEY ?? '';
  const anthropic = new Anthropic({
    apiKey: API_TOKEN,
  });

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'No prompt in the request' });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 4096,
      temperature: 0,
      messages: [
        { "role": "user", "content": prompt }
      ]
    });

    return res.status(200).json({ data: message });
  } catch (error: any) {
    console.error("Anthropic API error:", error);
    const errorMessage = error?.message || "An error occurred while generating the website code";
    return res.status(500).json({ error: errorMessage });
  }
} 