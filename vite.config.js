/**
 * server.js — Express + Socket.io backend for Maths The Bomb
 * Handles real multiplayer lobbies, quick match, bots, and singleplayer sessions.
 * All GameState instances live here; events are relayed to socket rooms.
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { GameState, Lobby, QuickMatchQueue, generatePlayerName, generateRoomCode } = require('./engine');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*' },
});

// NOTE: Static files / Vite middleware are mounted in startServer() below.

// ── In-memory state ───────────────────────────────────────────────────────────
/** Map<roomCode, { lobby: Lobby, game: GameState|null, socketIds: Map<playerId, socketId> }> */
const rooms = new Map();
/** Map<socketId, { playerId, roomCode }> */
const socketMeta = new Map();
/** Quick match queue */
const quickQueue = new QuickMatchQueue({ minPlayers: 2, maxWaitMs: 15000, fillWindowMs: 5000, maxPlayers: 8 });
/** Poll quick match every second */
setInterval(() => {
  const formed = quickQueue.tryFormMatch();
  if (formed) {
    const code = formed.code;
    console.log(`[quick-match] match formed! code=${code} players=${formed.players.map(p=>p.name).join(',')}`);
    const room = { lobby: formed, game: null, socketIds: new Map() };
    rooms.set(code, room);
    // notify all waiting sockets (they stored their socketId in the queue entry)
    formed.players.forEach((p) => {
      if (p._socketId) {
        const sock = io.sockets.sockets.get(p._socketId);
        if (sock) {
          sock.join(code);
          socketMeta.set(p._socketId, { playerId: p.id, roomCode: code });
          room.socketIds.set(p.id, p._socketId);
          sock.emit('lobby-state', lobbyPayload(formed, p.id));
          console.log(`[quick-match] lobby-state sent to ${p.name} (${p._socketId})`);
        } else {
          console.warn(`[quick-match] socket gone for player ${p.name} (${p._socketId})`);
        }
      } else if (!p.isBot) {
        console.warn(`[quick-match] no _socketId for real player ${p.name}`);
      }
    });
    // Auto-start immediately — no need for host to click Start in quick match
    console.log(`[quick-match] auto-starting game for room ${code}`);
    startGame(code);
  }

  // Let everyone still in the queue know how things are looking
  // (count found so far + countdown once the fill window has started).
  if (quickQueue.waiting.length > 0) {
    const status = quickQueue.getStatus();
    quickQueue.waiting.forEach((p) => {
      if (p._socketId) {
        const sock = io.sockets.sockets.get(p._socketId);
        if (sock) sock.emit('quick-match-status', status);
      }
    });
  }
}, 1000);

// ── Helpers ───────────────────────────────────────────────────────────────────

function lobbyPayload(lobby, myPlayerId) {
  return {
    roomCode: lobby.code,
    players: lobby.players,
    hostId: lobby.hostId,
    status: lobby.status,
    myPlayerId,
  };
}

function broadcastLobby(code) {
  const room = rooms.get(code);
  if (!room) return;
  room.socketIds.forEach((socketId, playerId) => {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) sock.emit('lobby-state', lobbyPayload(room.lobby, playerId));
  });
}

function startGame(code, timerConfig, initialDifficulty = 1) {
  const room = rooms.get(code);
  if (!room || room.game) return;

  room.lobby.status = 'in-progress';
  const game = new GameState({
    players: room.lobby.players,
    mode: room.lobby.players.length === 1 ? 'singleplayer' : 'multiplayer',
    timerConfig,
    initialDifficulty,
  });
  room.game = game;

  // Announce immediately so clients can navigate to the gameplay screen.
  // Emit per-socket (not a single room broadcast) so each client gets its
  // own myPlayerId/roomCode directly in the payload — relying on the client
  // to stitch this together from earlier 'lobby-state' React state is a race
  // (this event can be processed before that state has flushed), which was
  // causing players to think they weren't in the match and fall into
  // spectator mode immediately.
  room.socketIds.forEach((socketId, playerId) => {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) {
      sock.emit('match-starting', {
        players: room.lobby.players,
        myPlayerId: playerId,
        roomCode: code,
      });
    }
  });

  // Stats tracking per player for end-of-match rewards
  room.isSingleplayer  = room.lobby.players.length === 1;
  room.currentDifficulty = initialDifficulty;
  room.stats = {};
  room.lobby.players.forEach((p) => {
    room.stats[p.id] = { correctAnswers: 0, survivedRounds: 0, won: false, score: 0 };
  });

  game.on('match-start', ({ firstPlayer }) => {
    io.to(code).emit('match-start', { firstPlayer, players: room.lobby.players });
  });

  game.on('turn-start', ({ player, question, difficulty }) => {
    room.currentDifficulty = difficulty;
    io.to(code).emit('turn-start', { playerId: player.id, question, difficulty });
    // Bot logic: bots auto-answer after a random delay
    if (player.isBot) {
      const delay = 1500 + Math.random() * 3000;
      setTimeout(() => {
        if (room.game === game) {  // guard against stale timeouts from ended games
          // Bots answer correctly 70% of the time
          const answer = Math.random() < 0.7
            ? question.answer
            : (question.choices
                ? question.choices.find((c) => c !== question.answer) ?? question.answer
                : question.answer + 1);
          game.submitAnswer(player.id, answer);
        }
      }, delay);
    }
  });

  game.on('timer-tick', (tick) => {
    io.to(code).emit('timer-tick', tick);
  });

  game.on('answer-correct', ({ player, question }) => {
    if (room.stats[player.id]) {
      room.stats[player.id].correctAnswers += 1;
      if (room.isSingleplayer) {
        room.stats[player.id].score += room.currentDifficulty * 10;
      }
    }
    io.to(code).emit('answer-correct', { playerId: player.id, question });
  });

  game.on('answer-wrong', ({ player, question }) => {
    io.to(code).emit('answer-wrong', { playerId: player.id, question });
  });

  game.on('answer-timeout', ({ player, question }) => {
    io.to(code).emit('answer-timeout', { playerId: player.id, question });
  });

  game.on('player-eliminated', ({ player, question }) => {
    io.to(code).emit('player-eliminated', { playerId: player.id, question });
  });

  game.on('cycle-complete', ({ round, difficulty }) => {
    // Update survivedRounds for alive players; singleplayer also earns a round bonus
    room.lobby.players.filter((p) => p.alive !== false).forEach((p) => {
      if (room.stats[p.id]) {
        room.stats[p.id].survivedRounds += 1;
        if (room.isSingleplayer) {
          room.stats[p.id].score += room.currentDifficulty * 5;
        }
      }
    });
    io.to(code).emit('cycle-complete', { round, difficulty });
  });

  game.on('game-over', ({ winner }) => {
    if (winner && room.stats[winner.id]) room.stats[winner.id].won = true;
    // Send each player their own stats for wallet reward
    room.socketIds.forEach((socketId, playerId) => {
      const sock = io.sockets.sockets.get(socketId);
      if (sock) {
        sock.emit('game-over', {
          winner,
          myStats: room.stats[playerId] || { correctAnswers: 0, survivedRounds: 0, won: false, score: 0 },
        });
      }
    });
    room.lobby.status = 'finished';
    room.game = null; // detach so stale bot timeouts from this game are ignored
  });

  // Delay game.start() so clients have time to mount GameplayScreen
  // before turn-start and timer-tick events begin firing.
  setTimeout(() => {
    if (rooms.get(code)?.game === game) game.start();
  }, 1200);
}

// ── Socket handlers ───────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // ── Singleplayer ──────────────────────────────────────────────────────────
  socket.on('create-singleplayer', (payload = {}) => {
    try {
      const { playerName, difficulty, cosmetics } = payload;
      const playerId = uuidv4();
      const name = playerName || generatePlayerName();
      const code = generateRoomCode();

      const lobby = new Lobby({ hostId: playerId, isPrivate: true });
      lobby.code = code;
      lobby.addPlayer({ id: playerId, name, cosmetics });

      const socketIds = new Map([[playerId, socket.id]]);
      rooms.set(code, { lobby, game: null, socketIds });
      socketMeta.set(socket.id, { playerId, roomCode: code });

      socket.join(code);
      socket.emit('lobby-state', lobbyPayload(lobby, playerId));

      const timerConfig = difficulty === 'easy'
        ? { startingSeconds: 20, singleplayerStart: 20 }
        : difficulty === 'hard'
          ? { startingSeconds: 8, singleplayerStart: 8 }
          : undefined;
      const initialDifficulty = difficulty === 'hard' ? 5 : difficulty === 'easy' ? 1 : 2;
      startGame(code, timerConfig, initialDifficulty);
    } catch (err) {
      console.error('create-singleplayer error:', err);
      socket.emit('error', { message: 'Failed to start singleplayer game.' });
    }
  });

  // ── Create Lobby ──────────────────────────────────────────────────────────
  socket.on('create-lobby', (payload = {}) => {
    try {
      const { playerName, difficulty, cosmetics } = payload;
      const playerId = uuidv4();
      const name = playerName || generatePlayerName();

      const lobby = new Lobby({ hostId: playerId, isPrivate: true });
      const code = lobby.code;
      lobby.addPlayer({ id: playerId, name, cosmetics });
      lobby._difficulty = difficulty;

      const socketIds = new Map([[playerId, socket.id]]);
      rooms.set(code, { lobby, game: null, socketIds });
      socketMeta.set(socket.id, { playerId, roomCode: code });

      socket.join(code);
      socket.emit('lobby-state', lobbyPayload(lobby, playerId));
    } catch (err) {
      console.error('create-lobby error:', err);
      socket.emit('error', { message: 'Failed to create lobby.' });
    }
  });

  // ── Join Lobby by code ────────────────────────────────────────────────────
  socket.on('join-lobby', (payload = {}) => {
    try {
      const { playerName, code, cosmetics } = payload;
      const room = rooms.get(code?.toUpperCase());
      if (!room || room.lobby.status !== 'waiting') {
        socket.emit('error', { message: 'Room not found or game already started.' });
        return;
      }
      const playerId = uuidv4();
      const name = playerName || generatePlayerName();
      const result = room.lobby.addPlayer({ id: playerId, name, cosmetics });
      if (!result.success) {
        socket.emit('error', { message: result.reason });
        return;
      }

      room.socketIds.set(playerId, socket.id);
      socketMeta.set(socket.id, { playerId, roomCode: code.toUpperCase() });
      socket.join(code.toUpperCase());
      broadcastLobby(code.toUpperCase());
    } catch (err) {
      console.error('join-lobby error:', err);
      socket.emit('error', { message: 'Failed to join lobby.' });
    }
  });

  // ── Quick Match ───────────────────────────────────────────────────────────
  socket.on('quick-match', ({ playerName, cosmetics } = {}) => {
    const playerId = uuidv4();
    const name = playerName || generatePlayerName();
    console.log(`[quick-match] socket=${socket.id} player=${name} joining queue`);
    quickQueue.join({ id: playerId, name, cosmetics, _socketId: socket.id });
    socketMeta.set(socket.id, { playerId, roomCode: null, inQueue: true });
    socket.emit('queuing', { message: 'Searching for players…' });
    console.log(`[quick-match] queuing sent to ${socket.id}, queue size=${quickQueue.waiting.length}`);
  });

  // ── Play with Bots ────────────────────────────────────────────────────────
  socket.on('play-with-bots', (payload = {}) => {
    try {
      const { playerName, botCount = 3, difficulty, cosmetics } = payload;
      const playerId = uuidv4();
      const name = playerName || generatePlayerName();

      const lobby = new Lobby({ hostId: playerId, isPrivate: true });
      const code = lobby.code;
      lobby.addPlayer({ id: playerId, name, cosmetics });
      lobby.fillWithBots(botCount + 1);
      lobby._difficulty = difficulty;

      const socketIds = new Map([[playerId, socket.id]]);
      rooms.set(code, { lobby, game: null, socketIds });
      socketMeta.set(socket.id, { playerId, roomCode: code });

      socket.join(code);
      socket.emit('lobby-state', lobbyPayload(lobby, playerId));

      const timerConfig = difficulty === 'easy'
        ? { startingSeconds: 20 }
        : difficulty === 'hard'
          ? { startingSeconds: 8 }
          : undefined;
      const initialDifficulty = difficulty === 'hard' ? 5 : difficulty === 'easy' ? 1 : 2;
      startGame(code, timerConfig, initialDifficulty);
    } catch (err) {
      console.error('play-with-bots error:', err);
      socket.emit('error', { message: 'Failed to start bots game.' });
    }
  });

  // ── Host starts the game ──────────────────────────────────────────────────
  socket.on('lobby-start', () => {
    try {
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room || room.lobby.hostId !== meta.playerId) return;
      if (room.lobby.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start.' });
        return;
      }

      const difficulty = room.lobby._difficulty;
      const timerConfig = difficulty === 'easy'
        ? { startingSeconds: 20 }
        : difficulty === 'hard'
          ? { startingSeconds: 8 }
          : undefined;
      const initialDifficulty = difficulty === 'hard' ? 5 : difficulty === 'easy' ? 1 : 2;
      startGame(meta.roomCode, timerConfig, initialDifficulty);
    } catch (err) {
      console.error('lobby-start error:', err);
      socket.emit('error', { message: 'Failed to start match.' });
    }
  });

  // ── Submit Answer ─────────────────────────────────────────────────────────
  socket.on('submit-answer', (payload = {}) => {
    try {
      const { answer } = payload;
      const meta = socketMeta.get(socket.id);
      if (!meta) return;
      const room = rooms.get(meta.roomCode);
      if (!room?.game) return;
      room.game.submitAnswer(meta.playerId, answer);
    } catch (err) {
      console.error('submit-answer error:', err);
    }
  });

  // ── Live typing/selection broadcast ──────────────────────────────────────
  socket.on('player-typing', ({ selection } = {}) => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    socket.to(meta.roomCode).emit('player-typing-update', {
      playerId: meta.playerId,
      selection,
    });
  });

  // ── Rematch ───────────────────────────────────────────────────────────────
  socket.on('rematch', () => {
    const meta = socketMeta.get(socket.id);
    if (!meta) return;
    const room = rooms.get(meta.roomCode);
    if (!room || room.lobby.status !== 'finished') return;

    room.lobby.status = 'waiting';
    room.game = null;
    broadcastLobby(meta.roomCode);
  });

  // ── Leave / Disconnect ────────────────────────────────────────────────────
  function handleLeave(sid) {
    const meta = socketMeta.get(sid);
    if (!meta) return;
    socketMeta.delete(sid);

    if (meta.inQueue) {
      quickQueue.leave(meta.playerId);
      return;
    }

    const room = rooms.get(meta.roomCode);
    if (!room) return;

    // Actually leave the socket.io room. Without this, the socket keeps
    // receiving events broadcast to this room even after the player has
    // "left" on the client side.
    const sock = io.sockets.sockets.get(sid);
    if (sock) sock.leave(meta.roomCode);

    room.socketIds.delete(meta.playerId);
    room.lobby.removePlayer(meta.playerId);

    if (room.socketIds.size === 0) {
      // Stop the running game's timer before discarding the room — otherwise
      // its setInterval keeps firing forever (an orphaned game), and if this
      // player's socket ever rejoins/starts a new game, the old game's
      // leftover turn-start/timer-tick events end up mixed in with the new
      // one, which is what made the bomb timer appear to run twice as fast.
      if (room.game) room.game.timer.stop();
      rooms.delete(meta.roomCode);
    } else {
      broadcastLobby(meta.roomCode);
    }
  }

  socket.on('leave', () => handleLeave(socket.id));
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    handleLeave(socket.id);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  console.log(`[server] NODE_ENV = ${process.env.NODE_ENV || '(not set)'}`);

  if (process.env.NODE_ENV === 'production') {
    console.log('[server] Serving static dist/ build');
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    console.log('[server] Serving via Vite dev middleware');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      root: path.join(__dirname, 'client'),
      server: {
        middlewareMode: true,
        allowedHosts: true,
        // Disable HMR — Vite's HMR WebSocket conflicts with Socket.io's
        // upgrade handler through Replit's proxy. Not needed for a game.
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});