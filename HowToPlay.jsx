/**
 * stats.js — Per-mode persistent stats for Maths The Bomb
 * Stored in localStorage under 'mtb_stats'.
 *
 * Modes tracked: singleplayer, bots, quick, multiplayer (covers create + join)
 */

const KEY = 'mtb_stats';

const EMPTY_MODE_STATS = () => ({
  gamesPlayed: 0,
  wins: 0,
  totalCorrect: 0,
  bestRounds: 0,
  // singleplayer-only
  highScore: 0,
  totalScore: 0,
});

/** Normalize raw mode label to a storage bucket */
function bucket(mode) {
  if (mode === 'singleplayer') return 'singleplayer';
  if (mode === 'bots')         return 'bots';
  return 'multiplayer'; // quick, create, join, rematch all share one bucket
}

export function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (_) {
    return {};
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch (_) {}
}

/**
 * Record end-of-game results for a given mode.
 * @param {string} mode  - raw mode string from App state
 * @param {{ correctAnswers, survivedRounds, won }} myStats
 */
export function recordGame(mode, myStats) {
  const all = loadStats();
  const b = bucket(mode);
  const prev = all[b] || EMPTY_MODE_STATS();

  const score = myStats.score || 0;
  all[b] = {
    gamesPlayed:  prev.gamesPlayed + 1,
    wins:         prev.wins + (myStats.won ? 1 : 0),
    totalCorrect: prev.totalCorrect + (myStats.correctAnswers || 0),
    bestRounds:   Math.max(prev.bestRounds, myStats.survivedRounds || 0),
    // singleplayer score tracking
    highScore:    Math.max(prev.highScore || 0, score),
    totalScore:   (prev.totalScore || 0) + score,
  };

  saveStats(all);
}

/** Compute win rate (0–100) */
export function winRate(modeStat) {
  if (!modeStat || modeStat.gamesPlayed === 0) return 0;
  return Math.round((modeStat.wins / modeStat.gamesPlayed) * 100);
}
