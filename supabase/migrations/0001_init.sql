-- Friendsgiving planner: run once in the Supabase SQL editor.
create extension if not exists "pgcrypto";

create table people (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  slot_date date not null check (slot_date between '2026-11-20' and '2026-11-29'),
  slot_hour smallint not null check (slot_hour between 10 and 21), -- start hour; 21 = 9-10pm slot
  is_available boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (person_id, slot_date, slot_hour)
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

create table food (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

-- No auth in this app (trusted link, name-based identification only).
-- RLS on, anon key gets full access. Never use the service-role key client-side.
alter table people enable row level security;
alter table availability enable row level security;
alter table ideas enable row level security;
alter table food enable row level security;

create policy "anon full access" on people for all using (true) with check (true);
create policy "anon full access" on availability for all using (true) with check (true);
create policy "anon full access" on ideas for all using (true) with check (true);
create policy "anon full access" on food for all using (true) with check (true);

-- Live updates: publish these tables to Supabase Realtime.
alter publication supabase_realtime add table availability, ideas, food;
-- Send the full old row on delete so clients can remove it locally.
alter table ideas replica identity full;
alter table food replica identity full;

-- Seed the 17 names:
insert into people (name) values
  ('Alaric'), ('Jason'), ('Hunter'), ('Victoria'), ('Layana'),
  ('Zainab'), ('Nicole'), ('Nina'), ('Layla'), ('Jamie'),
  ('Presley'), ('Abby'), ('Kat'), ('Sofia'), ('Faith'),
  ('Izzy'), ('Jaidyn');
