#!/usr/bin/env node
/**
 * MC Guias — generateIndexes.js
 * Gera data/questions/index.json com índices por categoria, tag e dificuldade.
 * Uso: node js/tools/generateIndexes.js
 * Adrian E. Silva
 */

var fs   = require('fs');
var path = require('path');

var DATA_DIR   = path.join(__dirname, '../../data/questions');
var OUTPUT     = path.join(DATA_DIR, 'index.json');

var index = {
  version:       '1.0.0',
  generatedAt:   new Date().toISOString().slice(0, 10),
  byCategory:    {},
  byTag:         {},
  byDifficulty:  { 1: [], 2: [], 3: [], 4: [], 5: [] },
  byId:          {},
  totalQuestions: 0,
};

function processFile(filePath) {
  var raw  = fs.readFileSync(filePath, 'utf8');
  var pack = JSON.parse(raw);
  var qs   = pack.questions || [];

  qs.forEach(function (q) {
    index.totalQuestions++;

    // byId (metadata mínima, sem o texto completo)
    index.byId[q.id] = {
      categoria:   q.categoria,
      subcategoria: q.subcategoria || null,
      dificuldade: q.dificuldade,
      tags:        q.tags || [],
      ativo:       q.ativo !== false,
    };

    // byCategory
    var cat = q.categoria || 'geral';
    if (!index.byCategory[cat]) index.byCategory[cat] = [];
    index.byCategory[cat].push(q.id);

    // byTag
    (q.tags || []).forEach(function (t) {
      if (!index.byTag[t]) index.byTag[t] = [];
      index.byTag[t].push(q.id);
    });

    // byDifficulty
    var d = q.dificuldade || 1;
    if (!index.byDifficulty[d]) index.byDifficulty[d] = [];
    index.byDifficulty[d].push(q.id);
  });
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(function (item) {
    var full = path.join(dir, item);
    if (item === 'index.json') return; // skip output file
    if (fs.statSync(full).isDirectory()) {
      walkDir(full);
    } else if (item.endsWith('.json')) {
      processFile(full);
    }
  });
}

console.log('\n📦 MC Guias — Gerando índices\n');
walkDir(DATA_DIR);

fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2), 'utf8');
console.log('✅ Índice gerado: ' + OUTPUT);
console.log('📊 Total de questões indexadas: ' + index.totalQuestions);
console.log('🏷️  Tags indexadas: ' + Object.keys(index.byTag).length);
console.log('📂 Categorias: ' + Object.keys(index.byCategory).join(', ') + '\n');
