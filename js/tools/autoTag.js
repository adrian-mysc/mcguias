#!/usr/bin/env node
/**
 * MC Guias — autoTag.js
 * Analisa o texto das questões e sugere tags + dificuldade automaticamente.
 * Uso: node js/tools/autoTag.js [categoria]
 * Exemplos:
 *   node js/tools/autoTag.js          → processa todos os JSONs
 *   node js/tools/autoTag.js chapa    → só a pasta chapa/
 *   node js/tools/autoTag.js chapa basico  → só chapa/basico.json
 * Adrian E. Silva
 */

var fs   = require('fs');
var path = require('path');

var DATA_DIR = path.join(__dirname, '../../data/questions');
var catFilter   = process.argv[2] || null;
var nivelFilter = process.argv[3] || null;

/* ================================================================
   DICIONÁRIO DE TAGS
   Cada entrada: { tags: [...], palavras: [...] }
   O script procura QUALQUER palavra-chave no texto da pergunta
   ou nas alternativas e aplica as tags correspondentes.
================================================================ */
var TAG_RULES = [
  // ── Ingredientes ──────────────────────────────────────────────
  { tags: ['carne'],           palavras: ['carne', '10:1', '4:1', 'hambúrguer', 'hamburguer', 'beef', 'patty'] },
  { tags: ['bacon'],           palavras: ['bacon'] },
  { tags: ['queijo'],          palavras: ['queijo', 'cheese', 'cheddar', 'fatiado'] },
  { tags: ['tomate'],          palavras: ['tomate', 'tomato'] },
  { tags: ['cebola'],          palavras: ['cebola', 'onion', 'reidrat'] },
  { tags: ['alface'],          palavras: ['alface', 'lettuce'] },
  { tags: ['oleo'],            palavras: ['óleo', 'oleo', 'gordura', 'fritura', 'fritar'] },
  { tags: ['fritas'],          palavras: ['mcfritas', 'fritas', 'batata', 'frita'] },
  { tags: ['ovo'],             palavras: ['ovo', 'egg', 'ovos'] },
  { tags: ['molho'],           palavras: ['molho', 'sauce', 'ketchup', 'mostarda', 'maionese', 'big mac'] },
  { tags: ['pao'],             palavras: ['pão', 'bun', 'brioche', 'pao'] },

  // ── Temperaturas / Segurança ───────────────────────────────────
  { tags: ['temperatura'],     palavras: ['temperatura', 'grau', '°c', '°f', 'celsius', 'quente', 'fria', 'frio', 'aquec'] },
  { tags: ['seguranca_alimentar'], palavras: ['segurança', 'seguranca', 'contaminaç', 'perigo', 'bactéria', 'bacteria', 'zona de perigo', 'doenç'] },
  { tags: ['refrigeracao'],    palavras: ['câmara', 'camara', 'resfri', 'refriger', 'geladeir'] },
  { tags: ['peps'],            palavras: ['peps', 'primeiro a entrar', 'primeiro a sair', 'estocagem', 'estoque'] },
  { tags: ['validade'],        palavras: ['valid', 'vida útil', 'vida util', 'tempo de vida', 'vence', 'prazo', 'segunda'] },
  { tags: ['higiene'],         palavras: ['higien', 'lavar', 'lavagem', 'sabão', 'sabao', 'álcool', 'alcool', 'maos', 'mãos'] },
  { tags: ['contaminacao'],    palavras: ['contaminaç', 'cruzada', 'microb', 'físic', 'químic'] },
  { tags: ['sanitizacao'],     palavras: ['sanitiz', 'chlorine', 'sanitizante', 'desinf', 'cloro'] },

  // ── Tempo / Processo ──────────────────────────────────────────
  { tags: ['tempo'],           palavras: ['minuto', 'segundo', 'hora', 'min', 'seg', 'tempo', 'duração', 'ciclo', 'intervalo'] },
  { tags: ['frequencia'],      palavras: ['frequência', 'frequencia', 'quantas vezes', 'cada quantos', 'a cada'] },
  { tags: ['producao'],        palavras: ['produção', 'producao', 'produzir', 'produz', 'preparo', 'preparar'] },
  { tags: ['cozimento'],       palavras: ['cozimento', 'cozinhar', 'coc'] },

  // ── Chapa específicos ─────────────────────────────────────────
  { tags: ['uhc'],             palavras: ['uhc', 'gaveta', 'quentadora', 'holding'] },
  { tags: ['4:1'],             palavras: ['4:1', '4 : 1', 'quarto de libra'] },
  { tags: ['10:1'],            palavras: ['10:1', '10 : 1', 'regular'] },
  { tags: ['taylor-ng'],       palavras: ['taylor', 'next gen', 'next generation', 'ng'] },
  { tags: ['gap'],             palavras: ['gap'] },
  { tags: ['sal'],             palavras: ['sal', 'salg'] },
  { tags: ['raspador'],        palavras: ['raspador', 'raspar', 'raspagem', 'lâmina', 'lamina'] },
  { tags: ['angulo'],          palavras: ['ângulo', 'angulo', 'graus', '15°', '30°'] },
  { tags: ['teflon'],          palavras: ['teflon', 'superfície', 'superficie da chapa'] },
  { tags: ['cafe-da-manha'],   palavras: ['café da manhã', 'cafe da manha', 'breakfast', 'mcmuffin'] },

  // ── LOPE específicos ──────────────────────────────────────────
  { tags: ['rota'],            palavras: ['rota', 'ronda', 'percurso'] },
  { tags: ['corte'],           palavras: ['fatiar', 'fatiado', 'espessura', 'cortar', 'corte'] },
  { tags: ['porcao'],          palavras: ['porção', 'porcao', 'grama', 'gramas', 'peso', 'oz', 'cuba', 'rendimento'] },
  { tags: ['ambientacao'],     palavras: ['ambient', 'descongelar', 'descongela', 'temperatura ambiente'] },

  // ── Limpeza / Higiene ─────────────────────────────────────────
  { tags: ['limpeza'],         palavras: ['limpar', 'limpeza', 'limpo', 'sujo'] },
  { tags: ['panos'],           palavras: ['pano', 'panos', 'pano limpo'] },
  { tags: ['esfregao'],        palavras: ['esfregão', 'esfregao', 'rodo', 'rodinho'] },
  { tags: ['cores'],           palavras: ['cor ', 'cores ', 'azul', 'vermelho', 'verde', 'amarelo', 'código de cor'] },

  // ── Drive-Thru ────────────────────────────────────────────────
  { tags: ['oepe'],            palavras: ['oepe', 'tempo de serviço', 'tempo de servico'] },
  { tags: ['ppf'],             palavras: ['ppf', 'pedido', 'pagamento', 'fila'] },
  { tags: ['atendimento'],     palavras: ['atender', 'atendimento', 'cliente', 'saudar', 'cumpriment'] },
  { tags: ['influencer'],      palavras: ['influencer', 'vendedor', 'sugest'] },
  { tags: ['drive'],           palavras: ['drive', 'drive-thru', 'drive thru', 'janela', 'carro'] },

  // ── Equipamento ───────────────────────────────────────────────
  { tags: ['filtro'],          palavras: ['filtrar', 'filtragem', 'filtro'] },
  { tags: ['programacao'],     palavras: ['program', 'configurar', 'configuração', 'ajustar', 'ajuste'] },
  { tags: ['organizacao'],     palavras: ['organiz', 'organização'] },
  { tags: ['tecnica'],         palavras: ['técnica', 'tecnica', 'movimento', 'sentido', 'direção', 'direcao', 'forma'] },

  // ── Geral ─────────────────────────────────────────────────────
  { tags: ['limite'],          palavras: ['limite', 'máximo', 'maximo', 'mínimo', 'minimo'] },
  { tags: ['remocao'],         palavras: ['remov', 'retirar', 'retirada', 'colocar'] },
];

/* ================================================================
   REGRAS DE DIFICULDADE
   Aplicadas na ordem — a última regra que bater ganha.
================================================================ */
var DIFICULDADE_RULES = [
  // Dificuldade 1 — conceito básico, resposta óbvia
  {
    nivel: 1,
    palavras: [
      'pode retornar', 'nunca', 'sempre', 'qual é a sigla', 'o que significa',
      'qual o nome', 'é correto', 'é verdadeiro', 'pode ou não',
    ],
  },
  // Dificuldade 2 — número/valor direto, não tão óbvio
  {
    nivel: 2,
    palavras: [
      'qual é a temperatura', 'qual é o tempo', 'qual é o limite',
      'quantas vezes', 'qual a validade', 'quantos panos', 'quantas cubas',
      'qual o peso', 'qual o produto', 'qual a cor',
    ],
  },
  // Dificuldade 3 — detalhe técnico que exige estudo
  {
    nivel: 3,
    palavras: [
      'qual é o ponto de partida', 'a que ângulo', 'com quantas raspagens',
      'em quanto tempo devem ser removidas', 'qual o gap', 'frequência do óleo',
      'temperatura da água para reidratação', 'em que sentido',
      'qual é a faixa', 'qual é o tipo',
    ],
  },
  // Dificuldade 4 — específico de equipamento ou valor numérico não óbvio
  {
    nivel: 4,
    palavras: [
      'taylor next generation', 'taylor ng', 'gap programado',
      'ponto de partida.*4:1', '126 segundo', '95 segundo',
      'tempo secundário', 'tempo de vida secundário',
    ],
  },
  // Dificuldade 5 — especialista, combinação de variáveis
  {
    nivel: 5,
    palavras: [
      'exceto taylor ng.*4:1', '4:1.*exceto', 'convencional.*4:1',
      'variação.*temperatura', 'múltiplos equipamentos',
    ],
  },
];

/* ================================================================
   FUNÇÕES
================================================================ */
function normalize(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s:\.]/g, ' ');
}

function getText(q) {
  var parts = [q.pergunta || '', q.explicacao || '', q.dica || ''];
  (q.alternativas || []).forEach(function (a) { parts.push(a); });
  return normalize(parts.join(' '));
}

function inferTags(q) {
  var text     = getText(q);
  var foundTags = [];

  TAG_RULES.forEach(function (rule) {
    var hit = rule.palavras.some(function (p) {
      return text.indexOf(normalize(p)) !== -1;
    });
    if (hit) {
      rule.tags.forEach(function (t) {
        if (foundTags.indexOf(t) === -1) foundTags.push(t);
      });
    }
  });

  // Manter tags manuais existentes que não foram cobertas pelo dicionário
  (q.tags || []).forEach(function (t) {
    if (foundTags.indexOf(t) === -1) foundTags.push(t);
  });

  return foundTags.sort();
}

function inferDificuldade(q) {
  var text   = getText(q);
  var nivel  = q.dificuldade || 2; // manter o que existe como base

  DIFICULDADE_RULES.forEach(function (rule) {
    var hit = rule.palavras.some(function (p) {
      // Suporta padrão simples de regex com .*
      try {
        return new RegExp(normalize(p)).test(text);
      } catch (e) {
        return text.indexOf(normalize(p)) !== -1;
      }
    });
    if (hit) nivel = rule.nivel;
  });

  return nivel;
}

function processFile(filePath) {
  var rel  = path.relative(DATA_DIR, filePath);
  var raw  = fs.readFileSync(filePath, 'utf8');
  var pack;
  try { pack = JSON.parse(raw); }
  catch (e) { console.error('❌ JSON inválido: ' + rel); return 0; }

  var questions = pack.questions;
  if (!Array.isArray(questions)) return 0;

  var changed = 0;
  questions.forEach(function (q) {
    var newTags  = inferTags(q);
    var newDiff  = inferDificuldade(q);
    var oldTags  = JSON.stringify((q.tags || []).sort());
    var oldDiff  = q.dificuldade;

    if (JSON.stringify(newTags) !== oldTags || newDiff !== oldDiff) {
      q.tags        = newTags;
      q.dificuldade = newDiff;
      changed++;
    }
  });

  if (changed > 0) {
    fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf8');
    console.log('  ✅ ' + rel + ' — ' + changed + ' questão(ões) atualizada(s)');
  } else {
    console.log('  ─  ' + rel + ' — sem mudanças');
  }

  return changed;
}

function walkDir(dir) {
  var total = 0;
  fs.readdirSync(dir).forEach(function (item) {
    if (item === 'index.json') return;
    var full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      total += walkDir(full);
    } else if (item.endsWith('.json')) {
      total += processFile(full);
    }
  });
  return total;
}

/* ================================================================
   MAIN
================================================================ */
console.log('\n🏷️  MC Guias — Auto-tagger de questões\n');

var targetDir = DATA_DIR;
if (catFilter) {
  targetDir = path.join(DATA_DIR, catFilter);
  if (!fs.existsSync(targetDir)) {
    console.error('❌ Categoria não encontrada: ' + catFilter);
    process.exit(1);
  }
}

var totalChanged;
if (nivelFilter && catFilter) {
  var singleFile = path.join(targetDir, nivelFilter + '.json');
  if (!fs.existsSync(singleFile)) {
    console.error('❌ Arquivo não encontrado: ' + singleFile);
    process.exit(1);
  }
  totalChanged = processFile(singleFile);
} else {
  totalChanged = walkDir(targetDir);
}

console.log('\n📊 Total atualizado: ' + totalChanged + ' questão(ões)\n');
console.log('👉 Rode em seguida:');
console.log('   node js/tools/validateQuestions.js');
console.log('   node js/tools/generateIndexes.js\n');
