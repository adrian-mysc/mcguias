-- Índices nas FKs sinalizadas pelo advisor (lint 0001 unindexed_foreign_keys)
CREATE INDEX IF NOT EXISTS idx_battles_player1_id      ON public.battles(player1_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2_id      ON public.battles(player2_id);
CREATE INDEX IF NOT EXISTS idx_arena_sessions_host_id  ON public.arena_sessions(host_id);
CREATE INDEX IF NOT EXISTS idx_arena_participants_user_id ON public.arena_participants(user_id);
