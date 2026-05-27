-- get_leaderboard: usa quiz_sessions como fonte primária,
-- cai para leaderboard.points quando não há sessões sincronizadas ainda
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.id                                                         AS user_id,
    p.username,
    COALESCE(p.loja,  '')                                        AS loja,
    COALESCE(p.sigla, '')                                        AS sigla,
    GREATEST(
      COALESCE(SUM(qs.score)::bigint, 0),
      COALESCE(MAX(l.points)::bigint,  0)
    )                                                            AS pontos,
    GREATEST(
      COALESCE(COUNT(qs.id)::bigint, 0),
      COALESCE(MAX(l.total_xp)::bigint, 0)
    )                                                            AS quizzes,
    p.avatar,
    COALESCE(MAX(qs.played_at), MAX(l.updated_at))              AS updated_at
  FROM public.profiles p
  LEFT JOIN public.quiz_sessions qs ON qs.user_id = p.id
  LEFT JOIN public.leaderboard    l  ON l.user_id  = p.id
  GROUP BY p.id, p.username, p.loja, p.sigla, p.avatar
  HAVING GREATEST(
    COALESCE(SUM(qs.score)::bigint, 0),
    COALESCE(MAX(l.points)::bigint,  0)
  ) > 0
  ORDER BY pontos DESC
  LIMIT lim;
$$;
