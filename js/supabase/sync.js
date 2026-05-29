/* ============================================================
   sync.js — sincronização de quiz/leaderboard/conquistas/desafios
   ------------------------------------------------------------
   Usa REST direto (rest.js), SEM o SDK (esm.sh). Esse era o ponto
   de falha que impedia a maioria dos usuários de sincronizar.
   Best-effort: erros são logados, nunca quebram a página.
   ============================================================ */
import { db } from './rest.js';
import { submitScore } from './leaderboard.js';

function mcGet(key, def) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return def;
    return JSON.parse(raw);
  } catch {
    return def;
  }
}

async function syncQuizSessions(userId) {
  const history = mcGet('mc_quiz_history', []);
  if (!history.length) return;

  const alreadySynced = mcGet('mc_sessions_synced', 0);
  const newCount = Math.max(0, history.length - alreadySynced);
  if (!newCount) return;

  // history is newest-first (unshift), so the unsynced items are at the END
  const toSync = history.slice(-newCount);

  const rows = toSync.map(h => ({
    user_id:           userId,
    guide:             h.guia || 'desconhecido',
    score:             h.score  || 0,
    total:             h.total  || 0,
    percentage:        h.total > 0 ? Math.round((h.score / h.total) * 100) : 0,
    client_session_id: h.csid || null,
  }));

  try {
    // upsert idempotente: se o ponteiro dessincronizar, sessões com o mesmo
    // client_session_id não são duplicadas (evita inflar a pontuação)
    await db.upsert('quiz_sessions', rows, { onConflict: 'user_id,client_session_id', ignoreDuplicates: true });
    localStorage.setItem('mc_sessions_synced', JSON.stringify(history.length));
  } catch (error) {
    console.error('sync quiz_sessions:', error);
    // não avança o ponteiro — próxima sync tenta de novo
  }
}

// Batch upsert — 1 request instead of N sequential calls
async function syncAchievements(conquistas) {
  if (!conquistas.length) return;
  const userId = await db.getUserId();
  if (!userId) return;
  const rows = conquistas.map(key => ({ user_id: userId, achievement_key: key }));
  try {
    await db.upsert('achievements', rows, { onConflict: 'user_id,achievement_key', ignoreDuplicates: true });
  } catch (error) { console.error('sync achievements:', error); }
}

async function syncLeaderboard() {
  const userId = await db.getUserId();
  if (!userId) return;

  const perfilDados = mcGet('mc_perfil_dados', {});
  const username = mcGet('mc_username', null)
    || perfilDados.apelido
    || perfilDados.nome
    || 'Jogador';
  const loja  = perfilDados.loja  || null;
  const sigla = perfilDados.sigla || null;

  // points/total_xp são derivados de quiz_sessions pelo trigger do banco.
  // Aqui só mantemos os dados de identidade do jogador no ranking.
  await submitScore(username, loja, sigla);
}

// ─── Desafios Semanais ────────────────────────────────────────────────────────

// Mapeamento campo localStorage → challenge_key (espelha DESAFIOS em gamificacao.js)
const DESAFIOS_MAP = [
  { id: 'guerreiro_chapa',    campo: 'perguntasChapa',      isArray: false },
  { id: 'faxina_geral',       campo: 'quizzesLimpeza',      isArray: false },
  { id: 'equilibrio',         campo: 'categoriasEstudadas', isArray: true  },
  { id: 'perfeccionista',     campo: 'quizPerfeito',        isArray: false },
  { id: 'maratonista',        campo: 'totalPerguntas',      isArray: false },
  { id: 'streak_imparavel',   campo: 'diasStreak',          isArray: false },
  { id: 'rei_flashcard',      campo: 'flashcardsSemanais',  isArray: false },
  { id: 'noturno',            campo: 'quizzesApos22hSem',   isArray: false },
  { id: 'explorador',         campo: 'categoriasEstudadas', isArray: true  },
  { id: 'mestre_producao',    campo: 'perguntasProducao',   isArray: false },
  { id: 'velocidade_drive',   campo: 'quizzesDrive',        isArray: false },
  { id: 'zero_erros_limpeza', campo: 'quizLimpezaPerfeito', isArray: false },
  { id: 'especialista_cresc', campo: 'guiasCrescimento',    isArray: true  },
  { id: 'dominio_bb',         campo: 'quizzesBBSem',        isArray: false },
];

async function syncWeeklyChallenges() {
  const userId = await db.getUserId();
  if (!userId) return;

  const gamData = mcGet('gamificacao', null);
  if (!gamData?.desafiosSemanais) return;

  const { semana: weekStart, progresso: prog, concluidos = [] } = gamData.desafiosSemanais;
  if (!weekStart) return;

  const rows = DESAFIOS_MAP.map(d => {
    const raw  = prog[d.campo];
    const progress = d.isArray ? (Array.isArray(raw) ? raw.length : 0) : (raw || 0);
    const completed = concluidos.includes(d.id);
    return {
      user_id:       userId,
      week_start:    weekStart,
      challenge_key: d.id,
      progress,
      completed,
      ...(completed ? { completed_at: new Date().toISOString() } : {}),
    };
  });

  try {
    await db.upsert('weekly_challenges', rows, { onConflict: 'user_id,week_start,challenge_key' });
  } catch (error) { console.error('sync weekly_challenges:', error); }
}

export { syncWeeklyChallenges };

// ─── Sessão única ─────────────────────────────────────────────────────────────

// Sync de uma única sessão — chamado imediatamente após cada quiz
export async function syncOneSession({ guia, score, total, csid }) {
  const userId = await db.getUserId();
  if (!userId) return;

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  // upsert idempotente por client_session_id — evita duplicar a sessão
  await db.upsert('quiz_sessions', {
    user_id:           userId,
    guide:             guia || 'desconhecido',
    score:             score  || 0,
    total:             total  || 0,
    percentage,
    client_session_id: csid || null,
  }, { onConflict: 'user_id,client_session_id', ignoreDuplicates: true });

  const prev = (() => {
    try { return JSON.parse(localStorage.getItem('mc_sessions_synced') || '0'); } catch { return 0; }
  })();
  localStorage.setItem('mc_sessions_synced', JSON.stringify(prev + 1));
}

export async function syncToCloud() {
  const userId = await db.getUserId();
  if (!userId) return;

  await syncQuizSessions(userId);

  await syncLeaderboard().catch(console.error);

  const gamData = mcGet('gamificacao', null);
  if (gamData) {
    if (Array.isArray(gamData.conquistas) && gamData.conquistas.length) {
      await syncAchievements(gamData.conquistas);
    }
    await syncWeeklyChallenges().catch(console.error);
  }
}

// Sync completo após cada quiz: sessão + leaderboard + conquistas + desafios em paralelo
// Lock evita race condition se dois quizzes terminarem em rápida sucessão
let _syncInProgress = false;
window.addEventListener('mc:quizComplete', async (e) => {
  if (_syncInProgress) return;
  _syncInProgress = true;
  try {
    const gamData = mcGet('gamificacao', null);
    const tasks = [
      syncOneSession(e.detail).catch(console.error),
      syncLeaderboard().catch(console.error),
      syncWeeklyChallenges().catch(console.error),
    ];
    if (gamData?.conquistas?.length) tasks.push(syncAchievements(gamData.conquistas).catch(console.error));
    await Promise.all(tasks);
  } finally {
    _syncInProgress = false;
  }
});

// Sincroniza automaticamente ao recuperar conexão
window.addEventListener('online', () => {
  syncToCloud().catch(console.error);
});

// Sincroniza sessões pendentes no carregamento da página (garante sync de histórico antigo)
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (navigator.onLine) syncToCloud().catch(console.error);
  });
}
