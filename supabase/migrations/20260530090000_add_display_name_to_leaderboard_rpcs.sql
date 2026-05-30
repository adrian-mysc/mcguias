-- Inclui display_name (nome real do usuário) no retorno das RPCs de ranking.
-- Antes, o ranking só recebia `username` (slug com sufixo do UUID, ex.:
-- "joao_silva_a1b2c3"), por isso os nomes apareciam "daquele jeito" em vez de
-- "Nome Sobrenome". A coluna display_name já existe em profiles; aqui ela passa
-- a ser exposta pelas RPCs.
--
-- Retrocompatível: apenas ADICIONA uma coluna ao retorno. O cliente antigo
-- (ainda em produção no GitHub Pages) ignora o campo novo; o cliente novo usa
-- `display_name || username` como nome exibido.

CREATE OR REPLACE FUNCTION public.get_leaderboard(lim integer DEFAULT 20)
RETURNS TABLE(
  user_id    uuid, username text, display_name text, loja text, sigla text,
  pontos bigint, quizzes bigint, avatar text, updated_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    p.id AS user_id, p.username, p.display_name,
    COALESCE(p.loja,'')  AS loja,
    COALESCE(p.sigla,'') AS sigla,
    GREATEST(COALESCE(SUM(qs.score)::bigint,0), COALESCE(MAX(l.points)::bigint,0))   AS pontos,
    GREATEST(COALESCE(COUNT(qs.id)::bigint,0),  COALESCE(MAX(l.total_xp)::bigint,0)) AS quizzes,
    p.avatar,
    COALESCE(MAX(qs.played_at), MAX(l.updated_at)) AS updated_at
  FROM public.profiles p
  LEFT JOIN public.quiz_sessions qs ON qs.user_id = p.id
  LEFT JOIN public.leaderboard    l  ON l.user_id  = p.id
  GROUP BY p.id, p.username, p.display_name, p.loja, p.sigla, p.avatar
  HAVING GREATEST(COALESCE(SUM(qs.score)::bigint,0), COALESCE(MAX(l.points)::bigint,0)) > 0
  ORDER BY pontos DESC
  LIMIT lim;
$$;

CREATE OR REPLACE FUNCTION public.get_user_rank(uid uuid)
RETURNS TABLE(rank bigint, pontos bigint, quizzes bigint, username text, display_name text, avatar text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH effective AS (
    SELECT p.id AS user_id,
      GREATEST(COALESCE((SELECT SUM(qs.score)::bigint FROM public.quiz_sessions qs WHERE qs.user_id=p.id),0),
               COALESCE(l.points::bigint,0)) AS pontos,
      GREATEST(COALESCE((SELECT COUNT(*)::bigint FROM public.quiz_sessions qs WHERE qs.user_id=p.id),0),
               COALESCE(l.total_xp::bigint,0)) AS quizzes
    FROM public.profiles p
    LEFT JOIN public.leaderboard l ON l.user_id=p.id
    WHERE GREATEST(COALESCE((SELECT SUM(qs.score)::bigint FROM public.quiz_sessions qs WHERE qs.user_id=p.id),0),
                   COALESCE(l.points::bigint,0)) > 0
  )
  SELECT
    (SELECT COUNT(*)::bigint+1 FROM effective WHERE pontos > COALESCE((SELECT e.pontos FROM effective e WHERE e.user_id=uid),0)) AS rank,
    COALESCE((SELECT e.pontos FROM effective e WHERE e.user_id=uid),0)   AS pontos,
    COALESCE((SELECT e.quizzes FROM effective e WHERE e.user_id=uid),0)  AS quizzes,
    p.username, p.display_name, p.avatar
  FROM public.profiles p WHERE p.id=uid;
$$;
