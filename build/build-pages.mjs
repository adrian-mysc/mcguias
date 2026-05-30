#!/usr/bin/env node
/* ============================================================
   MC Guias — Gerador de partials das páginas (build-time)
   ------------------------------------------------------------
   Mantém UMA fonte de verdade para blocos repetidos no HTML,
   preservando a saída ESTÁTICA (sem bundler/SDK no runtime —
   bom para SEO, FOUC e PWA no GitHub Pages).

   Hoje gerencia a NAVBAR padrão das páginas de conteúdo: a
   estrutura vem de build/partials/navbar.html e os textos
   (título/subtítulo) de build/pages.config.json. A região
   gerada fica entre os marcadores:

       <!-- mc:navbar:start --> ... <!-- mc:navbar:end -->

   Uso:
     node build/build-pages.mjs           # aplica (reescreve as páginas)
     node build/build-pages.mjs --check   # dry-run: mostra o diff, não grava
                                           # (sai com código 1 se houver drift)

   Para adicionar/editar a navbar de uma página, edite o texto
   em build/pages.config.json e rode o build. NÃO edite a navbar
   diretamente no HTML — o build sobrescreve a região marcada.
   ============================================================ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/pages.config.json'), 'utf8'));
const navTpl = fs.readFileSync(path.join(ROOT, 'build/partials/navbar.html'), 'utf8');

const START = '  <!-- mc:navbar:start (gerado por build/build-pages.mjs — edite build/partials/navbar.html + build/pages.config.json) -->';
const END = '  <!-- mc:navbar:end -->';

function renderNav(meta) {
  return navTpl
    .replace('{{TITLE}}', meta.navTitle)
    .replace('{{SUBTITLE}}', meta.navSubtitle);
}

// Bloco completo (marcadores + nav renderizada), sem newline final extra.
function renderBlock(meta) {
  return START + '\n' + renderNav(meta).replace(/\n$/, '') + '\n' + END;
}

let changed = 0, unchanged = 0;
const diffs = [];

for (const [file, meta] of Object.entries(config)) {
  const abs = path.join(ROOT, 'pages', file);
  if (!fs.existsSync(abs)) { console.error('!! arquivo não encontrado:', file); process.exitCode = 1; continue; }
  let src = fs.readFileSync(abs, 'utf8');
  const block = renderBlock(meta);

  let next;
  const markerRe = /[ \t]*<!-- mc:navbar:start[\s\S]*?<!-- mc:navbar:end -->/;
  if (markerRe.test(src)) {
    // Já migrado: substitui apenas entre marcadores.
    next = src.replace(markerRe, block);
  } else {
    // Primeira migração: substitui o <nav class="navbar">…</nav> existente.
    const navRe = /[ \t]*<nav class="navbar">[\s\S]*?<\/nav>/;
    if (!navRe.test(src)) { console.error('!! navbar não encontrada em', file); process.exitCode = 1; continue; }
    next = src.replace(navRe, block);
  }

  if (next === src) { unchanged++; continue; }
  changed++;
  if (CHECK) {
    diffs.push(file);
  } else {
    fs.writeFileSync(abs, next);
  }
}

if (CHECK) {
  console.log(`[--check] ${changed} página(s) com drift, ${unchanged} em dia.`);
  if (changed) { console.log('Drift em:\n  ' + diffs.join('\n  ')); process.exitCode = 1; }
  else console.log('Tudo sincronizado com os partials. ✓');
} else {
  console.log(`build-pages: ${changed} reescrita(s), ${unchanged} sem mudança. (${Object.keys(config).length} páginas gerenciadas)`);
}
