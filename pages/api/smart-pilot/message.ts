import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { OpenAIStream } from '../../../utils/OpenAIStream';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userEmail = req.headers['x-user-email'] as string;
  
  if (!userEmail) {
    return res.status(401).json({ error: 'User email required' });
  }

  try {
    const { sessionId, message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message required' });
    }

    // Get user ID
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${userEmail}
    `;
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;

    let currentSessionId = sessionId;

    // If no session ID, create a new session
    if (!currentSessionId) {
      const title = message.length > 50 ? message.substring(0, 47) + '...' : message;
      const sessionResult = await sql`
        INSERT INTO smart_pilot_sessions (user_id, title)
        VALUES (${userId}, ${title})
        RETURNING id
      `;
      currentSessionId = sessionResult.rows[0].id;
    } else {
      // Verify session belongs to user
      const sessionCheck = await sql`
        SELECT id FROM smart_pilot_sessions 
        WHERE id = ${currentSessionId} AND user_id = ${userId}
      `;

      if (sessionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }

    // Save user message
    await sql`
      INSERT INTO smart_pilot_messages (session_id, role, content)
      VALUES (${currentSessionId}, 'user', ${message})
    `;

    // Get conversation history
    const historyResult = await sql`
      SELECT role, content FROM smart_pilot_messages 
      WHERE session_id = ${currentSessionId}
      ORDER BY created_at ASC
    `;

    // Build conversation context
    const messages = historyResult.rows.map(row => ({
      role: row.role,
      content: row.content
    }));

    // System prompt for Smart Pilot expertise across all tools
    const systemPrompt = `You are Smart Pilot, an expert AI assistant for simplerB's suite of tools. You help users with:

DOMAIN TOOL:
- Domain name strategy and branding advice
- TLD selection and availability insights
- Domain valuation and pricing guidance
- SEO-friendly domain recommendations

WEBSITE TOOL:
- Website design and structure optimization
- Content strategy and copywriting
- SEO best practices and technical optimization
- User experience and conversion optimization
- Landing page performance improvement

EMAIL TOOL:
- Email marketing strategy and campaign planning
- Subject line and copy optimization
- List building and segmentation advice
- Deliverability and engagement best practices
- A/B testing and performance analysis

ADS TOOL:
- Google Ads campaign strategy and optimization
- Ad copy writing with proper character limits (headlines: 30 chars, descriptions: 90 chars)
- Keyword research and negative keyword suggestions
- Landing page optimization for ads
- Performance analysis and improvement suggestions

GENERAL GUIDELINES:
- Provide actionable, specific advice for each tool
- Ask clarifying questions when context is insufficient
- Output concise, skimmable lists when appropriate
- Focus on ROI, performance metrics, and best practices
- Respect platform-specific constraints and policies
- Consider cross-tool synergies and integration opportunities

Current context: ${context?.campaignType ? `Campaign type: ${context.campaignType}` : 'General strategy'}
${context?.goals ? `Goals: ${context.goals}` : ''}

Respond as a helpful, expert consultant across all simplerB tools.`;

    // Prepare OpenAI request
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      stream: true,
      n: 1,
    };

    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let assistantResponse = '';
    let tokenCount = 0;

    try {
      const stream = await OpenAIStream(payload);
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                assistantResponse += data.text;
                tokenCount++;
                res.write(`data: ${JSON.stringify({ text: data.text })}\n\n`);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Save assistant response
      await sql`
        INSERT INTO smart_pilot_messages (session_id, role, content, model, tokens)
        VALUES (${currentSessionId}, 'assistant', ${assistantResponse}, 'gpt-3.5-turbo', ${tokenCount})
      `;

      // Update session timestamp
      await sql`
        UPDATE smart_pilot_sessions 
        SET updated_at = NOW() 
        WHERE id = ${currentSessionId}
      `;

      // Send final message with session ID
      res.write(`data: ${JSON.stringify({ sessionId: currentSessionId, done: true })}\n\n`);
      res.end();

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ error: 'Failed to generate response' })}\n\n`);
      res.end();
    }

  } catch (error) {
    console.error('Error in message API:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Failed to process request' })}\n\n`);
      res.end();
    }
  }
}
