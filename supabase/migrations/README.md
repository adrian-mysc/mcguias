# Supabase Migrations — MC Guias

Fonte de verdade do schema do banco (projeto `iizzeeceqysdfhnkosrc`).

## Histórico aplicado em produção

| Versão | Nome |
|--------|------|
| 20260521015617 | fix_rls_performance_and_indexes |
| 20260521015627 | fix_integrity_constraints |
| 20260521015640 | add_triggers_quiz_sessions_and_columns |
| 20260521015826 | fix_function_search_path |
| 20260521025004 | add_profile_loja_sigla |
| 20260521025018 | create_leaderboard_rpc_functions |
| 20260522163404 | add_avatar_emoji_cargo_to_profiles |
| 20260523083154 | public_read_achievements_and_sessions |
| 20260523084940 | add_avatars_bucket_and_leaderboard_cols |
| 20260523085542 | create_battles_table |
| 20260523113531 | create_battle_stats |
| 20260523115119 | battle_stats_streak_columns |
| 20260523121653 | fix_leaderboard_rpcs_add_avatar |
| 20260523175550 | add_cached_points_and_trigger |
| 20260524051426 | create_weekly_challenges |
| 20260526022053 | create_push_subscriptions |
| 20260526081402 | arena_sessions_and_participants |
| 20260527162312 | leaderboard_fallback_from_leaderboard_table |
| **20260529081404** | **add_fk_indexes** (perf — índices nas FKs) |
| **20260529081414** | **security_search_path_revoke_bucket** (lints 0011/0025/0028) |
| **20260529081441** | **optimize_rls_initplan_and_permissive** (lints 0003/0006) |
| **20260529081452** | **quiz_sessions_idempotency** (client_session_id) |

As 18 primeiras estão consolidadas em `20260521015617_baseline_remote_history.sql`
(cópia verbatim do `supabase_migrations.schema_migrations`). As 4 de `20260529*`
são arquivos individuais re-executáveis.

## Workflow

```bash
# Recuperar o schema completo de produção (recomendado para rebuild limpo):
supabase db pull

# Aplicar uma nova migration:
supabase migration new minha_mudanca
# editar o arquivo gerado e:
supabase db push
```

## Pendências conhecidas (ver análise)

- **Auth — proteção de senha vazada** desativada: ativar em
  Dashboard → Authentication → Policies (não é via SQL).
- **get_leaderboard / get_user_rank** são `SECURITY DEFINER` executáveis por
  `anon` — **intencional** (ranking público). Os lints 0028/0029 permanecem
  por design.
- **Modelo de pontos** tem 3 fontes (`SUM(quiz_sessions.score)`,
  `leaderboard.points`, `leaderboard.cached_points`). `get_leaderboard` usa
  `GREATEST(SUM, points)`. Considerar unificar numa única fonte no futuro.
