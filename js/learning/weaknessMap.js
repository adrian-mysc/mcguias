/**
 * MC Guias — Mapa de Fraquezas v1.0
 * Detecta automaticamente temas problemáticos
 * Adrian E. Silva
 */
(function () {
  'use strict';

  /* ---- Core ----
   * allQuestions : [{id, guide, category, tags, dificuldade, ...}]
   * allCards     : {[id]: {acertos, erros, nivelDominio, tempoMedioResposta}}
   */
  function calculateWeaknessMap(allQuestions, allCards) {
    var map = {};

    allQuestions.forEach(function (q) {
      var card  = allCards[q.id];
      if (!card) return;
      var total = card.acertos + card.erros;
      if (total === 0) return;

      // Agrupa por guide + tags individuais
      var keys = [q.guide || 'geral'].concat(q.tags || []);
      keys.forEach(function (k) {
        if (!map[k]) map[k] = { tag: k, erros: 0, total: 0, tempoAcc: 0, count: 0 };
        map[k].erros    += card.erros;
        map[k].total    += total;
        map[k].tempoAcc += card.tempoMedioResposta;
        map[k].count++;
      });
    });

    return Object.keys(map).map(function (k) {
      var m = map[k];
      return {
        tag:        m.tag,
        taxaErro:   m.total > 0 ? Math.round(m.erros / m.total * 100) : 0,
        total:      m.total,
        tempoMedio: m.count > 0  ? Math.round(m.tempoAcc / m.count)   : 0,
      };
    }).filter(function (m) {
      return m.total >= 2; // pelo menos 2 respostas para ser significativo
    }).sort(function (a, b) {
      return b.taxaErro - a.taxaErro;
    });
  }

  function getWeakTopics(allQuestions, allCards, n) {
    return calculateWeaknessMap(allQuestions, allCards).slice(0, n || 5);
  }

  /* ---- Focused review ---- */
  function generateFocusedReview(tag, allQuestions, allCards) {
    return allQuestions.filter(function (q) {
      var inTag = (q.tags || []).indexOf(tag) !== -1 || q.guide === tag;
      if (!inTag) return false;
      var card  = allCards[q.id];
      return !card || card.nivelDominio < 4;
    }).sort(function (a, b) {
      var ca = allCards[a.id] || { erros: 0, proximaRevisao: 0 };
      var cb = allCards[b.id] || { erros: 0, proximaRevisao: 0 };
      return (cb.erros - ca.erros) || ((ca.proximaRevisao || 0) - (cb.proximaRevisao || 0));
    });
  }

  /* ---- Human-readable report ---- */
  function generateWeaknessReport(allQuestions, allCards) {
    var weak = getWeakTopics(allQuestions, allCards, 3).filter(function (w) {
      return w.taxaErro >= 20; // só reporta se acima de 20% de erro
    });
    if (weak.length === 0) return null;

    var LABELS = {
      chapa: 'Chapa', fritas: 'McFritas', limpeza: 'Limpeza',
      'drive-thru': 'Drive-Thru', validade: 'Validades', temperatura: 'Temperaturas',
      carne: 'Carnes', lope: 'LOPE', seguranca: 'Segurança do Alimento',
      tempo: 'Tempos de Vida', montagem: 'Montagem', bacon: 'Bacon',
      cebola: 'Cebola', queijo: 'Queijo', tomate: 'Tomate',
    };

    return {
      topics: weak,
      lines: weak.map(function (w) {
        var label = LABELS[w.tag] || w.tag;
        return { label: label, taxaErro: w.taxaErro, total: w.total, tag: w.tag };
      }),
    };
  }

  /* ---- API pública ---- */
  window.WeaknessMap = {
    calculateWeaknessMap: calculateWeaknessMap,
    getWeakTopics:        getWeakTopics,
    generateFocusedReview:generateFocusedReview,
    generateWeaknessReport:generateWeaknessReport,
  };
})();
