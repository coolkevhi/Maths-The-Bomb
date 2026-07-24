/**
 * audio.js — SFX + music manager for Maths The Bomb
 *
 * Fully optimized with Web Audio API synthesis for zero-latency,
 * leak-proof ticking and non-blocking music state management.
 */

const ASSETS = {
  tick: "/sounds/tick.mp3",
  explosion: "/sounds/explosion.mp3",
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  passBomb: "/sounds/pass_bomb.mp3",
  hover: "/sounds/hover.mp3",
  click: "/sounds/click.mp3",
  menuMusic: "/sounds/menu_music.mp3",
  matchMusic: "/sounds/match_music.mp3",
};

let ctx = null;

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

// Unlock audio context on user gesture
if (typeof window !== "undefined") {
  const unlockContext = () => {
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    window.removeEventListener("click", unlockContext);
    window.removeEventListener("touchstart", unlockContext);
    window.removeEventListener("keydown", unlockContext);
  };
  window.addEventListener("click", unlockContext);
  window.addEventListener("touchstart", unlockContext);
  window.addEventListener("keydown", unlockContext);
}

// ── Ultra-Fast Web Audio Synthesizer (Zero Memory Leaks) ──────────────────────

function playSynthesizedTick(volume = 0.2, pitch = 800) {
  try {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(pitch, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.035);
  } catch (_) {}
}

function beep({ frequency = 440, duration = 0.1, type = "sine", gainVal = 0.3 } = {}) {
  try {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    gain.gain.setValueAtTime(gainVal, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch (_) {}
}

// ── Cached Audio Objects (Prevents Memory Accumulation) ─────────────────────

const loadedAudio = {};

function getAudioElement(key) {
  if (typeof window === "undefined") return null;
  if (!loadedAudio[key]) {
    const el = new Audio(ASSETS[key]);
    el.preload = "auto";
    loadedAudio[key] = el;
  }
  return loadedAudio[key];
}

function playSFX(key, volume = 0.5) {
  try {
    const el = getAudioElement(key);
    if (el) {
      el.currentTime = 0;
      el.volume = volume;
      el.play().catch(() => {
        // Fall back to synth if media file fails
        if (key === 'click' || key === 'hover') playSynthesizedTick(volume, 600);
      });
    }
  } catch (_) {}
}

// ── Robust Ticking Loop ───────────────────────────────────────────────────────

let tickInterval = null;
let currentIntervalMs = 0;

export function startTicking(pctLeft = 1) {
  stopTicking();

  const intervalMs = Math.max(120, Math.floor(pctLeft * 900));
  currentIntervalMs = intervalMs;

  tickInterval = setInterval(() => {
    playSynthesizedTick(0.18, 850); // Direct hardware sound, 0% CPU overhead
  }, intervalMs);
}

export function updateTickRate(pctLeft) {
  if (!tickInterval) return;
  const intervalMs = Math.max(120, Math.floor(pctLeft * 900));
  if (Math.abs(intervalMs - currentIntervalMs) < 90) return; // Ignore micro-shifts to avoid timer stutter
  startTicking(pctLeft);
}

export function stopTicking() {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  currentIntervalMs = 0;
}

// ── Exported SFX Controls ─────────────────────────────────────────────────────

export function playExplosion() {
  stopTicking(); // Instantly kill ticking when explosion fires
  playSFX("explosion", 0.9);
  beep({ frequency: 80, duration: 0.5, type: "sawtooth", gainVal: 0.5 });
}

export function playCorrect() {
  playSFX("correct", 0.3);
  beep({ frequency: 880, duration: 0.12, type: "sine", gainVal: 0.2 });
}

export function playWrong() {
  playSFX("wrong", 0.6);
  beep({ frequency: 180, duration: 0.3, type: "sawtooth", gainVal: 0.3 });
}

export function playHover() {
  playSFX("hover", 0.2);
}

export function playClick() {
  playSFX("click", 0.4);
}

export function playPassBomb() {
  playSFX("passBomb", 0.6);
}

// ── Music Manager ─────────────────────────────────────────────────────────────

let activeMusic = null;
let currentTrackKey = null;
let musicMuted = false;

export function isMenuMusicMuted() {
  return musicMuted;
}

export function toggleMenuMusicMute() {
  musicMuted = !musicMuted;
  if (musicMuted && activeMusic) {
    activeMusic.pause();
  } else if (!musicMuted && currentTrackKey === "menuMusic") {
    startMenuMusic();
  }
  return musicMuted;
}

function playMusicTrack(key, volume = 0.3) {
  if (musicMuted) return;
  if (currentTrackKey === key && activeMusic && !activeMusic.paused) {
    return; // Keep playing seamless track
  }

  stopAllMusic();

  const el = getAudioElement(key);
  if (el) {
    el.loop = true;
    el.volume = volume;
    el.currentTime = 0;
    activeMusic = el;
    currentTrackKey = key;
    el.play().catch(() => {});
  }
}

export function startMenuMusic() {
  playMusicTrack("menuMusic", 0.3);
}

export function startMatchMusic() {
  playMusicTrack("matchMusic", 0.25);
}

export function stopAllMusic() {
  stopTicking();
  if (activeMusic) {
    activeMusic.pause();
    activeMusic = null;
  }
  currentTrackKey = null;
}

export function addBtnSounds(el) {
  if (!el) return;
  el.addEventListener("mouseenter", playHover);
  el.addEventListener("click", playClick);
}