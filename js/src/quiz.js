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

  // Telemetria leve (best-effort): quiz iniciado
  if (window.mcTrack) window.mcTrack('quiz_started', { guia: window._quizGuia, total: questions.length });

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
