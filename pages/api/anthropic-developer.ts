import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

/*
 * Dedicated endpoint for website HTML generation
 * 
 * This endpoint is separated from the main Anthropic API endpoint to:
 * 1. Handle longer processing times required for HTML generation
 * 2. Avoid timeout issues in serverless functions
 * 3. Allow for specific configuration for website development
 * 
 * Configuration:
 * - maxDuration: 300 seconds (5 minutes) to allow for complex HTML generation
 * - max_tokens: 2000 to balance between detail and processing time
 * - temperature: 0 for consistent, deterministic output
 * - Updated to Claude Sonnet 4.5 for enhanced capabilities
 */
export const config = {
  maxDuration: 300, // 5 minutes in seconds
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
    // Configure for website HTML generation with Claude Sonnet 4.5
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Updated to Claude Sonnet 4.5
      max_tokens: 4096,
      temperature: 0,
      messages: [
        { "role": "user", "content": prompt }
      ]
    });

    // Handle new refusal stop reason from Claude 4
    if (message.stop_reason === 'refusal' as any) {
      console.warn('Claude 4 refused to generate content for safety reasons');
      return res.status(400).json({ 
        error: 'Content generation was refused for safety reasons',
        stop_reason: 'refusal'
      });
    }

    return res.status(200).json({ data: message });
  } catch (error: any) {
    console.error("Anthropic API error:", error);
    const errorMessage = error?.message || "An error occurred while generating the website code";
    return res.status(500).json({ error: errorMessage });
  }
} 