
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';
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

// Batch upsert — 1 request instead of N sequential calls
async function syncAchievements(conquistas) {
  if (!conquistas.length) return;
  const user = await getCurrentUser();
  if (!user) return;
  const rows = conquistas.map(key => ({ user_id: user.id, achievement_key: key }));
  const { error } = await supabase
    .from('achievements')
    .upsert(rows, { onConflict: 'user_id,achievement_key', ignoreDuplicates: true });
  if (error) console.error('sync achievements:', error);
}

async function syncLeaderboard(estatisticas) {
  const user = await getCurrentUser();
  if (!user) return;

  const perfilDados = mcGet('mc_perfil_dados', {});
  const username = mcGet('mc_username', null)
    || mcGet('mc_user_data', {}).username
    || perfilDados.apelido
    || perfilDados.nome
    || 'Jogador';
  const loja  = perfilDados.loja  || null;
  const sigla = perfilDados.sigla || null;

  // Fonte autoritativa: quiz_sessions no servidor (acumula entre dispositivos)
  const { data: sessions } = await supabase
    .from('quiz_sessions')
    .select('score')
    .eq('user_id', user.id);

  const serverPoints = (sessions || []).reduce((s, r) => s + (r.score || 0), 0);
  const serverXp     = sessions?.length ?? 0;

  // Fallback local — cobre sessões ainda não sincronizadas neste dispositivo
  const history     = mcGet('mc_quiz_history', []);
  const localPoints = history.reduce((s, h) => s + (h.score || 0), 0);
  const localXp     = estatisticas.quizzesCompletos || 0;

  // Usa sempre o maior valor: nunca perde pontos por troca de dispositivo
  const points  = Math.max(serverPoints, localPoints);
  const totalXp = Math.max(serverXp, localXp);

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
      await syncLeaderboard(gamData.estatisticas).catch(console.error);
    }
  }
}

// Sync completo após cada quiz: sessão + leaderboard + conquistas em paralelo
window.addEventListener('mc:quizComplete', (e) => {
  const gamData = mcGet('gamificacao', null);
  const tasks = [syncOneSession(e.detail).catch(console.error)];
  if (gamData?.estatisticas) tasks.push(syncLeaderboard(gamData.estatisticas).catch(console.error));
  if (gamData?.conquistas?.length) tasks.push(syncAchievements(gamData.conquistas).catch(console.error));
  Promise.all(tasks);
});

// Sincroniza automaticamente ao recuperar conexão
window.addEventListener('online', () => {
  syncToCloud().catch(console.error);
});
