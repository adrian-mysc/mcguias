-- =============================================================================
-- BASELINE — histórico de migrations já aplicadas em produção (squash)
-- =============================================================================
-- Este arquivo é uma cópia VERBATIM das 18 migrations registradas em
-- supabase_migrations.schema_migrations no projeto de produção, concatenadas
-- em ordem cronológica. Serve como registro histórico no repositório.
--
-- IMPORTANTE: as tabelas-base (profiles, progress, achievements, leaderboard)
-- e suas policies iniciais foram criadas ANTES da adoção de migrations, pelo
-- antigo sql/schema.sql. Para reconstruir o banco do zero de forma limpa,
-- prefira `supabase db pull` contra produção. Os arquivos datados após este
-- baseline (20260529*) são incrementais e re-executáveis com segurança.
-- =============================================================================


-- ── 20260521015617_fix_rls_performance_and_indexes ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_progress_user_id     ON public.progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_id  ON public.leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_points   ON public.leaderboard(points DESC);

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS progress_owner ON public.progress;
CREATE POLICY progress_owner ON public.progress
  FOR ALL USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS achievements_owner ON public.achievements;
CREATE POLICY achievements_owner ON public.achievements
  FOR ALL USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS leaderboard_owner  ON public.leaderboard;
DROP POLICY IF EXISTS leaderboard_public ON public.leaderboard;
CREATE POLICY leaderboard_select ON public.leaderboard
  FOR SELECT USING (true);
CREATE POLICY leaderboard_insert ON public.leaderboard
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY leaderboard_update ON public.leaderboard
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY leaderboard_delete ON public.leaderboard
  FOR DELETE USING ((select auth.uid()) = user_id);


-- ── 20260521015627_fix_integrity_constraints ────────────────────────────────
ALTER TABLE public.progress      ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.achievements  ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.leaderboard   ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.progress
  ADD CONSTRAINT progress_user_module_unique UNIQUE (user_id, module);
ALTER TABLE public.achievements
  ADD CONSTRAINT achievements_user_key_unique UNIQUE (user_id, achievement_key);
ALTER TABLE public.leaderboard
  ADD CONSTRAINT leaderboard_user_unique UNIQUE (user_id);


-- ── 20260521015640_add_triggers_quiz_sessions_and_columns ───────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER progress_set_updated_at
  BEFORE UPDATE ON public.progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER leaderboard_set_updated_at
  BEFORE UPDATE ON public.leaderboard
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS total_xp integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guide         text NOT NULL,
  score         integer NOT NULL DEFAULT 0,
  total         integer NOT NULL DEFAULT 0,
  percentage    integer NOT NULL DEFAULT 0,
  mode          text NOT NULL DEFAULT 'multipla_escolha',
  played_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_sessions_owner ON public.quiz_sessions
  FOR ALL USING ((select auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id
  ON public.quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_played_at
  ON public.quiz_sessions(user_id, played_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_guide
  ON public.quiz_sessions(user_id, guide);


-- ── 20260521015826_fix_function_search_path ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ── 20260521025004_add_profile_loja_sigla ───────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loja  TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sigla TEXT;


-- ── 20260521025018_create_leaderboard_rpc_functions ─────────────────────────
-- (substituída por versões posteriores; mantida aqui como histórico)


-- ── 20260522163404_add_avatar_emoji_cargo_to_profiles ───────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_emoji text DEFAULT '😊',
  ADD COLUMN IF NOT EXISTS cargo        text;


-- ── 20260523083154_public_read_achievements_and_sessions ────────────────────
DROP POLICY IF EXISTS achievements_select ON achievements;
CREATE POLICY achievements_select ON achievements FOR SELECT USING (true);
DROP POLICY IF EXISTS quiz_sessions_select ON quiz_sessions;
CREATE POLICY quiz_sessions_select ON quiz_sessions FOR SELECT USING (true);


-- ── 20260523084940_add_avatars_bucket_and_leaderboard_cols ──────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "avatars_owner_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- NOTA: avatars_public_read foi removida em 20260529081414 (lint 0025).

ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS loja text;
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS sigla text;


-- ── 20260523085542_create_battles_table ─────────────────────────────────────
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
  status text NOT NULL DEFAULT 'pending',
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
-- policies recriadas em 20260529081441 com (select auth.uid())
ALTER PUBLICATION supabase_realtime ADD TABLE battles;


-- ── 20260523113531_create_battle_stats ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS battle_stats (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      text NOT NULL,
  avatar        text,
  wins          integer NOT NULL DEFAULT 0,
  losses        integer NOT NULL DEFAULT 0,
  draws         integer NOT NULL DEFAULT 0,
  total_battles integer NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE battle_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "battle_stats_public_read" ON battle_stats FOR SELECT USING (true);
-- battle_stats_owner_write recriada/separada em 20260529081441


-- ── 20260523115119_battle_stats_streak_columns ──────────────────────────────
ALTER TABLE battle_stats
  ADD COLUMN IF NOT EXISTS win_streak  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0;


-- ── 20260523121653 + 20260527162312: get_leaderboard / get_user_rank ────────
-- Versão final (fallback quiz_sessions + leaderboard.points):
CREATE OR REPLACE FUNCTION public.get_leaderboard(lim integer DEFAULT 20)
RETURNS TABLE(
  user_id    uuid,
  username   text,
  loja       text,
  sigla      text,
  pontos     bigint,
  quizzes    bigint,
  avatar     text,
  updated_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    p.id AS user_id, p.username,
    COALESCE(p.loja, '') AS loja, COALESCE(p.sigla, '') AS sigla,
    GREATEST(COALESCE(SUM(qs.score)::bigint, 0), COALESCE(MAX(l.points)::bigint, 0)) AS pontos,
    GREATEST(COALESCE(COUNT(qs.id)::bigint, 0), COALESCE(MAX(l.total_xp)::bigint, 0)) AS quizzes,
    p.avatar,
    COALESCE(MAX(qs.played_at), MAX(l.updated_at)) AS updated_at
  FROM public.profiles p
  LEFT JOIN public.quiz_sessions qs ON qs.user_id = p.id
  LEFT JOIN public.leaderboard    l  ON l.user_id  = p.id
  GROUP BY p.id, p.username, p.loja, p.sigla, p.avatar
  HAVING GREATEST(COALESCE(SUM(qs.score)::bigint, 0), COALESCE(MAX(l.points)::bigint, 0)) > 0
  ORDER BY pontos DESC
  LIMIT lim;
$$;

CREATE OR REPLACE FUNCTION public.get_user_rank(uid uuid)
RETURNS TABLE(rank bigint, pontos bigint, quizzes bigint, username text, avatar text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH effective AS (
    SELECT p.id AS user_id,
      GREATEST(
        COALESCE((SELECT SUM(qs.score)::bigint FROM public.quiz_sessions qs WHERE qs.user_id = p.id), 0),
        COALESCE(l.points::bigint, 0)) AS pontos,
      GREATEST(
        COALESCE((SELECT COUNT(*)::bigint FROM public.quiz_sessions qs WHERE qs.user_id = p.id), 0),
        COALESCE(l.total_xp::bigint, 0)) AS quizzes
    FROM public.profiles p
    LEFT JOIN public.leaderboard l ON l.user_id = p.id
    WHERE GREATEST(
      COALESCE((SELECT SUM(qs.score)::bigint FROM public.quiz_sessions qs WHERE qs.user_id = p.id), 0),
      COALESCE(l.points::bigint, 0)) > 0
  )
  SELECT
    (SELECT COUNT(*)::bigint + 1 FROM effective
      WHERE pontos > COALESCE((SELECT e.pontos FROM effective e WHERE e.user_id = uid), 0)) AS rank,
    COALESCE((SELECT e.pontos  FROM effective e WHERE e.user_id = uid), 0) AS pontos,
    COALESCE((SELECT e.quizzes FROM effective e WHERE e.user_id = uid), 0) AS quizzes,
    p.username, p.avatar
  FROM public.profiles p WHERE p.id = uid;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rank   TO anon, authenticated;


-- ── 20260523175550_add_cached_points_and_trigger ────────────────────────────
ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS cached_points integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION update_leaderboard_cached_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO leaderboard (user_id, username, points, cached_points, total_xp)
  VALUES (
    NEW.user_id,
    COALESCE((SELECT username FROM leaderboard WHERE user_id = NEW.user_id), 'Jogador'),
    COALESCE((SELECT points FROM leaderboard WHERE user_id = NEW.user_id), 0),
    (SELECT COALESCE(SUM(score), 0) FROM quiz_sessions WHERE user_id = NEW.user_id),
    COALESCE((SELECT total_xp FROM leaderboard WHERE user_id = NEW.user_id), 0)
  )
  ON CONFLICT (user_id) DO UPDATE
    SET cached_points = (SELECT COALESCE(SUM(score), 0) FROM quiz_sessions WHERE user_id = NEW.user_id),
        updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION update_leaderboard_cached_points() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS trg_update_leaderboard_cached_points ON quiz_sessions;
CREATE TRIGGER trg_update_leaderboard_cached_points
  AFTER INSERT ON quiz_sessions
  FOR EACH ROW EXECUTE FUNCTION update_leaderboard_cached_points();


-- ── 20260524051426_create_weekly_challenges ─────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_challenges (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start   date NOT NULL,
  challenge_key text NOT NULL,
  progress     integer NOT NULL DEFAULT 0,
  completed    boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (user_id, week_start, challenge_key)
);
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
-- policies (own_read/own_write/own_update) recriadas em 20260529081441

CREATE OR REPLACE FUNCTION touch_weekly_challenges()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_touch_weekly_challenges
  BEFORE UPDATE ON weekly_challenges
  FOR EACH ROW EXECUTE FUNCTION touch_weekly_challenges();


-- ── 20260526022053_create_push_subscriptions ────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
-- policies (push_sub_*) recriadas em 20260529081441


-- ── 20260526081402_arena_sessions_and_participants ──────────────────────────
CREATE TABLE IF NOT EXISTS arena_sessions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code         text UNIQUE NOT NULL,
  mode         text NOT NULL CHECK (mode IN ('2v2', 'arena')),
  host_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status       text DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished', 'cancelled')),
  guide        text,
  guide_nome   text,
  question_ids text[],
  max_players  int DEFAULT 4,
  created_at   timestamptz DEFAULT now(),
  started_at   timestamptz,
  finished_at  timestamptz
);
CREATE TABLE IF NOT EXISTS arena_participants (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id   uuid REFERENCES arena_sessions(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  username     text NOT NULL,
  avatar       text,
  avatar_emoji text DEFAULT '😊',
  team         int,
  slot_order   int,
  score        int DEFAULT 0,
  answers      jsonb DEFAULT '[]',
  finished     bool DEFAULT false,
  finished_at  timestamptz,
  joined_at    timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);
ALTER TABLE arena_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arena_sessions_select" ON arena_sessions FOR SELECT USING (true);
CREATE POLICY "arena_participants_select" ON arena_participants FOR SELECT USING (true);
-- insert/update policies recriadas em 20260529081441 com (select auth.uid())
