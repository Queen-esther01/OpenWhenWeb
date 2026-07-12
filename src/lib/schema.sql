-- OpenWhen Database Schema
-- Run this in Supabase SQL Editor to create all required tables.

-- Enable Row Level Security
alter table if exists public.profiles disable row level security;
alter table if exists public.partner_invites disable row level security;
alter table if exists public.open_when_letters disable row level security;

-- ============================================
-- Table: profiles
-- Stores username + link to auth.users
-- ============================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_profiles_username
  on public.profiles(username);


-- ============================================
-- Table: partner_invites
-- Used when a user invites their partner after sign-up
-- ============================================
create table if not exists public.partner_invites (
  id            uuid primary key default gen_random_uuid(),
  invited_by    uuid not null references auth.users(id) on delete cascade,
  partner_email text not null,
  partner_name  text,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz
);

create index if not exists idx_partner_invites_invited_by
  on public.partner_invites(invited_by);

create index if not exists idx_partner_invites_email
  on public.partner_invites(partner_email);


-- ============================================
-- Table: open_when_letters
-- The core table storing each Open When letter
-- ============================================
create table if not exists public.open_when_letters (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references auth.users(id) on delete cascade,
  recipient_id  uuid references auth.users(id) on delete set null,
  title         text not null,
  content       text not null,
  opens_at      timestamptz,          -- null means immediately available
  is_locked     boolean not null default false,
  status        text not null default 'sent',
  category_id   text,
  sound_id      text,
  voice_id      text,
  read_at       timestamptz,
  ready_email_sent_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_letters_sender
  on public.open_when_letters(sender_id);

create index if not exists idx_letters_recipient
  on public.open_when_letters(recipient_id);

alter table if exists public.open_when_letters
  add column if not exists status text not null default 'sent';

alter table if exists public.open_when_letters
  add column if not exists category_id text;

alter table if exists public.open_when_letters
  add column if not exists sound_id text;

alter table if exists public.open_when_letters
  add column if not exists voice_id text;

alter table if exists public.open_when_letters
  add column if not exists read_at timestamptz;

alter table if exists public.open_when_letters
  add column if not exists ready_email_sent_at timestamptz;

alter table if exists public.open_when_letters
  alter column status set default 'sent';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'open_when_letters_status_check'
  ) then
    alter table public.open_when_letters
      add constraint open_when_letters_status_check
      check (status in ('draft', 'sent'));
  end if;
end $$;


-- Auto-update updated_at triggers
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

drop trigger if exists trg_open_when_letters_updated_at on public.open_when_letters;
create trigger trg_open_when_letters_updated_at
  before update on public.open_when_letters
  for each row
  execute function public.handle_updated_at();


-- ============================================
-- Row Level Security
-- ============================================
alter table if exists public.profiles enable row level security;
alter table if exists public.partner_invites enable row level security;
alter table if exists public.open_when_letters enable row level security;

-- Profiles: anyone can read (for username checks), only user can insert/update their own
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Partner invites: users can see invites they sent
drop policy if exists "Users can view their own invites" on public.partner_invites;
create policy "Users can view their own invites"
  on public.partner_invites
  for select
  using (auth.uid() = invited_by);

-- Partner invites: unauthenticated users can view pending invites by email (for /join page)
drop policy if exists "Anyone can view pending invites by email" on public.partner_invites;
create policy "Anyone can view pending invites by email"
  on public.partner_invites
  for select
  using (status = 'pending');

-- Partner invites: the invited person can view their accepted invite
drop policy if exists "Invited partner can view accepted invite" on public.partner_invites;
create policy "Invited partner can view accepted invite"
  on public.partner_invites
  for select
  using (lower(auth.jwt() ->> 'email') = partner_email and status = 'accepted');

drop policy if exists "Users can insert their own invites" on public.partner_invites;
create policy "Users can insert their own invites"
  on public.partner_invites
  for insert
  with check (auth.uid() = invited_by);

-- Partner invites: the invited person can accept their own invite
drop policy if exists "Invited partner can accept their invite" on public.partner_invites;
create policy "Invited partner can accept their invite"
  on public.partner_invites
  for update
  using (lower(auth.jwt() ->> 'email') = partner_email AND status = 'pending')
  with check (status = 'accepted');

-- Letters: users can see letters they sent or received
drop policy if exists "Users can view their own letters" on public.open_when_letters;
create policy "Users can view their own letters"
  on public.open_when_letters
  for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Users can insert letters they send" on public.open_when_letters;
create policy "Users can insert letters they send"
  on public.open_when_letters
  for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Users can update their own letters" on public.open_when_letters;
create policy "Users can update their own letters"
  on public.open_when_letters
  for update
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);