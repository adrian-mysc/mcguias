import { CATEGORIAS, getProgress, overallStats } from './store.js';

async function contarQuestoes(catId) {
  try {
    const res = await fetch(`data/${catId}.json`);
    const json = await res.json();
    return Array.isArray(json.questoes) ? json.questoes.length : 0;
  } catch (e) {
    return 0;
  }
}

function statBlock(num, label) {
  const el = document.createElement('div');
  el.className = 'bs-stat';
  el.innerHTML = `<div class="bs-stat-num">${num}</div><div class="bs-stat-label">${label}</div>`;
  return el;
}

function cardEl(cat, progress, totalQuestoes) {
  const p = progress[cat.id];
  const a = document.createElement('a');
  a.href = `quiz.html?cat=${cat.id}`;
  a.className = 'bs-card';
  a.dataset.cat = cat.id;
  const metaTxt = p.attempts > 0
    ? `<b>${p.best}%</b> melhor resultado · ${p.attempts} tentativa${p.attempts > 1 ? 's' : ''}`
    : `${totalQuestoes || '...'} perguntas · ainda não iniciado`;
  a.innerHTML = `
    <div class="bs-card-top">
      <div class="bs-card-icon">${cat.icon}</div>
      <h3 class="bs-card-title">${cat.titulo}</h3>
    </div>
    <p class="bs-card-desc">${cat.desc}</p>
    <div class="bs-card-meta">${metaTxt}</div>
    <div class="bs-card-bar"><div class="bs-card-bar-fill" style="width:${p.best}%"></div></div>
  `;
  return a;
}

async function render() {
  const progress = getProgress();
  const stats = overallStats(progress);

  const statsWrap = document.getElementById('bs-stats');
  statsWrap.appendChild(statBlock(stats.answered, 'respondidas'));
  statsWrap.appendChild(statBlock(`${stats.acc}%`, 'de acerto'));
  statsWrap.appendChild(statBlock(stats.attempts, 'quizzes feitos'));

  const cardsWrap = document.getElementById('bs-cards');
  for (const cat of CATEGORIAS) {
    const card = cardEl(cat, progress, null);
    cardsWrap.appendChild(card);
  }

  // Preenche a contagem real de perguntas por categoria (assíncrono, não bloqueia o primeiro render)
  CATEGORIAS.forEach(async (cat, i) => {
    const total = await contarQuestoes(cat.id);
    const p = progress[cat.id];
    if (p.attempts === 0) {
      const meta = cardsWrap.children[i].querySelector('.bs-card-meta');
      meta.textContent = `${total} perguntas · ainda não iniciado`;
    }
  });
}

render();
