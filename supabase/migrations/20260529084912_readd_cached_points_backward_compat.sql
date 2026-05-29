-- Compatibilidade retroativa: o código em PRODUÇÃO (ainda não atualizado)
-- faz .select('cached_points'). Após o drop em unify_points_model, esse sync
-- quebrou ("column leaderboard.cached_points does not exist" nos logs).
-- Readiciona cached_points como COLUNA GERADA espelhando points (sempre = SUM).
-- - Código antigo: lê cached_points e funciona (= points).
-- - Código novo: ignora a coluna.
-- - Ninguém escreve nela (generated), sem conflito com o trigger.
ALTER TABLE public.leaderboard
  ADD COLUMN IF NOT EXISTS cached_points integer GENERATED ALWAYS AS (points) STORED;
