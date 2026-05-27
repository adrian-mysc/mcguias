-- get_user_rank: mesmo fallback de get_leaderboard para calcular posição correta
CREATE OR REPLACE FUNCTION public.get_user_rank(uid uuid)
RETURNS TABLE(
  rank     bigint,
  pontos   bigint,
  quizzes  bigint,
  username text,
  avatar   text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH effective AS (
    SELECT
      p.id AS user_id,
      GREATEST(
        COALESCE((SELECT SUM(qs.score)::bigint FROM public.quiz_sessions qs WHERE qs.user_id = p.id), 0),
        COALESCE(l.points::bigint, 0)
      ) AS pontos,
      GREATEST(
        COALESCE((SELECT COUNT(*)::bigint    FROM public.quiz_sessions qs WHERE qs.user_id = p.id), 0),
        COALESCE(l.total_xp::bigint, 0)
      ) AS quizzes
    FROM public.profiles p
    LEFT JOIN public.leaderboard l ON l.user_id = p.id
    WHERE GREATEST(
      COALESCE((SELECT SUM(qs.score)::bigint FROM public.quiz_sessions qs WHERE qs.user_id = p.id), 0),
      COALESCE(l.points::bigint, 0)
    ) > 0
  )
  SELECT
    (SELECT COUNT(*)::bigint + 1
       FROM effective
      WHERE pontos > COALESCE((SELECT e.pontos FROM effective e WHERE e.user_id = uid), 0)) AS rank,
    COALESCE((SELECT e.pontos  FROM effective e WHERE e.user_id = uid), 0) AS pontos,
    COALESCE((SELECT e.quizzes FROM effective e WHERE e.user_id = uid), 0) AS quizzes,
    p.username,
    p.avatar
  FROM public.profiles p
  WHERE p.id = uid;
$$;
