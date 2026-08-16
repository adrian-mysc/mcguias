import { CATEGORIAS, saveAttempt, shuffle } from './store.js';

const MAX_QUESTOES = 10;
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

const params = new URLSearchParams(location.search);
const catId = params.get('cat');
const cat = CATEGORIAS.find((c) => c.id === catId);

const root = document.getElementById('bs-quiz-root');
const badge = document.getElementById('bs-cat-badge');
const titleTag = document.getElementById('bs-title-tag');

if (!cat) {
  root.innerHTML = '<div class="bs-empty">Categoria não encontrada. <a href="index.html">Voltar ao início</a>.</div>';
} else {
  badge.textContent = cat.titulo;
  badge.parentElement.dataset.cat = cat.id;
  titleTag.textContent = `Bit & Solda — ${cat.titulo}`;
  document.title = `${cat.titulo} — Quiz — Bit & Solda`;
  iniciar();
}

async function iniciar() {
  root.innerHTML = '<div class="bs-empty">Carregando perguntas…</div>';
  let banco;
  try {
    const res = await fetch(`data/${cat.id}.json`);
    banco = await res.json();
  } catch (e) {
    root.innerHTML = '<div class="bs-empty">Não foi possível carregar as perguntas. Verifique sua conexão e tente novamente.</div>';
    return;
  }

  const questoes = shuffle(banco.questoes).slice(0, MAX_QUESTOES).map(prepararQuestao);
  const state = { i: 0, acertos: 0, respondida: false };

  renderQuestao();

  function prepararQuestao(q) {
    const indices = shuffle(q.opcoes.map((_, idx) => idx));
    return {
      ...q,
      opcoesEmbaralhadas: indices.map((idx) => q.opcoes[idx]),
      corretaEmbaralhada: indices.indexOf(q.correta),
    };
  }

  function renderQuestao() {
    const q = questoes[state.i];
    state.respondida = false;
    const pct = Math.round((state.i / questoes.length) * 100);

    root.innerHTML = `
      <div class="bs-quiz-head">
        <div class="bs-progress-track"><div class="bs-progress-fill" style="width:${pct}%"></div></div>
        <div class="bs-progress-count">${state.i + 1} / ${questoes.length}</div>
      </div>
      <div class="bs-question-card">
        <div class="bs-question-tag">${cat.titulo}</div>
        <p class="bs-question-text">${q.pergunta}</p>
        <div class="bs-options">
          ${q.opcoesEmbaralhadas.map((op, idx) => `
            <button class="bs-option" data-idx="${idx}">
              <span class="bs-option-letter">${LETRAS[idx]}</span>
              <span>${op}</span>
            </button>
          `).join('')}
        </div>
        <div id="bs-explain-slot"></div>
        <div class="bs-quiz-footer">
          <button class="bs-btn bs-btn-primary" id="bs-next-btn" disabled>
            ${state.i === questoes.length - 1 ? 'Ver resultado' : 'Próxima →'}
          </button>
        </div>
      </div>
    `;

    root.querySelectorAll('.bs-option').forEach((btn) => {
      btn.addEventListener('click', () => onResponder(q, Number(btn.dataset.idx)));
    });
    document.getElementById('bs-next-btn').addEventListener('click', onProximo);
  }

  function onResponder(q, idx) {
    if (state.respondida) return;
    state.respondida = true;
    const acertou = idx === q.corretaEmbaralhada;
    if (acertou) state.acertos += 1;

    root.querySelectorAll('.bs-option').forEach((btn) => {
      const btnIdx = Number(btn.dataset.idx);
      btn.disabled = true;
      if (btnIdx === q.corretaEmbaralhada) btn.classList.add('correct');
      else if (btnIdx === idx) btn.classList.add('wrong');
      else btn.classList.add('dim');
    });

    document.getElementById('bs-explain-slot').innerHTML = `
      <div class="bs-explain">
        <b>${acertou ? 'Correto' : 'Explicação'}</b>
        ${q.explicacao}
      </div>
    `;
    document.getElementById('bs-next-btn').disabled = false;
  }

  function onProximo() {
    state.i += 1;
    if (state.i >= questoes.length) {
      finalizar();
    } else {
      renderQuestao();
    }
  }

  function finalizar() {
    saveAttempt(cat.id, state.acertos, questoes.length);
    const pct = Math.round((state.acertos / questoes.length) * 100);
    const msg = pct === 100
      ? 'Perfeito! Domínio total do básico.'
      : pct >= 70
      ? 'Muito bom! Você já tem uma boa base.'
      : pct >= 40
      ? 'No caminho certo — revise os pontos que errou.'
      : 'Vale a pena revisar o conteúdo e tentar de novo.';

    root.innerHTML = `
      <div class="bs-result">
        <div class="bs-result-score">${state.acertos}<span class="bs-result-total">/${questoes.length}</span></div>
        <p class="bs-result-msg">${msg}</p>
        <div class="bs-result-actions">
          <button class="bs-btn bs-btn-primary bs-btn-block" id="bs-retry-btn">Refazer quiz</button>
          <a class="bs-btn bs-btn-ghost bs-btn-block" href="index.html">Voltar ao início</a>
        </div>
      </div>
    `;
    document.getElementById('bs-retry-btn').addEventListener('click', iniciar);
  }
}
