import { OpenAIStream, OpenAIStreamPayload } from '../../utils/OpenAIStream';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing env var from OpenAI');
}

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { prompt, ptemp, ptop } = (await req.json()) as {
      prompt?: string;
      ptemp?: number;
      ptop?: number;    
    };

    if (!prompt) {
      return new Response('No prompt in the request', { status: 400 });
    }

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
    return new Response(stream, {
      headers: new Headers({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }),
    });
  } catch (error) {
    console.error('OpenAI API handler error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process OpenAI request' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export default handler;
