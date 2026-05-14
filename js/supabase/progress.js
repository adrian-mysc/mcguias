
import { supabase } from './config.js';
import { getCurrentUser } from './auth.js';

export async function saveProgress(module, score, completed) {
  const user = await getCurrentUser();

  if (!user) return;

  const payload = {
    user_id: user.id,
    module,
    score,
    completed,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('progress')
    .upsert(payload);

  if (error) throw error;
}

export async function getProgress() {
  const user = await getCurrentUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;

  return data;
}
