
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

export async function saveProgress(module, score, completed) {
  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await supabase
    .from('progress')
    .upsert(
      { user_id: user.id, module, score, completed },
      { onConflict: 'user_id,module' }
    );

  if (error) throw error;
}

export async function getProgress() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('progress')
    .select('module, score, completed, updated_at')
    .eq('user_id', user.id);

  if (error) throw error;
  return data;
}
