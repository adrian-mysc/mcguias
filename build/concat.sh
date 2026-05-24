#!/usr/bin/env bash
# build/concat.sh — concatena os módulos de js/src/ em js/main.js
# Execute da raiz do repositório: bash build/concat.sh

set -euo pipefail

SOURCES=(
  "js/src/storage.js"
  "js/src/audio.js"
  "js/src/stats.js"
  "js/src/srs.js"
  "js/src/quiz.js"
  "js/src/flashcard.js"
  "js/src/utils.js"
  "js/src/lacunas.js"
  "js/src/onboarding.js"
  "js/src/sw-init.js"
)

OUT="js/main.js"

{
  printf '"use strict";\n\n'
  printf '/* ============================================================\n'
  printf '   MC GUIAS — Shared JavaScript\n'
  printf '   Versão: 3.0 — refatoração modular + otimizações de performance\n'
  printf '   Gerado por: build/concat.sh — NÃO EDITE ESTE ARQUIVO DIRETAMENTE\n'
  printf '   Edite os arquivos em js/src/ e execute: bash build/concat.sh\n'
  printf '   ============================================================ */\n\n'
  for src in "${SOURCES[@]}"; do
    printf '/* ── %s ── */\n' "$(basename "$src")"
    cat "$src"
    printf '\n'
  done
} > "$OUT"

echo "✅ $OUT gerado a partir de ${#SOURCES[@]} módulos ($(wc -l < "$OUT") linhas)."
