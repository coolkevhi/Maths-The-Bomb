/**
 * audio.js — SFX + music manager for Maths The Bomb
 */

const SOUND_FILES = {
  click:      "/sounds/click.mp3",
  correct:    "/sounds/correct.mp3",
  explosion:  "/sounds/explosion.mp3",
  matchMusic: "/sounds/match_music.mp3",
  menuMusic:  "/sounds/menu_music.mp3",
};

let ctx = null;
const audioCache = {};

// ── Preload All Existing Assets On Startup (0ms Latency) ─────────────────────
if (typeof window !== "undefined") {
  Object.keys(SOUND_FILES).forEach((key) => {
    const a = new Audio(SOUND_FILES[key]);
    a.preload = "auto";
    audioCache[key] = a;
  });

  const unlockContext = () => {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener("click", unlockContext);
    window.removeEventListener("touchstart", unlockContext);
    window.removeEventListener("keydown", unlockContext);
  };

  window.addEventListener("click", unlockContext);
  window.addEventListener("touchstart", unlockContext);
  window.addEventListener("keydown", unlockContext);
}

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ctx = new AudioCtx();
  }
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// ── Instant Web Audio Synthesizer (Zero Delay / Zero Memory Leak) ─────────────
function playSynthesizedTone({ frequency = 440, duration = 0.08, type = "sine", volume = 0.2 } = {}) {
  try {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch (_) {}
}

// ── Play Preloaded SFX Instantly ──────────────────────────────────────────────
function playSFX(key, volume = 0.5) {
  if (typeof window === "undefined") return;
  try {
    const file = SOUND_FILES[key];
    if (!file) return;
    
    // Play using cached source for instantaneous response
    const sfx = new Audio(file);
    sfx.volume = volume;
    const p = sfx.play();
    if (p !== undefined) p.catch(() => {});
  } catch (_) {}
}

// ── Ticking Engine ────────────────────────────────────────────────────────────
let tickInterval = null;
let currentIntervalMs = 0;

export function startTicking(pctLeft = 1) {
  stopTicking();
  const intervalMs = Math.max(120, Math.floor(pctLeft * 900));
  currentIntervalMs = intervalMs;

  tickInterval = setInterval(() => {
    playSynthesizedTone({ frequency: 850, duration: 0.03, type: "sine", volume: 0.15 });
  }, intervalMs);
}

export function updateTickRate(pctLeft) {
  if (!tickInterval) return;
  const intervalMs = Math.max(120, Math.floor(pctLeft * 900));
  if (Math.abs(intervalMs - currentIntervalMs) < 90) return;
  startTicking(pctLeft);
}

export function stopTicking() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  currentIntervalMs = 0;
}

// ── SFX Exports ───────────────────────────────────────────────────────────────
export function playClick()     { playSFX("click", 0.5); }
export function playHover()     { playSynthesizedTone({ frequency: 1200, duration: 0.03, type: "sine", volume: 0.08 }); }
export function playCorrect()   { playSFX("correct", 0.6); }
export function playWrong()     { playSynthesizedTone({ frequency: 220, duration: 0.25, type: "sawtooth", volume: 0.25 }); }
export function playExplosion() { stopTicking(); playSFX("explosion", 0.9); }
export function playPassBomb()  { playSFX("click", 0.4); }

// ── Music Manager ─────────────────────────────────────────────────────────────
let currentMusicKey = null;
let musicMuted = false;

export function isMenuMusicMuted() {
  return musicMuted;
}

export function toggleMenuMusicMute() {
  musicMuted = !musicMuted;
  if (musicMuted && currentMusicKey && audioCache[currentMusicKey]) {
    audioCache[currentMusicKey].pause();
  } else if (!musicMuted && currentMusicKey === "menuMusic") {
    startMenuMusic();
  }
  return musicMuted;
}

function playMusicTrack(key, volume = 0.3) {
  if (musicMuted || typeof window === "undefined") return;

  // Don't restart if already playing
  if (currentMusicKey === key && audioCache[key] && !audioCache[key].paused) {
    return;
  }

  stopAllMusic();

  const track = audioCache[key] || new Audio(SOUND_FILES[key]);
  if (track) {
    track.loop = true;
    track.volume = volume;
    track.currentTime = 0;
    currentMusicKey = key;
    const p = track.play();
    if (p !== undefined) p.catch(() => {});
  }
}

export function startMenuMusic() {
  playMusicTrack("menuMusic", 0.3);
}

export function startMatchMusic() {
  playMusicTrack("matchMusic", 0.25);
}

export function stopAllMusic() {
  if (currentMusicKey && audioCache[currentMusicKey]) {
    audioCache[currentMusicKey].pause();
    audioCache[currentMusicKey].currentTime = 0;
  }
  currentMusicKey = null;
}

export function addBtnSounds(el) {
  if (!el) return;
  el.addEventListener("mouseenter", playHover);
  el.addEventListener("click", playClick);
}