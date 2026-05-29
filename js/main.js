"use strict";

/* ============================================================
   MC GUIAS — Shared JavaScript
   Versão: 3.0 — refatoração modular + otimizações de performance
   Gerado por: build/concat.sh — NÃO EDITE ESTE ARQUIVO DIRETAMENTE
   Edite os arquivos em js/src/ e execute: bash build/concat.sh
   ============================================================ */

/* ── storage.js ── */
// ── Storage — McStorage · migrations · analytics ──────────────

var McStorage = (function() {
  function get(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return (fallback !== undefined) ? fallback : null;
      try { return JSON.parse(raw); } catch(e) { return raw; }
    } catch(e) { return (fallback !== undefined) ? fallback : null; }
  }
  function set(key, value) {
    try {
      localStorage.setItem(key, (typeof value === 'string') ? value : JSON.stringify(value));
      return true;
    } catch(e) {
      if (e && e.name === 'QuotaExceededError') {
        console.warn('[MC Guias] localStorage cheio. Dado não salvo:', key);
      }
      return false;
    }
  }
  function remove(key) { try { localStorage.removeItem(key); } catch(e) {} }
  return { get: get, set: set, remove: remove };
})();

/* ── Migração única: mc_sr_data + mcg_srs_v1 → mc_sr_v2 ── */
(function migrateSRKeys() {
  try {
    var sr2 = JSON.parse(localStorage.getItem('mc_sr_v2') || '{}');
    var changed = false;
    var old1 = localStorage.getItem('mc_sr_data');
    if (old1 && !sr2.hashData) {
      try { sr2.hashData = JSON.parse(old1); changed = true; } catch(e) {}
      localStorage.removeItem('mc_sr_data');
    }
    var old2 = localStorage.getItem('mcg_srs_v1');
    if (old2 && !sr2.cardData) {
      try { sr2.cardData = JSON.parse(old2); changed = true; } catch(e) {}
      localStorage.removeItem('mcg_srs_v1');
    }
    if (changed) localStorage.setItem('mc_sr_v2', JSON.stringify(sr2));
  } catch(e) {}
})();

function trackAnswer(qId, isCorrect, elapsedMs, qText) {
  if (!qId) return;
  var data = McStorage.get('mc_analytics', {});
  if (!data[qId]) data[qId] = { answered: 0, correct: 0, wrong: 0, totalMs: 0, text: '' };
  data[qId].answered++;
  if (isCorrect) data[qId].correct++; else data[qId].wrong++;
  data[qId].totalMs += (elapsedMs || 0);
  if (qText && !data[qId].text) data[qId].text = qText;
  McStorage.set('mc_analytics', data);
}

/* ── audio.js ── */
// ── Sound Engine (Web Audio API — no external files) ──────────
var _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
function mcPlaySound(type) {
  if (McStorage.get('mc_sound_off', null) === '1') return;
  try {
    var ctx = _getAudioCtx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(780, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(140, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else if (type === 'streak') {
      // Three quick ascending beeps
      [0, 0.1, 0.2].forEach(function(t, i) {
        var o2 = ctx.createOscillator();
        var g2 = ctx.createGain();
        o2.connect(g2); g2.connect(ctx.destination);
        o2.type = 'sine';
        o2.frequency.value = 600 + i * 150;
        g2.gain.setValueAtTime(0.15, ctx.currentTime + t);
        g2.gain.linearRampToValueAtTime(0, ctx.currentTime + t + 0.09);
        o2.start(ctx.currentTime + t);
        o2.stop(ctx.currentTime + t + 0.1);
      });
    }
  } catch(e) {}
}

/* ── stats.js ── */
// ── Statistics · Tabs · Checklist · Quiz History ──────────────

function renderStats(containerId) {
  var el = document.getElementById(containerId);
  if (!el) return;

  var hist = McStorage.get('mc_quiz_history', []);
  var sr2 = McStorage.get('mc_sr_v2', {});
  var srData = sr2.hashData || {};

  if (!hist.length) {
    el.innerHTML = '<div style="text-align:center;padding:16px 0;">'
      + '<p style="color:var(--muted);font-size:13px;margin-bottom:12px;">Nenhum simulado realizado ainda.</p>'
      + '<a href="pages/quiz.html" class="btn-primary" style="display:inline-block;padding:10px 20px;text-decoration:none;">Começar agora →</a>'
      + '</div>';
    return;
  }

  // Aggregate by guia
  var byGuia = {};
  hist.forEach(function(h) {
    if (!byGuia[h.guia]) byGuia[h.guia] = { scores: [], total: 0, count: 0 };
    byGuia[h.guia].scores.push(Math.round((h.score / h.total) * 100));
    byGuia[h.guia].total += h.total;
    byGuia[h.guia].count++;
  });

  // Overall stats
  var allPcts = hist.filter(function(h) { return h.total > 0; }).map(function(h) { return Math.round((h.score / h.total) * 100); });
  if (!allPcts.length) allPcts = [0];
  var avgAll = Math.round(allPcts.reduce(function(a, b) { return a + b; }, 0) / allPcts.length);
  var best = Math.max.apply(null, allPcts);

  // SR wrong ratio — top 5 hardest questions
  var srEntries = Object.entries(srData).map(function(e) {
    var d = e[1];
    return { ratio: d.wrong / (d.correct + d.wrong + 0.001), wrong: d.wrong, correct: d.correct };
  }).filter(function(e) { return e.wrong > 0; })
    .sort(function(a, b) { return b.ratio - a.ratio; });

  var totalCorrect = Object.values(srData).reduce(function(s, d) { return s + d.correct; }, 0);
  var totalWrong   = Object.values(srData).reduce(function(s, d) { return s + d.wrong; }, 0);

  // Build HTML
  var guiaRows = Object.entries(byGuia).sort(function(a, b) {
    var avgA = a[1].scores.reduce(function(x,y){return x+y;},0)/a[1].scores.length;
    var avgB = b[1].scores.reduce(function(x,y){return x+y;},0)/b[1].scores.length;
    return avgA - avgB; // worst first
  }).map(function(entry) {
    var guia = entry[0], data = entry[1];
    var avg = Math.round(data.scores.reduce(function(a,b){return a+b;},0) / data.scores.length);
    var color = avg >= 80 ? '#22c55e' : avg >= 60 ? '#f59e0b' : 'var(--red)';
    var emoji = avg >= 80 ? '🏆' : avg >= 60 ? '👍' : '📖';
    return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);">'
      + '<div style="flex:1;font-size:13px;font-weight:600;color:var(--text);">' + emoji + ' ' + guia + '</div>'
      + '<div style="font-size:11px;color:var(--muted);">' + data.count + 'x</div>'
      + '<div style="width:80px;height:6px;background:var(--border);border-radius:3px;overflow:hidden;">'
      +   '<div style="height:100%;width:' + avg + '%;background:' + color + ';border-radius:3px;transition:width .6s;"></div>'
      + '</div>'
      + '<div style="font-size:13px;font-weight:800;color:' + color + ';width:36px;text-align:right;">' + avg + '%</div>'
      + '</div>';
  }).join('');

  el.innerHTML =
    '<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">'
    + '<div style="flex:1;min-width:90px;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius-md);padding:12px;text-align:center;">'
    +   '<div style="font-family:var(--font-display);font-size:22px;font-weight:900;color:var(--red);">' + hist.length + '</div>'
    +   '<div style="font-size:11px;color:var(--muted);margin-top:2px;">Simulados</div>'
    + '</div>'
    + '<div style="flex:1;min-width:90px;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius-md);padding:12px;text-align:center;">'
    +   '<div style="font-family:var(--font-display);font-size:22px;font-weight:900;color:var(--red);">' + avgAll + '%</div>'
    +   '<div style="font-size:11px;color:var(--muted);margin-top:2px;">Média geral</div>'
    + '</div>'
    + '<div style="flex:1;min-width:90px;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius-md);padding:12px;text-align:center;">'
    +   '<div style="font-family:var(--font-display);font-size:22px;font-weight:900;color:#22c55e;">' + best + '%</div>'
    +   '<div style="font-size:11px;color:var(--muted);margin-top:2px;">Melhor resultado</div>'
    + '</div>'
    + '<div style="flex:1;min-width:90px;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius-md);padding:12px;text-align:center;">'
    +   '<div style="font-family:var(--font-display);font-size:22px;font-weight:900;color:#f59e0b;">' + totalWrong + '</div>'
    +   '<div style="font-size:11px;color:var(--muted);margin-top:2px;">Total erros</div>'
    + '</div>'
    + '</div>'
    + '<div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">% Médio por guia</div>'
    + '<div style="display:flex;flex-direction:column;">' + guiaRows + '</div>'
    + (srEntries.length ? '<div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px;">Acertos vs Erros (SR)</div>'
    +   '<div style="display:flex;gap:6px;align-items:center;font-size:13px;">'
    +   '<div style="flex:' + totalCorrect + ';height:10px;background:#22c55e;border-radius:4px 0 0 4px;min-width:4px;" title="Corretas: ' + totalCorrect + '"></div>'
    +   '<div style="flex:' + totalWrong + ';height:10px;background:var(--red);border-radius:0 4px 4px 0;min-width:4px;" title="Erradas: ' + totalWrong + '"></div>'
    +   '</div>'
    +   '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:4px;">'
    +   '<span>✅ ' + totalCorrect + ' corretas</span><span>❌ ' + totalWrong + ' erradas</span></div>' : '');
}

window.renderStats = renderStats;

// switchMode — called from inline onclick in guide pages
window.switchMode = function(mode) {
  if (!window._quizData) return; // data not loaded yet
  if (window.setActiveMode) window.setActiveMode(mode);
  if (mode === 'flash')    { initFlashcard(window._quizData, window._quizGuia); return; }
  if (mode === 'lacuna')   { initLacuna(window._quizData, window._quizGuia);    return; }
  initQuiz(window._quizData, window._quizGuia);
};

var _tabsInitialized = false;
var _swipeDir = null; // 'left' | 'right' — set by initSwipeNav before programmatic click

function initTabs() {
  if (_tabsInitialized) return;
  _tabsInitialized = true;
  const tabBtns   = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabBtns.forEach((b)  => b.classList.remove("active"));
      tabPanels.forEach((p) => {
        p.classList.remove("active", "slide-from-right", "slide-from-left");
      });
      btn.classList.add("active");
      const panel = document.getElementById("panel-" + target);
      if (panel) {
        panel.classList.add("active");
        if (_swipeDir) {
          panel.classList.add(_swipeDir === 'left' ? 'slide-from-right' : 'slide-from-left');
          panel.addEventListener('animationend', function() {
            panel.classList.remove('slide-from-right', 'slide-from-left');
          }, { once: true });
          _swipeDir = null;
        }
      }
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      const pageId = document.body.dataset.page;
      if (pageId) sessionStorage.setItem("tab-" + pageId, target);
    });
  });
  const pageId = document.body.dataset.page;
  if (pageId) {
    const saved = sessionStorage.getItem("tab-" + pageId);
    if (saved) {
      const savedBtn = document.querySelector(`.tab-btn[data-tab="${saved}"]`);
      if (savedBtn) savedBtn.click();
    }
  }
}

function initSwipeNav() {
  var tabBtns = document.querySelectorAll(".tab-btn");
  if (tabBtns.length < 2) return;

  var startX, startY, startTime;
  var SWIPE_MIN_X  = 50;  // px mínimo horizontal
  var SWIPE_MAX_Y  = 80;  // px máximo vertical (previne scroll)
  var SWIPE_MAX_MS = 450; // ms máximo de duração

  var target = document.querySelector('main') || document.body;

  target.addEventListener('touchstart', function(e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startTime = Date.now();
  }, { passive: true });

  target.addEventListener('touchend', function(e) {
    if (startX === undefined) return;
    var dx = e.changedTouches[0].clientX - startX;
    var dy = e.changedTouches[0].clientY - startY;
    var dt = Date.now() - startTime;

    // Ignorar: muito curto, muito vertical, muito lento
    if (Math.abs(dx) < SWIPE_MIN_X)                  return;
    if (Math.abs(dy) > SWIPE_MAX_Y)                   return;
    if (dt > SWIPE_MAX_MS)                             return;
    if (Math.abs(dy) > Math.abs(dx) * 0.7)            return;

    var btns = Array.from(document.querySelectorAll('.tab-btn'));
    var activeIdx = btns.findIndex(function(b) { return b.classList.contains('active'); });
    if (activeIdx === -1) return;

    var nextIdx;
    if (dx < 0) {
      // deslize esquerda → próxima aba
      nextIdx = Math.min(activeIdx + 1, btns.length - 1);
      _swipeDir = 'left';
    } else {
      // deslize direita → aba anterior
      nextIdx = Math.max(activeIdx - 1, 0);
      _swipeDir = 'right';
    }

    if (nextIdx === activeIdx) { _swipeDir = null; return; }
    btns[nextIdx].click();
  }, { passive: true });
}

var _checklistInitialized = false;
function initChecklist() {
  if (_checklistInitialized) return;
  _checklistInitialized = true;
  const pageId = document.body.dataset.page;
  const key    = pageId ? `mc_checks_${pageId}` : null;
  const saved  = key ? McStorage.get(key, {}) : {};

  function updateCheckProgress(card) {
    var all  = card.querySelectorAll('.check-item input[type=checkbox]');
    var done = card.querySelectorAll('.check-item input[type=checkbox]:checked');
    if (!all.length) return;
    var pct  = Math.round((done.length / all.length) * 100);
    var prog = card.querySelector('.check-progress');
    if (!prog) {
      prog = document.createElement('div');
      prog.className = 'check-progress';
      prog.style.cssText = 'margin-top:10px;display:flex;align-items:center;gap:8px;font-size:11px;font-weight:700;color:var(--muted);';
      var bar = document.createElement('div');
      bar.style.cssText = 'flex:1;height:4px;background:var(--border);border-radius:4px;overflow:hidden;';
      var fill = document.createElement('div');
      fill.className = 'check-progress-fill';
      fill.style.cssText = 'height:100%;background:var(--red);border-radius:4px;transition:width .3s,background .3s;width:0%;';
      bar.appendChild(fill);
      prog.appendChild(bar);
      var label = document.createElement('span');
      label.className = 'check-progress-label';
      prog.appendChild(label);
      var cardBody = card.querySelector('.card-body');
      if (cardBody) cardBody.appendChild(prog);
    }
    var fill = prog.querySelector('.check-progress-fill');
    var label = prog.querySelector('.check-progress-label');
    if (fill) { fill.style.width = pct + '%'; fill.style.background = pct === 100 ? 'var(--green, #22c55e)' : 'var(--red)'; }
    if (label) label.textContent = done.length + '/' + all.length;
    if (pct === 100 && done.length > 0) {
      prog.style.color = '#1a5c2a';
      var existing = card.querySelector('.check-complete-badge');
      if (!existing) {
        var badge = document.createElement('div');
        badge.className = 'check-complete-badge';
        badge.style.cssText = 'margin-top:8px;padding:8px 12px;background:#e8f5e9;border:1.5px solid #b2dfca;border-radius:10px;font-size:13px;font-weight:700;color:#1a5c2a;text-align:center;animation:feedbackSlide .3s ease;';
        badge.textContent = '✅ Checklist completo!';
        var cardBody = card.querySelector('.card-body');
        if (cardBody) cardBody.appendChild(badge);
        // Fire gamification trophy
        if (window.Gamificacao && pageId) window.Gamificacao.onChecklistComplete(pageId);
      }
    } else {
      var badge = card.querySelector('.check-complete-badge');
      if (badge) badge.remove();
    }
  }

  // Estado em memória — evita JSON.parse a cada tick
  var checkState = Object.assign({}, saved);
  var _saveTimer = null;
  function flushCheckState() {
    if (key) McStorage.set(key, checkState);
  }

  document.querySelectorAll(".check-item input[type=checkbox]").forEach((cb, i) => {
    if (saved[i]) { cb.checked = true; cb.closest(".check-item").classList.add("done"); }
    var card = cb.closest('.card');
    if (card) updateCheckProgress(card);
    cb.addEventListener("change", () => {
      cb.closest(".check-item").classList.toggle("done", cb.checked);
      if (cb.checked) checkState[i] = true; else delete checkState[i];
      // Debounce: agrupa escritas em uma única operação após 120ms
      if (key) {
        clearTimeout(_saveTimer);
        _saveTimer = setTimeout(flushCheckState, 120);
      }
      var card = cb.closest('.card');
      if (card) updateCheckProgress(card);
    });
  });
}

function saveQuizResult(guia, score, total) {
  _flushSRData(); // ensure SR writes are committed before quiz end
  const hist = McStorage.get('mc_quiz_history', []);
  const date = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  // csid: id estável por sessão para idempotência no Supabase (evita duplicatas)
  const csid = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : (Date.now() + '-' + Math.random().toString(36).slice(2));
  hist.unshift({ guia, score, total, date, csid });
  if (hist.length > 180) hist.splice(180);
  McStorage.set('mc_quiz_history', hist);
  // Sync imediato para quiz_sessions — o sync.js escuta este evento
  window.dispatchEvent(new CustomEvent('mc:quizComplete', { detail: { guia, score, total, csid } }));
}

function renderHistory(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const hist = McStorage.get('mc_quiz_history', []);
  if (!hist.length) {
    el.innerHTML = '<div style="text-align:center;padding:8px 0;">'
      + '<p style="color:var(--muted);font-size:13px;margin-bottom:10px;">Nenhum simulado realizado ainda.</p>'
      + '<a href="pages/quiz.html" class="btn-primary" style="display:inline-block;padding:9px 18px;text-decoration:none;font-size:13px;">Começar agora →</a>'
      + '</div>';
    return;
  }
  el.innerHTML = hist.map(h => {
    const pct   = Math.round((h.score / h.total) * 100);
    const cls   = pct >= 80 ? 'good' : pct >= 60 ? 'ok' : '';
    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📖';
    return `<div class="hist-item">
      <div class="hist-score ${cls}">${h.score}/${h.total}</div>
      <div class="hist-meta"><div class="hist-guia">${emoji} ${h.guia}</div><div class="hist-date">${h.date}</div></div>
      <div class="hist-pct">${pct}%</div>
    </div>`;
  }).join('');
}

/* ── srs.js ── */
// ── Spaced Repetition System ──────────────────────────────────

function getQuestionHash(q) {
  if (!q || !q.question) return 'unknown';
  try {
    return btoa(encodeURIComponent(q.question)).slice(0, 20);
  } catch(e) {
    return String(q.question).slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  }
}

// SR data cached in memory — avoids repeated JSON.parse/stringify per answer
var _srCache = null;
var _srDirty = false;
var _srFlushTimer = null;

function getSRData() {
  if (_srCache !== null) return _srCache;
  try {
    var sr2 = JSON.parse(localStorage.getItem('mc_sr_v2') || '{}');
    _srCache = sr2.hashData || {};
  } catch(e) { _srCache = {}; }
  return _srCache;
}

function _flushSRData() {
  if (!_srDirty || _srCache === null) return;
  try {
    var sr2 = JSON.parse(localStorage.getItem('mc_sr_v2') || '{}');
    sr2.hashData = _srCache;
    localStorage.setItem('mc_sr_v2', JSON.stringify(sr2));
    _srDirty = false;
  } catch(e) {}
}

// quality: 5=perfeito, 4=bom, 3=hesitante, 1=errado (SM-2)
function updateSRData(hash, correct, quality) {
  if (!hash || hash === 'unknown') return;
  if (quality === undefined) quality = correct ? 4 : 1;
  const data = getSRData();
  if (!data[hash]) data[hash] = { correct: 0, wrong: 0, interval: 1, ease: 2.5 };
  const entry = data[hash];
  if (!entry.ease) entry.ease = 2.5; // migra entradas antigas

  if (quality >= 3) {
    entry.correct++;
    if (entry.interval <= 1)      entry.interval = 3;
    else if (entry.interval <= 3) entry.interval = 7;
    else entry.interval = Math.min(Math.ceil(entry.interval * entry.ease), 90);
  } else {
    entry.wrong++;
    entry.interval = Math.max(1, Math.ceil(entry.interval / 2));
  }
  // Fórmula SM-2: EF = EF + 0.1 - (5-q)*(0.08+(5-q)*0.02)
  entry.ease = Math.max(1.3, entry.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  entry.nextReview = Date.now() + entry.interval * 24 * 60 * 60 * 1000;
  _srDirty = true;
  clearTimeout(_srFlushTimer);
  _srFlushTimer = setTimeout(_flushSRData, 2000);
}

function prioritizeQuestions(questions) {
  const data = getSRData();
  const now  = Date.now();
  // Pré-computa hashes uma vez — evita ~13.400 chamadas dentro do comparator
  const hashes = new Map(questions.map(q => [q, getQuestionHash(q)]));
  return [...questions].sort((a, b) => {
    const ha = hashes.get(a);
    const hb = hashes.get(b);
    const da = data[ha];
    const db = data[hb];

    if (!da && !db) return 0;
    if (!da) return -1;
    if (!db) return 1;

    const aDue = da.nextReview <= now;
    const bDue = db.nextReview <= now;
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;

    const aRatio = da.wrong / Math.max(1, da.correct + da.wrong);
    const bRatio = db.wrong / Math.max(1, db.correct + db.wrong);
    return bRatio - aRatio;
  });
}

/* ── quiz.js ── */
// ── Multiple-Choice Quiz ──────────────────────────────────────

function initQuiz(questions, guiaName) {
  const app = document.getElementById("quiz-app");
  if (!app) return;

  // ── Validação de dados ──────────────────────────────────────
  if (!Array.isArray(questions) || questions.length === 0) {
    app.innerHTML = '<div style="padding:24px;text-align:center;color:#c62828;">'
      + '<div style="font-size:32px;margin-bottom:8px;">⚠️</div>'
      + '<strong>Erro ao carregar quiz</strong><br>'
      + '<span style="font-size:13px;color:var(--muted);">Nenhuma questão encontrada. Verifique o console para detalhes.</span>'
      + '</div>';
    console.error('[MC Guias] initQuiz: array de questões vazio ou inválido para "' + guiaName + '".');
    return;
  }
  var invalidIdx = questions.findIndex(function(q) {
    return !q || typeof q.question === 'undefined' || !Array.isArray(q.options);
  });
  if (invalidIdx !== -1) {
    app.innerHTML = '<div style="padding:24px;text-align:center;color:#c62828;">'
      + '<div style="font-size:32px;margin-bottom:8px;">⚠️</div>'
      + '<strong>Erro na questão ' + (invalidIdx + 1) + '</strong><br>'
      + '<span style="font-size:13px;color:var(--muted);">Estrutura inválida detectada. Verifique o console.</span>'
      + '</div>';
    console.error('[MC Guias] initQuiz: questão inválida no índice ' + invalidIdx + ':', questions[invalidIdx]);
    return;
  }

  // Inject key badge style once
  if (!document.getElementById('mc-quiz-opt-style')) {
    var s = document.createElement('style');
    s.id = 'mc-quiz-opt-style';
    s.textContent = '.quiz-opt-key{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;background:rgba(0,0,0,0.08);font-size:11px;font-weight:900;margin-right:6px;flex-shrink:0;font-family:var(--font-display);}';
    document.head.appendChild(s);
  }

  window._quizData = questions;
  window._quizGuia = guiaName || 'Simulado';

  var oldBar = document.getElementById('quiz-mode-bar');
  // Only remove bar if it was created dynamically by JS (not hardcoded in HTML)
  // We detect this by checking if it has our data attribute
  if (oldBar && oldBar.dataset.dynamic === '1') oldBar.remove();

  // Always define setActiveMode regardless of whether bar is hardcoded or dynamic
  window.setActiveMode = function(mode) {
    var btnM = document.getElementById('btnMultiple');
    var btnF = document.getElementById('btnFlash');
    var btnL = document.getElementById('btnLacuna');
    if (!btnM || !btnF || !btnL) return;
    btnM.className = mode === 'multiple' ? 'btn-primary' : 'btn-secondary';
    btnF.className = mode === 'flash'    ? 'btn-primary' : 'btn-secondary';
    btnL.className = mode === 'lacuna'   ? 'btn-primary' : 'btn-secondary';
  };

  if (!document.getElementById('quiz-mode-bar')) {
    const bar = document.createElement('div');
    bar.id = 'quiz-mode-bar';
    bar.dataset.dynamic = '1';
    bar.style.cssText = 'display:flex;gap:8px;margin-bottom:14px;';

    var timerOptions = [10, 15, 20, 30];
    var timerDropdownHTML = '<div id="quiz-timer-wrap" style="position:relative;flex-shrink:0;">'
      + '<button class="btn-secondary" id="btnTimer" style="font-size:13px;padding:9px 12px;white-space:nowrap;" title="Selecionar tempo por pergunta">⏱️</button>'
      + '<div id="timer-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:var(--card);border:1.5px solid var(--border);border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.15);z-index:200;overflow:hidden;min-width:120px;">'
      + timerOptions.map(function(s) {
          return '<button class="timer-opt-btn" data-secs="' + s + '" style="display:block;width:100%;padding:10px 16px;text-align:left;background:none;border:none;font-size:13px;font-family:var(--font-body);font-weight:600;color:var(--text);cursor:pointer;border-bottom:1px solid var(--border);">' + s + 's por pergunta</button>';
        }).join('')
      + '<button class="timer-opt-btn" data-secs="0" style="display:block;width:100%;padding:10px 16px;text-align:left;background:none;border:none;font-size:13px;font-family:var(--font-body);font-weight:600;color:var(--muted);cursor:pointer;">⛔ Sem timer</button>'
      + '</div>'
      + '</div>';

    bar.innerHTML = '<button class="btn-primary" id="btnMultiple" style="flex:1;font-size:13px;padding:9px 0;">🎯 Múltipla escolha</button>'
                  + '<button class="btn-secondary" id="btnFlash" style="flex:1;font-size:13px;padding:9px 0;">⚡ Flashcard</button>'
                  + '<button class="btn-secondary" id="btnLacuna" style="flex:1;font-size:13px;padding:9px 0;">✏️ Lacunas</button>'
                  + '<button id="btnAutoAdv" style="flex-shrink:0;font-size:12px;padding:9px 10px;white-space:nowrap;border-radius:var(--radius-md);font-family:var(--font-display);font-weight:800;cursor:pointer;border:1.5px solid var(--border);transition:all .2s;" title="Auto-avançar após acerto">⚡ Auto</button>'
                  + '<button id="btnSound" style="flex-shrink:0;font-size:18px;padding:9px 10px;border-radius:var(--radius-md);cursor:pointer;border:1.5px solid var(--border);background:var(--card);transition:all .2s;" title="Som de acerto/erro"></button>'
                  + '<button id="btnStats" style="flex-shrink:0;font-size:18px;padding:9px 10px;border-radius:var(--radius-md);cursor:pointer;border:1.5px solid var(--border);background:var(--card);transition:all .2s;" title="Estatísticas">📊</button>'
                  + timerDropdownHTML;
    app.parentNode.insertBefore(bar, app);

    // Cache refs — elements just inserted above
    var _btnTimerEl  = document.getElementById('btnTimer');
    var _timerDdEl   = document.getElementById('timer-dropdown');
    var _timerOptBtns = document.querySelectorAll('.timer-opt-btn');

    window._quizActiveMode = 'multiple';

    document.getElementById('btnMultiple').addEventListener('click', function() {
      setActiveMode('multiple');
      initQuiz(window._quizData, window._quizGuia);
    });
    document.getElementById('btnFlash').addEventListener('click', function() {
      setActiveMode('flash');
      initFlashcard(window._quizData, window._quizGuia);
    });
    document.getElementById('btnLacuna').addEventListener('click', function() {
      setActiveMode('lacuna');
      initLacuna(window._quizData, window._quizGuia);
    });

    _btnTimerEl.addEventListener('click', function(e) {
      e.stopPropagation();
      _timerDdEl.style.display = _timerDdEl.style.display === 'none' ? 'block' : 'none';

      _timerOptBtns.forEach(function(b) {
        var s = parseInt(b.dataset.secs, 10);
        b.style.background = (window._quizTimerEnabled && s === window._quizTimerSecs) || (!window._quizTimerEnabled && s === 0)
          ? 'var(--bg)' : '';
        b.style.color = (window._quizTimerEnabled && s === window._quizTimerSecs) || (!window._quizTimerEnabled && s === 0)
          ? 'var(--red)' : 'var(--text)';
      });
    });

    _timerOptBtns.forEach(function(b) {
      b.addEventListener('click', function(e) {
        e.stopPropagation();
        var secs = parseInt(b.dataset.secs, 10);
        if (secs === 0) {
          window._quizTimerEnabled = false;
          _btnTimerEl.className   = 'btn-secondary';
          _btnTimerEl.textContent = '⏱️';
        } else {
          window._quizTimerEnabled = true;
          window._quizTimerSecs    = secs;
          _btnTimerEl.className   = 'btn-primary';
          _btnTimerEl.textContent = '⏱️ ' + secs + 's';
        }
        _timerDdEl.style.display = 'none';
      });
    });

    document.addEventListener('click', function() {
      _timerDdEl.style.display = 'none';
    });

    // Auto-advance toggle
    function syncAutoBtn() {
      var btn = document.getElementById('btnAutoAdv');
      if (!btn) return;
      if (window._quizAutoAdvance) {
        btn.style.background = 'var(--accent, #da291c)';
        btn.style.color = '#fff';
        btn.style.borderColor = 'var(--accent, #da291c)';
        btn.textContent = '⚡ Auto ON';
      } else {
        btn.style.background = 'var(--card)';
        btn.style.color = 'var(--muted)';
        btn.style.borderColor = 'var(--border)';
        btn.textContent = '⚡ Auto OFF';
      }
    }
    if (typeof window._quizAutoAdvance === 'undefined') window._quizAutoAdvance = true;
    syncAutoBtn();
    document.getElementById('btnAutoAdv').addEventListener('click', function() {
      window._quizAutoAdvance = !window._quizAutoAdvance;
      syncAutoBtn();
    });

    // Sound toggle
    function syncSoundBtn() {
      var btn = document.getElementById('btnSound');
      if (!btn) return;
      var off = McStorage.get('mc_sound_off', null) === '1';
      btn.textContent = off ? '🔇' : '🔊';
      btn.style.opacity = off ? '0.5' : '1';
    }
    syncSoundBtn();
    document.getElementById('btnSound').addEventListener('click', function() {
      var off = McStorage.get('mc_sound_off', null) === '1';
      McStorage.set('mc_sound_off', off ? '0' : '1');
      syncSoundBtn();
      if (off) mcPlaySound('correct'); // preview
    });

    // Stats button — show stats overlay
    document.getElementById('btnStats').addEventListener('click', function() {
      var existing = document.getElementById('stats-overlay');
      if (existing) { existing.remove(); return; }
      var overlay = document.createElement('div');
      overlay.id = 'stats-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:400;display:flex;align-items:flex-end;justify-content:center;animation:obFadeIn .2s ease;';
      overlay.innerHTML = '<div style="background:var(--card);border-radius:20px 20px 0 0;width:100%;max-width:780px;max-height:82vh;overflow-y:auto;padding:20px 18px 32px;box-shadow:0 -8px 40px rgba(0,0,0,0.2);animation:obSlideUp .25s cubic-bezier(0.22,1,.36,1);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">'
        +   '<div style="font-family:var(--font-display);font-size:16px;font-weight:900;">📊 Minhas Estatísticas</div>'
        +   '<button onclick="document.getElementById(\'stats-overlay\').remove()" style="background:var(--bg);border:1.5px solid var(--border);border-radius:50%;width:30px;height:30px;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text);">✕</button>'
        + '</div>'
        + '<div id="stats-content"></div>'
        + '</div>';
      overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
      document.body.appendChild(overlay);
      renderStats('stats-content');
    });
  }
  if (typeof window._quizTimerEnabled === 'undefined') window._quizTimerEnabled = false;
  if (typeof window._quizTimerSecs    === 'undefined') window._quizTimerSecs    = 20;
  if (typeof window._quizAutoAdvance  === 'undefined') window._quizAutoAdvance  = true;

  // Limpa timers de sessão anterior para evitar avanço duplo ao trocar de modo
  if (window._quizTimerInterval) { clearInterval(window._quizTimerInterval); window._quizTimerInterval = null; }
  if (window._autoAdvanceTimer)  { clearTimeout(window._autoAdvanceTimer);   window._autoAdvanceTimer  = null; }

  var pool          = prioritizeQuestions(questions);
  var current       = 0;
  var score         = 0;
  var streak        = 0;
  var bestStreak    = 0;
  var answered      = false;
  var _wrongAnswers = [];
  var _sessionStart = Date.now();
  var _qStart       = Date.now();
  var _resultShown  = false;

  function render() {
    if (current >= pool.length) { showResult(); return; }
    var q    = pool[current];
    var opts = shuffle(q.options.slice());
    var pct  = Math.round((current / pool.length) * 100);
    answered = false;
    _qStart  = Date.now();

    var timerSVG = window._quizTimerEnabled
      ? '<div style="position:relative;display:flex;justify-content:center;margin-bottom:-4px;"><svg width="56" height="56" viewBox="0 0 32 32" style="transform:rotate(-90deg);"><circle cx="16" cy="16" r="14" fill="none" stroke="var(--border)" stroke-width="3"/><circle id="quiz-timer-arc" cx="16" cy="16" r="14" fill="none" stroke="var(--red)" stroke-width="3" stroke-dasharray="88" stroke-dashoffset="0" style="transition:stroke-dashoffset .9s linear,stroke .3s;"/></svg><div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:56px;height:56px;display:flex;align-items:center;justify-content:center;"><span id="quiz-timer-num" style="font-family:var(--font-display);font-size:15px;font-weight:800;color:var(--text);"></span></div></div>'
      : '';

    app.innerHTML = '<div style="display:flex;flex-direction:column;gap:14px;">' + timerSVG
      + '<div>'
      +   '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="transform:scaleX(' + (pct/100) + ')"></div></div>'
      +   '<div style="display:flex;justify-content:space-between;margin-top:4px;">'
      +     '<span class="quiz-counter">Pergunta ' + (current + 1) + ' de ' + pool.length + '</span>'
      +     '<span class="quiz-counter">✅ ' + score + ' corretas' + (streak >= 3 ? ' &nbsp;' + (streak >= 10 ? '🏆' : streak >= 5 ? '⚡' : '🔥') + ' ' + streak : '') + '</span>'
      +   '</div>'
      + '</div>'
      + '<div class="quiz-question-card">'
      +   '<div class="quiz-category">' + esc(q.category || '') + '</div>'
      +   '<div class="quiz-question">' + esc(q.question) + '</div>'
      +   '<div class="quiz-options" id="quiz-options">'
      +     opts.map(function(o, oi) {
              return '<button class="quiz-option" onclick="handleQuizOption('+oi+')" data-correct="'+(o===q.answer)+'" data-idx="'+oi+'">'
                + '<span class="quiz-opt-key">' + String.fromCharCode(65+oi) + '</span> ' + esc(o)
                + '</button>';
            }).join('')
      +   '</div>'
      + '</div>'
      + '<div class="quiz-feedback" id="quiz-feedback" aria-live="polite" role="status"></div>'
      + '<div class="quiz-nav">'
      +   '<button class="btn-secondary" onclick="if(window.setActiveMode)window.setActiveMode(\'multiple\');initQuiz(window._quizData,window._quizGuia)">🔀 Reiniciar</button>'
      +   '<button class="btn-primary" id="btn-next" style="display:none;" onclick="nextQuestion()">'
      +     (current + 1 < pool.length ? "Próxima →" : "Ver Resultado →")
      +   '</button>'
      + '</div>'
      + '</div>';

    // Animate options in staggered
    setTimeout(function() {
      document.querySelectorAll('.quiz-option').forEach(function(b, i) {
        b.style.opacity = '0';
        b.style.transform = 'translateY(8px)';
        setTimeout(function() {
          b.style.transition = 'opacity .2s ease, transform .2s ease';
          b.style.opacity = '1';
          b.style.transform = 'translateY(0)';
        }, i * 60);
      });
    }, 10);

    window._currentQ = q;

    // Preload remaining question JSON packs during idle on first question
    if (current === 0 && guiaName && typeof QuestionLoader !== 'undefined' && QuestionLoader.preloadGuide) {
      var _ric2 = typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : function(fn) { setTimeout(fn, 300); };
      _ric2(function() { QuestionLoader.preloadGuide(guiaName); });
    }

    if (window._quizTimerEnabled) {
      if (window._quizTimerInterval) clearInterval(window._quizTimerInterval);
      var remaining = window._quizTimerSecs;
      var arc = null;
      var num = null;
      var totalDash = 88;
      function updateTimerUI() {
        arc = arc || document.getElementById('quiz-timer-arc');
        num = num || document.getElementById('quiz-timer-num');
        if (!arc || !num) return;
        var pctLeft = remaining / window._quizTimerSecs;
        arc.style.strokeDashoffset = String(totalDash * (1 - pctLeft));
        arc.style.stroke = remaining <= 5 ? '#e53935' : remaining <= 10 ? '#f57f17' : 'var(--red)';
        num.textContent = remaining;
        num.style.color = remaining <= 5 ? '#e53935' : 'var(--text)';
      }
      updateTimerUI();
      window._quizTimerInterval = setInterval(function() {
        remaining--;
        updateTimerUI();
        if (remaining <= 0) {
          clearInterval(window._quizTimerInterval);

          if (!answered) {
            var allBtns = document.querySelectorAll('.quiz-option');

            allBtns.forEach(function(b) {
              b.disabled = true;
              if (b.dataset.correct === 'true') b.classList.add('correct');
            });
            var fb = document.getElementById('quiz-feedback');
            fb.className = 'quiz-feedback show wrong';
            fb.innerHTML = '⏱️ <strong>Tempo esgotado!</strong> ' + esc(q.explanation || '');
            answered = true;
            _wrongAnswers.push({ question: q.question, answer: q.answer, userAnswer: null, explanation: q.explanation, category: q.category });
            updateSRData(getQuestionHash(q), false, 1);
            var nb = document.getElementById('btn-next');
            if (nb) nb.style.display = 'inline-flex';
          }
        }
      }, 1000);
    }

    window.handleQuizOption = function(optIndex) {
      var btns = document.querySelectorAll('.quiz-option');
      var btn  = btns[optIndex];
      if (btn) handleAnswer(btn, q.answer, q.explanation, q);
    };

    if (window._quizKeyHandler) document.removeEventListener('keydown', window._quizKeyHandler);
    window._quizKeyHandler = function(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var key = e.key.toUpperCase();
      if (!answered) {
        var idx = ['A','B','C','D'].indexOf(key);
        if (idx !== -1) {
          var btns = document.querySelectorAll('.quiz-option');
          if (btns[idx]) { btns[idx].click(); }
        }
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        var nb = document.getElementById('btn-next');
        if (nb && nb.style.display !== 'none') nb.click();
      }
    };
    document.addEventListener('keydown', window._quizKeyHandler);
  }

  function showStreakToast(streakCount) {
    var existing = document.getElementById('streak-toast');
    if (existing) existing.remove();
    var milestones = { 3: '🔥 3 seguidas!', 5: '⚡ 5 seguidas!', 10: '🏆 10 seguidas!', 15: '🌟 15 seguidas!', 20: '🚀 20 seguidas!' };
    var msg = milestones[streakCount];
    if (!msg) return;
    var toast = document.createElement('div');
    toast.id = 'streak-toast';
    toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0.5);z-index:9999;background:linear-gradient(135deg,#da291c,#ff6b35);color:#fff;padding:18px 32px;border-radius:20px;font-family:var(--font-display);font-size:28px;font-weight:900;text-align:center;box-shadow:0 8px 40px rgba(218,41,28,0.5);pointer-events:none;opacity:0;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translate(-50%,-50%) scale(1)';
    });
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%,-60%) scale(0.8)';
      setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
    }, 1200);
  }

  function startAutoAdvanceCountdown() {
    var nb = document.getElementById('btn-next');
    if (!nb) return;
    var duration = 1500;
    var fb = document.getElementById('quiz-feedback');
    var bar = document.createElement('div');
    bar.id = 'auto-countdown-bar';
    bar.style.cssText = 'height:3px;background:rgba(255,255,255,0.3);border-radius:2px;margin-top:10px;overflow:hidden;';
    var fill = document.createElement('div');
    fill.style.cssText = 'height:100%;background:rgba(255,255,255,0.8);width:100%;transition:width ' + duration + 'ms linear;border-radius:2px;';
    bar.appendChild(fill);
    if (fb) fb.appendChild(bar);
    requestAnimationFrame(function() { fill.style.width = '0%'; });

    window._autoAdvanceTimer = setTimeout(function() {
      if (answered && current < pool.length) {
        current++;
        render();
      }
    }, duration);
  }

  function handleAnswer(btn, correct, explanation, q) {
    if (answered) return;
    if (window._quizTimerInterval) { clearInterval(window._quizTimerInterval); window._quizTimerInterval = null; }
    answered = true;
    var elapsed = Date.now() - _qStart;
    var isCorrect = btn.dataset.correct === "true";
    trackAnswer(q.id || getQuestionHash(q), isCorrect, elapsed, q.question);
    if (isCorrect) {
      score++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
      _wrongAnswers.push({ question: q.question, answer: q.answer, userAnswer: btn.textContent, explanation: q.explanation, category: q.category });
    }

    var _timerSecs = window._quizTimerEnabled ? window._quizTimerSecs : null;
    var _srQuality;
    if (!isCorrect) _srQuality = 1;
    else if (_timerSecs && elapsed < _timerSecs * 300) _srQuality = 5;
    else if (_timerSecs && elapsed < _timerSecs * 700) _srQuality = 4;
    else _srQuality = 3;
    updateSRData(getQuestionHash(q), isCorrect, _srQuality);
    mcPlaySound(isCorrect ? 'correct' : 'wrong');
    document.querySelectorAll(".quiz-option").forEach(function(b) {
      b.disabled = true;
      if (b.dataset.correct === "true") b.classList.add("correct");
      else if (b === btn && !isCorrect) b.classList.add("wrong");
    });
    var fb = document.getElementById("quiz-feedback");
    fb.className = "quiz-feedback show " + (isCorrect ? "correct" : "wrong");

    var streakEmoji = streak >= 10 ? '🏆' : streak >= 5 ? '⚡' : '🔥';
    var streakBadge = (isCorrect && streak >= 3)
      ? ' <span style="display:inline-block;background:rgba(255,255,255,0.25);border-radius:8px;padding:2px 9px;font-size:13px;font-weight:800;margin-left:6px;">' + streakEmoji + ' ' + streak + ' seguidas!</span>'
      : '';

    fb.innerHTML = isCorrect
      ? "✅ <strong>Correto!</strong>" + streakBadge + "<br><span style='font-size:13px;opacity:.9;'>" + esc(explanation || "") + "</span>"
      : "❌ <strong>Incorreto.</strong> A resposta certa é: <strong>" + esc(correct) + "</strong>.<br><span style='font-size:13px;opacity:.9;'>" + esc(explanation || "") + "</span>";

    var nb = document.getElementById("btn-next");
    if (nb) nb.style.display = "inline-flex";

    if (isCorrect && [3, 5, 10, 15, 20].indexOf(streak) !== -1) {
      showStreakToast(streak);
      mcPlaySound('streak');
    }

    if (isCorrect && window._quizAutoAdvance !== false) {
      startAutoAdvanceCountdown();
    }
  }

  window.nextQuestion = function() {
    var nb = document.getElementById('btn-next');
    if (nb) { nb.disabled = true; nb.style.opacity = '0.5'; nb.style.pointerEvents = 'none'; }
    if (window._autoAdvanceTimer) { clearTimeout(window._autoAdvanceTimer); window._autoAdvanceTimer = null; }
    if (window._quizKeyHandler) { document.removeEventListener('keydown', window._quizKeyHandler); window._quizKeyHandler = null; }
    current++;
    render();
  };

  function showResult() {
    if (_resultShown) return;
    _resultShown = true;
    var pct  = Math.round((score / pool.length) * 100);
    var msg  = pct >= 80 ? "🎉 Excelente!" : pct >= 60 ? "👍 Bom trabalho!" : "📚 Continue estudando!";
    var elapsed = Math.round((Date.now() - _sessionStart) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var timeStr = mins > 0 ? mins + 'min ' + secs + 's' : secs + 's';
    var avgSec = pool.length > 0 ? Math.round(elapsed / pool.length) : 0;
    if (window._quizKeyHandler) { document.removeEventListener('keydown', window._quizKeyHandler); window._quizKeyHandler = null; }
    saveQuizResult(guiaName || window._quizGuia || "Simulado", score, pool.length);
    if (window.Gamificacao) {
      window.Gamificacao.onQuizComplete({
        guide:       (guiaName || window._quizGuia || 'simulado').toLowerCase(),
        score:       score,
        total:       pool.length,
        pct:         Math.round((score / pool.length) * 100),
        hour:        new Date().getHours(),
        maxStreak:   bestStreak || 0,
        fastAnswers: 0,
        mode:        'mc',
      });
    }
    var homeLink   = isRoot ? "../index.html" : "index.html";
    var isQuizPage = window.location.pathname.indexOf("quiz.html") !== -1;
    window.backToSetup = function() {
      document.getElementById("quiz-setup").style.display = "block";
      document.getElementById("quiz-app").style.display   = "none";
      var ob = document.getElementById("quiz-mode-bar");
      if (ob && ob.dataset.dynamic === '1') ob.remove();
    };
    var extraBtn = isQuizPage
      ? '<button class="btn-secondary" onclick="backToSetup()">📚 Escolher Guia</button>'
      : '<a href="' + homeLink + '" class="btn-secondary">🏠 Início</a>';

    var errorsHTML = '';
    if (_wrongAnswers.length > 0) {
      var errorItems = _wrongAnswers.map(function(w) {
        return '<div style="background:var(--bg);border:1.5px solid #fecaca;border-radius:var(--radius-md);padding:11px 13px;">'          + '<div style="font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.5px;margin-bottom:4px;text-transform:uppercase;">' + esc(w.category || '') + '</div>'          + '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;line-height:1.4;">' + esc(w.question) + '</div>'          + '<div style="display:flex;flex-direction:column;gap:4px;">'          + '<div style="font-size:12px;padding:6px 10px;border-radius:8px;background:#ffebee;color:#c62828;">'          + '❌ Sua resposta: <strong>' + esc(w.userAnswer || 'Tempo esgotado') + '</strong></div>'          + '<div style="font-size:12px;padding:6px 10px;border-radius:8px;background:#e8f5e9;color:#2e7d32;">'          + '✅ Correto: <strong>' + esc(w.answer) + '</strong></div>'          + (w.explanation ? '<div style="font-size:11px;color:var(--muted);margin-top:3px;line-height:1.4;">' + esc(w.explanation) + '</div>' : '')          + '</div></div>';
      }).join('');
      errorsHTML = '<div style="margin-top:16px;text-align:left;">'        + '<button id="err-toggle-btn" onclick="toggleErrorReview()" style="width:100%;padding:11px 14px;background:var(--bg);border:1.5px solid #fecaca;border-radius:var(--radius-md);font-family:var(--font-display);font-size:13px;font-weight:800;color:#c62828;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">'        + '<span>❌ Revisar ' + _wrongAnswers.length + ' erro' + (_wrongAnswers.length > 1 ? 's' : '') + '</span><span id="err-arrow">▼</span></button>'        + '<div id="error-review" style="display:none;margin-top:8px;flex-direction:column;gap:8px;">'        + errorItems        + '</div></div>';
    }

    var ringColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : 'var(--red)';
    var ringDash   = 188; // 2*PI*30
    var ringFill   = Math.round((pct / 100) * ringDash);
    var ringHTML = '<div class="quiz-result-ring">'
      + '<svg width="80" height="80" viewBox="0 0 80 80">'
      + '<circle cx="40" cy="40" r="30" fill="none" stroke="var(--border)" stroke-width="6"/>'
      + '<circle cx="40" cy="40" r="30" fill="none" stroke="' + ringColor + '" stroke-width="6"'
      + ' stroke-dasharray="' + ringDash + '" stroke-dashoffset="' + ringDash + '"'
      + ' style="transition:stroke-dashoffset 1s cubic-bezier(0.34,1,0.64,1) .3s;" id="result-ring-arc"/>'
      + '</svg>'
      + '<div class="quiz-result-ring-num" style="color:' + ringColor + ';">' + pct + '%</div>'
      + '</div>';

    // ── Próximo Passo: SR due + weakest guide ──────────────────
    var nextStepHTML = '';
    try {
      var _sr2 = JSON.parse(localStorage.getItem('mc_sr_v2') || '{}');
      var _dueCount = Object.values(_sr2.hashData || {}).filter(function(e) {
        return e.nextReview && e.nextReview <= Date.now();
      }).length;
      var _hist = JSON.parse(localStorage.getItem('mc_quiz_history') || '[]');
      var _guideMap = {};
      _hist.forEach(function(h) {
        if (!h.guia) return;
        var k = h.guia.replace(' ✏️','');
        if (!_guideMap[k]) _guideMap[k] = { total: 0, sum: 0 };
        _guideMap[k].total += h.total || 0;
        _guideMap[k].sum   += h.score || 0;
      });
      var _weakest = null, _weakestPct = 101;
      Object.keys(_guideMap).forEach(function(k) {
        var g = _guideMap[k];
        if (g.total >= 5) {
          var p = Math.round((g.sum / g.total) * 100);
          if (p < _weakestPct) { _weakestPct = p; _weakest = k; }
        }
      });
      var _tips = [];
      if (_dueCount > 0) _tips.push('📅 <strong>' + _dueCount + ' questão' + (_dueCount !== 1 ? 'ões' : '') + '</strong> de revisão espaçada pronta' + (_dueCount !== 1 ? 's' : '') + ' para hoje.');
      if (_weakest) _tips.push('📉 Seu ponto mais fraco: <strong>' + esc(_weakest) + '</strong> (' + _weakestPct + '%) — pratique mais este guia.');
      if (_tips.length > 0) {
        nextStepHTML = '<div style="margin-top:16px;background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius-md);padding:12px 14px;text-align:left;">'
          + '<div style="font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">🎯 Próximo passo</div>'
          + _tips.map(function(t) { return '<div style="font-size:13px;color:var(--text);line-height:1.5;margin-bottom:4px;">' + t + '</div>'; }).join('')
          + '</div>';
      }
    } catch(e) {}

    app.innerHTML = '<div class="quiz-result-card">'
      + ringHTML
      + '<div class="quiz-score">' + score + '/' + pool.length + '</div>'
      + '<div class="quiz-score-label">' + msg + '</div>'
      + '<div style="display:flex;gap:10px;justify-content:center;margin:12px 0;flex-wrap:wrap;">'
      +   (bestStreak >= 3 ? '<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;color:var(--text);">'+(bestStreak>=10?'🏆':bestStreak>=5?'⚡':'🔥')+' Melhor sequência: '+bestStreak+'</div>' : '')
      +   '<div style="background:var(--bg);border:1.5px solid var(--border);border-radius:10px;padding:8px 14px;font-size:12px;font-weight:700;color:var(--text);">⏱️ '+timeStr+' · ~'+avgSec+'s/pergunta</div>'
      + '</div>'
      + '<div style="margin-top:8px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">'
      +   '<button class="btn-primary" onclick="if(window.setActiveMode)window.setActiveMode(\'multiple\');initQuiz(window._quizData,window._quizGuia)">🔀 Tentar Novamente</button>'
      +   extraBtn
      + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px;">'
      + '<button class="btn-share" onclick="shareQuizResult(' + score + ',' + pool.length + ',window._quizGuia)">📤 Compartilhar resultado</button>'
      + (pct >= 70 ? '<button class="btn-share" onclick="gerarCertificado(' + score + ',' + pool.length + ',window._quizGuia)" style="background:linear-gradient(135deg,#FFC72C,#e6a800);color:#1a1a1a;border-color:#FFC72C;">🎓 Baixar Certificado</button>' : '')
      + '</div>'
      + nextStepHTML
      + errorsHTML
      + '<div id="hist-inline" style="margin-top:20px;display:flex;flex-direction:column;gap:8px;text-align:left;"></div>'
      + '</div>';

    // Animate progress ring
    setTimeout(function() {
      var arc = document.getElementById('result-ring-arc');
      if (arc) {
        var dash = parseInt(arc.getAttribute('stroke-dasharray'), 10);
        var fill = Math.round((pct / 100) * dash);
        arc.style.strokeDashoffset = String(dash - fill);
      }
    }, 80);

    window.toggleErrorReview = function() {
      var el  = document.getElementById('error-review');
      var arr = document.getElementById('err-arrow');
      if (!el) return;
      var open = el.style.display !== 'none';
      el.style.display = open ? 'none' : 'flex';
      if (arr) arr.textContent = open ? '▼' : '▲';
    };

    var _srForReview = getSRData();
    var _errorPool = pool.filter(function(q) {
      var h = getQuestionHash(q);
      var d = _srForReview[h];
      return d && d.wrong > 0;
    });
    if (_errorPool.length > 0) {
      var reviewBtn = document.createElement('button');
      reviewBtn.className = 'btn-secondary';
      reviewBtn.style.cssText = 'margin-top:10px;width:100%;';
      reviewBtn.innerHTML = '❌ Revisar só os erros (' + _errorPool.length + ' questão' + (_errorPool.length > 1 ? 'ões' : '') + ')';
      reviewBtn.onclick = function() { window.initReviewErrors(); };
      var resultCard = app.querySelector('.quiz-result-card');
      if (resultCard) resultCard.appendChild(reviewBtn);
    }
    // Defer history render — not needed for first paint
    var _ric = typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : function(fn) { setTimeout(fn, 200); };
    _ric(function() { renderHistory('hist-inline'); });
  }

  window.initReviewErrors = function() {
    var srData = getSRData();
    var errorPool = (window._quizData || []).filter(function(q) {
      var h = getQuestionHash(q);
      var d = srData[h];
      return d && d.wrong > 0;
    }).sort(function(a, b) {
      var ha = getQuestionHash(a), hb = getQuestionHash(b);
      var da = srData[ha] || {}, db = srData[hb] || {};
      var ra = (da.wrong || 0) / ((da.correct || 0) + (da.wrong || 0) + 1);
      var rb = (db.wrong || 0) / ((db.correct || 0) + (db.wrong || 0) + 1);
      return rb - ra;
    });
    if (!errorPool.length) { mcShowToast('Nenhum erro registrado ainda!', false); return; }
    if (window.setActiveMode) window.setActiveMode('multiple');
    initQuiz(errorPool, (window._quizGuia || 'Simulado') + ' — Revisão de Erros');
  };

  render();
}

/* ── flashcard.js ── */
// ── Flashcard Mode · shuffle ──────────────────────────────────

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initFlashcard(questions, guiaName) {
  const app = document.getElementById("quiz-app");
  if (!app) return;
  if (!Array.isArray(questions) || questions.length === 0) {
    app.innerHTML = '<p style="padding:24px;text-align:center;color:var(--muted);">Nenhuma questão disponível.</p>';
    return;
  }
  const pool = shuffle([...questions]);
  let current = 0;
  let knew = 0;
  let didntKnow = 0;
  let _qStart = Date.now();

  function render() {
    _qStart = Date.now();
    if (current >= pool.length) {
      const isRoot = window.location.pathname.includes('/pages/') ? '../index.html' : 'index.html';
      const pct = pool.length > 0 ? Math.round((knew / pool.length) * 100) : 0;
      const medal = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📖';
      app.innerHTML = `<div class="quiz-result-card">
        <div style="font-size:48px;margin-bottom:10px;">${medal}</div>
        <div class="quiz-score">${knew}/${pool.length}</div>
        <div class="quiz-score-label" style="font-size:18px;font-weight:700;">${pct >= 80 ? 'Ótimo domínio!' : pct >= 60 ? 'Bom progresso!' : 'Continue praticando!'}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:6px;">✅ Sabia: ${knew} &nbsp;|&nbsp; ❌ Não sabia: ${didntKnow}</div>
        <div style="margin-top:20px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
          <button class="btn-primary" onclick="if(window.setActiveMode)window.setActiveMode('flash');initFlashcard(window._quizData,window._quizGuia)">🔀 Repetir</button>
          <a href="${isRoot}" class="btn-secondary">🏠 Início</a>
        </div>
      </div>`;
      return;
    }
    const q   = pool[current];
    const pct = Math.round((current / pool.length) * 100);
    app.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="transform:scaleX(${pct/100})"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span class="quiz-counter">Cartão ${current + 1} de ${pool.length}</span>
          <span class="quiz-counter">✅ ${knew} sabia · ❌ ${didntKnow} não</span>
        </div>
      </div>
      <div class="flashcard" id="fc" onclick="revealCard()">
        <div class="flashcard-hint">PERGUNTA — toque para ver a resposta</div>
        <div class="flashcard-q">${esc(q.question)}</div>
        <div class="flashcard-a">✅ ${esc(q.answer)}${q.explanation ? '<br><span style="font-size:12px;color:var(--muted);margin-top:6px;display:block;">' + esc(q.explanation) + '</span>' : ''}</div>
      </div>
      <div class="flashcard-nav" id="fc-nav" style="display:none;">
        <button class="btn-wrong" onclick="rateCard(false)" style="flex:1;padding:12px;font-size:14px;font-weight:800;background:#ffebee;color:#c62828;border:1.5px solid #fecaca;border-radius:var(--radius-md);cursor:pointer;">❌ Não sabia</button>
        <button class="btn-correct" onclick="rateCard(true)" style="flex:1;padding:12px;font-size:14px;font-weight:800;background:#e8f5e9;color:#2e7d32;border:1.5px solid #b2dfca;border-radius:var(--radius-md);cursor:pointer;">✅ Sabia!</button>
      </div>
      <p style="text-align:center;font-size:11px;color:var(--muted);">Categoria: ${esc(q.category)}</p>
    </div>`;
  }
  window.revealCard = () => {
    document.getElementById('fc').classList.add('revealed');
    document.getElementById('fc-nav').style.display = 'flex';
    if (window.Gamificacao) window.Gamificacao.onFlashcard();
  };
  window.rateCard = (didKnow) => {
    var elapsed = Date.now() - _qStart;
    if (didKnow) knew++; else didntKnow++;
    var q = pool[current];
    trackAnswer(q.id || getQuestionHash(q), didKnow, elapsed, q.question);
    var fcQuality = !didKnow ? 1 : elapsed < 5000 ? 5 : elapsed < 15000 ? 4 : 3;
    updateSRData(getQuestionHash(q), didKnow, fcQuality);
    current++;
    render();
  };
  window._quizData = questions;
  window._quizGuia = guiaName || 'Flashcard';
  render();
}

/* ── utils.js ── */
// ── Certificado · Compartilhar · Clipboard · Toast ────────────

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Certificado de Conclusão ────────────────────────────────────────────────
window.gerarCertificado = function(score, total, guia) {
  var pct  = total > 0 ? Math.round((score / total) * 100) : 0;
  var guiaNome = (guia || window._quizGuia || 'Treinamento').replace(/_/g, ' ');
  var perfil   = McStorage.get('mc_perfil_dados', {});
  var userName = McStorage.get('mc_username', null) || perfil.apelido || perfil.nome || 'Colaborador';
  var loja     = perfil.loja || perfil.sigla || '';
  var dataStr  = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  var W = 900, H = 620;
  var cv = document.createElement('canvas');
  cv.width  = W * 2; // retina
  cv.height = H * 2;
  cv.style.width  = W + 'px';
  cv.style.height = H + 'px';
  var c = cv.getContext('2d');
  c.scale(2, 2);

  // Fundo branco
  c.fillStyle = '#FFFFFF';
  c.fillRect(0, 0, W, H);

  // Moldura dourada externa
  c.strokeStyle = '#FFC72C';
  c.lineWidth = 6;
  c.strokeRect(14, 14, W - 28, H - 28);
  // Moldura interna fina
  c.lineWidth = 1.5;
  c.strokeRect(22, 22, W - 44, H - 44);

  // Barra vermelha superior
  c.fillStyle = '#DA291C';
  c.fillRect(14, 14, W - 28, 76);

  // Título na barra
  c.fillStyle = '#FFFFFF';
  c.font = 'bold 13px system-ui, sans-serif';
  c.letterSpacing = '3px';
  c.textAlign = 'center';
  c.fillText('MC TREINAMENTOS', W / 2, 44);
  c.font = 'bold 22px system-ui, sans-serif';
  c.letterSpacing = '1px';
  c.fillText('CERTIFICADO DE CONCLUSÃO', W / 2, 72);
  c.letterSpacing = '0px';

  // Ornamento dourado
  c.fillStyle = '#FFC72C';
  c.font = 'bold 28px serif';
  c.fillText('✦  ✦  ✦', W / 2, 130);

  // Texto introdutório
  c.fillStyle = '#777';
  c.font = 'italic 15px Georgia, serif';
  c.fillText('Certificamos que', W / 2, 168);

  // Nome do usuário
  c.fillStyle = '#1a1a1a';
  c.font = 'bold 34px system-ui, sans-serif';
  c.fillText(userName, W / 2, 218);

  // Linha dourada abaixo do nome
  var nameW = Math.min(c.measureText(userName).width + 60, W - 100);
  c.strokeStyle = '#FFC72C';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo((W - nameW) / 2, 228);
  c.lineTo((W + nameW) / 2, 228);
  c.stroke();

  // Texto do guia
  c.fillStyle = '#555';
  c.font = 'italic 15px Georgia, serif';
  c.fillText('concluiu com êxito o guia de treinamento', W / 2, 268);

  c.fillStyle = '#DA291C';
  c.font = 'bold 26px system-ui, sans-serif';
  c.fillText(guiaNome, W / 2, 308);

  // Badge de aproveitamento
  var badgeX = W / 2, badgeY = 375, badgeR = 52;
  c.beginPath();
  c.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
  c.fillStyle = pct >= 90 ? '#15803d' : pct >= 70 ? '#1d4ed8' : '#92400e';
  c.fill();
  c.strokeStyle = '#FFC72C';
  c.lineWidth = 3;
  c.stroke();
  c.fillStyle = '#FFFFFF';
  c.font = 'bold 28px system-ui, sans-serif';
  c.fillText(pct + '%', badgeX, badgeY + 5);
  c.font = '11px system-ui, sans-serif';
  c.fillText(score + '/' + total + ' acertos', badgeX, badgeY + 22);

  // Linha separadora
  c.strokeStyle = '#FFC72C';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(60, 450);
  c.lineTo(W - 60, 450);
  c.stroke();

  // Rodapé
  c.fillStyle = '#999';
  c.font = '12px system-ui, sans-serif';
  c.textAlign = 'left';
  c.fillText(loja ? 'Loja: ' + loja : '', 60, 478);
  c.textAlign = 'right';
  c.fillText(dataStr, W - 60, 478);
  c.textAlign = 'center';
  c.font = '10px system-ui, sans-serif';
  c.fillText('Documento gerado automaticamente · MC Guias de Treinamento', W / 2, 510);

  // Download
  cv.toBlob(function(blob) {
    var url  = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href     = url;
    link.download = 'certificado-' + guiaNome.toLowerCase().replace(/\s+/g, '-') + '.png';
    link.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
  }, 'image/png');
};

window.shareQuizResult = function(score, total, guia) {
  var g = guia || window._quizGuia || 'Simulado';
  var pct;
  if (total && typeof score === 'number') {
    pct = Math.round((score / total) * 100);
  } else {
    pct = parseInt(score, 10) || 0;
    total = null;
  }
  var medal  = pct >= 90 ? '🏆' : pct >= 80 ? '⭐' : pct >= 60 ? '👍' : '📖';
  var nivel  = pct >= 90 ? 'Excelente!' : pct >= 80 ? 'Muito bom!' : pct >= 60 ? 'Bom trabalho!' : 'Continue estudando!';
  var bars   = '';
  var filled = Math.round(pct / 10);
  for (var i = 0; i < 10; i++) bars += (i < filled ? '🟩' : '⬜');
  var guiaLabel  = g.replace(/\s*✏️\s*$/, '').trim();
  var scoreStr   = total ? (score + '/' + total + ' (' + pct + '%)') : (pct + '%');
  var text = medal + ' ' + nivel + '\n'
           + '📋 Guia: ' + guiaLabel + '\n'
           + '✅ ' + scoreStr + '\n'
           + bars + '\n'
           + '📱 MC Guias — Treine onde estiver\n'
           + '🔗 mc-guias.github.io/mcguias/';
  if (navigator && navigator.share) {
    navigator.share({ title: 'MC Guias — ' + guiaLabel, text: text })
      .catch(function() { mcCopyToClipboard(text); });
    return;
  }
  mcCopyToClipboard(text);
};

function mcCopyToClipboard(text) {
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(function() { mcShowToast('✅ Resultado copiado!', false); })
      .catch(function() { mcExecCopy(text); });
    return;
  }
  mcExecCopy(text);
}

function mcExecCopy(text) {
  try {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    mcShowToast(ok ? '✅ Resultado copiado!' : '⚠️ Não foi possível copiar', !ok);
  } catch(e) {
    mcShowToast('⚠️ Não foi possível copiar', true);
  }
}

function mcShowToast(msg, isWarn) {
  var old = document.getElementById('mc-toast');
  if (old) old.remove();
  var toast = document.createElement('div');
  toast.id = 'mc-toast';
  toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);'
    + 'background:' + (isWarn ? '#f57f17' : '#1b5e20') + ';color:#fff;'
    + 'padding:11px 20px;border-radius:24px;font-size:14px;font-weight:700;'
    + 'z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.25);white-space:nowrap;';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2800);
}

/* ── lacunas.js ── */
// ── Lacunas (fill-in-blank) · answer normalization ────────────

function normalizeAnswer(text) {
  var t = text.toLowerCase().trim();

  t = t.replace(/^(\d+):(\d+)$/, '$1min$2s');
  t = t.replace(/^(\d+)\s*min\s*(\d+)$/, '$1min$2s');

  t = t.replace(/°\s*[cCfF]\b/g, '');
  t = t.replace(/\b(graus?)\b/gi, '');

  t = t.replace(/\s+a\s+|\s*[\–\-]\s*|\s*até\s*/g, '-');

  t = t.replace(/\b(minutos?|min\.?)\b/gi, 'min');
  t = t.replace(/\b(segundos?|seg\.?)\b/gi, 's');
  t = t.replace(/\b(horas?)\b/gi, 'h');
  t = t.replace(/\b(dias?)\b/gi, 'd');
  t = t.replace(/\b(semanas?)\b/gi, 'sem');

  t = t.replace(/\s*(g|kg|ml|l\b|oz|cm|mm|%)\b/g, '$1');

  t = t.replace(/\b(de|a|à|por|em|o|os|as|um|uma|ao|da|do|dos|das|cada|após|depois|de\s+uso)\b/g, ' ');

  t = t.replace(/,/g, '.');

  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function answersMatch(userInput, correctAnswer) {
  var u = normalizeAnswer(userInput);
  var c = normalizeAnswer(correctAnswer);
  if (!u) return false;
  if (u === c) return true;

  if (u.replace(/\s/g,'') === c.replace(/\s/g,'')) return true;

  var hasPercent = correctAnswer.indexOf('%') !== -1;
  if (!hasPercent) {
    var cNum = c.replace(/[^\d\.\-]/g, '');
    var uNum = u.replace(/[^\d\.\-]/g, '');
    if (cNum && uNum && cNum === uNum && cNum.length >= 2) return true;
  }
  return false;
}

function makeHint(answer) {
  var hint = answer.replace(/(\d+[,\.]?\d*)/g, function(n) {
    return '_'.repeat(Math.max(n.length, 1));
  });

  if (hint === answer) hint = '___';
  return hint;
}

function isLacunaEligible(answer) {
  var a = answer.trim();
  if (a.length > 50) return false;

  if (!/\d/.test(a)) return false;
  return true;
}

function initLacuna(questions, guiaName) {
  var app = document.getElementById('quiz-app');
  if (!app) return;

  window._quizData = questions;
  window._quizGuia = guiaName || 'Simulado';

  var pool = (questions || []).filter(function(q) { return isLacunaEligible(q.answer); });
  pool = prioritizeQuestions(pool);

  if (!pool.length) {
    app.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:14px;">Nenhuma pergunta disponível para este modo neste guia.</div>';
    return;
  }

  var current          = 0;
  var score            = 0;
  var scoreHalf        = 0; // correct after hint
  var answered         = false;
  var hintUsed         = false;
  var _qStart          = Date.now();
  var _lacunaResultShown = false;

  function render() {
    _qStart = Date.now();
    if (current >= pool.length) { showLacunaResult(); return; }
    var q    = pool[current];
    var hint = makeHint(q.answer);
    var pct  = Math.round((current / pool.length) * 100);
    answered = false;
    hintUsed = false;

    app.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:14px;">'
      + '<div>'
      +   '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="transform:scaleX(' + (pct/100) + ')"></div></div>'
      +   '<div style="display:flex;justify-content:space-between;margin-top:4px;">'
      +     '<span class="quiz-counter">Pergunta ' + (current + 1) + ' de ' + pool.length + '</span>'
      +     '<span class="quiz-counter">✅ ' + score + (scoreHalf ? ' +' + scoreHalf + '⚠️' : '') + '</span>'
      +   '</div>'
      + '</div>'
      + '<div class="quiz-question-card">'
      +   '<div class="quiz-category">' + esc(q.category || '') + '</div>'
      +   '<div class="quiz-question">' + esc(q.question) + '</div>'
      +   '<div style="margin-top:12px;">'
      +     '<div id="lacuna-hint-text" style="font-size:13px;color:var(--muted);margin-bottom:6px;letter-spacing:2px;">' + hint + '</div>'
      +     '<input id="lacuna-input" type="text" autocomplete="off" autocorrect="off" spellcheck="false"'
      +       ' placeholder="Digite sua resposta..." '
      +       ' style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid var(--border);border-radius:var(--radius-md);font-size:16px;font-family:var(--font-body);color:var(--text);background:var(--card);outline:none;">'
      +   '</div>'
      + '</div>'
      + '<div class="quiz-feedback" id="quiz-feedback" aria-live="polite" role="status"></div>'
      + '<div style="display:flex;gap:8px;">'
      +   '<button class="btn-secondary" id="btn-lacuna-hint" onclick="useLacunaHint()" style="flex:1;">💡 Dica</button>'
      +   '<button class="btn-primary" id="btn-lacuna-confirm" onclick="checkLacuna()" style="flex:2;">✓ Confirmar</button>'
      + '</div>'
      + '<div class="quiz-nav">'
      +   '<button class="btn-secondary" onclick="if(window.setActiveMode)window.setActiveMode(\'lacuna\');initLacuna(window._quizData,window._quizGuia)">🔀 Reiniciar</button>'
      +   '<button class="btn-primary" id="btn-next" style="display:none;" onclick="lacunaNext()">Próxima →</button>'
      + '</div>'
      + '</div>';

    setTimeout(function() {
      var inp = document.getElementById('lacuna-input');
      if (inp) {
        inp.focus();
        inp.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') checkLacuna();
        });
      }
    }, 80);

    window._lacunaQ = q;
  }

  window.useLacunaHint = function() {
    if (answered) return;
    hintUsed = true;
    var q = window._lacunaQ;
    // Reveal first char + mask the rest by word
    var hint = q.answer.split('').map(function(ch, i) {
      if (i === 0) return ch;
      if (ch === ' ' || ch === '°' || ch === '/' || ch === ':') return ch;
      return '_';
    }).join('');
    var hintEl = document.getElementById('lacuna-hint-text');
    if (hintEl) {
      hintEl.textContent = hint;
      hintEl.style.color = 'var(--text)';
      hintEl.style.fontWeight = '700';
      hintEl.style.letterSpacing = '3px';
    }
    var hintBtn = document.getElementById('btn-lacuna-hint');
    if (hintBtn) { hintBtn.disabled = true; hintBtn.style.opacity = '0.5'; }
  };

  window.checkLacuna = function() {
    if (answered) return;
    var q   = window._lacunaQ;
    var inp = document.getElementById('lacuna-input');
    if (!inp) return;
    var userVal = inp.value.trim();
    if (!userVal) { inp.focus(); return; }

    answered = true;
    var isCorrect = answersMatch(userVal, q.answer);

    inp.disabled = true;
    inp.style.borderColor = isCorrect ? '#43a047' : '#e53935';
    inp.style.background  = isCorrect ? '#f1f8e9' : '#ffebee';
    var cb = document.getElementById('btn-lacuna-confirm');
    if (cb) cb.disabled = true;
    var hb = document.getElementById('btn-lacuna-hint');
    if (hb) hb.disabled = true;

    if (isCorrect) {
      if (hintUsed) scoreHalf++;
      else score++;
    }

    var _lacunaElapsed = Date.now() - _qStart;
    trackAnswer(q.id || getQuestionHash(q), isCorrect, _lacunaElapsed, q.answer ? q.question : null);
    var lacunaQuality = !isCorrect ? 1 : hintUsed ? 3 : 4;
    updateSRData(getQuestionHash(q), isCorrect, lacunaQuality);

    var fb = document.getElementById('quiz-feedback');
    fb.className = 'quiz-feedback show ' + (isCorrect ? 'correct' : 'wrong');
    var normalizedUser = normalizeAnswer(userVal);
    var fuzzyMatch = isCorrect && normalizedUser !== userVal.toLowerCase().trim();
    if (isCorrect) {
      fb.innerHTML = (hintUsed ? '⚠️' : '✅') + ' <strong>' + (hintUsed ? 'Correto com dica!' : 'Correto!') + '</strong> ' + esc(q.answer)
        + (fuzzyMatch ? '<br><span style="font-size:11px;opacity:.75;">Você digitou "<em>' + esc(userVal) + '</em>" → interpretado como <em>' + esc(normalizedUser) + '</em></span>' : '')
        + (q.explanation ? ' — ' + esc(q.explanation) : '');
    } else {
      fb.innerHTML = '❌ <strong>Resposta:</strong> ' + esc(q.answer) + (q.explanation ? ' — ' + esc(q.explanation) : '');
    }

    var nb = document.getElementById('btn-next');
    if (nb) {
      nb.style.display = 'inline-flex';
      nb.textContent   = current + 1 < pool.length ? 'Próxima →' : 'Ver Resultado →';
    }
  };

  window.lacunaNext = function() {
    var nb = document.getElementById('btn-next');
    if (nb) { nb.disabled = true; nb.style.opacity = '0.5'; nb.style.pointerEvents = 'none'; }
    if (window._quizTimerInterval) { clearInterval(window._quizTimerInterval); window._quizTimerInterval = null; }
    current++;
    render();
  };

  function showLacunaResult() {
    if (_lacunaResultShown) return;
    _lacunaResultShown = true;
    var total    = pool.length;
    var fullPct  = Math.round((score / total) * 100);
    var halfPct  = Math.round(((score + scoreHalf * 0.5) / total) * 100);
    var medal    = halfPct >= 80 ? '🏆' : halfPct >= 60 ? '👍' : '📖';

    saveQuizResult((guiaName || 'Lacunas') + ' ✏️', score + scoreHalf * 0.5, total);
    if (window.Gamificacao) {
      window.Gamificacao.onQuizComplete({
        guide:      (guiaName || window._quizGuia || 'lacunas').toLowerCase(),
        score:      score,
        total:      total,
        pct:        halfPct,
        hour:       new Date().getHours(),
        maxStreak:  0,
        fastAnswers:0,
        mode:       'lacuna',
      });
    }
    app.innerHTML =
      '<div style="text-align:center;padding:16px 0;">'
      + '<div style="font-size:48px;margin-bottom:8px;">' + medal + '</div>'
      + '<div style="font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--text);margin-bottom:4px;">' + halfPct + '%</div>'
      + '<div style="font-size:14px;color:var(--muted);margin-bottom:4px;">' + score + ' corretas · ' + scoreHalf + ' com dica · ' + (total - score - scoreHalf) + ' erradas</div>'
      + '<div style="font-size:13px;color:var(--muted);margin-bottom:20px;">de ' + total + ' perguntas</div>'
      + '<div style="display:flex;flex-direction:column;gap:8px;">'
      + '<button class="btn-primary" onclick="if(window.setActiveMode)window.setActiveMode(\'lacuna\');initLacuna(window._quizData,window._quizGuia)">🔄 Repetir</button>'
      + '<button class="btn-secondary" onclick="shareQuizResult(' + halfPct + ',' + total + ',window._quizGuia)">📤 Compartilhar</button>'
      + '</div>'
      + '</div>';
  }

  render();
}

/* ── onboarding.js ── */
// ── Onboarding (first-visit carousel) ────────────────────────

function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  // Only show on first ever visit (localStorage, not sessionStorage)
  if (McStorage.get('mc_onboarding_done', null)) return;

  overlay.style.display = 'flex';

  const slides  = overlay.querySelectorAll('.ob-slide');
  const dots    = overlay.querySelectorAll('.ob-dot');
  const nextBtn = document.getElementById('ob-next');
  const skipBtn = document.getElementById('ob-skip');
  const startBtn= document.getElementById('ob-start-btn');
  let current = 0;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = idx;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
    // Last slide: hide next button
    if (nextBtn) nextBtn.style.display = current === slides.length - 1 ? 'none' : 'inline-flex';
  }

  function close() {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity .25s';
    setTimeout(() => { overlay.style.display = 'none'; }, 250);
    McStorage.set('mc_onboarding_done', '1');
  }

  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (current < slides.length - 1) goTo(current + 1);
  });
  if (skipBtn) skipBtn.addEventListener('click', close);
  if (startBtn) startBtn.addEventListener('click', close);

  // Tap outside to skip
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  goTo(0);
}

/* ── sw-init.js ── */
// ── Service Worker · DOMContentLoaded · Update Toast ─────────

function applyUpdate(reg) {
  const r = reg || window._swRegistration;
  if (r && r.waiting) {
    r.waiting.postMessage({ type: 'SKIP_WAITING' });
  } else {
    window.location.reload();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initSwipeNav();
  initChecklist();
  initOnboarding();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/mcguias/sw.js')
      .then(function(reg) {

        setInterval(function() { reg.update(); }, 60 * 60 * 1000);
      })
      .catch(err => console.log('SW error:', err));
  });

  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SW_UPDATED') {
      mcShowUpdateToast();
    }

    if (event.data && event.data.type === 'SW_VERSION') {
      var lastVer = McStorage.get('mc_sw_version', null);
      var curVer  = event.data.version;
      if (lastVer && lastVer !== curVer) {
        mcShowUpdateToast();
      }
      McStorage.set('mc_sw_version', curVer);
    }
  });

  navigator.serviceWorker.ready.then(function(reg) {
    if (reg.active) {
      reg.active.postMessage({ type: 'GET_VERSION' });
    }
  }).catch(function() {});
}

function mcShowUpdateToast() {
  if (document.getElementById('mc-update-toast')) return;
  var toast = document.createElement('div');
  toast.id = 'mc-update-toast';
  toast.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);'
    + 'background:#1565c0;color:#fff;padding:12px 18px;border-radius:24px;'
    + 'font-size:13px;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);'
    + 'display:flex;align-items:center;gap:10px;white-space:nowrap;max-width:90vw;';
  toast.innerHTML = '🆕 Nova versão disponível! <button onclick="location.reload()" style="background:#fff;color:#1565c0;border:none;border-radius:16px;padding:4px 12px;font-size:12px;font-weight:800;cursor:pointer;margin-left:4px;">Atualizar</button>'
    + '<button onclick="this.parentNode.remove()" style="background:rgba(255,255,255,0.2);color:#fff;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:14px;line-height:1;flex-shrink:0;">×</button>';
  document.body.appendChild(toast);
}

// Checar atualizações a cada 60s
setInterval(() => { if (window._swRegistration) window._swRegistration.update(); }, 60000);

