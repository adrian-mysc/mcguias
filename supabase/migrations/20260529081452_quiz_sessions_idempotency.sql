-- Idempotência: evita inserir a mesma sessão de quiz duas vezes quando o
-- ponteiro de sync (localStorage) dessincroniza. O cliente envia um UUID
-- estável por sessão (client_session_id). NULLs são distintos no índice
-- único, então sessões antigas (sem id) não conflitam.
ALTER TABLE public.quiz_sessions ADD COLUMN IF NOT EXISTS client_session_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_sessions_user_csid
  ON public.quiz_sessions(user_id, client_session_id);
