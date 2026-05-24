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

    const aRatio = da.wrong / (da.correct + da.wrong + 1);
    const bRatio = db.wrong / (db.correct + db.wrong + 1);
    return bRatio - aRatio;
  });
}
