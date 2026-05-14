
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

export async function submitScore(points, username) {
  const user = await getCurrentUser();

  if (!user) return;

  const { error } = await supabase
    .from('leaderboard')
    .upsert({
      user_id: user.id,
      username,
      points,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

export async function getTopPlayers(limit = 10) {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('points', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return data;
}
