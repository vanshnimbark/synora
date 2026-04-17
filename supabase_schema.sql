-- =====================================================================
-- SYNORA — SUPABASE SCHEMA MIGRATION
-- Paste this whole file into: Supabase Studio → SQL Editor → Run
-- Safe to re-run (idempotent via IF NOT EXISTS).
-- =====================================================================

-- Extensions -----------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ENUMS ----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'gender_t') then
    create type gender_t as enum ('woman', 'man', 'non_binary', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'discovery_zone_t') then
    create type discovery_zone_t as enum ('nearby', 'here_now');
  end if;
  if not exists (select 1 from pg_type where typname = 'match_status_t') then
    create type match_status_t as enum ('active', 'archived', 'blocked');
  end if;
  if not exists (select 1 from pg_type where typname = 'presence_status_t') then
    create type presence_status_t as enum ('in', 'out');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status_t') then
    create type subscription_status_t as enum ('free', 'active', 'inactive');
  end if;
end $$;

-- USERS ----------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique not null,
  handle text unique not null,
  full_name text not null,
  age int not null check (age >= 18 and age <= 80),
  gender gender_t not null,
  bio text,
  avatar_url text,
  photo_urls text[] default '{}'::text[],
  prompt_one text,
  prompt_one_answer text,
  prompt_two text,
  prompt_two_answer text,
  intent text,
  city text,
  college text,
  is_approved boolean not null default true,
  is_founder_approved boolean not null default false,
  is_banned boolean not null default false,
  is_invisible boolean not null default false,
  is_paid boolean not null default false,
  subscription_status subscription_status_t not null default 'free',
  payment_expires_at timestamptz,
  current_zone discovery_zone_t not null default 'nearby',
  current_venue_id uuid,
  expo_push_token text,
  last_active_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists users_gender_idx on public.users (gender);
create index if not exists users_approved_idx on public.users (is_approved, is_banned, is_invisible);

-- VENUES ---------------------------------------------------------------
create table if not exists public.venues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  city text not null,
  address text,
  category text,
  zone_label text not null default 'nearby',
  latitude double precision not null,
  longitude double precision not null,
  geofence_radius_meters int not null default 500,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists venues_city_idx on public.venues (city);
create index if not exists venues_active_idx on public.venues (is_active);

-- VENUE PRESENCE -------------------------------------------------------
create table if not exists public.venue_presence (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status presence_status_t not null default 'in',
  is_active boolean not null default true,
  entered_at timestamptz not null default now(),
  exited_at timestamptz,
  left_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists venue_presence_venue_active_idx
  on public.venue_presence (venue_id, is_active);
create index if not exists venue_presence_user_active_idx
  on public.venue_presence (user_id, is_active);

-- COMMENTS (the "like" mechanism — must include a comment) ------------
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  from_user uuid not null references public.users(id) on delete cascade,
  to_user uuid not null references public.users(id) on delete cascade,
  prompt_index int not null default 0,
  comment_text text not null,
  created_at timestamptz not null default now(),
  unique (from_user, to_user)
);
create index if not exists comments_to_user_idx on public.comments (to_user);
create index if not exists comments_from_user_idx on public.comments (from_user);

-- MATCHES --------------------------------------------------------------
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  user_one_id uuid not null references public.users(id) on delete cascade,
  user_two_id uuid not null references public.users(id) on delete cascade,
  status match_status_t not null default 'active',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint match_pair_unique unique (user_one_id, user_two_id),
  constraint match_not_self check (user_one_id <> user_two_id)
);
create index if not exists matches_user_one_idx on public.matches (user_one_id);
create index if not exists matches_user_two_idx on public.matches (user_two_id);

-- MESSAGES -------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_match_idx on public.messages (match_id, created_at);

-- BLOCKS ---------------------------------------------------------------
create table if not exists public.blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);

-- REPORTS --------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reported_id uuid not null references public.users(id) on delete cascade,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

-- MATCH TRIGGER: when mutual comments exist, create a match -----------
create or replace function public.create_match_on_mutual_comment()
returns trigger
language plpgsql
security definer
as $$
declare
  reverse_exists boolean;
  a_id uuid;
  b_id uuid;
begin
  select exists(
    select 1 from public.comments
    where from_user = new.to_user and to_user = new.from_user
  ) into reverse_exists;

  if reverse_exists then
    -- Order pair for uniqueness
    if new.from_user < new.to_user then
      a_id := new.from_user;
      b_id := new.to_user;
    else
      a_id := new.to_user;
      b_id := new.from_user;
    end if;

    insert into public.matches (user_one_id, user_two_id, status)
    values (a_id, b_id, 'active')
    on conflict (user_one_id, user_two_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists comments_create_match on public.comments;
create trigger comments_create_match
after insert on public.comments
for each row
execute function public.create_match_on_mutual_comment();

-- updated_at auto maintain
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_venues_updated_at on public.venues;
create trigger trg_venues_updated_at before update on public.venues
for each row execute function public.set_updated_at();

drop trigger if exists trg_venue_presence_updated_at on public.venue_presence;
create trigger trg_venue_presence_updated_at before update on public.venue_presence
for each row execute function public.set_updated_at();

drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at before update on public.matches
for each row execute function public.set_updated_at();

-- CROSSED PATHS RPC ---------------------------------------------------
create or replace function public.get_crossed_paths(
  current_user_id uuid,
  venue_id uuid,
  limit_count int default 10
)
returns table (
  user_id uuid,
  full_name text,
  age int,
  avatar_url text,
  intent text,
  match_percent int
)
language sql
security definer
as $$
  select
    u.id as user_id,
    u.full_name,
    u.age,
    u.avatar_url,
    u.intent,
    (40 + floor(random() * 60))::int as match_percent
  from public.venue_presence vp
  join public.users u on u.id = vp.user_id
  where vp.venue_id = get_crossed_paths.venue_id
    and vp.user_id <> get_crossed_paths.current_user_id
    and u.is_approved = true
    and u.is_banned = false
    and u.is_invisible = false
  order by vp.entered_at desc
  limit limit_count;
$$;

-- Row Level Security (permissive for MVP — tighten later) -------------
alter table public.users          enable row level security;
alter table public.venues         enable row level security;
alter table public.venue_presence enable row level security;
alter table public.comments       enable row level security;
alter table public.matches        enable row level security;
alter table public.messages       enable row level security;
alter table public.blocks         enable row level security;
alter table public.reports        enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'users','venues','venue_presence','comments','matches','messages','blocks','reports'
  ]
  loop
    execute format('drop policy if exists "allow_all_auth_%1$s" on public.%1$I', t);
    execute format(
      'create policy "allow_all_auth_%1$s" on public.%1$I for all to authenticated using (true) with check (true)',
      t
    );
    execute format('drop policy if exists "allow_read_anon_%1$s" on public.%1$I', t);
    execute format(
      'create policy "allow_read_anon_%1$s" on public.%1$I for select to anon using (true)',
      t
    );
  end loop;
end $$;

-- Realtime: enable for messages + venue_presence + matches ------------
do $$ begin
  begin execute 'alter publication supabase_realtime add table public.messages'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.venue_presence'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.matches'; exception when others then null; end;
end $$;

-- Storage bucket for profile photos ------------------------------------
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload & read profile photos -----------
drop policy if exists "profile_photos_upload" on storage.objects;
create policy "profile_photos_upload" on storage.objects
for insert to authenticated
with check (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_read" on storage.objects;
create policy "profile_photos_read" on storage.objects
for select to public
using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_update" on storage.objects;
create policy "profile_photos_update" on storage.objects
for update to authenticated
using (bucket_id = 'profile-photos');

-- =====================================================================
-- SEED VENUES (Bangalore + Delhi + Mumbai staples)
-- =====================================================================
insert into public.venues (name, slug, city, address, category, latitude, longitude, geofence_radius_meters)
values
  ('Third Wave Coffee, Indiranagar', 'third-wave-indiranagar', 'Bangalore', '100 Feet Rd, Indiranagar', 'cafe', 12.9719, 77.6412, 500),
  ('Antisocial, Koramangala',       'antisocial-koramangala',  'Bangalore', '118 7th Block, Koramangala',  'club',  12.9352, 77.6245, 500),
  ('Toit Brewpub, Indiranagar',     'toit-indiranagar',        'Bangalore', '298, 100 Feet Rd',             'bar',   12.9759, 77.6411, 500),
  ('Blue Tokai, Church Street',      'blue-tokai-church',       'Bangalore', 'Church Street',                 'cafe',  12.9747, 77.6078, 500),
  ('Cuppa, HSR Layout',              'cuppa-hsr',               'Bangalore', 'HSR Layout Sector 2',           'cafe',  12.9116, 77.6474, 500),
  ('Social, Hauz Khas',              'social-hauz-khas',        'Delhi',     'Hauz Khas Village',             'bar',   28.5535, 77.1944, 500),
  ('CP Starbucks Reserve',           'starbucks-cp',            'Delhi',     'Connaught Place',               'cafe',  28.6330, 77.2194, 500),
  ('Khan Market — Perch',            'perch-khan-market',       'Delhi',     'Khan Market',                   'cafe',  28.5998, 77.2273, 500),
  ('The Bombay Canteen',             'bombay-canteen',          'Mumbai',   'Kamala Mills, Lower Parel',      'restaurant', 19.0014, 72.8306, 500),
  ('Kitty Su, Juhu',                 'kitty-su-juhu',           'Mumbai',   'Juhu Tara Road',                 'club',  19.1075, 72.8263, 500),
  ('IIT Bombay — H15 Cafeteria',     'iitb-h15',                'Mumbai',   'Powai',                          'campus', 19.1334, 72.9133, 800),
  ('IISc Main Campus',               'iisc-main',               'Bangalore','CV Raman Rd',                    'campus', 13.0213, 77.5697, 800)
on conflict (slug) do nothing;

-- Done.
