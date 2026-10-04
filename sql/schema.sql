-- Moritzfreund Arcade — Supabase Schema
-- Dieses Script im SQL Editor des Supabase-Projekts ausführen

-- 1. Highscores
create table if not exists scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 16),
  game text not null check (game in ('snake','press','clicker','slots','blackjack')),
  score bigint not null check (score >= 0),
  created_at timestamptz not null default now(),
  unique (name, game)  -- Ein Eintrag pro Spieler & Spiel (UPSERT)
);

-- Migration falls Tabelle schon existiert:
-- ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_game_check;
-- ALTER TABLE scores ADD CONSTRAINT scores_game_check CHECK (game IN ('snake','press','clicker','slots','blackjack'));
-- ALTER TABLE scores ALTER COLUMN score TYPE bigint;

-- 2. Spielstände pro Spieler & Spiel
create table if not exists game_states (
  id bigint generated always as identity primary key,
  name text not null,
  game text not null,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  unique (name, game)
);

-- 3. Spieler-Profile mit Admin-Rolle & Single-Device Session Lock
create table if not exists profiles (
  id bigint generated always as identity primary key,
  username text unique not null check (char_length(username) between 2 and 16),
  pass_hash text not null,
  is_admin boolean not null default false,
  is_banned boolean not null default false,
  active_session_token text,
  last_heartbeat timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Migration falls profiles bereits existiert:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean not null default false;

-- Row Level Security aktivieren
alter table scores enable row level security;
alter table game_states enable row level security;
alter table profiles enable row level security;

-- Policies für Highscores
drop policy if exists "anon read scores" on scores;
create policy "anon read scores" on scores for select using (true);

drop policy if exists "anon insert scores" on scores;
create policy "anon insert scores" on scores for insert with check (true);

drop policy if exists "anon delete scores" on scores;
create policy "anon delete scores" on scores for delete using (true);

-- UPDATE-Policy für Upsert (Score wird nur überschrieben wenn neuer höher)
drop policy if exists "anon update scores" on scores;
create policy "anon update scores" on scores for update using (true) with check (true);

-- Policies für Spielstände
drop policy if exists "anon read states" on game_states;
create policy "anon read states" on game_states for select using (true);

drop policy if exists "anon write states" on game_states;
create policy "anon write states" on game_states for insert with check (true);

drop policy if exists "anon update states" on game_states;
create policy "anon update states" on game_states for update using (true);

-- Policies für Profile
drop policy if exists "anon read profiles" on profiles;
create policy "anon read profiles" on profiles for select using (true);

drop policy if exists "anon write profiles" on profiles;
create policy "anon write profiles" on profiles for insert with check (true);

drop policy if exists "anon update profiles" on profiles;
create policy "anon update profiles" on profiles for update using (true);

drop policy if exists "anon delete profiles" on profiles;
create policy "anon delete profiles" on profiles for delete using (true);

-- 4. Feedback & Bug Reports
create table if not exists feedback (
  id bigint generated always as identity primary key,
  name text not null default 'Anonym',
  type text not null check (type in ('bug', 'feedback', 'suggestion')),
  game text not null default 'general',
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

drop policy if exists "anon read feedback" on feedback;
create policy "anon read feedback" on feedback for select using (true);

drop policy if exists "anon insert feedback" on feedback;
create policy "anon insert feedback" on feedback for insert with check (true);

drop policy if exists "anon update feedback" on feedback;
create policy "anon update feedback" on feedback for update using (true);

drop policy if exists "anon delete feedback" on feedback;
create policy "anon delete feedback" on feedback for delete using (true);
