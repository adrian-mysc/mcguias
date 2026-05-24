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

  var current    = 0;
  var score      = 0;
  var scoreHalf  = 0; // correct after hint
  var answered   = false;
  var hintUsed   = false;
  var _qStart    = Date.now();

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
      +   '<div class="quiz-category">' + (q.category || '') + '</div>'
      +   '<div class="quiz-question">' + q.question + '</div>'
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

    trackAnswer(q.id || getQuestionHash(q), isCorrect, Date.now() - _qStart, q.answer ? q.question : null);
    updateSRData(getQuestionHash(q), isCorrect);

    var fb = document.getElementById('quiz-feedback');
    fb.className = 'quiz-feedback show ' + (isCorrect ? 'correct' : 'wrong');
    var normalizedUser = normalizeAnswer(userVal);
    var fuzzyMatch = isCorrect && normalizedUser !== userVal.toLowerCase().trim();
    if (isCorrect) {
      fb.innerHTML = (hintUsed ? '⚠️' : '✅') + ' <strong>' + (hintUsed ? 'Correto com dica!' : 'Correto!') + '</strong> ' + q.answer
        + (fuzzyMatch ? '<br><span style="font-size:11px;opacity:.75;">Você digitou "<em>' + userVal + '</em>" → interpretado como <em>' + normalizedUser + '</em></span>' : '')
        + (q.explanation ? ' — ' + q.explanation : '');
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

    saveQuizResult((guiaName || 'Lacunas') + ' ✏️', score + Math.round(scoreHalf * 0.5), total);
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
