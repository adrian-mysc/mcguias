/* leaderboard.js — operações de ranking via REST puro (sem SDK/esm.sh). */
import { db } from './rest.js';

// Apenas identidade — points/total_xp são derivados de quiz_sessions pelo
// trigger do banco. NÃO escreva points/total_xp daqui.
export async function submitScore(username, loja = null, sigla = null) {
  const userId = await db.getUserId();
  if (!userId) return;
  await db.upsert('leaderboard',
    { user_id: userId, username, loja, sigla },
    { onConflict: 'user_id' });
}

// Fallback (lê leaderboard direto). Usado quando a RPC falha.
export async function getUserRank() {
  const userId = await db.getUserId();
  if (!userId) return null;

  const myRow = await db.select('leaderboard', {
    columns: 'points, username, total_xp', match: { user_id: userId }, single: true
  }).catch(() => null);
  if (!myRow) return null;

  const ahead = await db.count('leaderboard', { gt: { points: myRow.points } }).catch(() => 0);
  return { rank: ahead + 1, ...myRow };
}

// ── 100% online: dados via RPC ──────────────────────────────────────────────
export async function getOnlineLeaderboard(limit = 20) {
  return (await db.rpc('get_leaderboard', { lim: limit })) ?? [];
}

export async function getOnlineUserRank() {
  const userId = await db.getUserId();
  if (!userId) return null;
  const data = await db.rpc('get_user_rank', { uid: userId });
  return (data && data[0]) ?? null;
}

export async function getTopPlayers(limit = 10) {
  return await db.select('leaderboard', {
    columns: 'user_id, username, points, total_xp, loja, sigla, updated_at',
    order: 'points.desc', limit
  });
}

export async function getAvatarsByUserIds(userIds) {
  if (!userIds.length) return {};
  const data = await db.select('profiles', { columns: 'id, avatar', in: { id: userIds } });
  const map = {};
  for (const row of (data ?? [])) {
    if (row.avatar) map[row.id] = row.avatar;
  }
  return map;
}
