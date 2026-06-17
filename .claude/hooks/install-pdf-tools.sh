#!/usr/bin/env bash
# SessionStart hook — garante o leitor de PDF (poppler-utils) disponível.
# O container das sessões web é efêmero, então reinstalamos se necessário.
# Best-effort: nunca falha a sessão.
if ! command -v pdftoppm >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    # Sem `apt-get update` (PPAs de terceiros podem bloquear); usa listas em cache.
    apt-get install -y --no-install-recommends poppler-utils >/dev/null 2>&1 || true
  fi
fi
exit 0
