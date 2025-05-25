# OpenAI Proxy for Android Apps

A simple Node.js proxy to forward requests from your app to OpenAI API, bypassing regional blocks.

## Usage

1. Deploy to Railway (or any Node.js hosting).
2. Set environment variable `OPENAI_API_KEY` in Railway dashboard.
3. Send POST requests to `/chat` with the same body as OpenAI's `/v1/chat/completions`.

## Example request

POST /chat
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```
```