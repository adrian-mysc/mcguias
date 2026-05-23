
create extension if not exists "uuid-ossp";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar text,
  created_at timestamptz default now()
);

create table progress (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  module text not null,
  score integer default 0,
  completed boolean default false,
  updated_at timestamptz default now()
);

create table achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz default now()
);

create table leaderboard (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  username text not null,
  points integer default 0,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
alter table progress enable row level security;
alter table achievements enable row level security;
alter table leaderboard enable row level security;

create policy "profiles_select"
on profiles for select
using (true);

create policy "profiles_insert"
on profiles for insert
with check (auth.uid() = id);

create policy "profiles_update"
on profiles for update
using (auth.uid() = id);

create policy "progress_owner"
on progress
for all
using (auth.uid() = user_id);

create policy "achievements_owner"
on achievements
for all
using (auth.uid() = user_id);

-- Leitura pública para exibir no perfil público de outros usuários
create policy "achievements_select"
on achievements
for select
using (true);

create policy "leaderboard_public"
on leaderboard
for select
using (true);

create policy "leaderboard_owner"
on leaderboard
for all
using (auth.uid() = user_id);

-- Adicionado: avatar público e cargo no perfil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_emoji text DEFAULT '😊';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cargo text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS loja text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sigla text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;

-- Leaderboard: colunas extras para XP, loja e sigla
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS total_xp integer DEFAULT 0;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS loja text;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS sigla text;

-- Storage: bucket público para fotos de perfil
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- quiz_sessions: tabela de sessões individuais de quiz
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  guide text not null,
  score integer not null default 0,
  total integer not null default 0,
  percentage integer not null default 0,
  mode text not null default 'multipla_escolha',
  played_at timestamptz not null default now()
);

alter table quiz_sessions enable row level security;

create policy "quiz_sessions_owner"
on quiz_sessions
for all
using (auth.uid() = user_id);

-- Leitura pública para exibir estatísticas no perfil público
create policy "quiz_sessions_select"
on quiz_sessions
for select
using (true);
