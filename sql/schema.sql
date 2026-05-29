-- =============================================================================
-- ⚠️  LEGADO / DESATUALIZADO — NÃO é a fonte de verdade do schema.
-- =============================================================================
-- Este arquivo NÃO reflete o estado real do banco de produção. Faltam tabelas
-- (battle_stats, weekly_challenges, arena_sessions, arena_participants),
-- colunas (leaderboard.cached_points, profiles.estado/cidade), funções e
-- triggers. Além disso, partes aqui CONFLITAM com as migrations (ex.:
-- achievements_select é criado nos dois lugares).
--
-- ➡️  A fonte de verdade é `supabase/migrations/` (ver README de lá).
--     Para reconstruir o banco do zero, use `supabase db pull`.
--
-- Mantido apenas como referência histórica do schema inicial.
-- =============================================================================

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

-- Batalha ao vivo: duelos em tempo real
CREATE TABLE IF NOT EXISTS battles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  player1_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player2_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  player1_username text NOT NULL,
  player2_username text NOT NULL,
  player1_avatar text,
  player2_avatar text,
  guide text NOT NULL,
  guide_nome text NOT NULL,
  question_ids text[] NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | active | finished | declined | cancelled
  player1_score integer NOT NULL DEFAULT 0,
  player2_score integer NOT NULL DEFAULT 0,
  player1_finished boolean NOT NULL DEFAULT false,
  player2_finished boolean NOT NULL DEFAULT false,
  winner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battles_select" ON battles FOR SELECT  USING (player1_id = auth.uid() OR player2_id = auth.uid());
CREATE POLICY "battles_insert" ON battles FOR INSERT  WITH CHECK (player1_id = auth.uid());
CREATE POLICY "battles_update" ON battles FOR UPDATE  USING (player1_id = auth.uid() OR player2_id = auth.uid());
CREATE POLICY "battles_delete" ON battles FOR DELETE  USING (player1_id = auth.uid() OR player2_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE battles;

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
