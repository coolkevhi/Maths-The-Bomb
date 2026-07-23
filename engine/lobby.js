/**
 * lobby.js
 * -----------------------------------------------------------------------
 * Lobby / matchmaking logic, independent of any networking layer.
 * If Replit AI adds real multiplayer, this is the piece that should sit
 * behind a WebSocket layer (e.g. Replit's built-in DB + a socket.io
 * server) — this file just defines the rules, not the transport.
 * -----------------------------------------------------------------------
 */

const ADJECTIVES = ['Speedy', 'Clever', 'Brave', 'Sneaky', 'Mighty', 'Quick', 'Jolly', 'Bold'];
const NOUNS = ['Fox', 'Otter', 'Falcon', 'Panda', 'Tiger', 'Comet', 'Rocket', 'Ninja'];
const BOT_NAMES = ['BotBuddy', 'CircuitSam', 'ByteBot', 'MathBot9000'];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Auto-generated name assigned to each player at startup, per blueprint. */
function generatePlayerName() {
  return `${randomFrom(ADJECTIVES)}${randomFrom(NOUNS)}${Math.floor(Math.random() * 100)}`;
}

/** Generates a short, shareable room code for "Create Lobby" / "Input Code". */
function generateRoomCode(length = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class Lobby {
  constructor({ hostId, isPrivate = false, maxPlayers = 8 }) {
    this.code = generateRoomCode();
    this.hostId = hostId;
    this.isPrivate = isPrivate;
    this.maxPlayers = maxPlayers;
    this.players = [];
    this.status = 'waiting'; // waiting -> countdown -> in-progress -> finished
  }

  addPlayer({ id, name, isBot = false, cosmetics = null, _socketId = null }) {
  if (this.players.length >= this.maxPlayers) {
    return { success: false, reason: 'lobby-full' };
  }

  const player = {
    id,
    name: name || generatePlayerName(),
    isBot,
    // Keep the Socket.IO connection ID for real players.
    // This is needed by Quick Match to send the player
    // into the correct Socket.IO room.
    _socketId,
    // Cosmetics forwarded from the client so all players can render
    // each other's equipped bomb/hand skins during gameplay.
    cosmetics: cosmetics || { bomb: 'bomb_default', hand: 'hand_blue' },
  };

  this.players.push(player);
  return { success: true, player };
 }

  removePlayer(id) {
    this.players = this.players.filter((p) => p.id !== id);
    // Auto-promote a new host if the host left
    if (this.hostId === id && this.players.length > 0) {
      this.hostId = this.players[0].id;
    }
  }

  /** "Play with Bots": tops off the lobby with AI players up to a target count. */
  fillWithBots(targetCount) {
    let botIndex = 0;
    while (this.players.length < targetCount && this.players.length < this.maxPlayers) {
      this.addPlayer({
        id: `bot-${Date.now()}-${botIndex}`,
        name: `${randomFrom(BOT_NAMES)}${botIndex}`,
        isBot: true,
      });
      botIndex += 1;
    }
    return this.players;
  }

  isReadyToStart() {
    return this.players.length >= 2;
  }
}

/**
 * Simple in-memory quick-match queue. Real deployment should back this
 * with Replit DB or a lightweight server-side store, but the matching
 * rule itself lives here.
 */
class QuickMatchQueue {
  constructor({ minPlayers = 2, maxWaitMs = 15000, fillWindowMs = 5000, maxPlayers = 8 } = {}) {
    this.minPlayers = minPlayers;
    this.maxWaitMs = maxWaitMs;
    // Once minPlayers is reached, we don't match instantly — we wait this
    // long to see if more players queue up, so quick match can grow beyond
    // just 2 people before locking the lobby in.
    this.fillWindowMs = fillWindowMs;
    this.maxPlayers = maxPlayers;
    this.waiting = []; // [{ id, name, joinedAt }]
    this._fillTimerStartedAt = null; // set once queue first hits minPlayers
  }

  join(player) {
    this.waiting.push({ ...player, joinedAt: Date.now() });
  }

  leave(id) {
    this.waiting = this.waiting.filter((p) => p.id !== id);
    // If we dropped back below minPlayers, cancel the fill window so it
    // restarts cleanly next time we cross the threshold.
    if (this.waiting.length < this.minPlayers) {
      this._fillTimerStartedAt = null;
    }
  }

  /**
   * Snapshot of queue state for broadcasting to waiting clients
   * (e.g. "3 players found, starting in 4s"). Call AFTER tryFormMatch()
   * in the same tick so _fillTimerStartedAt is already up to date.
   */
  getStatus() {
    const count = this.waiting.length;
    if (count < this.minPlayers || this._fillTimerStartedAt === null) {
      return { count, minPlayers: this.minPlayers, maxPlayers: this.maxPlayers, secondsLeft: null };
    }
    const elapsed = Date.now() - this._fillTimerStartedAt;
    const secondsLeft = Math.max(0, Math.ceil((this.fillWindowMs - elapsed) / 1000));
    return { count, minPlayers: this.minPlayers, maxPlayers: this.maxPlayers, secondsLeft };
  }

  /**
   * Call this on an interval (e.g. every second) from the server tick.
   * Returns a formed lobby once:
   *   - the queue is full (hit maxPlayers), OR
   *   - the fill window has elapsed since we first had >= minPlayers waiting
   * Below minPlayers, always returns null (no bots backfilled here).
   */
 tryFormMatch() {
  // Quick Match requires real players.
  // Do not start a match with a bot just because someone has waited.
  if (this.waiting.length < this.minPlayers) {
    this._fillTimerStartedAt = null;
    return null;
  }

  // Just crossed the threshold — start the fill window instead of
  // matching immediately, so late joiners can still get in.
  if (this._fillTimerStartedAt === null) {
    this._fillTimerStartedAt = Date.now();
  }

  const windowElapsed = Date.now() - this._fillTimerStartedAt >= this.fillWindowMs;
  const isFull = this.waiting.length >= this.maxPlayers;

  if (!windowElapsed && !isFull) {
    return null; // keep waiting for more players
  }

  const takeCount = Math.min(this.waiting.length, this.maxPlayers);
  const matched = this.waiting.splice(0, takeCount);
  this._fillTimerStartedAt = null;

  const lobby = new Lobby({
    hostId: matched[0].id,
    isPrivate: false,
  });

  matched.forEach((p) => lobby.addPlayer(p));

  return lobby;
 }
}

module.exports = { Lobby, QuickMatchQueue, generatePlayerName, generateRoomCode };