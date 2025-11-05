import { OpenAIStream, OpenAIStreamPayload } from '../../utils/OpenAIStream';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing env var from OpenAI');
}

// Temporarily disabled edge runtime to test environment variables
// export const config = {
//   runtime: 'edge',
// };

const handler = async (req: any, res: any) => {
  try {
    // Validate request comes from authenticated user via Clerk
    try {
      const { getAuth } = await import('@clerk/nextjs/server');
      const { userId } = getAuth(req);

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
    } catch (authError) {
      console.error('Authentication error:', authError);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const { prompt, ptemp, ptop } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'No prompt in the request' });
    }

    // Rate limiting: simple in-memory check (use Redis in production)
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10; // 10 requests per minute

    if (!global.rateLimit) global.rateLimit = new Map();

    const userRequests = global.rateLimit.get(clientIP) || [];
    const recentRequests = userRequests.filter(time => now - time < windowMs);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    recentRequests.push(now);
    global.rateLimit.set(clientIP, recentRequests);

    const temperature = (typeof ptemp === 'number') ? ptemp : 0;
    const top_p = (typeof ptop === 'number') ? ptop : 0;

  const payload: OpenAIStreamPayload = {
    model: 'gpt-5-nano',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
    n: 1,
  };

    const stream = await OpenAIStream(payload);
    // return stream response (SSE)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Handle the web stream manually for Node.js
    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (error) {
      console.error('Stream reading error:', error);
      res.end();
    }
  } catch (error) {
    console.error('OpenAI API handler error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process OpenAI request'
    });
  }
};

export default handler;
