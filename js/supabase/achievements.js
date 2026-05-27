
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

export async function unlockAchievement(key) {
  const user = await getCurrentUser();
  if (!user) return;

  // ignoreDuplicates garante idempotência: não falha se já desbloqueada
  const { error } = await supabase
    .from('achievements')
    .upsert(
      { user_id: user.id, achievement_key: key },
      { onConflict: 'user_id,achievement_key', ignoreDuplicates: true }
    );

  if (error) throw error;
}

export async function getAchievements() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('achievements')
    .select('achievement_key, unlocked_at')
    .eq('user_id', user.id)
    .order('unlocked_at', { ascending: false });

  if (error) throw error;
  return data;
}
