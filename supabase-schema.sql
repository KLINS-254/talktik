-- Run in Supabase SQL Editor.
-- Use the service-role key ONLY in the live worker environment, never in frontend JS.
create table if not exists public.live_gift_events (
  id bigint generated always as identity primary key,
  event_id text not null unique,
  sender_username text not null,
  gift_name text not null,
  gift_count integer not null default 1 check (gift_count > 0),
  demo_points integer not null default 0 check (demo_points >= 0),
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.live_gift_events enable row level security;

-- The table is not readable by anonymous users by default. To show events in the web app,
-- use a server-side API that authenticates the browser/session and reads recent rows.
-- Do not add a public SELECT policy for the whole table in a production deployment.
