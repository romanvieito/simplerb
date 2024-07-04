import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const API_TOKEN = process.env.ANTHROPIC_API_KEY ?? '';

const anthropic = new Anthropic({
  apiKey: API_TOKEN,
});

export default async function handler (
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (req.method !== 'POST') {
      return res.status(405).end('Method Not Allowed');
    }

    const { prompt } : { prompt: string } = req.body;    

    if (!prompt) {
      return new Response('No prompt in the request', { status: 400 });
    } 
    
    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 4096,
        messages: [
          {"role": "user", "content": prompt }
        ]
      });

      return res.status(200).json({ data: message });
    } catch (error) {
      return res.status(500).json({ error: error });
    }    
};
