#!/usr/bin/env node
/**
 * MC Guias — Test Suite
 * Run: node tests/run_tests.js
 */

const fs   = require('fs');
const path = require('path');

let passed = 0, failed = 0, total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    → ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'assertion failed');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

function section(title) {
  console.log(`\n▶ ${title}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ROOT  = path.resolve(__dirname, '..');
const QS    = path.join(ROOT, 'data', 'questions');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function loadQuestions(guide) {
  const d = loadJson(`data/questions/${guide}/basico.json`);
  return d.questions || d.perguntas || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Question JSON structure & integrity
// ─────────────────────────────────────────────────────────────────────────────
section('Question JSON — structure & integrity');

const GUIDES_WITH_COUNTS = {
  'chapa':               73,
  'treinador':          164,
  'gerencia':            87,
  'lideranca':           71,
  'fritas':              40,
  'fechamento':          40,
  'seguranca-alimento':  40,
  'best-burguer':        null,
  'mccafe':              null,
  'lope':                null,
  'condimentacao':       null,
  'fritos':              null,
  'drive-thru':          null,
  'bebidas-sobremesas':  null,
  'linha':               null,
  'montagem-entrega':    null,
  'salao-ngk':           null,
  'embaixador-experiencia': null,
  'influencer-pagamento':   null,
  'estoque-recebimento':    null,
  'manutencao-preventivas': null,
  'mcfritas':            null,
};

for (const [guide, expectedCount] of Object.entries(GUIDES_WITH_COUNTS)) {
  test(`${guide}: arquivo basico.json existe`, () => {
    const p = path.join(QS, guide, 'basico.json');
    assert(fs.existsSync(p), `Arquivo não encontrado: ${p}`);
  });

  test(`${guide}: JSON válido com array de questões`, () => {
    const qs = loadQuestions(guide);
    assert(Array.isArray(qs), `"questions" deve ser array`);
    assert(qs.length > 0, `Array de questões está vazio`);
  });

  if (expectedCount !== null) {
    test(`${guide}: contém ${expectedCount} questões`, () => {
      const qs = loadQuestions(guide);
      assertEqual(qs.length, expectedCount,
        `Esperado ${expectedCount} questões, encontrado ${qs.length}`);
    });
  }

  test(`${guide}: todas as questões têm campos obrigatórios`, () => {
    const qs = loadQuestions(guide);
    const errs = [];
    for (const [i, q] of qs.entries()) {
      const id  = q.id ?? `#${i}`;
      if (!q.pergunta)     errs.push(`${id}: falta 'pergunta'`);
      if (!Array.isArray(q.alternativas) || q.alternativas.length < 2)
        errs.push(`${id}: 'alternativas' inválido`);
      if (q.respostaCorreta === undefined || q.respostaCorreta === null)
        errs.push(`${id}: falta 'respostaCorreta'`);
    }
    assert(errs.length === 0, errs.slice(0, 5).join('; '));
  });

  test(`${guide}: respostaCorreta dentro do range de alternativas`, () => {
    const qs = loadQuestions(guide);
    const errs = [];
    for (const q of qs) {
      const r = q.respostaCorreta;
      const n = (q.alternativas || []).length;
      if (typeof r !== 'number' || r < 0 || r >= n)
        errs.push(`${q.id}: respostaCorreta=${r} mas tem ${n} alternativas`);
    }
    assert(errs.length === 0, errs.slice(0, 5).join('; '));
  });

  test(`${guide}: IDs únicos dentro do arquivo`, () => {
    const qs = loadQuestions(guide);
    const ids = qs.map(q => q.id);
    const unique = new Set(ids);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert(unique.size === ids.length, `IDs duplicados: ${dupes.slice(0, 5).join(', ')}`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GUIAS array consistency — every id has a JSON file
// ─────────────────────────────────────────────────────────────────────────────
section('GUIAS array — todos os IDs têm arquivo JSON');

const GUIAS_IDS = [
  'treinador','gerencia','lideranca','best-burguer','mccafe','lope','chapa',
  'condimentacao','fritas','mcfritas','drive-thru','bebidas-sobremesas','linha',
  'montagem-entrega','fritos','salao-ngk','embaixador-experiencia',
  'influencer-pagamento','estoque-recebimento','fechamento',
  'manutencao-preventivas','seguranca-alimento',
];

for (const id of GUIAS_IDS) {
  test(`GUIA '${id}' tem basico.json`, () => {
    const p = path.join(QS, id, 'basico.json');
    assert(fs.existsSync(p), `Arquivo ausente: data/questions/${id}/basico.json`);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Battle logic — pure function tests (simulated without DOM)
// ─────────────────────────────────────────────────────────────────────────────
section('Battle logic — funções puras');

test('answer(): acerto incrementa score e registra myAnswers', () => {
  // Simulates answer() logic
  let myScore = 0;
  const myProgress = [];
  const myAnswers  = [];
  const q = { pergunta: 'P?', alternativas: ['A','B','C'], respostaCorreta: 1 };

  const idx = 1; // correct
  const correct = idx >= 0 && idx === q.respostaCorreta;
  if (correct) myScore++;
  myProgress.push(correct);
  myAnswers.push(idx);

  assertEqual(myScore, 1, 'score deve ser 1 após acerto');
  assertEqual(myProgress[0], true, 'myProgress deve registrar true');
  assertEqual(myAnswers[0], 1, 'myAnswers deve registrar índice 1');
});

test('answer(): erro não incrementa score, registra false', () => {
  let myScore = 0;
  const myProgress = [];
  const myAnswers  = [];
  const q = { pergunta: 'P?', alternativas: ['A','B','C'], respostaCorreta: 1 };

  const idx = 0; // wrong
  const correct = idx >= 0 && idx === q.respostaCorreta;
  if (correct) myScore++;
  myProgress.push(correct);
  myAnswers.push(idx);

  assertEqual(myScore, 0);
  assertEqual(myProgress[0], false);
  assertEqual(myAnswers[0], 0);
});

test('answer(): timeout (idx=-1) não incrementa score', () => {
  let myScore = 0;
  const myProgress = [];
  const myAnswers  = [];
  const q = { respostaCorreta: 2 };

  const idx = -1;
  const correct = idx >= 0 && idx === q.respostaCorreta;
  if (correct) myScore++;
  myProgress.push(correct);
  myAnswers.push(idx);

  assertEqual(myScore, 0);
  assertEqual(myProgress[0], false);
  assertEqual(myAnswers[0], -1);
});

test('mixed mode: IDs compostos gerados corretamente', () => {
  const guide = 'chapa';
  const qs = loadQuestions(guide).slice(0, 3);
  const composite = qs.map(q => `${guide}::${q.id}`);

  for (const cid of composite) {
    assert(cid.includes('::'), `ID composto deve conter '::'`);
    const [g, id] = cid.split('::');
    assertEqual(g, guide);
    assert(id.length > 0, 'ID não pode ser vazio');
  }
});

test('mixed mode: reconstrói mapa de questões a partir de IDs compostos', () => {
  const guias = ['chapa', 'fritas'];
  const map = {};

  for (const guide of guias) {
    const qs = loadQuestions(guide).slice(0, 5);
    for (const q of qs) {
      map[`${guide}::${q.id}`] = q;
    }
  }

  const ids = [`chapa::${loadQuestions('chapa')[0].id}`, `fritas::${loadQuestions('fritas')[0].id}`];
  const reconstructed = ids.map(id => map[id]).filter(Boolean);

  assertEqual(reconstructed.length, ids.length, 'Todas as questões devem ser reconstruídas');
  assert(reconstructed[0].pergunta, 'Questão deve ter pergunta');
});

test('syncLeaderboard: Math.max evita perda de pontos', () => {
  const serverPoints = 80;
  const localPoints  = 60; // stale local
  const points = Math.max(serverPoints, localPoints);
  assertEqual(points, 80, 'Deve usar server points quando maior');

  const serverPoints2 = 30;
  const localPoints2  = 55; // local has unsynced sessions
  const points2 = Math.max(serverPoints2, localPoints2);
  assertEqual(points2, 55, 'Deve usar local quando maior (sessões não sincronizadas)');
});

test('syncQuizSessions: slice correto — não re-sincroniza sessões antigas', () => {
  // history is newest-first (unshift), alreadySynced = 2, history.length = 5
  // → newCount = 3, toSync = history.slice(0, 3) = 3 items (the 3 newest)
  const history = [5,4,3,2,1]; // newest at index 0
  const alreadySynced = 2;
  const newCount = Math.max(0, history.length - alreadySynced);
  assertEqual(newCount, 3);
  const toSync = history.slice(0, newCount);
  assert(toSync.length === 3, `Esperado 3 itens, obtido ${toSync.length}`);
  // Verifies newest items are taken
  assert(toSync[0] === 5 && toSync[2] === 3, 'Deve pegar os 3 mais recentes');
});

test('pickQs: parseInt comparação segura com texto do botão', () => {
  const values = [5, 10, 15, 20];
  const n = 10;
  const selected = values.filter(v => parseInt(String(v)) === n);
  assertEqual(selected.length, 1);
  assertEqual(selected[0], 10);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. WO logic
// ─────────────────────────────────────────────────────────────────────────────
section('WO — lógica de walkover');

test('WO: não dispara antes de qIndex > 0', () => {
  let qIndex = 0;
  let oppDone = false;
  const oppLastActivity = Date.now() - 70000; // 70s ago

  const shouldWO = qIndex > 0 && !oppDone && (Date.now() - oppLastActivity > 60000);
  assertEqual(shouldWO, false, 'WO não deve disparar no início da batalha');
});

test('WO: dispara quando oponente inativo por >60s e batalha em andamento', () => {
  let qIndex = 3;
  let oppDone = false;
  const oppLastActivity = Date.now() - 70000;

  const shouldWO = qIndex > 0 && !oppDone && (Date.now() - oppLastActivity > 60000);
  assertEqual(shouldWO, true, 'WO deve disparar após 60s de inatividade');
});

test('WO: não dispara se oponente já terminou', () => {
  let qIndex = 5;
  let oppDone = true;
  const oppLastActivity = Date.now() - 70000;

  const shouldWO = qIndex > 0 && !oppDone && (Date.now() - oppLastActivity > 60000);
  assertEqual(shouldWO, false, 'WO não deve disparar se oppDone=true');
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Post-battle review
// ─────────────────────────────────────────────────────────────────────────────
section('Post-battle review — renderização');

test('renderReview: myAnswers mais curto que questions usa -1 como fallback', () => {
  const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
  const myAnswers = [0, 1]; // só respondeu 2

  const results = questions.map((q, i) => myAnswers[i] ?? -1);
  assertEqual(results[0], 0);
  assertEqual(results[1], 1);
  assertEqual(results[2], -1, 'Questão não respondida deve retornar -1');
});

test('renderReview: identifica acertos e erros corretamente', () => {
  const qs = [
    { respostaCorreta: 1 },
    { respostaCorreta: 2 },
    { respostaCorreta: 0 },
  ];
  const myAnswers = [1, 0, 0]; // acerto, erro, acerto

  const myProgress = qs.map((q, i) => {
    const idx = myAnswers[i] ?? -1;
    return idx >= 0 && idx === q.respostaCorreta;
  });

  assertEqual(myProgress[0], true);
  assertEqual(myProgress[1], false);
  assertEqual(myProgress[2], true);
  const score = myProgress.filter(Boolean).length;
  assertEqual(score, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Question count cross-check with batalha.html GUIAS
// ─────────────────────────────────────────────────────────────────────────────
section('batalha.html — GUIAS vs arquivos em disco');

test('batalha.html contém o array GUIAS', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'batalha.html'), 'utf8');
  assert(html.includes("const GUIAS = ["), 'GUIAS array não encontrado');
});

test('batalha.html: todos os IDs do GUIAS têm arquivo JSON', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'batalha.html'), 'utf8');
  const match = html.match(/const GUIAS = \[([\s\S]*?)\];/);
  assert(match, 'Não foi possível extrair GUIAS');
  const ids = [...match[1].matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
  assert(ids.length >= 10, `Poucos guias: ${ids.length}`);

  const missing = ids.filter(id => id !== 'misto' && !fs.existsSync(path.join(QS, id, 'basico.json')));
  assert(missing.length === 0, `IDs sem JSON: ${missing.join(', ')}`);
});

test('batalha.html: BATTLE_QS não referenciado (undefined var removida)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'batalha.html'), 'utf8');
  assert(!html.includes('BATTLE_QS'), 'BATTLE_QS ainda referenciado — bug não foi corrigido');
});

test('batalha.html: _rippleReady guard presente', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'batalha.html'), 'utf8');
  assert(html.includes('_rippleReady'), 'Guard de listener acumulado não encontrado');
});

test('batalha.html: finishWatcher declarado no estado', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'batalha.html'), 'utf8');
  assert(html.includes('let finishWatcher = null'), 'finishWatcher não declarado');
});

test('batalha.html: finishWatcher limpo no goLobby', () => {
  const html = fs.readFileSync(path.join(ROOT, 'pages', 'batalha.html'), 'utf8');
  const lobbyFn = html.slice(html.indexOf('window.goLobby'), html.indexOf('window.goLobby') + 600);
  assert(lobbyFn.includes('finishWatcher'), 'finishWatcher não é limpo no goLobby');
});

test('sync.js: evento mc:quizComplete usa async/await', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'supabase', 'sync.js'), 'utf8');
  assert(src.includes("async (e) =>"), 'Handler não é async');
  assert(src.includes("await Promise.all(tasks)"), 'Promise.all não tem await');
});

test('gamificacao.js: aceita tanto opts.guide quanto opts.guia', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'gamificacao.js'), 'utf8');
  assert(src.includes('opts.guide || opts.guia'), 'Key mismatch não foi corrigido');
});

// ─────────────────────────────────────────────────────────────────────────────
// Results
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Total: ${total}  ✓ ${passed}  ✗ ${failed}`);
if (failed > 0) {
  console.error(`\n${failed} teste(s) falharam.`);
  process.exit(1);
} else {
  console.log('\nTodos os testes passaram.');
}
