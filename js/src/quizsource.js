// ── Fonte única das perguntas ────────────────────────────────
// As páginas de guia mantinham um array de perguntas embutido no próprio HTML
// (const QUIZ_XXX = [...]) e chamavam initQuiz(QUIZ_XXX, 'Nome'). Isso criava
// um segundo banco, paralelo ao de data/questions/: a mesma pergunta existia
// nos dois lugares e as correções precisavam ser feitas em dobro — foi de onde
// vieram as contradições encontradas na auditoria. Além disso, o que só existia
// no HTML ficava invisível para SRS, tags, mapa de fraquezas e analytics.
//
// initQuizFromJSON() lê a categoria do banco e entrega ao initQuiz já no
// formato que ele espera, para que a página não precise de array nenhum.

// Raiz da app: '/mcguias/' no GitHub Pages, '/' na Vercel/domínio próprio.
function _quizBasePath() {
  return location.pathname.replace(/\/(pages\/)?[^\/]*$/, '/') + 'data/questions/';
}

// Converte do formato do banco para o que o initQuiz consome.
function _toQuizShape(q) {
  var alts = Array.isArray(q.alternativas) ? q.alternativas : [];
  return {
    id:          q.id,
    category:    q.subcategoria || q.categoria || '',
    question:    q.pergunta,
    options:     alts,
    answer:      alts[q.respostaCorreta],
    explanation: q.explicacao || '',
    dificuldade: q.dificuldade || 2,
    tags:        q.tags || [],
  };
}

// Carrega os níveis existentes de uma categoria (basico + avancado, se houver).
function loadQuizQuestions(categoria) {
  var base = _quizBasePath() + categoria + '/';
  var niveis = ['basico', 'avancado'];
  return Promise.all(niveis.map(function (n) {
    return fetch(base + n + '.json')
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  })).then(function (packs) {
    var out = [];
    packs.forEach(function (p) {
      if (!p || !Array.isArray(p.questions)) return;
      p.questions.forEach(function (q) {
        if (q.ativo === false) return;
        if (!q.pergunta || !Array.isArray(q.alternativas) || !q.alternativas.length) return;
        out.push(_toQuizShape(q));
      });
    });
    return out;
  });
}

// Substitui `initQuiz(QUIZ_XXX, 'Nome')` nas páginas de guia.
// `fallback` é opcional: array no formato antigo, usado se o fetch falhar
// (ex.: primeira visita offline, com o JSON ainda fora do cache).
function initQuizFromJSON(categoria, guiaNome, fallback) {
  var alvo = document.getElementById('quiz-app');
  if (alvo && !alvo.dataset.loading) {
    alvo.dataset.loading = '1';
    alvo.innerHTML = '<div style="padding:28px 16px;text-align:center;color:var(--muted);font-size:13.5px">Carregando perguntas…</div>';
  }
  // switchMode() (modos flashcard/lacuna) lê window._quizData/_quizGuia. Antes
  // só uma página preenchia essas globais — nas outras o switchMode saía pelo
  // `if (!window._quizData) return` e os modos alternativos não faziam nada.
  // Publicando aqui, toda página que carrega do banco ganha os três modos.
  function publicar(qs) {
    window._quizData = qs;
    window._quizGuia = guiaNome;
    initQuiz(qs, guiaNome);
    return qs.length;
  }

  return loadQuizQuestions(categoria).then(function (qs) {
    if (alvo) delete alvo.dataset.loading;
    if (qs.length) return publicar(qs);
    if (fallback && fallback.length) return publicar(fallback);
    if (alvo) {
      alvo.innerHTML = '<div style="padding:28px 16px;text-align:center;color:var(--muted);font-size:13.5px">'
        + 'Não foi possível carregar as perguntas. Verifique sua conexão e tente novamente.</div>';
    }
    return 0;
  }).catch(function (e) {
    if (alvo) delete alvo.dataset.loading;
    console.error('initQuizFromJSON:', e);
    if (fallback && fallback.length) return publicar(fallback);
    return 0;
  });
}

window.initQuizFromJSON = initQuizFromJSON;
window.loadQuizQuestions = loadQuizQuestions;
