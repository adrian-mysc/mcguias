#!/usr/bin/env bash
# build/build.sh — build completo do projeto (execute da raiz do repo).
#   1) concatena js/src/ → js/main.js
#   2) gera as regiões de partial nas páginas (navbar) a partir de
#      build/partials/ + build/pages.config.json
#
# Uso:
#   bash build/build.sh          # aplica tudo
#   bash build/build.sh --check  # só verifica drift dos partials (não grava)
set -euo pipefail

if [[ "${1:-}" == "--check" ]]; then
  node build/build-pages.mjs --check
else
  bash build/concat.sh
  node build/build-pages.mjs
fi
