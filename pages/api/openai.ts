import { OpenAIStream, OpenAIStreamPayload } from '../../utils/OpenAIStream';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing env var from OpenAI');
}

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
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
    //model: 'gpt-4o-mini',
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: temperature,
    top_p: top_p,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 200,
    stream: true,
    n: 1,
  };

  const stream = await OpenAIStream(payload);
  // return stream response (SSE)
  return new Response(stream, {
    headers: new Headers({
      // since we don't use browser's EventSource interface, specifying content-type is optional.
      // the eventsource-parser library can handle the stream response as SSE, as long as the data format complies with SSE:
      // https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#sending_events_from_the_server

      // 'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    }),
  });
};

export default handler;
