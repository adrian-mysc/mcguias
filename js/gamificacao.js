/**
 * MC Guias — Gamificação v1.0
 * Conquistas + Desafios Semanais
 * Adrian E. Silva
 */
(function () {
  'use strict';

  /* ============================================================
     CATÁLOGO DE CONQUISTAS
     ============================================================ */
  var CONQUISTAS = [
    { id: 'novato',             nome: 'Novato',               desc: 'Complete seu primeiro quiz',                         icon: '🔰', cat: 'estudo',     cor: '#22c55e' },
    { id: 'mestre_chapa',       nome: 'Mestre da Chapa',      desc: 'Atingiu 90%+ em um quiz da Chapa',                   icon: '🍔', cat: 'estudo',     cor: '#f59e0b' },
    { id: 'jardineiro',         nome: 'Jardineiro',           desc: 'Atingiu 90%+ em um quiz de Limpeza',                 icon: '🧹', cat: 'estudo',     cor: '#4ade80' },
    { id: 'faxineiro',          nome: 'Faxineiro',            desc: 'Completou 3 quizzes de Limpeza',                     icon: '✨', cat: 'estudo',     cor: '#38bdf8' },
    { id: 'precisao_cirurgica', nome: 'Precisão Cirúrgica',   desc: 'Acertou 20 perguntas seguidas em algum quiz',        icon: '🎯', cat: 'precisao',   cor: '#818cf8' },
    { id: 'relampago',          nome: 'Relâmpago',            desc: 'Respondeu 10 perguntas em menos de 30s cada',        icon: '⚡', cat: 'precisao',   cor: '#fbbf24' },
    { id: 'estudioso',          nome: 'Estudioso',            desc: 'Estudou 7 dias consecutivos',                        icon: '📚', cat: 'persistencia', cor: '#f472b6' },
    { id: 'coruja',             nome: 'Coruja',               desc: 'Completou um quiz após as 22h',                      icon: '🌙', cat: 'persistencia', cor: '#a78bfa' },
    { id: 'sequencia_fogo',     nome: 'Sequência de Fogo',    desc: 'Manteve 5 dias de estudo consecutivos',              icon: '🔥', cat: 'persistencia', cor: '#fb923c' },
    { id: 'colecionador',       nome: 'Colecionador',         desc: 'Desbloqueou 10 conquistas diferentes',               icon: '🏆', cat: 'especial',   cor: '#fbbf24' },
    { id: 'montador',           nome: 'Montador',             desc: 'Completou o Jogo Sanduíche uma vez',                 icon: '🎮', cat: 'jogo',       cor: '#34d399' },
    { id: 'rei_revisao',        nome: 'Rei da Revisão',       desc: 'Revisou 50 perguntas com flashcards',                icon: '🔁', cat: 'estudo',     cor: '#60a5fa' },
    { id: 'maratonista_estudo', nome: 'Maratonista',          desc: 'Completou 100 perguntas no total',                   icon: '🏅', cat: 'persistencia', cor: '#f87171' },
    { id: 'perfeccionista_all', nome: 'Perfeccionista',       desc: 'Atingiu 90% de acerto em qualquer quiz',             icon: '💎', cat: 'precisao',   cor: '#67e8f9' },
    // ── Troféus por guia ──────────────────────────────────────
    { id: 'trofeu_chapa',       nome: 'Troféu Chapa',         desc: 'Completou 100% do checklist de Chapa',               icon: '🥇', cat: 'trofeu',     cor: '#f59e0b' },
    { id: 'trofeu_fritas',      nome: 'Troféu Fritas',        desc: 'Completou 100% do checklist de MC Fritas',           icon: '🥇', cat: 'trofeu',     cor: '#f59e0b' },
    { id: 'trofeu_limpeza',     nome: 'Troféu Limpeza',       desc: 'Completou 100% do checklist de Limpeza',             icon: '🥇', cat: 'trofeu',     cor: '#22c55e' },
    { id: 'trofeu_drive',       nome: 'Troféu Drive-Thru',    desc: 'Completou 100% do checklist de Drive-Thru',          icon: '🥇', cat: 'trofeu',     cor: '#38bdf8' },
    { id: 'trofeu_mccafe',      nome: 'Troféu McCafé',        desc: 'Completou 100% do checklist de McCafé',              icon: '🥇', cat: 'trofeu',     cor: '#a78bfa' },
    { id: 'trofeu_fechamento',  nome: 'Troféu Fechamento',    desc: 'Completou 100% do checklist de Fechamento',          icon: '🥇', cat: 'trofeu',     cor: '#818cf8' },
    { id: 'trofeu_manutencao',  nome: 'Troféu Manutenção',    desc: 'Completou 100% do checklist de Manutenção',          icon: '🥇', cat: 'trofeu',     cor: '#fb923c' },
    // ── Prova ────────────────────────────────────────────────
    { id: 'aprovado_turno',     nome: 'Aprovado — Turno',     desc: 'Atingiu 70%+ na Prova de Gerente de Turno',          icon: '📋', cat: 'prova',      cor: '#34d399' },
    { id: 'aprovado_plantao',   nome: 'Aprovado — Plantão',   desc: 'Atingiu 70%+ na Prova de Gerente de Plantão',        icon: '📋', cat: 'prova',      cor: '#34d399' },
    { id: 'excelencia_turno',   nome: 'Excelência — Turno',   desc: 'Atingiu 90%+ na Prova de Gerente de Turno',          icon: '🌟', cat: 'prova',      cor: '#fbbf24' },
    // ── Tempo de estudo ───────────────────────────────────────
    { id: 'hora_de_estudo',     nome: '1 Hora de Estudo',     desc: 'Acumulou 60 minutos estudando no MC Guias',          icon: '⏱️', cat: 'persistencia', cor: '#f472b6' },
    { id: 'estudante_dedicado', nome: 'Dedicado',             desc: 'Acumulou 5 horas estudando no MC Guias',             icon: '🎓', cat: 'persistencia', cor: '#818cf8' },
    // ── Best Burger ───────────────────────────────────────────
    { id: 'especialista_bb',   nome: 'Especialista BB',      desc: 'Acertou 10 perguntas seguidas de Best Burger',       icon: '🏆', cat: 'estudo',     cor: '#DA291C' },
    { id: 'mestre_bb',         nome: 'Mestre do Best Burger',desc: 'Atingiu 90%+ em um quiz exclusivo de Best Burger',   icon: '🍔', cat: 'estudo',     cor: '#f59e0b' },
    { id: 'trofeu_bb',         nome: 'Troféu Best Burger',   desc: 'Completou 100% do checklist de Best Burger',         icon: '🥇', cat: 'trofeu',     cor: '#DA291C' },
    { id: 'cebola_expert',     nome: 'Expert em Cebola',     desc: 'Acertou todas as perguntas de Cebola Reidratada',    icon: '🧅', cat: 'estudo',     cor: '#22c55e' },
    { id: 'padeiro_bb',        nome: 'Padeiro BB',           desc: 'Acertou todas as perguntas de Pães Best Burger',     icon: '🍞', cat: 'estudo',     cor: '#f59e0b' },
  ];

  /* ============================================================
     DESAFIOS SEMANAIS
     ============================================================ */
  var DESAFIOS = [
    { id: 'guerreiro_chapa', nome: 'Guerreiro da Chapa', desc: 'Responda 30 perguntas da categoria Chapa', meta: 30,  emblema: '🔥', campo: 'perguntasChapa' },
    { id: 'faxina_geral',    nome: 'Faxina Geral',       desc: 'Complete 3 quizzes de Limpeza',            meta: 3,   emblema: '✨', campo: 'quizzesLimpeza' },
    { id: 'equilibrio',      nome: 'Equilíbrio',         desc: 'Estude 4 categorias diferentes',           meta: 4,   emblema: '🌈', campo: 'categoriasEstudadas', isArray: true },
    { id: 'perfeccionista',  nome: 'Perfeccionista',     desc: 'Atingiu 90% de acerto em um quiz',         meta: 1,   emblema: '💎', campo: 'quizPerfeito' },
    { id: 'maratonista',     nome: 'Maratonista',        desc: 'Complete 100 perguntas no total',          meta: 100, emblema: '🏅', campo: 'totalPerguntas' },
  ];

  /* ============================================================
     HELPERS — STORAGE
     ============================================================ */
  var STORAGE_KEY = 'gamificacao';

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function defaultData() {
    return {
      conquistas: [],
      desafiosSemanais: {
        semana: _mondayStr(),
        progresso: { perguntasChapa: 0, quizzesLimpeza: 0, categoriasEstudadas: [], quizPerfeito: 0, totalPerguntas: 0 },
        concluidos: []
      },
      estatisticas: {
        quizzesCompletos: 0,
        perguntasSeguidasCertas: 0,
        respostasRapidas: 0,
        diasConsecutivos: 0,
        quizzesApos22h: 0,
        totalFlashcards: 0,
        ultimaAtividade: null,
        totalPerguntas: 0,
        minEstudo: 0,
        guiasConcluidos: [],
        provasAprovadas: []
      }
    };
  }

  function save(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function getData() {
    var d = loadData() || defaultData();
    var def = defaultData();
    if (!d.conquistas)        d.conquistas        = [];
    if (!d.desafiosSemanais)  d.desafiosSemanais  = def.desafiosSemanais;
    if (!d.estatisticas)      d.estatisticas      = def.estatisticas;
    var s = d.estatisticas;
    if (!s.totalFlashcards)   s.totalFlashcards   = 0;
    if (!s.totalPerguntas)    s.totalPerguntas     = 0;
    if (!s.minEstudo)         s.minEstudo          = 0;
    if (!s.guiasConcluidos)   s.guiasConcluidos    = [];
    if (!s.provasAprovadas)   s.provasAprovadas    = [];
    if (!d.desafiosSemanais.progresso.categoriasEstudadas) {
      d.desafiosSemanais.progresso.categoriasEstudadas = [];
    }
    return d;
  }

  /* ============================================================
     WEEK HELPERS
     ============================================================ */
  function _mondayStr(date) {
    var d = date ? new Date(date) : new Date();
    var day = d.getDay();                 // 0=Sun
    var diff = (day === 0 ? -6 : 1 - day);
    var mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return mon.toISOString().slice(0, 10);
  }

  function checkWeekReset(data) {
    var currentMon = _mondayStr();
    if (data.desafiosSemanais.semana !== currentMon) {
      data.desafiosSemanais = {
        semana: currentMon,
        progresso: { perguntasChapa: 0, quizzesLimpeza: 0, categoriasEstudadas: [], quizPerfeito: 0, totalPerguntas: 0 },
        concluidos: []
      };
    }
  }

  /* ============================================================
     STREAK / CONSECUTIVE DAYS
     ============================================================ */
  function updateStreak(stats) {
    var today = new Date().toISOString().slice(0, 10);
    if (!stats.ultimaAtividade) {
      stats.diasConsecutivos = 1;
      stats.ultimaAtividade  = today;
      return;
    }
    var last = new Date(stats.ultimaAtividade);
    var now  = new Date(today);
    var diff = Math.round((now - last) / 86400000);
    if (diff === 0) return;                    // same day — no change
    if (diff === 1) {
      stats.diasConsecutivos++;
    } else {
      stats.diasConsecutivos = 1;              // broke streak
    }
    stats.ultimaAtividade = today;
  }

  /* ============================================================
     TOAST NOTIFICATION
     ============================================================ */
  function showToast(icon, title, sub) {
    var existing = document.getElementById('gamif-toast');
    if (existing) existing.remove();

    var t = document.createElement('div');
    t.id = 'gamif-toast';
    t.setAttribute('aria-live', 'polite');
    t.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%) translateY(20px)',
      'background:linear-gradient(135deg,#1a1a18,#2c2a26)', 'color:white',
      'border-radius:14px', 'padding:12px 16px', 'display:flex', 'align-items:center', 'gap:12px',
      'box-shadow:0 8px 32px rgba(0,0,0,0.35)', 'z-index:9999', 'max-width:320px', 'width:calc(100% - 32px)',
      'border:1.5px solid rgba(255,199,44,0.3)', 'opacity:0',
      'transition:opacity .3s ease, transform .35s cubic-bezier(0.34,1.2,0.64,1)',
      'pointer-events:none', 'will-change:opacity,transform'
    ].join(';');

    t.innerHTML = '<div style="font-size:28px;flex-shrink:0;line-height:1;">' + icon + '</div>'
      + '<div style="min-width:0;">'
      + '<div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(255,199,44,0.9);margin-bottom:2px;">Conquista Desbloqueada!</div>'
      + '<div style="font-size:14px;font-weight:800;">' + title + '</div>'
      + '<div style="font-size:11.5px;opacity:.7;line-height:1.4;margin-top:1px;">' + sub + '</div>'
      + '</div>';

    document.body.appendChild(t);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        t.style.opacity = '1';
        t.style.transform = 'translateX(-50%) translateY(0)';
      });
    });

    setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 4000);
  }

  function showDesafioToast(icon, nome) {
    var existing = document.getElementById('gamif-toast');
    if (existing) {
      // Queue after existing
      setTimeout(function () { showDesafioToast(icon, nome); }, 4500);
      return;
    }
    var t = document.createElement('div');
    t.id = 'gamif-toast';
    t.style.cssText = [
      'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%) translateY(20px)',
      'background:linear-gradient(135deg,#0d3a6e,#1a5fa8)', 'color:white',
      'border-radius:14px', 'padding:12px 16px', 'display:flex', 'align-items:center', 'gap:12px',
      'box-shadow:0 8px 32px rgba(26,95,168,0.4)', 'z-index:9999', 'max-width:320px', 'width:calc(100% - 32px)',
      'border:1.5px solid rgba(255,255,255,0.15)', 'opacity:0',
      'transition:opacity .3s ease, transform .35s cubic-bezier(0.34,1.2,0.64,1)',
      'pointer-events:none'
    ].join(';');
    t.innerHTML = '<div style="font-size:28px;flex-shrink:0;line-height:1;">' + icon + '</div>'
      + '<div><div style="font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:rgba(100,200,255,0.9);margin-bottom:2px;">Desafio Concluído!</div>'
      + '<div style="font-size:14px;font-weight:800;">' + nome + '</div></div>';
    document.body.appendChild(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)';
    }); });
    setTimeout(function () {
      t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 4000);
  }

  /* ============================================================
     CHECK & UNLOCK CONQUISTAS
     ============================================================ */
  function verificarConquistas(data, extras) {
    var stats = data.estatisticas;
    var unlocked = data.conquistas;
    var newOnes  = [];

    function check(id, cond) {
      if (cond && unlocked.indexOf(id) === -1) {
        unlocked.push(id);
        newOnes.push(id);
      }
    }

    extras = extras || {};

    check('novato',             stats.quizzesCompletos >= 1);
    check('mestre_chapa',       !!extras.mestre_chapa);
    check('jardineiro',         !!extras.jardineiro);
    check('faxineiro',          (extras.limpezaCount || 0) >= 3);
    check('precisao_cirurgica', stats.perguntasSeguidasCertas >= 20);
    check('relampago',          stats.respostasRapidas >= 10);
    check('estudioso',          stats.diasConsecutivos >= 7);
    check('coruja',             stats.quizzesApos22h >= 1);
    check('sequencia_fogo',     stats.diasConsecutivos >= 5);
    check('colecionador',       unlocked.length >= 10);
    check('montador',           !!extras.jogoCompleto);
    check('rei_revisao',        stats.totalFlashcards >= 50);
    check('maratonista_estudo', stats.totalPerguntas >= 100);
    check('perfeccionista_all', !!extras.perfeccionista);
    // Troféus por guia (checklist 100%)
    var gc = stats.guiasConcluidos || [];
    check('trofeu_chapa',      gc.indexOf('chapa') !== -1);
    check('trofeu_fritas',     gc.indexOf('mcfritas') !== -1);
    check('trofeu_limpeza',    gc.indexOf('limpeza') !== -1);
    check('trofeu_drive',      gc.indexOf('drive-thru') !== -1);
    check('trofeu_mccafe',     gc.indexOf('mccafe') !== -1);
    check('trofeu_fechamento', gc.indexOf('fechamento') !== -1);
    check('trofeu_manutencao', gc.indexOf('manutencao-preventivas') !== -1);
    // Prova
    var pa = stats.provasAprovadas || [];
    check('aprovado_turno',    pa.indexOf('gerente-de-turno') !== -1);
    check('aprovado_plantao',  pa.indexOf('gerente-de-plantao') !== -1);
    check('excelencia_turno',  !!extras.excelencia_turno);
    // Tempo de estudo
    check('hora_de_estudo',    (stats.minEstudo || 0) >= 60);
    check('estudante_dedicado',(stats.minEstudo || 0) >= 300);

    // Show toasts and push notifications for new unlocks (staggered)
    newOnes.forEach(function (id, i) {
      var c = CONQUISTAS.filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      setTimeout(function () {
        showToast(c.icon, c.nome, c.desc);
        // Notificação push só se o app estiver em background (visibilityState hidden)
        if (document.visibilityState === 'hidden') {
          _notifyConquista(c);
        }
      }, i * 4500);
    });

    return newOnes;
  }

  /* ============================================================
     CHECK DESAFIOS SEMANAIS
     ============================================================ */
  function verificarDesafios(data) {
    var prog     = data.desafiosSemanais.progresso;
    var concl    = data.desafiosSemanais.concluidos;
    var newOnes  = [];

    DESAFIOS.forEach(function (d) {
      if (concl.indexOf(d.id) !== -1) return; // already done

      var valor = d.isArray
        ? (prog[d.campo] ? prog[d.campo].length : 0)
        : (prog[d.campo] || 0);

      if (valor >= d.meta) {
        concl.push(d.id);
        newOnes.push(d);
      }
    });

    // Show toasts staggered (after conquista toasts)
    newOnes.forEach(function (d, i) {
      setTimeout(function () { showDesafioToast(d.emblema, d.nome); }, 300 + i * 4500);
    });
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */

  /**
   * Call after each quiz completion.
   * @param {object} opts
   *   guide      {string}  – guide id (e.g. 'chapa', 'limpeza')
   *   score      {number}  – correct answers
   *   total      {number}  – total questions
   *   pct        {number}  – percentage 0–100
   *   hour       {number}  – hour of day (0–23) when quiz finished
   *   maxStreak  {number}  – best consecutive streak in this session
   *   fastAnswers{number}  – questions answered in < 30s
   *   mode       {string}  – 'mc' | 'flash' | 'lacuna'
   */
  function onQuizComplete(opts) {
    opts = opts || {};
    var data  = getData();
    var stats = data.estatisticas;

    checkWeekReset(data);
    updateStreak(stats);

    // -- Statistics --
    stats.quizzesCompletos++;
    stats.totalPerguntas = (stats.totalPerguntas || 0) + (opts.total || 0);
    if ((opts.hour || 0) >= 22)    stats.quizzesApos22h++;
    if ((opts.maxStreak || 0) > stats.perguntasSeguidasCertas) {
      stats.perguntasSeguidasCertas = opts.maxStreak;
    }
    stats.respostasRapidas = (stats.respostasRapidas || 0) + (opts.fastAnswers || 0);

    // -- Weekly challenges --
    var prog  = data.desafiosSemanais.progresso;
    var guide = (opts.guide || '').toLowerCase();
    var pct   = opts.pct || 0;

    // guerreiro_chapa — count questions if guide contains 'chapa'
    if (guide.indexOf('chapa') !== -1 || guide.indexOf('futuros') !== -1) {
      prog.perguntasChapa = (prog.perguntasChapa || 0) + (opts.total || 0);
    }

    // faxina_geral — quiz de limpeza
    if (guide.indexOf('limpeza') !== -1 || guide.indexOf('faxin') !== -1) {
      prog.quizzesLimpeza = (prog.quizzesLimpeza || 0) + 1;
    }

    // equilibrio — unique categories
    if (guide && prog.categoriasEstudadas.indexOf(guide) === -1) {
      prog.categoriasEstudadas.push(guide);
    }

    // perfeccionista
    if (pct >= 90) prog.quizPerfeito = (prog.quizPerfeito || 0) + 1;

    // maratonista
    prog.totalPerguntas = (prog.totalPerguntas || 0) + (opts.total || 0);

    // -- Extras for conquistas --
    var extras = {
      mestre_chapa:   guide.indexOf('chapa') !== -1 && pct >= 90,
      jardineiro:     guide.indexOf('limpeza') !== -1 && pct >= 90,
      limpezaCount:   prog.quizzesLimpeza,
      perfeccionista: pct >= 90,
    };

    // -- Check & notify --
    verificarConquistas(data, extras);
    verificarDesafios(data);

    save(data);
  }

  /** Call each time a flashcard is flipped/self-evaluated. */
  function onFlashcard() {
    var data = getData();
    checkWeekReset(data);
    updateStreak(data.estatisticas);
    data.estatisticas.totalFlashcards = (data.estatisticas.totalFlashcards || 0) + 1;
    verificarConquistas(data, {});
    save(data);
  }

  /** Call when jogo sanduíche is completed. */
  function onJogoComplete() {
    var data = getData();
    checkWeekReset(data);
    updateStreak(data.estatisticas);
    verificarConquistas(data, { jogoCompleto: true });
    save(data);
  }

  /**
   * Call when a guide checklist reaches 100%.
   * @param {string} guideId  — page id, e.g. 'chapa', 'limpeza', 'mccafe'
   */
  function onChecklistComplete(guideId) {
    if (!guideId) return;
    var data = getData();
    checkWeekReset(data);
    updateStreak(data.estatisticas);
    var gc = data.estatisticas.guiasConcluidos;
    if (gc.indexOf(guideId) === -1) gc.push(guideId);
    verificarConquistas(data, {});
    save(data);
  }

  /**
   * Call when a prova is completed.
   * @param {string} provaId  — prova id, e.g. 'gerente-de-turno'
   * @param {number} pct      — percentage 0-100
   */
  function onProvaComplete(provaId, pct) {
    if (!provaId) return;
    var data = getData();
    checkWeekReset(data);
    updateStreak(data.estatisticas);
    var pa = data.estatisticas.provasAprovadas;
    if (pct >= 70 && pa.indexOf(provaId) === -1) pa.push(provaId);
    var extras = {
      excelencia_turno: provaId === 'gerente-de-turno' && pct >= 90,
    };
    verificarConquistas(data, extras);
    save(data);
  }

  /**
   * Add study minutes (call on page unload or after timed session).
   * @param {number} minutes
   */
  function addStudyMinutes(minutes) {
    if (!minutes || minutes <= 0) return;
    var data = getData();
    data.estatisticas.minEstudo = (data.estatisticas.minEstudo || 0) + Math.round(minutes);
    verificarConquistas(data, {});
    save(data);
  }

  /**
   * Request permission for daily reminder notifications (local + push via SW).
   * Returns a promise resolving to 'granted' | 'denied' | 'unsupported'.
   */
  function requestNotificationReminder() {
    if (!('Notification' in window)) return Promise.resolve('unsupported');

    if (Notification.permission === 'granted') {
      _scheduleReminderCheck();
      _setupPushReminder();
      return Promise.resolve('granted');
    }

    return Notification.requestPermission().then(function(perm) {
      if (perm === 'granted') {
        _scheduleReminderCheck();
        _setupPushReminder();
      }
      return perm;
    });
  }

  /**
   * Dispara uma notificação local imediata via Service Worker (mais confiável
   * que new Notification() em mobile/Android, que às vezes é bloqueada).
   */
  function _showLocalNotification(title, body, tag) {
    tag = tag || 'mc-reminder';
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function(reg) {
        reg.showNotification(title, {
          body:     body,
          icon:     '/mcguias/icons/icon-192.png',
          badge:    '/mcguias/icons/icon-192.png',
          tag:      tag,
          renotify: false,
          data:     { url: '/mcguias/' },
          actions:  [
            { action: 'open',    title: '📖 Estudar agora' },
            { action: 'dismiss', title: '✕ Fechar' },
          ],
        });
      }).catch(function() {
        // Fallback para Notification API direta
        try {
          new Notification(title, { body: body, icon: '/mcguias/icons/icon-192.png', tag: tag });
        } catch(e) {}
      });
    } else {
      try {
        new Notification(title, { body: body, icon: '/mcguias/icons/icon-192.png', tag: tag });
      } catch(e) {}
    }
  }

  function _scheduleReminderCheck() {
    var today   = new Date().toISOString().slice(0, 10);
    var lastKey = 'mc_last_notif';
    if (localStorage.getItem(lastKey) === today) return;

    var data         = getData();
    var lastActivity = data.estatisticas.ultimaAtividade;
    var streak       = data.estatisticas.diasConsecutivos || 0;

    if (lastActivity !== today) {
      setTimeout(function() {
        if (Notification.permission !== 'granted') return;
        var msg = streak > 0
          ? 'Não perca seu streak de ' + streak + ' dia' + (streak !== 1 ? 's' : '') + '! Estude pelo menos 1 quiz hoje.'
          : 'Que tal estudar hoje? Abra um guia e complete um quiz rápido!';
        _showLocalNotification('MC Guias 📚', msg, 'mc-daily-reminder');
        localStorage.setItem(lastKey, today);
      }, 3000);
    }
  }

  /**
   * Configura lembretes recorrentes usando setTimeout encadeado.
   * Simula um alarme diário às 20h (horário do dispositivo) —
   * funciona enquanto o navegador/PWA estiver aberto.
   * Para notificações 100% background seria necessário servidor VAPID,
   * que está além do escopo de um app estático; esta abordagem cobre
   * a grande maioria dos casos (usuário abre o app ao longo do dia).
   */
  function _setupPushReminder() {
    var REMINDER_KEY = 'mc_push_reminder_set';
    if (localStorage.getItem(REMINDER_KEY) === '1') return;
    localStorage.setItem(REMINDER_KEY, '1');

    function scheduleNext() {
      var now    = new Date();
      var target = new Date();
      target.setHours(20, 0, 0, 0); // 20h local
      if (now >= target) target.setDate(target.getDate() + 1);
      var delay = target.getTime() - now.getTime();
      setTimeout(function() {
        _scheduleReminderCheck();
        scheduleNext(); // agenda o próximo dia
      }, delay);
    }

    scheduleNext();
  }

  /**
   * Verifica e mostra notificação de conquista desbloqueada.
   */
  function _notifyConquista(conquista) {
    if (Notification.permission !== 'granted') return;
    _showLocalNotification(
      '🏆 Conquista desbloqueada!',
      conquista.icon + ' ' + conquista.nome + ' — ' + conquista.desc,
      'mc-conquista-' + conquista.id
    );
  }

  /** Returns current data snapshot (for the conquistas page). */
  function getSnapshot() {
    var d = getData();
    checkWeekReset(d);
    return {
      conquistas:       d.conquistas,
      desafiosSemanais: d.desafiosSemanais,
      estatisticas:     d.estatisticas,
      catalogo:         CONQUISTAS,
      desafiosCatalogo: DESAFIOS,
    };
  }

  /** Reset all data (for debug). */
  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ============================================================
     EXPOSE
     ============================================================ */
  window.Gamificacao = {
    onQuizComplete:              onQuizComplete,
    onFlashcard:                 onFlashcard,
    onJogoComplete:              onJogoComplete,
    onChecklistComplete:         onChecklistComplete,
    onProvaComplete:             onProvaComplete,
    addStudyMinutes:             addStudyMinutes,
    requestNotificationReminder: requestNotificationReminder,
    getSnapshot:                 getSnapshot,
    resetAll:                    resetAll,
    CONQUISTAS:                  CONQUISTAS,
    DESAFIOS:                    DESAFIOS,
  };

})();
