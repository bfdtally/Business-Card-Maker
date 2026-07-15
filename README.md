# Lesson Plan Generator

A simple Next.js app for teachers, tutors, homeschool educators, and education students to generate complete standards-aligned lesson plans.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your OpenAI API key to `.env.local` as `OPENAI_API_KEY`. The key is used only by the server-side API route and is never exposed to browser code.

## Features

- Next.js App Router
- React and TypeScript
- Tailwind CSS
- Server-side API route using the OpenAI official JavaScript SDK and Responses API
- Server-side standards lookup before lesson generation
- Required form validation
- Clean lesson-plan preview
- PDF download with `@react-pdf/renderer`

## Deploy on Render

Deploy this app as a Render Web Service, not a Static Site, because lesson generation runs through the server-side API route.

1. Push this app folder to a GitHub repo.
2. In Render, create a new Web Service from that repo.
3. Use these settings if Render does not read `render.yaml` automatically:
   - Runtime: Node
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start -- -p $PORT`
4. Add environment variables in Render:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` optional, defaults to `gpt-4.1-mini`
   - `OPENAI_SEARCH_MODEL` optional, defaults to `OPENAI_MODEL`
5. Deploy, then share the Render URL with users.
