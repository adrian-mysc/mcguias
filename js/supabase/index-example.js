
import {
  signIn,
  signUp,
  signOut
} from './auth.js';

import {
  saveProgress,
  getProgress
} from './progress.js';

import {
  unlockAchievement
} from './achievements.js';

import {
  submitScore,
  getTopPlayers
} from './leaderboard.js';

import './sync.js';

async function bootstrap() {
  console.log('Supabase integration ready');
}

bootstrap();
