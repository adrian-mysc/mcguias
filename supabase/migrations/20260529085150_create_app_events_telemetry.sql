-- Telemetria leve: registra eventos do app (app_open, quiz_started, quiz_finished)
-- independente do pipeline de sync. Sem FK em user_id (atribuição best-effort,
-- não pode falhar por integridade). Insert-only; sem leitura pública.
CREATE TABLE IF NOT EXISTS public.app_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  anon_id    text,
  event      text NOT NULL CHECK (char_length(event) <= 40),
  path       text,
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON public.app_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_events_event      ON public.app_events(event, created_at DESC);

ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Insert permitido a qualquer cliente (captura até sessões com auth instável).
-- Sem SELECT público — só service_role/dashboard lê (privacidade).
DROP POLICY IF EXISTS app_events_insert ON public.app_events;
CREATE POLICY app_events_insert ON public.app_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON public.app_events TO anon, authenticated;
