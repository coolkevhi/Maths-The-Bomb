/**
 * gameState.js
 * -----------------------------------------------------------------------
 * The turn-based elimination engine for "Maths The Bomb".
 * Pure game logic — no rendering, no networking, no sound. Replit AI
 * should subscribe to the events this class emits and hook them up to
 * animations, VFX, and audio.
 *
 * Usage:
 *   const game = new GameState({ players, mode: 'multiplayer' });
 *   game.on('turn-start', ({ player, question }) => { ...render... });
 *   game.on('player-eliminated', ({ player, question }) => { ...explode... });
 *   game.on('game-over', ({ winner }) => { ...show results... });
 *   game.start();
 *   ...
 *   game.submitAnswer(playerId, answerValue);
 * -----------------------------------------------------------------------
 */

const { generateQuestion } = require('./questionGenerator');
const { TurnTimer } = require('./timerManager');

class SimpleEmitter {
  constructor() {
    this._listeners = {};
  }
  on(event, cb) {
    (this._listeners[event] ||= []).push(cb);
    return this;
  }
  emit(event, payload) {
    (this._listeners[event] || []).forEach((cb) => cb(payload));
  }
}

class GameState extends SimpleEmitter {
  /**
   * @param {object} opts
   * @param {Array<{id:string, name:string}>} opts.players
   * @param {'singleplayer'|'multiplayer'} opts.mode
   * @param {string[]} [opts.topics] - restrict question topics
   * @param {object} [opts.timerConfig]
   */
  constructor({ players, mode = 'multiplayer', topics, timerConfig, initialDifficulty = 1 }) {
    super();
    if (mode === 'singleplayer' && players.length !== 1) {
      throw new Error('Singleplayer mode requires exactly one player.');
    }

    this.mode = mode;
    this.topics = topics;
    this.players = players.map((p) => ({ ...p, alive: true }));
    this.turnOrder = [...this.players]; // circle order, fixed at match start
    this.currentTurnIndex = 0;
    // Allow difficulty settings (easy/hard) to set a meaningful starting
    // question difficulty, not just change the timer length.
    this.difficulty = Math.max(1, initialDifficulty);
    this.currentQuestion = null;
    this.roundNumber = 1; // increments each full cycle
    this._turnsTakenThisCycle = 0;
    this._cyclesSinceIncrease = 0; // difficulty only ramps every 3 cycles (multiplayer)

    this.timer = new TurnTimer({
      mode,
      config: timerConfig,
      onTick: (tickInfo) => this.emit('timer-tick', tickInfo),
      onExpire: () => this._handleTimeout(),
    });
  }

  // ---- lifecycle -------------------------------------------------------

  start() {
    // Randomly select the first player, per blueprint ("First player is
    // randomly selected"). Reshuffle turnOrder starting point only —
    // circle adjacency order is preserved.
    this.currentTurnIndex = Math.floor(Math.random() * this.turnOrder.length);
    this.emit('match-start', { firstPlayer: this._activePlayer() });
    this._beginTurn();
  }

  submitAnswer(playerId, answerValue) {
    const active = this._activePlayer();
    if (!active || active.id !== playerId || !this.currentQuestion) return;

    const isCorrect = answerValue === this.currentQuestion.answer;
    this.timer.stop();

    if (isCorrect) {
      this.emit('answer-correct', { player: active, question: this.currentQuestion });
      if (this.mode === 'singleplayer') {
        this.timer.applyCorrectAnswerBonus();
        this.difficulty += 1; // "difficulty increases with every correct answer"
      }
      this._advanceTurn();
    } else {
      // Wrong answer: bomb PASSES without exploding — only a timeout (or the
      // 5-second MC penalty running the clock to zero) triggers elimination.
      // Multiple-choice questions (clock, shape names — answer is a string)
      // apply a 5-second penalty to the remaining time.  If that exhausts the
      // timer the active player explodes immediately.
      const isMC = typeof this.currentQuestion.answer === 'string';
      this.emit('answer-wrong', { player: active, question: this.currentQuestion });

      if (isMC) {
        const shouldExplode = this.timer.applyWrongAnswerPenalty();
        if (shouldExplode) {
          this._eliminateActivePlayer();
          return;
        }
      }

      // Singleplayer replays the same question for the one player.
      // Multiplayer: a non-eliminating wrong pass generates a FRESH question
      // for the next player (same-question persistence only happens after an
      // actual explosion via _eliminateActivePlayer).
      // Wrong answers repeat the same question.
// The player keeps getting this question until they answer correctly
// or the timer expires and they are eliminated.
this._startTurnWithCurrentQuestion({ continueTimer: true });
    }
  }

  // ---- internals ---------------------------------------------------------

  _activePlayer() {
    return this.turnOrder[this.currentTurnIndex];
  }

  _aliveTurnOrder() {
    return this.turnOrder.filter((p) => p.alive);
  }

  _handleTimeout() {
    const active = this._activePlayer();
    this.emit('answer-timeout', { player: active, question: this.currentQuestion });
    this._eliminateActivePlayer();
  }

  _eliminateActivePlayer() {
    const active = this._activePlayer();
    active.alive = false;
    this.emit('player-eliminated', { player: active, question: this.currentQuestion });

    const remaining = this._aliveTurnOrder();
    if (remaining.length <= 1) {
      this._endGame(remaining[0] || null);
      return;
    }

    // "If a player explodes, the same unsolved question passes to the
    // next player" — so we do NOT generate a new question here.
    this._moveToNextAlivePlayer();
    this._startTurnWithCurrentQuestion();
  }

  _advanceTurn() {
    this._turnsTakenThisCycle += 1;

    if (this.mode === 'singleplayer') {
      // Endless solo survival: the "only 1 player left" win condition below
      // is meaningless here since there's always exactly 1 total player —
      // it was ending the match right after the very first correct answer.
      // Difficulty/timer bonus for this answer were already applied in
      // submitAnswer(); just serve up the next question and keep going
      // until a wrong answer or timeout eliminates the player.
      this._beginTurn();
      return;
    }

    const remaining = this._aliveTurnOrder();
    if (remaining.length <= 1) {
      this._endGame(remaining[0] || null);
      return;
    }

    if (this._turnsTakenThisCycle >= remaining.length) {
      this._completeCycle();
    }

    this._moveToNextAlivePlayer();
    this._beginTurn();
  }

  _completeCycle() {
    this._turnsTakenThisCycle = 0;
    this.roundNumber += 1;
    if (this.mode === 'multiplayer') {
      this.timer.advanceCycle();
      // Difficulty ramps every 3 completed cycles, not every cycle
      this._cyclesSinceIncrease += 1;
      if (this._cyclesSinceIncrease >= 3) {
        this.difficulty += 1;
        this._cyclesSinceIncrease = 0;
      }
    }
    this.emit('cycle-complete', { round: this.roundNumber, difficulty: this.difficulty });
  }

  _moveToNextAlivePlayer() {
    let next = (this.currentTurnIndex + 1) % this.turnOrder.length;
    let guard = 0;
    while (!this.turnOrder[next].alive && guard < this.turnOrder.length) {
      next = (next + 1) % this.turnOrder.length;
      guard += 1;
    }
    this.currentTurnIndex = next;
  }

  _beginTurn() {
    this.currentQuestion = generateQuestion(this.difficulty, this.topics);
    this._startTurnWithCurrentQuestion();
  }

  _startTurnWithCurrentQuestion({ continueTimer = false } = {}) {
  const active = this._activePlayer();

  this.emit('turn-start', {
    player: active,
    question: this.currentQuestion,
    difficulty: this.difficulty,
  });

  if (this.mode === 'singleplayer' || continueTimer) {
    this.timer.continue();
  } else {
    this.timer.start();
  }
}

  _endGame(winner) {
    this.timer.stop();
    this.emit('game-over', { winner });
  }
}

module.exports = { GameState };
