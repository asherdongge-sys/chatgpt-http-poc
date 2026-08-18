import { ChatGPTHttpClient, parseSseStream } from './chatgpt-http-client.mjs';

const token = process.env.CHATGPT_ACCESS_TOKEN;
const baseUrl = process.env.CHATGPT_BASE_URL || 'https://chatgpt.com';
const prompt = process.argv.slice(2).join(' ').trim();

if (!token || !prompt) {
  console.error('Usage: CHATGPT_ACCESS_TOKEN=... node src/cli.mjs "your prompt"');
  process.exit(2);
}

const client = new ChatGPTHttpClient({ accessToken: token, baseUrl });
const stream = await client.createConversation({
  message: prompt,
  conversationId: process.env.CHATGPT_CONVERSATION_ID,
});

for await (const event of parseSseStream(stream)) {
  const part = event?.message?.content?.parts?.join('');
  if (part) process.stdout.write(`\r${part}`);
}
process.stdout.write('\n');
