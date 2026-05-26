-- Adiciona cidade e estado ao perfil do usuário
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cidade text;
