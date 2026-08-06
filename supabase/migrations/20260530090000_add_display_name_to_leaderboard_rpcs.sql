-- Inclui display_name (nome real do usuário) no retorno das RPCs de ranking.
-- Antes, o ranking só recebia `username` (slug com sufixo do UUID, ex.:
-- "joao_silva_a1b2c3"), por isso os nomes apareciam "daquele jeito" em vez de
-- "Nome Sobrenome". A coluna display_name já existe em profiles; aqui ela passa
-- a ser exposta pelas RPCs.
--
-- Retrocompatível no cliente: apenas ADICIONA uma coluna ao retorno. O cliente
-- antigo (ainda em produção no GitHub Pages) ignora o campo novo; o cliente novo
-- usa `display_name || username` como nome exibido.
--
-- ⚠️ POR QUE ESTA MIGRATION USA DROP + CREATE, E NÃO CREATE OR REPLACE
-- A primeira versão deste arquivo usava CREATE OR REPLACE e por isso NUNCA
-- chegou a ser aplicada: acrescentar uma coluna ao RETURNS TABLE muda o tipo de
-- retorno da função, e o Postgres recusa com
--   ERROR: cannot change return type of existing function (SQLSTATE 42P13)
-- A correção é remover a função antes de recriá-la. Como DDL é transacional no
-- Postgres, as sessões concorrentes continuam enxergando a versão antiga até o
-- COMMIT — não há janela de indisponibilidade.
--
-- ⚠️ DROP FUNCTION TAMBÉM APAGA OS GRANTS. As RPCs são chamadas pelo PostgREST
-- como `anon`/`authenticated`, então os GRANT EXECUTE precisam ser refeitos no
-- fim do arquivo, ou o ranking passaria a ser negado para todo mundo.

DROP FUNCTION IF EXISTS public.get_leaderboard(integer);
DROP FUNCTION IF EXISTS public.get_user_rank(uuid);

-- lim = 100 acompanha o número de posições exibidas na página de Ranking.
-- O cliente sempre passa `lim` explicitamente; o default é só fallback.
CREATE FUNCTION public.get_leaderboard(lim integer DEFAULT 100)
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

CREATE FUNCTION public.get_user_rank(uid uuid)
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

-- Restaura os GRANTs perdidos no DROP (ver nota no cabeçalho).
GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_rank(uuid)      TO anon, authenticated, service_role;
