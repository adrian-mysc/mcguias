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
