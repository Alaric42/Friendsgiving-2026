# Friendsgiving Planner

Mobile-first planner for 17 friends: availability heatmap (Nov 20–29, 10am–10pm), activity ideas, and who's bringing what.
Next.js + Tailwind + Supabase (with Realtime), deployed on Vercel. Full spec: `thanksgiving-planner-spec.md`.

## Setup

1. In Supabase → SQL Editor, paste and run `supabase/migrations/0001_init.sql` (once).
2. Fill `.env.local` with your Project URL and anon/publishable key (Supabase → Project Settings → API).
3. `npm install && npm run dev`, open http://localhost:3000.

## Deploy

Push to GitHub, import in Vercel, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as env vars, deploy.

No login: anyone with the link can pick any name. That's intentional for a trusted group.
