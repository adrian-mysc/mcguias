// Bit & Solda — progresso local (sem backend: tudo em localStorage)
const KEY = 'bs_progress';

export const CATEGORIAS = [
  { id: 'hardware', titulo: 'Hardware', desc: 'Componentes, montagem e conceitos de PC.', icon: '🖥️' },
  { id: 'manutencao', titulo: 'Manutenção de Eletrônicos', desc: 'Solda, multímetro, ESD e reparo de placas.', icon: '🔧' },
  { id: 'ti', titulo: 'Tecnologia da Informação', desc: 'Redes, sistemas, segurança e nuvem.', icon: '🌐' },
];

function defaultCatProgress() {
  return { attempts: 0, answered: 0, correct: 0, best: 0, lastScore: 0 };
}

export function getProgress() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { raw = {}; }
  const out = {};
  for (const c of CATEGORIAS) out[c.id] = Object.assign(defaultCatProgress(), raw[c.id] || {});
  return out;
}

export function saveAttempt(catId, correctCount, totalCount) {
  const progress = getProgress();
  const p = progress[catId];
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  p.attempts += 1;
  p.answered += totalCount;
  p.correct += correctCount;
  p.lastScore = pct;
  p.best = Math.max(p.best, pct);
  localStorage.setItem(KEY, JSON.stringify(progress));
  return progress;
}

export function overallStats(progress) {
  let answered = 0, correct = 0, attempts = 0;
  for (const c of CATEGORIAS) {
    answered += progress[c.id].answered;
    correct += progress[c.id].correct;
    attempts += progress[c.id].attempts;
  }
  const acc = answered > 0 ? Math.round((correct / answered) * 100) : 0;
  return { answered, correct, attempts, acc };
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
