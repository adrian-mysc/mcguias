#!/usr/bin/env node
/**
 * MC Guias — validateQuestions.js
 * Valida todos os JSON do banco de questões.
 * Uso: node js/tools/validateQuestions.js
 * Adrian E. Silva
 */

var fs   = require('fs');
var path = require('path');

var DATA_DIR     = path.join(__dirname, '../../data/questions');
var REQUIRED     = ['id', 'categoria', 'dificuldade', 'tipo', 'pergunta', 'alternativas', 'respostaCorreta', 'explicacao'];
var VALID_TIPOS  = ['multipla_escolha', 'verdadeiro_falso', 'preencher_lacuna', 'ordenacao', 'imagem', 'hotspot', 'simulacao'];
var VALID_NIVELS = [1, 2, 3, 4, 5];

var errors   = [];
var warnings = [];
var allIds   = {};
var total    = 0;

function err(file, id, msg) {
  errors.push('[ERRO]  ' + file + ' › ' + (id || '?') + ' → ' + msg);
}
function warn(file, id, msg) {
  warnings.push('[AVISO] ' + file + ' › ' + (id || '?') + ' → ' + msg);
}

function validateQuestion(q, file) {
  total++;
  var id = q.id || '(sem id)';

  // Campos obrigatórios
  REQUIRED.forEach(function (f) {
    if (q[f] === undefined || q[f] === null || q[f] === '') {
      err(file, id, 'Campo obrigatório ausente: ' + f);
    }
  });

  // ID duplicado
  if (q.id) {
    if (allIds[q.id]) {
      err(file, q.id, 'ID duplicado! Também existe em ' + allIds[q.id]);
    }
    allIds[q.id] = file;
  }

  // Tipo válido
  if (q.tipo && VALID_TIPOS.indexOf(q.tipo) === -1) {
    err(file, id, 'Tipo inválido: ' + q.tipo);
  }

  // Dificuldade válida
  if (q.dificuldade && VALID_NIVELS.indexOf(q.dificuldade) === -1) {
    err(file, id, 'Dificuldade inválida: ' + q.dificuldade + ' (esperado 1-5)');
  }

  // Alternativas
  if (Array.isArray(q.alternativas)) {
    if (q.alternativas.length < 2) {
      err(file, id, 'Mínimo de 2 alternativas');
    }
    q.alternativas.forEach(function (a, i) {
      if (!a || a.toString().trim() === '') {
        err(file, id, 'Alternativa ' + i + ' está vazia');
      }
    });

    // respostaCorreta dentro do range
    if (typeof q.respostaCorreta === 'number') {
      if (q.respostaCorreta < 0 || q.respostaCorreta >= q.alternativas.length) {
        err(file, id, 'respostaCorreta (' + q.respostaCorreta + ') fora do range de alternativas');
      }
    }
  } else {
    err(file, id, 'alternativas deve ser um array');
  }

  // Warnings opcionais
  if (!q.tags || q.tags.length === 0) {
    warn(file, id, 'Sem tags — impacta mapa de fraquezas');
  }
  if (!q.explicacao || q.explicacao.length < 10) {
    warn(file, id, 'Explicação muito curta ou ausente');
  }
  if (!q.relatedQuestions) {
    warn(file, id, 'relatedQuestions ausente');
  }
  if (typeof q.taxaAcertoGlobal !== 'number') {
    warn(file, id, 'taxaAcertoGlobal ausente');
  }
}

function validateFile(filePath) {
  var rel  = path.relative(DATA_DIR, filePath);
  var raw  = fs.readFileSync(filePath, 'utf8');
  var pack;
  try {
    pack = JSON.parse(raw);
  } catch (e) {
    err(rel, null, 'JSON inválido: ' + e.message);
    return;
  }

  if (!pack.version)    warn(rel, null, 'Campo version ausente');
  if (!pack.updatedAt)  warn(rel, null, 'Campo updatedAt ausente');
  if (!pack.categoria)  warn(rel, null, 'Campo categoria ausente');

  var questions = pack.questions;
  if (!Array.isArray(questions)) {
    err(rel, null, 'Array questions ausente ou malformado');
    return;
  }
  // Pacote de nível deliberadamente vazio (ex.: questões removidas por
  // duplicidade) é um estado válido — o loader trata como []. Apenas avisa.
  if (questions.length === 0) {
    warn(rel, null, 'Pacote sem questões (vazio)');
    return;
  }

  questions.forEach(function (q) { validateQuestion(q, rel); });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) {
    console.error('Diretório não encontrado: ' + dir);
    process.exit(1);
  }
  fs.readdirSync(dir).forEach(function (item) {
    if (item === 'index.json' || item === 'packs.json') return; // arquivos gerados
    var full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      walkDir(full);
    } else if (item.endsWith('.json')) {
      validateFile(full);
    }
  });
}

/* ---- Main ---- */
console.log('\n📋 MC Guias — Validação do Banco de Questões\n');
walkDir(DATA_DIR);

if (warnings.length > 0) {
  console.log('⚠️  Avisos (' + warnings.length + '):\n' + warnings.join('\n'));
  console.log('');
}

if (errors.length > 0) {
  console.log('❌ Erros (' + errors.length + '):\n' + errors.join('\n'));
  console.log('\n📊 Total verificado: ' + total + ' questões | IDs únicos: ' + Object.keys(allIds).length);
  process.exit(1);
} else {
  console.log('✅ Tudo OK — ' + total + ' questões validadas sem erros!\n');
  console.log('📊 IDs únicos: ' + Object.keys(allIds).length);
  process.exit(0);
}
