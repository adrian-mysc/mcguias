
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';
import { submitScore } from './leaderboard.js';
import { unlockAchievement } from './achievements.js';

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

  // history é ordenado do mais novo (índice 0) para o mais antigo
  // os "novos" são os primeiros `newCount` itens
  const toSync = history.slice(0, newCount);

  const rows = toSync.map(h => ({
    user_id:    userId,
    guide:      h.guia || 'desconhecido',
    score:      h.score  || 0,
    total:      h.total  || 0,
    percentage: h.total > 0 ? Math.round((h.score / h.total) * 100) : 0,
  }));

  const { error } = await supabase.from('quiz_sessions').insert(rows);
  if (error) {
    console.error('sync quiz_sessions:', error);
    return;
  }

  localStorage.setItem('mc_sessions_synced', JSON.stringify(history.length));
}

async function syncAchievements(conquistas) {
  for (const key of conquistas) {
    await unlockAchievement(key);
  }
}

async function syncLeaderboard(userId, estatisticas) {
  const username = mcGet('mc_username', null)
    || mcGet('mc_user_data', {}).username
    || 'Jogador';

  // Points = total correct answers (h.score), not total questions attempted
  const history = mcGet('mc_quiz_history', []);
  const points  = history.reduce((s, h) => s + (h.score || 0), 0);
  const totalXp = estatisticas.quizzesCompletos || 0;

  const perfilDados = mcGet('mc_perfil_dados', {});
  const loja  = perfilDados.loja  || null;
  const sigla = perfilDados.sigla || null;

  await submitScore(points, username, totalXp, loja, sigla);
}

// Sync de uma única sessão — chamado imediatamente após cada quiz
export async function syncOneSession({ guia, score, total }) {
  const user = await getCurrentUser();
  if (!user) return;

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const { error } = await supabase.from('quiz_sessions').insert({
    user_id: user.id,
    guide:   guia || 'desconhecido',
    score:   score  || 0,
    total:   total  || 0,
    percentage,
  });

  if (error) throw error;

  // Avança o contador para que syncQuizSessions não re-sincronize esta sessão
  const prev = (() => {
    try { return JSON.parse(localStorage.getItem('mc_sessions_synced') || '0'); } catch { return 0; }
  })();
  localStorage.setItem('mc_sessions_synced', JSON.stringify(prev + 1));
}

export async function syncToCloud() {
  const user = await getCurrentUser();
  if (!user) return;

  await syncQuizSessions(user.id);

  const gamData = mcGet('gamificacao', null);
  if (gamData) {
    if (Array.isArray(gamData.conquistas) && gamData.conquistas.length) {
      await syncAchievements(gamData.conquistas);
    }
    if (gamData.estatisticas) {
      await syncLeaderboard(user.id, gamData.estatisticas).catch(console.error);
    }
  }
}

// Sync imediato após cada quiz (disparado por main.js via CustomEvent)
window.addEventListener('mc:quizComplete', (e) => {
  syncOneSession(e.detail).catch(console.error);
});

// Sincroniza automaticamente ao recuperar conexão
window.addEventListener('online', () => {
  syncToCloud().catch(console.error);
});
