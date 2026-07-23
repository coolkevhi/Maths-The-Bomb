/**
 * audio.js — SFX + music manager for Maths The Bomb
 *
 * Uses the Web Audio API for procedurally-generated tones as fallbacks,
 * and <audio> elements for real asset files.
 *
 * TODO: Drop your royalty-free sound files into /client/public/sounds/ and
 * update the paths in the ASSETS map below.
 */

// ── Asset paths ─────────────────────────────────────────────────────────────
// TODO: Replace with real files from freesound.org or Kenney's audio packs.
const ASSETS = {
  tick: "/sounds/tick.mp3", // bomb fuse fizz
  explosion: "/sounds/explosion.mp3", // retro explode
  correct: "/sounds/correct.mp3", // correct answer chime
  wrong: "/sounds/wrong.mp3", // wrong answer buzzer
  passBomb: "/sounds/pass_bomb.mp3", // fast swoosh when bomb is passed
  hover: "/sounds/hover.mp3", // soft hover (no file — uses beep fallback)
  click: "/sounds/click.mp3", // button press
  menuMusic: "/sounds/menu_music.mp3", // 8-bit menu loop
  matchMusic: "/sounds/match_music.mp3", // in-game background loop
};

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// ── Procedural tone generator (fallback when no file is loaded) ───────────────

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
    /* ignore AudioContext errors in restricted envs */
  }
}

// ── Real audio element loader ─────────────────────────────────────────────────

const loaded = {};

function loadAudio(key) {
  if (loaded[key]) return loaded[key];
  const el = new Audio(ASSETS[key]);
  el.preload = "auto";
  el.addEventListener("error", () => {
    // File not found — fall back to procedural
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
    el.play().catch(() => {}); // autoplay may be blocked; ignore silently
    return el;
  } catch (_) {
    return null;
  }
}

// ── Clone-play helper (plays a fresh copy of an asset so overlapping calls don't cut each other off) ──

function playAssetClone(key, { volume = 1, playbackRate = 1 } = {}) {
  // Ensure the source element is loaded so we know the src path
  const source = loadAudio(key);
  if (!source || !source.src) return null;
  try {
    const clone = new Audio(source.src);
    clone.volume = Math.min(1, Math.max(0, volume));
    clone.playbackRate = playbackRate;
    clone.play().catch(() => {});
    return clone;
  } catch (_) {
    return null;
  }
}

// ── Tick loop (bomb ticking, rate driven by pctLeft) ─────────────────────────

let tickInterval = null;

export function startTicking(pctLeft = 1) {
  const rate = Math.max(0.3, pctLeft); // playbackRate: slow when full, fast when empty
  const intervalMs = Math.max(120, pctLeft * 900); // interval shrinks as time runs out

  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(() => {
    // Clone the tick element each time so rapid ticks don't cancel each other
    const played = playAssetClone("tick", {
      volume: 0.5,
      playbackRate: 1 / rate,
    });
    if (!played) {
      // Procedural tick fallback
      beep({ frequency: 800, duration: 0.04, type: "square", gainVal: 0.2 });
    }
  }, intervalMs);
}

export function updateTickRate(pctLeft) {
  if (!tickInterval) return;
  startTicking(pctLeft); // restarts with new rate
}

export function stopTicking() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = null;
  // Clones are fire-and-forget; only pause the source element if it somehow played
  if (loaded.tick) loaded.tick.pause();
}

// ── Sounds ────────────────────────────────────────────────────────────────────

export function playExplosion() {
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

export function playHover() {
  const el = playAsset("hover", { volume: 0.3 });
  if (!el) {
    beep({ frequency: 1200, duration: 0.04, type: "sine", gainVal: 0.08 });
  }
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

// Calm 8-bit menu melody (C major feel, square-wave)
const MENU_NOTES = [
  [523, 0.5],
  [659, 0.5],
  [784, 0.5],
  [659, 0.5],
  [698, 0.5],
  [880, 0.5],
  [784, 1.0],
  [0, 0.5],
  [523, 0.5],
  [587, 0.5],
  [659, 0.5],
  [523, 0.5],
  [440, 0.5],
  [523, 0.5],
  [392, 1.0],
  [0, 0.5],
];

// Faster tension loop for in-match music
const MATCH_NOTES = [
  [392, 0.25],
  [0, 0.25],
  [392, 0.25],
  [523, 0.5],
  [440, 0.25],
  [0, 0.25],
  [440, 0.25],
  [587, 0.5],
  [392, 0.25],
  [0, 0.25],
  [349, 0.25],
  [392, 0.5],
  [330, 0.25],
  [0, 0.25],
  [0, 0.5],
  [392, 0.25],
];

/**
 * Self-rescheduling note sequencer using setTimeout so timing stays tight.
 * Returns a stop() function.
 */
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
    // Unmuting: restart menu music from scratch
    startMenuMusic();
  }
  return musicMuted;
}

/**
 * Try to play the music file; if the file is missing (404/error), fall back to
 * the procedural sequencer so music always plays regardless of asset presence.
 */
function tryPlayMusicFile(assetKey, volume, onFileFail) {
  const el = new Audio(ASSETS[assetKey]);
  el.loop = true;
  el.volume = volume;
  // If the file fails to load, switch to procedural immediately
  el.addEventListener(
    "error",
    () => {
      onFileFail();
    },
    { once: true },
  );
  el.play().catch(() => {
    // Autoplay blocked — the error event will fire separately if file is missing
  });
  return el;
}

export function startMenuMusic() {
  stopAllMusic();
  if (musicMuted) return;

  menuMusicEl = tryPlayMusicFile("menuMusic", 0.3, () => {
    menuMusicEl = null;
    if (!musicMuted)
      stopProceduralMenu = scheduleMusic(MENU_NOTES, 0.28, 0.08, "square");
  });
}

export function startMatchMusic() {
  stopAllMusic();

  matchMusicEl = tryPlayMusicFile("matchMusic", 0.25, () => {
    matchMusicEl = null;
    if (!musicMuted)
      stopProceduralMatch = scheduleMusic(MATCH_NOTES, 0.18, 0.07, "square");
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

// ── Button sound hook helper ──────────────────────────────────────────────────

export function addBtnSounds(el) {
  if (!el) return;
  el.addEventListener("mouseenter", playHover);
  el.addEventListener("click", playClick);
}
