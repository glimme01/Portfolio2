-- Moritzfreund Arcade — Supabase Schema
-- Dieses Script im SQL Editor des Supabase-Projekts ausführen

-- 1. Highscores
create table if not exists scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 16),
  game text not null check (game in ('snake','press','clicker')),
  score int not null check (score >= 0),
  created_at timestamptz not null default now()
);

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
  active_session_token text,
  last_heartbeat timestamptz not null default now(),
  created_at timestamptz not null default now()
);

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

