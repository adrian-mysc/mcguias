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

  // O ponteiro mc_sessions_synced é só uma CONTAGEM — não diz QUAIS sessões já
  // subiram. Como o unshift coloca a sessão nova no INÍCIO do array (e o
  // syncOneSession avança o ponteiro por ela), uma "fatia" pelo ponteiro erra o
  // alvo: pega as sessões mais antigas (já na nuvem) e nunca as novas. Por isso
  // reenviamos TODO o histórico que tem csid — o upsert é idempotente por
  // (user_id, client_session_id), então o servidor ignora as duplicatas e
  // nenhuma sessão pendente fica para trás (corrige o sync que só pegava as
  // sessões quando rodava o botão manual). Linhas sem csid são puladas: NULL
  // nunca colide no índice único, então cada reenvio criaria uma linha nova.
  const rows = history
    .filter(h => h.csid)
    .map(h => ({
      user_id:           userId,
      guide:             h.guia || 'desconhecido',
      score:             h.score  || 0,
      total:             h.total  || 0,
      percentage:        h.total > 0 ? Math.round((h.score / h.total) * 100) : 0,
      client_session_id: h.csid,
    }));

  if (!rows.length) {
    localStorage.setItem('mc_sessions_synced', JSON.stringify(history.length));
    return;
  }

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
  // `sigla` cai para `loja` porque o campo do perfil já É a sigla do
  // restaurante. Perfis salvos antes de a sigla passar a ser gravada só têm
  // `loja` — sem o fallback eles continuariam sem sigla no ranking.
  const sigla = perfilDados.sigla || loja || null;

  // points/total_xp são derivados de quiz_sessions pelo trigger do banco.
  // Aqui só mantemos os dados de identidade do jogador no ranking.
  await submitScore(username, loja, sigla);
}

// Empurra só a identidade (nome/loja/sigla) para a tabela leaderboard.
// Usado pelo perfil logo após salvar, para o ranking refletir a edição sem
// esperar o próximo quiz.
export const syncIdentidade = syncLeaderboard;

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
      // SEMPRE inclui completed_at (null quando não concluído). O PostgREST
      // rejeita o bulk upsert com 400 (PGRST102) quando os objetos do array têm
      // CONJUNTOS DE CHAVES diferentes — o spread condicional anterior fazia
      // exatamente isso (só os concluídos tinham completed_at), quebrando 100%
      // dos syncs de desafios semanais (visível como POST 400 nos logs da API).
      completed_at:  completed ? new Date().toISOString() : null,
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
