#!/usr/bin/env node
/**
 * MC Guias — migrateLegacyQuestions.js
 * Converte arrays de quiz legados (objeto JS) para o formato JSON modular.
 * Uso: node js/tools/migrateLegacyQuestions.js <arquivo.html> <categoria> [nivel]
 * Exemplo: node js/tools/migrateLegacyQuestions.js pages/chapa.html chapa basico
 * Adrian E. Silva
 */

var fs   = require('fs');
var path = require('path');

var src      = process.argv[2];
var cat      = process.argv[3] || 'geral';
var nivel    = process.argv[4] || 'basico';

if (!src) {
  console.error('Uso: node migrateLegacyQuestions.js <arquivo.html> <categoria> [nivel]');
  process.exit(1);
}

var content = fs.readFileSync(src, 'utf8');

/* ---- Extrai o array de quiz do HTML ---- */
// Suporta padrões: var QUIZ_DATA = [...], const Q = [...], window.QUIZ = [...]
var match = content.match(/(?:var|const|let)\s+(?:QUIZ_DATA|QUIZ|Q)\s*=\s*(\[[\s\S]*?\]);/);
if (!match) {
  // Tenta capturar o primeiro array grande
  match = content.match(/=\s*(\[\s*\{[\s\S]{200,}?\}\s*\])/);
}

if (!match) {
  console.error('❌ Não foi possível encontrar um array de questões em: ' + src);
  process.exit(1);
}

var rawArray;
try {
  // Eval seguro: apenas avalia um literal de array
  rawArray = Function('"use strict"; return ' + match[1])(); // eslint-disable-line no-new-func
} catch (e) {
  console.error('❌ Erro ao parsear o array: ' + e.message);
  process.exit(1);
}

/* ---- Mapeia para o novo formato ---- */
var counter  = 1;
var prefix   = cat.replace(/[^a-z0-9]/gi, '_').toLowerCase();

var questions = rawArray.map(function (q) {
  var id = q.id || (prefix + '_' + String(counter++).padStart(3, '0'));
  var alternativas = q.alternativas || q.options || q.opcoes || [];
  var respostaCorreta;
  if (typeof q.resposta === 'number') {
    respostaCorreta = q.resposta;
  } else if (typeof q.answer === 'string') {
    respostaCorreta = alternativas.indexOf(q.answer);
    if (respostaCorreta === -1) respostaCorreta = 0;
  } else {
    respostaCorreta = q.respostaCorreta || 0;
  }

  return {
    id:                  id,
    categoria:           cat,
    subcategoria:        q.subcategoria || q.category || null,
    dificuldade:         q.dificuldade  || q.difficulty || 2,
    tipo:                q.tipo         || 'multipla_escolha',
    tags:                q.tags         || [],
    pergunta:            q.pergunta     || q.question || q.enunciado || '',
    alternativas:        alternativas,
    respostaCorreta:     respostaCorreta,
    explicacao:          q.explicacao   || q.explanation || '',
    dica:                q.dica         || q.hint        || '',
    tempoEstimado:       q.tempoEstimado || 15,
    xp:                  q.xp           || 10,
    peso:                q.peso         || 1.0,
    frequenciaErro:      0,
    taxaAcertoGlobal:    q.taxaAcertoGlobal || 0,
    timesAnswered:       0,
    mediaTempoResposta:  0,
    ativo:               q.ativo !== false,
    reviewData:  { facilidade: 2.5, intervalo: 1, ultimaRevisao: null, proximaRevisao: null, nivelDominio: 0 },
    errorStats:  { timesWrong: 0, timesCorrect: 0, weaknessScore: 0 },
    analytics:   { globalAccuracy: 0, averageTime: 0, dropRate: 0 },
    contextHints: q.contextHints || [],
    relatedQuestions: q.relatedQuestions || [],
  };
});

/* ---- Output ---- */
var outDir  = path.join(__dirname, '../../data/questions', cat);
var outFile = path.join(outDir, nivel + '.json');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

var pack = {
  version:    '1.0.0',
  updatedAt:  new Date().toISOString().slice(0, 10),
  categoria:  cat,
  nivel:      nivel,
  migratedFrom: path.basename(src),
  questions:  questions,
};

fs.writeFileSync(outFile, JSON.stringify(pack, null, 2), 'utf8');

console.log('\n✅ Migração concluída!');
console.log('📁 Destino: ' + outFile);
console.log('📊 Questões migradas: ' + questions.length);
console.log('\n⚠️  Revise manualmente:');
console.log('   • tags de cada questão');
console.log('   • subcategoria');
console.log('   • dificuldade (1-5)');
console.log('   • relatedQuestions\n');
