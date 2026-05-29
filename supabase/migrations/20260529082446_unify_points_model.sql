-- ============================================================================
-- Unifica o modelo de pontos: quiz_sessions é a ÚNICA fonte de verdade.
-- leaderboard.points/total_xp viram cache derivado, mantido pelo trigger.
-- Remove cached_points (redundante) e o fallback GREATEST das RPCs.
-- ============================================================================

-- 1. Reconciliação (idempotente): alinha o cache ao agregado real.
--    points já == SUM para todos; isto corrige total_xp -> COUNT real.
UPDATE public.leaderboard l
SET points   = agg.s,
    total_xp = agg.c,
    updated_at = now()
FROM (
  SELECT user_id, COALESCE(SUM(score),0)::int AS s, COUNT(*)::int AS c
  FROM public.quiz_sessions GROUP BY user_id
) agg
WHERE l.user_id = agg.user_id
  AND (l.points <> agg.s OR l.total_xp <> agg.c);

-- 2. Trigger passa a manter points + total_xp diretamente (sem cached_points).
--    (nome mantido para preservar o trigger/grants existentes)
CREATE OR REPLACE FUNCTION public.update_leaderboard_cached_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO leaderboard (user_id, username, points, total_xp)
  VALUES (
    NEW.user_id,
    COALESCE((SELECT username FROM leaderboard WHERE user_id = NEW.user_id), 'Jogador'),
    (SELECT COALESCE(SUM(score), 0) FROM quiz_sessions WHERE user_id = NEW.user_id),
    (SELECT COUNT(*)                FROM quiz_sessions WHERE user_id = NEW.user_id)
  )
  ON CONFLICT (user_id) DO UPDATE
    SET points     = (SELECT COALESCE(SUM(score), 0) FROM quiz_sessions WHERE user_id = NEW.user_id),
        total_xp   = (SELECT COUNT(*)                FROM quiz_sessions WHERE user_id = NEW.user_id),
        updated_at = now();
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_leaderboard_cached_points() FROM anon, authenticated, public;

-- 3. Remove a coluna redundante.
ALTER TABLE public.leaderboard DROP COLUMN IF EXISTS cached_points;

-- 4. RPCs leem o cache diretamente (fonte única, sem GREATEST).
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
    p.id, p.username,
    COALESCE(p.loja, '')  AS loja,
    COALESCE(p.sigla, '') AS sigla,
    l.points::bigint      AS pontos,
    l.total_xp::bigint    AS quizzes,
    p.avatar,
    l.updated_at
  FROM public.leaderboard l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.points > 0
  ORDER BY l.points DESC
  LIMIT lim;
$$;

CREATE OR REPLACE FUNCTION public.get_user_rank(uid uuid)
RETURNS TABLE(rank bigint, pontos bigint, quizzes bigint, username text, avatar text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    (SELECT COUNT(*)::bigint + 1
       FROM public.leaderboard
      WHERE points > COALESCE((SELECT points FROM public.leaderboard WHERE user_id = uid), 0)) AS rank,
    COALESCE(l.points::bigint, 0)   AS pontos,
    COALESCE(l.total_xp::bigint, 0) AS quizzes,
    p.username,
    p.avatar
  FROM public.profiles p
  LEFT JOIN public.leaderboard l ON l.user_id = p.id
  WHERE p.id = uid;
$$;
