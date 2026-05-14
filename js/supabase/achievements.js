
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

export async function unlockAchievement(key) {
  const user = await getCurrentUser();

  if (!user) return;

  const { error } = await supabase
    .from('achievements')
    .insert({
      user_id: user.id,
      achievement_key: key
    });

  if (error) {
    console.error(error);
  }
}
