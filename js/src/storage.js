// ── Storage — McStorage · migrations · analytics ──────────────

var McStorage = (function() {
  function get(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return (fallback !== undefined) ? fallback : null;
      try { return JSON.parse(raw); } catch(e) { return raw; }
    } catch(e) { return (fallback !== undefined) ? fallback : null; }
  }
  function set(key, value) {
    try {
      localStorage.setItem(key, (typeof value === 'string') ? value : JSON.stringify(value));
      return true;
    } catch(e) {
      if (e && e.name === 'QuotaExceededError') {
        console.warn('[MC Guias] localStorage cheio. Dado não salvo:', key);
      }
      return false;
    }
  }
  function remove(key) { try { localStorage.removeItem(key); } catch(e) {} }
  return { get: get, set: set, remove: remove };
})();

/* ── Migração única: mc_sr_data + mcg_srs_v1 → mc_sr_v2 ── */
(function migrateSRKeys() {
  try {
    var sr2 = JSON.parse(localStorage.getItem('mc_sr_v2') || '{}');
    var changed = false;
    var old1 = localStorage.getItem('mc_sr_data');
    if (old1 && !sr2.hashData) {
      try { sr2.hashData = JSON.parse(old1); changed = true; } catch(e) {}
      localStorage.removeItem('mc_sr_data');
    }
    var old2 = localStorage.getItem('mcg_srs_v1');
    if (old2 && !sr2.cardData) {
      try { sr2.cardData = JSON.parse(old2); changed = true; } catch(e) {}
      localStorage.removeItem('mcg_srs_v1');
    }
    if (changed) localStorage.setItem('mc_sr_v2', JSON.stringify(sr2));
  } catch(e) {}
})();

function trackAnswer(qId, isCorrect, elapsedMs, qText) {
  if (!qId) return;
  var data = McStorage.get('mc_analytics', {});
  if (!data[qId]) data[qId] = { answered: 0, correct: 0, wrong: 0, totalMs: 0, text: '' };
  data[qId].answered++;
  if (isCorrect) data[qId].correct++; else data[qId].wrong++;
  data[qId].totalMs += (elapsedMs || 0);
  if (qText && !data[qId].text) data[qId].text = qText;
  McStorage.set('mc_analytics', data);
}
