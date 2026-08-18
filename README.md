# ChatGPT HTTP POC

> Experimental research project for a browserless HTTP client against ChatGPT Web's backend APIs.

## Goal

Validate whether a logged-in ChatGPT Web session can be used through HTTP only, without launching or controlling a browser.

The first PoC deliberately does **not** implement browser automation, DOM scraping, or API-key authentication.

## Scope

1. Inspect/accept an existing ChatGPT Web session credential set supplied by the user.
2. Resolve an access token/session where possible.
3. Call the ChatGPT Web backend conversation endpoint over HTTP.
4. Preserve streaming output.
5. Keep conversation state for follow-up requests.

## Important

This targets undocumented ChatGPT Web endpoints. They can change or require additional anti-abuse/authentication checks at any time. This repository is for local experimentation only; do not expose the gateway publicly or store credentials in source control.

## Planned API

A later phase will expose a local OpenAI-compatible endpoint such as `/v1/chat/completions` once the direct HTTP backend flow is proven.

## Current status

Scaffold only. The next commit will add the minimal Node.js HTTP client and environment-based session configuration.