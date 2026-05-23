
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

export async function submitScore(points, username, totalXp = 0, loja = null, sigla = null) {
  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from('leaderboard')
    .upsert(
      { user_id: user.id, username, points, total_xp: totalXp, loja, sigla },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}

export async function getUserRank() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: myRow } = await supabase
    .from('leaderboard')
    .select('points, username, total_xp')
    .eq('user_id', user.id)
    .single();

  if (!myRow) return null;

  const { count } = await supabase
    .from('leaderboard')
    .select('*', { count: 'exact', head: true })
    .gt('points', myRow.points);

  return { rank: (count ?? 0) + 1, ...myRow };
}

// ── 100% online: dados diretos do Supabase ──────────────────────────────────

export async function getOnlineLeaderboard(limit = 20) {
  const { data, error } = await supabase.rpc('get_leaderboard', { lim: limit });
  if (error) throw error;
  return data ?? [];
}

export async function getOnlineUserRank() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('get_user_rank', { uid: user.id });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function getTopPlayers(limit = 10) {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('username, points, total_xp, loja, sigla, updated_at')
    .order('points', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
