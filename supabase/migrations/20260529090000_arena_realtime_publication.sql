-- arena_sessions e arena_participants precisam estar na publicação do Realtime
-- para que o postgres_changes subscription funcione na sala de espera da Arena/2v2.
-- A migration 20260526081402 criou as tabelas mas esqueceu de adicioná-las.
ALTER PUBLICATION supabase_realtime ADD TABLE arena_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE arena_participants;
