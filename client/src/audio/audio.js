// ── Preloaded Audio Engine ────────────────────────────────────────────────────

// Sound instances preloaded into browser memory for zero latency
const SOUNDS = {
  click:      new Audio('/sounds/click.mp3'),
  hover:      new Audio('/sounds/click.mp3'), // Can share click or custom hover file
  correct:    new Audio('/sounds/correct.mp3'),
  wrong:      new Audio('/sounds/explosion.mp3'),
  explosion:  new Audio('/sounds/explosion.mp3'),
  pass:       new Audio('/sounds/click.mp3'),
  matchMusic: new Audio('/sounds/match_music.mp3'),
  menuMusic:  new Audio('/sounds/menu_music.mp3'),
};

// Configure settings
Object.values(SOUNDS).forEach((audio) => {
  audio.preload = 'auto';
});

SOUNDS.matchMusic.loop = true;
SOUNDS.menuMusic.loop  = true;
SOUNDS.matchMusic.volume = 0.4;
SOUNDS.menuMusic.volume  = 0.4;

// Play SFX cleanly by resetting current position
function playSFX(audio, volume = 1.0) {
  try {
    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (_) {}
}

// ── Ticking Engine ────────────────────────────────────────────────────────────

let tickInterval = null;
let currentTickDelay = 1000;

export function startTicking(initialPct = 1.0) {
  stopTicking(); // Always clear previous intervals first
  updateTickRate(initialPct);
}

export function updateTickRate(pctLeft) {
  // Faster ticking as time runs low
  const newDelay = Math.max(150, Math.floor(1000 * Math.max(0.1, pctLeft)));

  if (tickInterval && Math.abs(newDelay - currentTickDelay) < 50) return;

  currentTickDelay = newDelay;
  if (tickInterval) clearInterval(tickInterval);

  tickInterval = setInterval(() => {
    playSFX(SOUNDS.click, 0.25);
  }, currentTickDelay);
}

export function stopTicking() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

// ── Exported Audio Controls ───────────────────────────────────────────────────

export function playClick()     { playSFX(SOUNDS.click, 0.6); }
export function playHover()     { playSFX(SOUNDS.hover, 0.2); }
export function playCorrect()   { playSFX(SOUNDS.correct, 0.8); }
export function playWrong()     { playSFX(SOUNDS.wrong, 0.8); }
export function playExplosion() { playSFX(SOUNDS.explosion, 1.0); }
export function playPassBomb()  { playSFX(SOUNDS.pass, 0.7); }

export function startMatchMusic() {
  SOUNDS.menuMusic.pause();
  SOUNDS.matchMusic.currentTime = 0;
  SOUNDS.matchMusic.play().catch(() => {});
}

export function startMenuMusic() {
  SOUNDS.matchMusic.pause();
  SOUNDS.menuMusic.currentTime = 0;
  SOUNDS.menuMusic.play().catch(() => {});
}

export function stopAllMusic() {
  SOUNDS.matchMusic.pause();
  SOUNDS.menuMusic.pause();
}