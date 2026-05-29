-- lint 0011: fixar search_path nas funções (usa 'public' pois os corpos
-- referenciam tabelas sem schema-qualificação)
ALTER FUNCTION public.update_leaderboard_cached_points() SET search_path = public;
ALTER FUNCTION public.touch_weekly_challenges() SET search_path = public;

-- lint 0028/0029: a função de trigger não deve ser executável via RPC público
REVOKE EXECUTE ON FUNCTION public.update_leaderboard_cached_points() FROM anon, authenticated, public;

-- lint 0025: bucket público 'avatars' não precisa de SELECT amplo em storage.objects.
-- O acesso por URL pública (getPublicUrl) não usa esta policy; removê-la impede listagem.
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
