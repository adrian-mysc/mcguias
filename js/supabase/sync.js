
import { saveProgress } from './progress.js';

export async function syncLocalProgress() {
  const local = JSON.parse(
    localStorage.getItem('mcguias_progress') || '[]'
  );

  for (const item of local) {
    try {
      await saveProgress(
        item.module,
        item.score,
        item.completed
      );
    } catch (err) {
      console.error('Sync failed:', err);
    }
  }
}

window.addEventListener('online', () => {
  syncLocalProgress();
});
