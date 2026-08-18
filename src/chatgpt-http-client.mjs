const DEFAULT_BASE_URL = 'https://chatgpt.com';

export class ChatGPTHttpError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ChatGPTHttpError';
    this.status = status;
    this.body = body;
  }
}

export class ChatGPTHttpClient {
  constructor({ accessToken, baseUrl = DEFAULT_BASE_URL, fetchImpl = fetch } = {}) {
    if (!accessToken) {
      throw new Error('CHATGPT_ACCESS_TOKEN is required');
    }
    this.accessToken = accessToken;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetch = fetchImpl;
  }

  async createConversation({ message, conversationId, parentMessageId = crypto.randomUUID() }) {
    if (!message) throw new Error('message is required');

    const payload = {
      action: 'next',
      messages: [
        {
          id: parentMessageId,
          author: { role: 'user' },
          content: { content_type: 'text', parts: [message] },
        },
      ],
      model: 'auto',
      timezone_offset_min: new Date().getTimezoneOffset(),
      conversation_mode: { kind: 'primary_assistant' },
      ...(conversationId ? { conversation_id: conversationId } : {}),
    };

    const response = await this.fetch(`${this.baseUrl}/backend-api/conversation`, {
      method: 'POST',
      headers: {
        accept: 'text/event-stream',
        authorization: `Bearer ${this.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new ChatGPTHttpError(`ChatGPT backend returned HTTP ${response.status}`, {
        status: response.status,
        body,
      });
    }

    if (!response.body) throw new ChatGPTHttpError('ChatGPT response has no body');

    return response.body;
  }
}

export async function* parseSseStream(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? '';

      for (const event of events) {
        const data = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n');
        if (!data || data === '[DONE]') continue;
        try {
          yield JSON.parse(data);
        } catch {
          yield { type: 'raw', data };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
