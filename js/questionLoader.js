/**
 * MC Guias — QuestionLoader v1.0
 * Lazy loading de JSON, cache offline, indexação e storage abstrato
 * Adrian E. Silva
 */
(function () {
  'use strict';

  var BASE_PATH   = '/mcguias/data/questions';
  var META_PATH   = '/mcguias/data/metadata';
  var CACHE_KEY   = 'mcg_qpack_v1';
  var PROG_KEY    = 'mcg_qprog_v1';

  /* ================================================================
     CACHE OFFLINE (localStorage como fallback de fetch)
  ================================================================ */
  var _memCache = {};

  function _cacheGet(key) {
    if (_memCache[key]) return _memCache[key];
    try {
      var raw = localStorage.getItem(CACHE_KEY + '_' + key);
      if (raw) { _memCache[key] = JSON.parse(raw); return _memCache[key]; }
    } catch (e) {}
    return null;
  }

  function _cacheSet(key, data) {
    _memCache[key] = data;
    try { localStorage.setItem(CACHE_KEY + '_' + key, JSON.stringify(data)); }
    catch (e) {}
  }

  /* ================================================================
     FETCH COM FALLBACK DE CACHE
  ================================================================ */
  function fetchJSON(url) {
    var cacheKey = url.replace(/\//g, '_');
    var cached   = _cacheGet(cacheKey);
    if (cached) return Promise.resolve(cached);

    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' — ' + url);
        return r.json();
      })
      .then(function (data) {
        _cacheSet(cacheKey, data);
        return data;
      });
  }

  /* ================================================================
     LAZY LOADING DE PACOTES
  ================================================================ */
  /**
   * loadQuestionPack(category, level)
   * level: 'basico' | 'avancado'
   * Returns: Promise<Array<Question>>
   */
  function loadQuestionPack(category, level) {
    var url = BASE_PATH + '/' + category + '/' + (level || 'basico') + '.json';
    return fetchJSON(url).then(function (pack) {
      return pack.questions || [];
    });
  }

  /**
   * loadAllForCategory(category)
   * Carrega todos os níveis de uma categoria, mesclando as questões.
   */
  function loadAllForCategory(category) {
    var levels = ['basico', 'avancado'];
    var promises = levels.map(function (l) {
      return loadQuestionPack(category, l).catch(function () { return []; });
    });
    return Promise.all(promises).then(function (results) {
      return results.reduce(function (acc, arr) { return acc.concat(arr); }, []);
    });
  }

  /**
   * loadCategories(ids?)
   * Carrega questões de múltiplas categorias. Se ids omitido, usa todas.
   */
  function loadCategories(ids) {
    var cats = ids || ['chapa', 'lope', 'fritas', 'limpeza', 'drive-thru', 'seguranca', 'validades'];
    return Promise.all(cats.map(loadAllForCategory)).then(function (results) {
      return results.reduce(function (acc, arr) { return acc.concat(arr); }, []);
    });
  }

  /* ================================================================
     INDEXAÇÃO
  ================================================================ */
  function buildIndex(questions) {
    var index = { byId: {}, byCategory: {}, byTag: {}, byDifficulty: {} };

    questions.forEach(function (q) {
      // byId
      index.byId[q.id] = q;

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

    return index;
  }

  /* ================================================================
     METADATA
  ================================================================ */
  function loadMetadata(file) {
    return fetchJSON(META_PATH + '/' + file + '.json');
  }

  /* ================================================================
     STORAGE ABSTRATO
     Compatível com localStorage hoje; pronto para IndexedDB/Supabase
  ================================================================ */
  function saveQuestionProgress(questionId, data) {
    var all = _loadAllProgress();
    all[questionId] = Object.assign(all[questionId] || {}, data, { updatedAt: Date.now() });
    try { localStorage.setItem(PROG_KEY, JSON.stringify(all)); }
    catch (e) {}
  }

  function loadQuestionProgress(questionId) {
    return _loadAllProgress()[questionId] || null;
  }

  function updateQuestionStats(questionId, correct, timeMs) {
    var prog  = loadQuestionProgress(questionId) || {};
    var right = (prog.timesCorrect || 0) + (correct ? 1 : 0);
    var wrong = (prog.timesWrong  || 0) + (correct ? 0 : 1);
    var total = right + wrong;
    var avgT  = total > 1
      ? Math.round(((prog.mediaTempoResposta || 0) * (total - 1) + timeMs) / total)
      : timeMs;

    saveQuestionProgress(questionId, {
      timesCorrect:       right,
      timesWrong:         wrong,
      timesAnswered:      total,
      mediaTempoResposta: avgT,
      errorStats: {
        timesWrong:    wrong,
        timesCorrect:  right,
        weaknessScore: total > 0 ? Math.round(wrong / total * 100) : 0,
      },
    });
  }

  function getAllProgress() {
    return _loadAllProgress();
  }

  function clearProgress() {
    try { localStorage.removeItem(PROG_KEY); }
    catch (e) {}
  }

  function _loadAllProgress() {
    try { return JSON.parse(localStorage.getItem(PROG_KEY)) || {}; }
    catch (e) { return {}; }
  }

  /* ================================================================
     HELPERS
  ================================================================ */
  /** Filtra questões por tag */
  function filterByTag(questions, tag) {
    return questions.filter(function (q) {
      return (q.tags || []).indexOf(tag) !== -1;
    });
  }

  /** Filtra questões por dificuldade máxima */
  function filterByMaxDifficulty(questions, max) {
    return questions.filter(function (q) { return (q.dificuldade || 1) <= max; });
  }

  /** Mescla progresso salvo nas questões (usado por SRS / AdaptiveQuiz) */
  function hydrateProgress(questions) {
    var allProg = _loadAllProgress();
    return questions.map(function (q) {
      var p = allProg[q.id];
      if (!p) return q;
      return Object.assign({}, q, p);
    });
  }

  /* ================================================================
     API PÚBLICA
  ================================================================ */
  window.QuestionLoader = {
    loadQuestionPack:       loadQuestionPack,
    loadAllForCategory:     loadAllForCategory,
    loadCategories:         loadCategories,
    buildIndex:             buildIndex,
    loadMetadata:           loadMetadata,
    saveQuestionProgress:   saveQuestionProgress,
    loadQuestionProgress:   loadQuestionProgress,
    updateQuestionStats:    updateQuestionStats,
    getAllProgress:          getAllProgress,
    clearProgress:          clearProgress,
    filterByTag:            filterByTag,
    filterByMaxDifficulty:  filterByMaxDifficulty,
    hydrateProgress:        hydrateProgress,
  };
})();
