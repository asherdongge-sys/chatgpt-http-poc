# ChatGPT HTTP POC

> Experimental research project for a browserless HTTP client against ChatGPT Web's backend APIs.

## Goal

Validate whether a logged-in ChatGPT Web session can be used through HTTP only, without launching or controlling a browser.

The first PoC deliberately does **not** implement browser automation, DOM scraping, API-key authentication, cookie extraction, or anti-abuse bypasses.

## What is implemented

- Node.js 20+ HTTP client using native `fetch`.
- `POST /backend-api/conversation` request shape.
- Bearer access token supplied explicitly through an environment variable.
- Server-sent event parsing.
- Basic continuation support via `CHATGPT_CONVERSATION_ID`.
- Unit tests with mocked HTTP responses.

## Setup

```bash
pnpm install
pnpm test
```

For a direct smoke test:

```bash
CHATGPT_ACCESS_TOKEN="<your own session access token>" node src/cli.mjs "Reply with exactly HTTP_POC_OK"
```

PowerShell:

```powershell
$env:CHATGPT_ACCESS_TOKEN = "<your own session access token>"
node src/cli.mjs "Reply with exactly HTTP_POC_OK"
```

No browser is launched by this program.

## Expected outcomes

### Success

If the supplied session credential is currently accepted by the backend, the CLI should print the streamed assistant response.

### 401/403 or a requirements-related error

That is useful PoC data. It means the current backend requires additional session/anti-abuse state beyond the bearer token. **Do not work around those controls in this PoC.** Record the response shape and update the protocol research separately.

## Important

These are undocumented ChatGPT Web endpoints. They can change or require additional authentication/anti-abuse checks at any time. This repository is for local experimentation only. Do not expose a gateway publicly, commit credentials, or attempt to bypass access controls.

## Next milestone

If the direct request works, add a tiny local OpenAI-compatible `/v1/chat/completions` adapter around this client. If it does not, inspect the current web authentication flow and determine exactly which non-browser session artifacts are legitimately available to the user before changing the client.
