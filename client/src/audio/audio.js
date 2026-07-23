/**
 * audio.js — SFX + music manager for Maths The Bomb
 *
 * Uses the Web Audio API for procedurally-generated tones as fallbacks,
 * and <audio> elements for real asset files.
 */

// ── Asset paths ─────────────────────────────────────────────────────────────
const ASSETS = {
  tick: "/sounds/tick.mp3",
  explosion: "/sounds/explosion.mp3",
  correct: "/sounds/correct.mp3",
  wrong: "/sounds/wrong.mp3",
  passBomb: "/sounds/pass_bomb.mp3",
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

// Global user-gesture listener for browser/mobile audio unlock
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

// ── Procedural tone generator (synthesizer) ──────────────────────────────────

function beep({
  frequency = 440,
  duration = 0.1,
  type = "sine",
  gainVal = 0.3,
  attack = 0.005,
  decay = 0.05,
} = {}) {
  try {
    const c = getCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime);
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(gainVal, c.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration + decay);
  } catch (_) {
    /* ignore AudioContext errors */
  }
}

// ── Real audio element loader ─────────────────────────────────────────────────

const loaded = {};

function loadAudio(key) {
  if (!ASSETS[key]) return null;
  if (loaded[key]) return loaded[key];

  const el = new Audio(ASSETS[key]);
  el.preload = "auto";
  el.addEventListener("error", () => {
    loaded[key] = null;
  });
  loaded[key] = el;
  return el;
}

function playAsset(key, { volume = 1, loop = false, playbackRate = 1 } = {}) {
  const el = loadAudio(key);
  if (!el) return null;

  try {
    el.currentTime = 0;
    el.volume = Math.min(1, Math.max(0, volume));
    el.loop = loop;
    el.playbackRate = playbackRate;
    const promise = el.play();
    if (promise !== undefined) {
      promise.catch(() => {});
    }
    return el;
  } catch (_) {
    return null;
  }
}

// ── Clone-play helper (plays rapid overlapping sounds without cutting off) ────

function playAssetClone(key, { volume = 1, playbackRate = 1 } = {}) {
  const source = loadAudio(key);
  if (!source || !source.src) return null;

  try {
    const clone = new Audio(source.src);
    clone.volume = Math.min(1, Math.max(0, volume));
    clone.playbackRate = playbackRate;
    const promise = clone.play();
    if (promise !== undefined) {
      promise.catch(() => {});
    }
    return clone;
  } catch (_) {
    return null;
  }
}

// ── Tick loop (bomb ticking, rate driven by pctLeft) ─────────────────────────

let tickInterval = null;
let currentTickIntervalMs = 0;

export function startTicking(pctLeft = 1) {
  const rate = Math.max(0.3, pctLeft);
  const intervalMs = Math.max(120, pctLeft * 900);

  if (tickInterval) clearInterval(tickInterval);
  currentTickIntervalMs = intervalMs;

  tickInterval = setInterval(() => {
    const played = playAssetClone("tick", {
      volume: 0.5,
      playbackRate: 1 / rate,
    });
    if (!played) {
      beep({ frequency: 800, duration: 0.04, type: "square", gainVal: 0.2 });
    }
  }, intervalMs);
}

export function updateTickRate(pctLeft) {
  if (!tickInterval) return;
  const intervalMs = Math.max(120, pctLeft * 900);

  if (Math.abs(intervalMs - currentTickIntervalMs) < 80) return;

  startTicking(pctLeft);
}

export function stopTicking() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = null;
  currentTickIntervalMs = 0;
  if (loaded.tick) loaded.tick.pause();
}

export function playTick() {
  const played = playAssetClone("tick", { volume: 0.3 });
  if (!played) {
    beep({ frequency: 800, duration: 0.04, type: "square", gainVal: 0.2 });
  }
}

// ── Sounds ────────────────────────────────────────────────────────────────────

export function playExplosion() {
  stopTicking();
  const el = playAsset("explosion", { volume: 0.9 });
  if (!el) {
    beep({ frequency: 80, duration: 0.8, type: "sawtooth", gainVal: 0.6 });
    setTimeout(
      () =>
        beep({ frequency: 40, duration: 0.4, type: "sawtooth", gainVal: 0.4 }),
      100,
    );
  }
}

export function playCorrect() {
  const el = playAsset("correct", { volume: 0.2 });
  if (!el) {
    beep({ frequency: 660, duration: 0.12, type: "sine", gainVal: 0.18 });
    setTimeout(
      () =>
        beep({ frequency: 880, duration: 0.15, type: "sine", gainVal: 0.15 }),
      100,
    );
  }
}

export function playWrong() {
  const el = playAsset("wrong", { volume: 0.7 });
  if (!el) {
    beep({ frequency: 200, duration: 0.35, type: "sawtooth", gainVal: 0.4 });
  }
}

// Directly uses Web Audio API beep synthesizer for button hover
export function playHover() {
  beep({ frequency: 1200, duration: 0.04, type: "sine", gainVal: 0.08 });
}

export function playClick() {
  const el = playAsset("click", { volume: 0.4 });
  if (!el) {
    beep({ frequency: 900, duration: 0.06, type: "square", gainVal: 0.15 });
  }
}

export function playPassBomb() {
  const el = playAsset("passBomb", { volume: 0.6 });
  if (!el) {
    beep({ frequency: 600, duration: 0.15, type: "sine", gainVal: 0.2 });
  }
}

// ── Procedural music sequencer ────────────────────────────────────────────────

const MENU_NOTES = [
  [523, 0.5], [659, 0.5], [784, 0.5], [659, 0.5],
  [698, 0.5], [880, 0.5], [784, 1.0], [0, 0.5],
  [523, 0.5], [587, 0.5], [659, 0.5], [523, 0.5],
  [440, 0.5], [523, 0.5], [392, 1.0], [0, 0.5],
];

const MATCH_NOTES = [
  [392, 0.25], [0, 0.25], [392, 0.25], [523, 0.5],
  [440, 0.25], [0, 0.25], [440, 0.25], [587, 0.5],
  [392, 0.25], [0, 0.25], [349, 0.25], [392, 0.5],
  [330, 0.25], [0, 0.25], [0, 0.5],   [392, 0.25],
];

function scheduleMusic(notes, tempoSec, gainVal, oscType) {
  let stopped = false;
  let tid = null;

  function step(i) {
    if (stopped) return;
    const [freq, beats] = notes[i % notes.length];
    const durationMs = beats * tempoSec * 1000;
    if (freq > 0 && !musicMuted) {
      beep({
        frequency: freq,
        duration: beats * tempoSec * 0.82,
        type: oscType,
        gainVal,
      });
    }
    tid = setTimeout(() => step(i + 1), durationMs);
  }

  step(0);
  return () => {
    stopped = true;
    if (tid) clearTimeout(tid);
  };
}

// ── Music state ───────────────────────────────────────────────────────────────

let menuMusicEl = null;
let matchMusicEl = null;
let musicMuted = false;
let stopProceduralMenu = null;
let stopProceduralMatch = null;

export function isMenuMusicMuted() {
  return musicMuted;
}

export function toggleMenuMusicMute() {
  musicMuted = !musicMuted;
  if (musicMuted) {
    if (menuMusicEl) menuMusicEl.pause();
    if (stopProceduralMenu) {
      stopProceduralMenu();
      stopProceduralMenu = null;
    }
  } else {
    startMenuMusic();
  }
  return musicMuted;
}

function tryPlayMusicFile(assetKey, volume, onFileFail) {
  const el = new Audio(ASSETS[assetKey]);
  el.loop = true;
  el.volume = volume;
  let failed = false;

  const handleFail = () => {
    if (failed) return;
    failed = true;
    onFileFail();
  };

  el.addEventListener("error", handleFail, { once: true });

  const promise = el.play();
  if (promise !== undefined) {
    promise.catch(() => {
      if (el.error) handleFail();
    });
  }
  return el;
}

export function startMenuMusic() {
  if (musicMuted) return;

  if (menuMusicEl && !menuMusicEl.paused) return;
  if (stopProceduralMenu) return;

  if (matchMusicEl) {
    matchMusicEl.pause();
    matchMusicEl = null;
  }
  if (stopProceduralMatch) {
    stopProceduralMatch();
    stopProceduralMatch = null;
  }

  menuMusicEl = tryPlayMusicFile("menuMusic", 0.3, () => {
    menuMusicEl = null;
    if (!musicMuted && !stopProceduralMenu) {
      stopProceduralMenu = scheduleMusic(MENU_NOTES, 0.28, 0.08, "square");
    }
  });
}

export function startMatchMusic() {
  if (menuMusicEl) {
    menuMusicEl.pause();
    menuMusicEl = null;
  }
  if (stopProceduralMenu) {
    stopProceduralMenu();
    stopProceduralMenu = null;
  }

  if (matchMusicEl && !matchMusicEl.paused) return;

  matchMusicEl = tryPlayMusicFile("matchMusic", 0.25, () => {
    matchMusicEl = null;
    if (!musicMuted && !stopProceduralMatch) {
      stopProceduralMatch = scheduleMusic(MATCH_NOTES, 0.18, 0.07, "square");
    }
  });
}

export function stopAllMusic() {
  if (menuMusicEl) {
    menuMusicEl.pause();
    menuMusicEl = null;
  }
  if (matchMusicEl) {
    matchMusicEl.pause();
    matchMusicEl = null;
  }
  if (stopProceduralMenu) {
    stopProceduralMenu();
    stopProceduralMenu = null;
  }
  if (stopProceduralMatch) {
    stopProceduralMatch();
    stopProceduralMatch = null;
  }
}

export function addBtnSounds(el) {
  if (!el) return;
  el.addEventListener("mouseenter", playHover);
  el.addEventListener("click", playClick);
}