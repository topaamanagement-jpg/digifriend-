-- DigiFriend — run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- 1. Calls table
create table if not exists calls (
  id               uuid default gen_random_uuid() primary key,
  member_id        uuid references auth.users(id) on delete cascade not null,
  friend_name      text not null,
  friend_flag      text default '🌍',
  scheduled_at     timestamptz not null,
  duration_minutes int default 60,
  jitsi_room       text,
  reminder_sent    boolean default false,
  created_at       timestamptz default now()
);

-- 2. Auto-generate Jitsi room name on insert
create or replace function set_jitsi_room()
returns trigger language plpgsql as $$
begin
  if new.jitsi_room is null then
    new.jitsi_room := 'digifriend-' || substr(new.id::text, 1, 8);
  end if;
  return new;
end;
$$;

drop trigger if exists calls_set_jitsi_room on calls;
create trigger calls_set_jitsi_room
  before insert on calls
  for each row execute function set_jitsi_room();

-- 3. Row-level security — members see only their own calls
alter table calls enable row level security;

drop policy if exists "Members see own calls" on calls;
create policy "Members see own calls" on calls
  for select using (auth.uid() = member_id);

-- ───────────────────────────────────────────────────────
-- 2. DigiFriends table
create table if not exists digifriends (
  id               uuid default gen_random_uuid() primary key,
  name             text not null,
  email            text not null unique,
  country          text not null,
  flag             text default '🌍',
  city             text,
  age              int,
  languages        text,          -- e.g. "English (Native), Swahili (Fluent)"
  interests        text,          -- e.g. "Books, Music, Travel"
  style            text,          -- conversation style
  headline         text,
  bio              text,
  photo_url        text,
  available_days   text,          -- e.g. "Monday, Wednesday, Friday"
  status           text default 'active', -- active | paused | inactive
  created_at       timestamptz default now()
);

-- Anyone can read active DigiFriends (for browse page later)
alter table digifriends enable row level security;
create policy "Public read active digifriends" on digifriends
  for select using (status = 'active');

-- Done! To add a call for a member, run:
-- insert into calls (member_id, friend_name, friend_flag, scheduled_at)
-- values ('<user-uuid>', 'James from Nairobi', '🇰🇪', '2026-06-25 16:00:00+02');
-- The Jitsi room is auto-generated. Find the member's UUID in Authentication → Users.
