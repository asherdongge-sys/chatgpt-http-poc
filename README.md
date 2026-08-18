# chatgpt-http-poc

> Experimental transport POC. The original ChatGPT Web backend client is intentionally kept as a diagnostic experiment, not treated as a stable API.

## Gateway POC

The current direction is a local **Agent Gateway**: ChatGPT remains the planner/brain, while a localhost service owns the real workspace and executes typed tools.

Architecture:

```text
ChatGPT / planner
      |
      | tool calls
      v
Local Agent Gateway :4318
      |
      +--> fs.list
      +--> fs.read
      +--> fs.write
      +--> fs.search
      |
      v
Local workspace
```

The gateway binds to `127.0.0.1` by default, so it is not exposed on the LAN. Set `AGENT_WORKSPACE` to the workspace that the agent is allowed to access.

### Start

```powershell
$env:AGENT_WORKSPACE = 'E:\web\browser-coding-agent'
pnpm install
pnpm gateway
```

Optional local bearer protection:

```powershell
$env:GATEWAY_TOKEN = 'replace-with-a-random-local-token'
pnpm gateway
```

### Endpoints

- `GET /health` — gateway health.
- `GET /tools` — typed tool catalog.
- `POST /execute` — execute one tool call.
- `GET /events` — Server-Sent Events stream for tool lifecycle events.

Example:

```powershell
Invoke-RestMethod http://127.0.0.1:4318/tools
Invoke-RestMethod -Method Post http://127.0.0.1:4318/execute -ContentType 'application/json' -Body '{"tool":"fs.list","arguments":{"path":"."}}'
```

## Why this replaces the previous HTTP approach

The previous POC called undocumented `chatgpt.com/backend-api/*` endpoints with a Web access token. Those endpoints are not a stable public API and can require browser session state, cookies, Cloudflare state, device/session headers, and changing frontend metadata. A 403 is therefore expected to be possible even when the same account works in the browser.

The gateway deliberately does **not** try to reproduce that private transport. It isolates the local execution layer so that the ChatGPT-side transport can later be replaced without rewriting the filesystem/tool implementation.

## Next milestones

1. Add a small adapter from the existing browser Bridge to `/tools` + `/execute`.
2. Add approval policy for write/execute operations.
3. Add `terminal.exec` behind an explicit local opt-in and command policy.
4. Add Git tools (`git.status`, `git.diff`, `git.commit`, `git.push`) as typed operations.
5. Add a session/job id so multiple ChatGPT conversations can own independent agents.
6. Add a durable event log and reconnect/resume semantics.
