import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatGPTHttpClient, ChatGPTHttpError, parseSseStream } from '../src/chatgpt-http-client.mjs';

function streamOf(text) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

test('sends a backend conversation request without browser automation', async () => {
  let request;
  const client = new ChatGPTHttpClient({
    accessToken: 'test-token',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response(streamOf('data: {"message":{"content":{"parts":["ok"]}}}\n\ndata: [DONE]\n\n'), {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    },
  });

  const body = await client.createConversation({ message: 'hello' });
  assert.ok(body);
  assert.equal(request.url, 'https://chatgpt.com/backend-api/conversation');
  assert.equal(request.options.headers.authorization, 'Bearer test-token');
  assert.equal(JSON.parse(request.options.body).messages[0].content.parts[0], 'hello');
});

test('surfaces backend HTTP errors', async () => {
  const client = new ChatGPTHttpClient({
    accessToken: 'test-token',
    fetchImpl: async () => new Response('unauthorized', { status: 401 }),
  });

  await assert.rejects(
    client.createConversation({ message: 'hello' }),
    (error) => error instanceof ChatGPTHttpError && error.status === 401,
  );
});

test('parses SSE JSON events', async () => {
  const events = [];
  for await (const event of parseSseStream(streamOf('data: {"x":1}\n\ndata: {"x":2}\n\ndata: [DONE]\n\n'))) {
    events.push(event);
  }
  assert.deepEqual(events, [{ x: 1 }, { x: 2 }]);
});
