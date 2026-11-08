# Thanksgiving Meetup Planner — Build Spec for Claude Code

Paste this whole file as your first prompt to Claude Code in an empty project folder. Fill in the `[[ ]]` placeholders before you paste it.

## 0. What this is

A mobile-first web app for coordinating a Thanksgiving meetup among 17 people:
1. **Availability** — each person marks which hours they're free, Nov 20–29, 10am–10pm, in 1-hour blocks. A shared heatmap shows overlap counts; tapping a slot shows exactly who's free then.
2. **Ideas** — a running list of activity suggestions (Top Golf, game night, etc.), tagged by who suggested it.
3. **Food** — a running list of who's bringing what, tagged by name.

No login/password. A person identifies themselves by picking their name from a preset dropdown of the 17. Anyone with the link can edit anyone's entries — that's a deliberate trade-off for a trusted friend group, not an oversight. If that turns out to be a problem in practice, a PIN-per-person can be added later.

## 1. Tech stack

- **Next.js (App Router) + TypeScript + Tailwind CSS** — frontend
- **Supabase** (Postgres + `@supabase/supabase-js`) — shared data store, with Realtime subscriptions so the heatmap updates live without a manual refresh
- **Vercel** — hosting/deploy

## 2. Data model (Supabase SQL — Claude Code should write this as a migration file)

```sql
create extension if not exists "pgcrypto";

create table people (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  slot_date date not null,                -- '2026-11-20' .. '2026-11-29'
  slot_hour smallint not null check (slot_hour between 10 and 21), -- start hour; 21 = 9-10pm slot
  is_available boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (person_id, slot_date, slot_hour)
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table food (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- No auth in this app (trusted link, name-based identification only).
-- Enable RLS and allow the anon key full access — do NOT use the service-role key client-side.
alter table people enable row level security;
alter table availability enable row level security;
alter table ideas enable row level security;
alter table food enable row level security;

create policy "anon full access" on people for all using (true) with check (true);
create policy "anon full access" on availability for all using (true) with check (true);
create policy "anon full access" on ideas for all using (true) with check (true);
create policy "anon full access" on food for all using (true) with check (true);

-- Seed the 17 names:
insert into people (name) values
  ('[[Alaric]]'), ('[[Jason]]'), ('[[Hunter]]'), ('[[Victoria]]'), ('[[Layana]]'),
  ('[[Zainab]]'), ('[[Nicole]]'), ('[[Nina]]'), ('[[Layla]]'), ('[[Jamie]]'),
  ('[[Presley]]'), ('[[Abby]]'), ('[[Kat]]'), ('[[Sofia]]'), ('[[Faith]]'),
  ('[[Izzy]]'), ('[[Jaidyn]]');
```

Date range: Thu Nov 20, 2026 – Sun Nov 29, 2026 inclusive = **10 days**. Hour slots: start hours 10–21 = **12 one-hour slots/day** (10–11am … 9–10pm), which covers "10am till 10pm." 120 slots per person total. Confirm this matches what you meant before Claude Code seeds it.

## 3. Pages / flow

### `/` — Name picker
- Dropdown/select of the 17 seeded names (fetched from `people`).
- On selection, store the chosen `person_id` + `name` in `localStorage` and route to `/app`.
- If `localStorage` already has a selection, skip straight to `/app` (returning visitor).

### `/app` — three tabs
Mobile: bottom tab bar. Desktop: top tabs. Sticky header shows "Hi, [[name]]" with a small "Not you? Switch" link that clears `localStorage` and returns to `/`.

**Availability tab**
- *Your availability:* a day switcher (horizontally scrollable pills, Nov 20–29) showing one day at a time on mobile. For the selected day, a vertical list of 12 hour rows (10–11am … 9–10pm), each a large tappable toggle for "I'm free then" — upserts into `availability` keyed on `(person_id, slot_date, slot_hour)`. Pre-check whatever this person already submitted.
- *Group heatmap:* for every slot, show the **count** of people marked available (e.g., "6/17") plus a background color intensity scaled to that count. On mobile, this renders per-day (matching the day switcher above it); on desktop, show the full 10-day × 12-hour grid at once.
- Tapping/clicking any slot opens a sheet/modal listing the names of everyone free at that slot.
- Subscribe to Supabase Realtime on the `availability` table so counts update live as others submit, no refresh needed.

**Ideas tab**
- Text input + "Add idea" button. New row inserts into `ideas` with the current `person_id`.
- List below, newest first, each row showing the text and the submitter's name.
- A delete icon appears only on rows where `person_id` matches the current user's `localStorage` id; deleting removes that row from `ideas`.

**Food tab**
- Identical pattern to Ideas, backed by the `food` table (text input, name-tagged list, delete-own-only).

## 4. Mobile-first requirements

- Design for a 375–430px-wide screen first; this is the primary device — most of the 17 will use it on their phones.
- No horizontal page scroll anywhere except the intentional day-pill switcher.
- Touch targets ≥ 44px.
- Availability toggles and list rows should be big enough to tap accurately with one thumb.
- Keep the heatmap on mobile to one day's worth of hours at a time (12 rows), not a cramped 120-cell grid.

## 5. Acceptance criteria (Claude Code should verify these, not just assume them)

1. Selecting a name, marking availability across all 10 days, and reloading the page preserves and pre-fills that person's prior selections.
2. With 2–3 test people submitting overlapping slots, the heatmap counts and the "who's free" modal both match what's actually in the `availability` table.
3. Two browser sessions submitting at the same time don't clobber each other's data (upsert is keyed correctly; no duplicate rows on the same person+slot).
4. Idea/food entries show the correct submitter name, and the delete button only ever appears on the current user's own entries — never on someone else's, even if you inspect the DOM.
5. The whole flow — name picker → mark availability → add an idea → add a food item — works end-to-end on a real phone-sized viewport with no overflow or unreadably small tap targets.

## 6. Build & deploy sequence

Steps marked **[You]** happen outside Claude Code, in a browser, on your own accounts.

1. **[You]** Create a free project at supabase.com. Copy the Project URL and the `anon` public API key from Settings → API.
2. **[You]** Create a free Vercel account and connect it to your GitHub.
3. **[Claude Code]** Scaffold the Next.js + TypeScript + Tailwind + Supabase client project.
4. **[Claude Code]** Write the SQL migration (Section 2) to a file; **[You]** paste it into the Supabase SQL editor and run it once you've filled in the 17 real names.
5. **[Claude Code]** Build the pages and components per Sections 3–4.
6. **[Claude Code]** Add `.env.local` (git-ignored) with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus a committed `.env.example` with the variable names only.
7. **[Claude Code]** Run it locally against your real Supabase project and check it against Section 5's acceptance criteria.
8. **[You]** Push the repo to GitHub, import it in Vercel, add the two env vars in the Vercel project's settings, deploy.
9. **[You]** Share the resulting `*.vercel.app` link with the group.

## 7. Still open — confirm or fill in before/while building

- The final list of all 17 names, spelled exactly as you want them in the dropdown (replace the `[[Name N]]` placeholders in Section 2).
- Confirm the date range and hour slots in Section 2 match "Nov 20–29, 10am–10pm."
- Any visual theme (Thanksgiving colors) vs. a plain neutral UI — Claude Code will default to a clean, neutral look unless you say otherwise.
