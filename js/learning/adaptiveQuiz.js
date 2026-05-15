/**
 * MC Guias — Quiz Adaptativo v1.0
 * Ajusta dificuldade em tempo real
 * Adrian E. Silva
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'mcg_adaptive_v1';

  /* ---- Storage ---- */
  function loadSession() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; }
    catch (e) { return null; }
  }
  function saveSession(s) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
    catch (e) {}
  }

  /* ---- Skill level (0–100) ---- */
  function calculateSkillLevel(allCards) {
    var cards = Object.keys(allCards).map(function (k) { return allCards[k]; })
      .filter(function (c) { return c.acertos + c.erros > 0; });
    if (cards.length === 0) return 0;

    var score = cards.reduce(function (acc, c) {
      var total = c.acertos + c.erros;
      var taxa  = c.acertos / total;
      var peso  = Math.min(1, total / 5);
      return acc + taxa * c.nivelDominio * peso;
    }, 0);

    return Math.min(100, Math.round(score / cards.length * 20));
  }

  function getSkillLabel(score) {
    if (score < 20) return { label: 'Iniciante',     icon: '🔰', cor: '#94a3b8' };
    if (score < 50) return { label: 'Básico',         icon: '📗', cor: '#38bdf8' };
    if (score < 80) return { label: 'Intermediário',  icon: '📘', cor: '#f59e0b' };
    return               { label: 'Avançado',        icon: '🏆', cor: '#22c55e' };
  }

  /* ---- Difficulty mapping ---- */
  function targetDifficulty(skillScore) {
    if (skillScore < 20) return 1;
    if (skillScore < 50) return 2;
    if (skillScore < 80) return 3;
    return 4;
  }

  /* ---- Select next question ---- */
  function selectAdaptiveQuestion(allQuestions, skillScore, answeredIds, allCards) {
    var answered = answeredIds || [];
    var pool     = allQuestions.filter(function (q) {
      return answered.indexOf(q.id) === -1;
    });
    if (pool.length === 0) return null;

    var target = targetDifficulty(skillScore);

    var scored = pool.map(function (q) {
      var diff      = q.dificuldade || 2;
      var card      = allCards[q.id];
      var diffDelta = Math.abs(diff - target);
      // Bônus para perguntas não revisadas ou com domínio baixo
      var weakBonus = (!card || card.nivelDominio < 3) ? 1.5 : 0;
      // Bônus para perguntas com mais erros
      var errBonus  = card ? Math.min(2, card.erros * 0.3) : 0;
      return { q: q, score: diffDelta - weakBonus - errBonus };
    }).sort(function (a, b) { return a.score - b.score; });

    // Escolhe aleatoriamente entre os top 5 para evitar repetição linear
    var top = scored.slice(0, Math.min(5, scored.length));
    return top[Math.floor(Math.random() * top.length)].q;
  }

  /* ---- Skill adjustment after answer ---- */
  function adjustDifficulty(currentScore, correct, timeMs) {
    var fast = timeMs < 8000;
    if (correct  && fast)  return Math.min(100, currentScore + 5);
    if (correct  && !fast) return Math.min(100, currentScore + 2);
    if (!correct && fast)  return Math.max(0,   currentScore - 5);
    return                              Math.max(0,   currentScore - 8);
  }

  /* ---- Session management ---- */
  function createSession(maxQuestions, focusTag) {
    var s = {
      started:      Date.now(),
      skillScore:   0,
      answered:     [],
      results:      [],
      maxQuestions: maxQuestions || 15,
      focusTag:     focusTag || null,
    };
    saveSession(s);
    return s;
  }

  function recordAnswer(session, questionId, correct, timeMs) {
    session.answered.push(questionId);
    session.results.push({ id: questionId, correct: correct, time: timeMs });
    session.skillScore = adjustDifficulty(session.skillScore, correct, timeMs);
    saveSession(session);
    return session;
  }

  function getSessionStats(session) {
    if (!session || session.results.length === 0) return null;
    var correct = session.results.filter(function (r) { return r.correct; }).length;
    var total   = session.results.length;
    var avgTime = Math.round(
      session.results.reduce(function (s, r) { return s + r.time; }, 0) / total
    );
    return {
      correct: correct, total: total,
      pct:     Math.round(correct / total * 100),
      avgTime: avgTime,
      skillScore: session.skillScore,
      skillInfo:  getSkillLabel(session.skillScore),
      duration:   Math.round((Date.now() - session.started) / 1000),
    };
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ---- API pública ---- */
  window.AdaptiveQuiz = {
    calculateSkillLevel:     calculateSkillLevel,
    getSkillLabel:           getSkillLabel,
    targetDifficulty:        targetDifficulty,
    selectAdaptiveQuestion:  selectAdaptiveQuestion,
    adjustDifficulty:        adjustDifficulty,
    createSession:           createSession,
    recordAnswer:            recordAnswer,
    getSessionStats:         getSessionStats,
    loadSession:             loadSession,
    clearSession:            clearSession,
  };
})();
