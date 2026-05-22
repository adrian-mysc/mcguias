/**
 * MC Guias — Repetição Espaçada v1.0
 * Algoritmo SM-2 simplificado
 * Adrian E. Silva
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'mc_sr_v2';

  /* ---- Storage ---- */
  function loadAll() {
    try {
      var sr2 = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      return sr2.cardData || {};
    } catch (e) { return {}; }
  }
  function saveAll(data) {
    try {
      var sr2 = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      sr2.cardData = data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sr2));
    } catch (e) {}
  }

  /* ---- SM-2 core ----
   * rating: 3 = muito fácil | 2 = médio | 1 = difícil | 0 = errei
   */
  function calcNextReview(card, rating) {
    var ef       = card.facilidade || 2.5;
    var interval = card.intervalo  || 0;
    var reps     = card.reps       || 0;

    if (rating < 2) {
      // Errou ou achou muito difícil → recomeça
      interval = 1;
      reps     = 0;
    } else {
      reps++;
      if      (reps === 1) interval = 1;
      else if (reps === 2) interval = 6;
      else                 interval = Math.round(interval * ef);
    }

    // Atualizar fator de facilidade
    ef = ef + (0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02));
    ef = Math.max(1.3, Math.min(4.0, parseFloat(ef.toFixed(2))));

    interval = Math.max(1, Math.min(365, interval));

    var now    = Date.now();
    var nextMs = now + interval * 86400000; // dias → ms

    return { facilidade: ef, intervalo: interval, reps: reps,
             ultimaRevisao: now, proximaRevisao: nextMs };
  }

  /* ---- Getters ---- */
  function getCard(id) {
    var all  = loadAll();
    return all[id] || {
      id: id, acertos: 0, erros: 0,
      facilidade: 2.5, intervalo: 0, reps: 0,
      ultimaRevisao: null, proximaRevisao: null,
      nivelDominio: 0, tempoMedioResposta: 0,
      historico: []
    };
  }

  /* ---- Update ---- */
  function updateCard(id, rating, responseTimeMs) {
    var all  = loadAll();
    var card = getCard(id);

    if (rating >= 2) card.acertos++;
    else             card.erros++;

    // Tempo médio de resposta (média móvel)
    var n = card.acertos + card.erros;
    card.tempoMedioResposta = Math.round(
      (card.tempoMedioResposta * (n - 1) + (responseTimeMs || 0)) / n
    );

    // Nível de domínio (0–5) — cresce com acertos consistentes
    var taxa = n > 0 ? card.acertos / n : 0;
    card.nivelDominio = Math.min(5,
      Math.round(taxa * 5 * Math.min(1, n / 5))
    );

    // SM-2
    var next = calcNextReview(card, rating);
    card.facilidade      = next.facilidade;
    card.intervalo       = next.intervalo;
    card.reps            = next.reps;
    card.ultimaRevisao   = next.ultimaRevisao;
    card.proximaRevisao  = next.proximaRevisao;

    // Histórico (últimas 20 respostas)
    card.historico.push({ r: rating, ts: Date.now(), t: responseTimeMs });
    if (card.historico.length > 20) card.historico.shift();

    all[id] = card;
    saveAll(all);
    return card;
  }

  /* ---- Due questions ---- */
  function getDueQuestions(allIds) {
    var all = loadAll();
    var now = Date.now();
    return allIds.filter(function (id) {
      var c = all[id];
      if (!c || !c.proximaRevisao) return true; // nunca revisada
      return c.proximaRevisao <= now;
    }).sort(function (a, b) {
      var ca = all[a], cb = all[b];
      if (!ca || !ca.proximaRevisao) return -1;
      if (!cb || !cb.proximaRevisao) return 1;
      // mais atrasada primeiro
      return ca.proximaRevisao - cb.proximaRevisao;
    });
  }

  /* ---- Stats ---- */
  function getRetentionStats(allIds) {
    var all   = loadAll();
    var stats = { total: allIds.length, reviewed: 0, dominated: 0,
                  totalAcertos: 0, totalRespostas: 0 };

    allIds.forEach(function (id) {
      var c = all[id];
      if (!c || !c.ultimaRevisao) return;
      stats.reviewed++;
      stats.totalAcertos   += c.acertos;
      stats.totalRespostas += c.acertos + c.erros;
      if (c.nivelDominio >= 4) stats.dominated++;
    });

    stats.retentionRate = stats.totalRespostas > 0
      ? Math.round(stats.totalAcertos / stats.totalRespostas * 100) : 0;
    stats.dueToday = getDueQuestions(allIds).length;
    return stats;
  }

  /* ---- API pública ---- */
  window.SRS = {
    getCard:           getCard,
    updateCard:        updateCard,
    getDueQuestions:   getDueQuestions,
    getRetentionStats: getRetentionStats,
    getAllCards:        loadAll,
    resetAll:          function () { localStorage.removeItem(STORAGE_KEY); },
  };
})();
