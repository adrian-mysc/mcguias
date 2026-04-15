/* ============================================================
   MC GUIAS — Shared JavaScript
   Versão: 2.2 — estatísticas · som · transição de perguntas
   ============================================================ */
"use strict";

// ── Sound Engine (Web Audio API — no external files) ──────────
var _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}
function mcPlaySound(type) {
  if (localStorage.getItem('mc_sound_off') === '1') return;
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

// ── Statistics ────────────────────────────────────────────────
function renderStats(containerId) {
  var el = document.getElementById(containerId);
  if (!el) return;

  var hist = JSON.parse(localStorage.getItem('mc_quiz_history') || '[]');
  var srData = JSON.parse(localStorage.getItem('mc_sr_data') || '{}');

  if (!hist.length) {
    el.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:16px 0;text-align:center;">Nenhum simulado realizado ainda.</p>';
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
  var allPcts = hist.map(function(h) { return Math.round((h.score / h.total) * 100); });
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
  if (window.setActiveMode) window.setActiveMode(mode);
  if (mode === 'flash')    { initFlashcard(window._quizData, window._quizGuia); return; }
  if (mode === 'lacuna')   { initLacuna(window._quizData, window._quizGuia);    return; }
  initQuiz(window._quizData, window._quizGuia);
};

function initTabs() {
  const tabBtns   = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      tabBtns.forEach((b)  => b.classList.remove("active"));
      tabPanels.forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = document.getElementById("panel-" + target);
      if (panel) panel.classList.add("active");
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

function initChecklist() {
  const pageId = document.body.dataset.page;
  const key    = pageId ? `mc_checks_${pageId}` : null;
  const saved  = key ? JSON.parse(localStorage.getItem(key) || '{}') : {};

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
      }
    } else {
      var badge = card.querySelector('.check-complete-badge');
      if (badge) badge.remove();
    }
  }

  document.querySelectorAll(".check-item input[type=checkbox]").forEach((cb, i) => {
    if (saved[i]) { cb.checked = true; cb.closest(".check-item").classList.add("done"); }
    var card = cb.closest('.card');
    if (card) updateCheckProgress(card);
    cb.addEventListener("change", () => {
      cb.closest(".check-item").classList.toggle("done", cb.checked);
      if (key) {
        const cur = JSON.parse(localStorage.getItem(key) || '{}');
        if (cb.checked) cur[i] = true; else delete cur[i];
        localStorage.setItem(key, JSON.stringify(cur));
      }
      var card = cb.closest('.card');
      if (card) updateCheckProgress(card);
    });
  });
}

function saveQuizResult(guia, score, total) {
  const hist = JSON.parse(localStorage.getItem('mc_quiz_history') || '[]');
  const date = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  hist.unshift({ guia, score, total, date });
  if (hist.length > 20) hist.splice(20);
  localStorage.setItem('mc_quiz_history', JSON.stringify(hist));
}

function renderHistory(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const hist = JSON.parse(localStorage.getItem('mc_quiz_history') || '[]');
  if (!hist.length) { el.innerHTML = '<p style="color:var(--muted);font-size:13px;padding:8px 0;">Nenhum simulado realizado ainda.</p>'; return; }
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

function getQuestionHash(q) {
  if (!q || !q.question) return 'unknown';
  try {
    return btoa(encodeURIComponent(q.question)).slice(0, 20);
  } catch(e) {
    return String(q.question).slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  }
}

function getSRData() {
  return JSON.parse(localStorage.getItem('mc_sr_data') || '{}');
}

function updateSRData(hash, correct) {
  if (!hash || hash === 'unknown') return;
  const data = getSRData();
  if (!data[hash]) data[hash] = { correct: 0, wrong: 0, interval: 1 };
  const entry = data[hash];
  if (correct) {
    entry.correct++;
    entry.interval = Math.min(entry.interval * 2, 30);
  } else {
    entry.wrong++;
    entry.interval = 1;
  }
  entry.nextReview = Date.now() + entry.interval * 24 * 60 * 60 * 1000;
  data[hash] = entry;
  localStorage.setItem('mc_sr_data', JSON.stringify(data));
}

function prioritizeQuestions(questions) {
  const data = getSRData();
  const now  = Date.now();
  return [...questions].sort((a, b) => {
    const ha = getQuestionHash(a);
    const hb = getQuestionHash(b);
    const da = data[ha];
    const db = data[hb];

    if (!da && !db) return 0;
    if (!da) return -1;
    if (!db) return 1;

    const aDue = da.nextReview <= now;
    const bDue = db.nextReview <= now;
    if (aDue && !bDue) return -1;
    if (!aDue && bDue) return 1;

    const aRatio = da.wrong / (da.correct + da.wrong + 1);
    const bRatio = db.wrong / (db.correct + db.wrong + 1);
    return bRatio - aRatio;
  });
}

function initQuiz(questions, guiaName) {
  const app = document.getElementById("quiz-app");
  if (!app) return;

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
    if (!btnM) return;
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

    document.getElementById('btnTimer').addEventListener('click', function(e) {
      e.stopPropagation();
      var dd = document.getElementById('timer-dropdown');
      dd.style.display = dd.style.display === 'none' ? 'block' : 'none';

      document.querySelectorAll('.timer-opt-btn').forEach(function(b) {
        var s = parseInt(b.dataset.secs, 10);
        b.style.background = (window._quizTimerEnabled && s === window._quizTimerSecs) || (!window._quizTimerEnabled && s === 0)
          ? 'var(--bg)' : '';
        b.style.color = (window._quizTimerEnabled && s === window._quizTimerSecs) || (!window._quizTimerEnabled && s === 0)
          ? 'var(--red)' : 'var(--text)';
      });
    });

    document.querySelectorAll('.timer-opt-btn').forEach(function(b) {
      b.addEventListener('click', function(e) {
        e.stopPropagation();
        var secs = parseInt(b.dataset.secs, 10);
        if (secs === 0) {
          window._quizTimerEnabled = false;
          document.getElementById('btnTimer').className   = 'btn-secondary';
          document.getElementById('btnTimer').textContent = '⏱️';
        } else {
          window._quizTimerEnabled = true;
          window._quizTimerSecs    = secs;
          document.getElementById('btnTimer').className   = 'btn-primary';
          document.getElementById('btnTimer').textContent = '⏱️ ' + secs + 's';
        }
        document.getElementById('timer-dropdown').style.display = 'none';
      });
    });

    document.addEventListener('click', function() {
      var dd = document.getElementById('timer-dropdown');
      if (dd) dd.style.display = 'none';
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
      var off = localStorage.getItem('mc_sound_off') === '1';
      btn.textContent = off ? '🔇' : '🔊';
      btn.style.opacity = off ? '0.5' : '1';
    }
    syncSoundBtn();
    document.getElementById('btnSound').addEventListener('click', function() {
      var off = localStorage.getItem('mc_sound_off') === '1';
      localStorage.setItem('mc_sound_off', off ? '0' : '1');
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

  var pool          = prioritizeQuestions(questions);
  var current       = 0;
  var score         = 0;
  var streak        = 0;
  var bestStreak    = 0;
  var answered      = false;
  var _wrongAnswers = [];
  var _sessionStart = Date.now();
  var _qStart       = Date.now();

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
      +   '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:' + pct + '%"></div></div>'
      +   '<div style="display:flex;justify-content:space-between;margin-top:4px;">'
      +     '<span class="quiz-counter">Pergunta ' + (current + 1) + ' de ' + pool.length + '</span>'
      +     '<span class="quiz-counter">✅ ' + score + ' corretas' + (streak >= 3 ? ' &nbsp;' + (streak >= 10 ? '🏆' : streak >= 5 ? '⚡' : '🔥') + ' ' + streak : '') + '</span>'
      +   '</div>'
      + '</div>'
      + '<div class="quiz-question-card">'
      +   '<div class="quiz-category">' + (q.category || '') + '</div>'
      +   '<div class="quiz-question">' + q.question + '</div>'
      +   '<div class="quiz-options" id="quiz-options">'
      +     opts.map(function(o, oi) {
              return '<button class="quiz-option" onclick="handleQuizOption('+oi+')" data-correct="'+(o===q.answer)+'" data-idx="'+oi+'">'
                + '<span class="quiz-opt-key">' + String.fromCharCode(65+oi) + '</span> ' + o
                + '</button>';
            }).join('')
      +   '</div>'
      + '</div>'
      + '<div class="quiz-feedback" id="quiz-feedback"></div>'
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
            fb.innerHTML = '⏱️ <strong>Tempo esgotado!</strong> ' + (q.explanation || '');
            answered = true;
            _wrongAnswers.push({ question: q.question, answer: q.answer, userAnswer: null, explanation: q.explanation, category: q.category });
            updateSRData(getQuestionHash(q), false);
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
    var isCorrect = btn.dataset.correct === "true";
    if (isCorrect) {
      score++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
      _wrongAnswers.push({ question: q.question, answer: q.answer, userAnswer: btn.textContent, explanation: q.explanation, category: q.category });
    }

    updateSRData(getQuestionHash(q), isCorrect);
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
      ? "✅ <strong>Correto!</strong>" + streakBadge + "<br><span style='font-size:13px;opacity:.9;'>" + (explanation || "") + "</span>"
      : "❌ <strong>Incorreto.</strong> A resposta certa é: <strong>" + correct + "</strong>.<br><span style='font-size:13px;opacity:.9;'>" + (explanation || "") + "</span>";

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
    if (window._autoAdvanceTimer) { clearTimeout(window._autoAdvanceTimer); window._autoAdvanceTimer = null; }
    if (window._quizKeyHandler) { document.removeEventListener('keydown', window._quizKeyHandler); window._quizKeyHandler = null; }
    current++;
    render();
  };

  function showResult() {
    var pct  = Math.round((score / pool.length) * 100);
    var msg  = pct >= 80 ? "🎉 Excelente!" : pct >= 60 ? "👍 Bom trabalho!" : "📚 Continue estudando!";
    var elapsed = Math.round((Date.now() - _sessionStart) / 1000);
    var mins = Math.floor(elapsed / 60);
    var secs = elapsed % 60;
    var timeStr = mins > 0 ? mins + 'min ' + secs + 's' : secs + 's';
    var avgSec = pool.length > 0 ? Math.round(elapsed / pool.length) : 0;
    if (window._quizKeyHandler) { document.removeEventListener('keydown', window._quizKeyHandler); window._quizKeyHandler = null; }
    saveQuizResult(guiaName || window._quizGuia || "Simulado", score, pool.length);
    var isRoot     = window.location.pathname.indexOf("/pages/") !== -1;
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
        return '<div style="background:var(--bg);border:1.5px solid #fecaca;border-radius:var(--radius-md);padding:11px 13px;">'          + '<div style="font-size:10px;font-weight:800;color:var(--muted);letter-spacing:.5px;margin-bottom:4px;text-transform:uppercase;">' + (w.category || '') + '</div>'          + '<div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:8px;line-height:1.4;">' + w.question + '</div>'          + '<div style="display:flex;flex-direction:column;gap:4px;">'          + '<div style="font-size:12px;padding:6px 10px;border-radius:8px;background:#ffebee;color:#c62828;">'          + '❌ Sua resposta: <strong>' + (w.userAnswer || 'Tempo esgotado') + '</strong></div>'          + '<div style="font-size:12px;padding:6px 10px;border-radius:8px;background:#e8f5e9;color:#2e7d32;">'          + '✅ Correto: <strong>' + w.answer + '</strong></div>'          + (w.explanation ? '<div style="font-size:11px;color:var(--muted);margin-top:3px;line-height:1.4;">' + w.explanation + '</div>' : '')          + '</div></div>';
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
      + '<button class="btn-share" onclick="shareQuizResult(' + score + ',' + pool.length + ',window._quizGuia)" style="margin-top:12px;">📤 Compartilhar resultado</button>'
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

    renderHistory('hist-inline');
  }

  render();
}

function initFlashcard(questions, guiaName) {
  const app = document.getElementById("quiz-app");
  if (!app) return;
  const pool = shuffle([...questions]);
  let current = 0;
  let knew = 0;
  let didntKnow = 0;

  function render() {
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
        <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span class="quiz-counter">Cartão ${current + 1} de ${pool.length}</span>
          <span class="quiz-counter">✅ ${knew} sabia · ❌ ${didntKnow} não</span>
        </div>
      </div>
      <div class="flashcard" id="fc" onclick="revealCard()">
        <div class="flashcard-hint">PERGUNTA — toque para ver a resposta</div>
        <div class="flashcard-q">${q.question}</div>
        <div class="flashcard-a">✅ ${q.answer}${q.explanation ? '<br><span style="font-size:12px;color:var(--muted);margin-top:6px;display:block;">' + q.explanation + '</span>' : ''}</div>
      </div>
      <div class="flashcard-nav" id="fc-nav" style="display:none;">
        <button class="btn-wrong" onclick="rateCard(false)" style="flex:1;padding:12px;font-size:14px;font-weight:800;background:#ffebee;color:#c62828;border:1.5px solid #fecaca;border-radius:var(--radius-md);cursor:pointer;">❌ Não sabia</button>
        <button class="btn-correct" onclick="rateCard(true)" style="flex:1;padding:12px;font-size:14px;font-weight:800;background:#e8f5e9;color:#2e7d32;border:1.5px solid #b2dfca;border-radius:var(--radius-md);cursor:pointer;">✅ Sabia!</button>
      </div>
      <p style="text-align:center;font-size:11px;color:var(--muted);">Categoria: ${q.category}</p>
    </div>`;
  }
  window.revealCard = () => {
    document.getElementById('fc').classList.add('revealed');
    document.getElementById('fc-nav').style.display = 'flex';
  };
  window.rateCard = (didKnow) => {
    if (didKnow) knew++; else didntKnow++;
    updateSRData(getQuestionHash(pool[current]), didKnow);
    current++;
    render();
  };
  window._quizData = questions;
  window._quizGuia = guiaName || 'Flashcard';
  render();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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

  var current    = 0;
  var score      = 0;
  var scoreHalf  = 0; // correct after hint
  var answered   = false;
  var hintUsed   = false;

  function render() {
    if (current >= pool.length) { showLacunaResult(); return; }
    var q    = pool[current];
    var hint = makeHint(q.answer);
    var pct  = Math.round((current / pool.length) * 100);
    answered = false;
    hintUsed = false;

    app.innerHTML =
      '<div style="display:flex;flex-direction:column;gap:14px;">'
      + '<div>'
      +   '<div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:' + pct + '%"></div></div>'
      +   '<div style="display:flex;justify-content:space-between;margin-top:4px;">'
      +     '<span class="quiz-counter">Pergunta ' + (current + 1) + ' de ' + pool.length + '</span>'
      +     '<span class="quiz-counter">✅ ' + score + (scoreHalf ? ' +' + scoreHalf + '⚠️' : '') + '</span>'
      +   '</div>'
      + '</div>'
      + '<div class="quiz-question-card">'
      +   '<div class="quiz-category">' + (q.category || '') + '</div>'
      +   '<div class="quiz-question">' + q.question + '</div>'
      +   '<div style="margin-top:12px;">'
      +     '<div id="lacuna-hint-text" style="font-size:13px;color:var(--muted);margin-bottom:6px;letter-spacing:2px;">' + hint + '</div>'
      +     '<input id="lacuna-input" type="text" autocomplete="off" autocorrect="off" spellcheck="false"'
      +       ' placeholder="Digite sua resposta..." '
      +       ' style="width:100%;box-sizing:border-box;padding:12px 14px;border:2px solid var(--border);border-radius:var(--radius-md);font-size:16px;font-family:var(--font-body);color:var(--text);background:var(--card);outline:none;">'
      +   '</div>'
      + '</div>'
      + '<div class="quiz-feedback" id="quiz-feedback"></div>'
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

    updateSRData(getQuestionHash(q), isCorrect);

    var fb = document.getElementById('quiz-feedback');
    fb.className = 'quiz-feedback show ' + (isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      fb.innerHTML = (hintUsed ? '⚠️' : '✅') + ' <strong>' + (hintUsed ? 'Correto com dica!' : 'Correto!') + '</strong> ' + q.answer + (q.explanation ? ' — ' + q.explanation : '');
    } else {
      fb.innerHTML = '❌ <strong>Resposta:</strong> ' + q.answer + (q.explanation ? ' — ' + q.explanation : '');
    }

    var nb = document.getElementById('btn-next');
    if (nb) {
      nb.style.display = 'inline-flex';
      nb.textContent   = current + 1 < pool.length ? 'Próxima →' : 'Ver Resultado →';
    }
  };

  window.lacunaNext = function() {
    if (window._quizTimerInterval) { clearInterval(window._quizTimerInterval); window._quizTimerInterval = null; }
    current++;
    render();
  };

  function showLacunaResult() {
    var total    = pool.length;
    var fullPct  = Math.round((score / total) * 100);
    var halfPct  = Math.round(((score + scoreHalf * 0.5) / total) * 100);
    var medal    = halfPct >= 80 ? '🏆' : halfPct >= 60 ? '👍' : '📖';

    saveQuizResult(score + Math.round(scoreHalf * 0.5), total, (guiaName || 'Lacunas') + ' ✏️');

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

function initOnboarding() {
  const overlay = document.getElementById('onboarding-overlay');
  if (!overlay) return;

  // Only show on first ever visit (localStorage, not sessionStorage)
  if (localStorage.getItem('mc_onboarding_done')) return;

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
    localStorage.setItem('mc_onboarding_done', '1');
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

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
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
      var lastVer = localStorage.getItem('mc_sw_version');
      var curVer  = event.data.version;
      if (lastVer && lastVer !== curVer) {
        mcShowUpdateToast();
      }
      localStorage.setItem('mc_sw_version', curVer);
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