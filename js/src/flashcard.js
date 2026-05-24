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
