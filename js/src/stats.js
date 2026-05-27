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
  hist.unshift({ guia, score, total, date });
  if (hist.length > 180) hist.splice(180);
  McStorage.set('mc_quiz_history', hist);
  // Sync imediato para quiz_sessions — o sync.js escuta este evento
  window.dispatchEvent(new CustomEvent('mc:quizComplete', { detail: { guia, score, total } }));
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
