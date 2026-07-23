/**
 * timerManager.js
 * -----------------------------------------------------------------------
 * Handles all turn-timer logic for both singleplayer and multiplayer.
 *
 * Multiplayer: timer per turn shrinks every full cycle (every active
 * player has taken one turn).
 * Singleplayer: a correct answer grants +5 seconds; timer never grows
 * from a cycle bonus since there's only one player.
 *
 * This module is intentionally UI-agnostic: it exposes plain start/tick/
 * stop functions and fires callbacks. Replit AI wires these callbacks to
 * the bomb-ticking sound, the flashing background intensity, and the
 * on-screen countdown display.
 * -----------------------------------------------------------------------
 */

const DEFAULT_CONFIG = {
  startingSeconds: 15,      // turn length at the very start of a multiplayer match
  minSeconds: 5,            // timer never shrinks below this
  secondsLostPerCycle: 1,   // multiplayer: shaved off every full cycle
  singleplayerBonus: 5,     // singleplayer: added on each correct answer
  singleplayerStart: 12,
};

class TurnTimer {
  /**
   * @param {object} opts
   * @param {'singleplayer'|'multiplayer'} opts.mode
   * @param {object} [opts.config] - override DEFAULT_CONFIG values
   * @param {function} opts.onTick - called every 100ms with {secondsLeft, pctLeft}
   * @param {function} opts.onExpire - called when timer hits 0
   */
  constructor({ mode, config = {}, onTick, onExpire }) {
    this.mode = mode;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onTick = onTick || (() => {});
    this.onExpire = onExpire || (() => {});

    this.cycleCount = 0;
    this.currentTurnLengthMs =
      (mode === 'singleplayer' ? this.config.singleplayerStart : this.config.startingSeconds) * 1000;

    this._interval = null;
    this._remainingMs = 0;
  }

  /** Recalculates turn length for multiplayer after a full cycle completes. */
  advanceCycle() {
    if (this.mode !== 'multiplayer') return;
    this.cycleCount += 1;
    const shrunk =
      this.config.startingSeconds - this.cycleCount * this.config.secondsLostPerCycle;
    this.currentTurnLengthMs = Math.max(this.config.minSeconds, shrunk) * 1000;
  }

  /** Singleplayer only: extend the current running timer after a correct answer. */
  applyCorrectAnswerBonus() {
    if (this.mode !== 'singleplayer') return;
    this._remainingMs = Math.min(
      this._remainingMs + this.config.singleplayerBonus * 1000,
      20000, // never exceed 20 seconds
    );
  }

  /**
   * Apply a 5-second penalty for a wrong answer on a multiple-choice question.
   * Returns true if the penalty consumed all remaining time (player should explode).
   */
  applyWrongAnswerPenalty() {
    this._remainingMs -= 5000;
    return this._remainingMs <= 0;
  }

  /**
   * Continue the countdown from whatever _remainingMs is currently set to,
   * without resetting it to the full turn length.  Used in singleplayer so
   * that correct-answer bonuses (+5 s) and wrong-answer MC penalties (-5 s)
   * are preserved across questions instead of being wiped by a full start().
   * Falls back to a full turn length only when _remainingMs is 0 (first turn).
   */
  continue() {
    if (this._remainingMs <= 0) {
      this._remainingMs = this.currentTurnLengthMs;
    }
    this.stop();
    this._interval = setInterval(() => {
      this._remainingMs -= 100;
      if (this._remainingMs <= 0) {
        this._remainingMs = 0;
        this._emitTick();
        this.stop();
        this.onExpire();
        return;
      }
      this._emitTick();
    }, 100);
  }

  /** Starts (or restarts) the countdown for the current player's turn. */
  start() {
    this.stop();
    this._remainingMs = this.currentTurnLengthMs;

    this._interval = setInterval(() => {
      this._remainingMs -= 100;

      if (this._remainingMs <= 0) {
        this._remainingMs = 0;
        this._emitTick();
        this.stop();
        this.onExpire();
        return;
      }

      this._emitTick();
    }, 100);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  _emitTick() {
    const totalMs = this.currentTurnLengthMs;
    const pctLeft = Math.max(0, this._remainingMs / totalMs);
    this.onTick({
      secondsLeft: Math.ceil(this._remainingMs / 1000),
      pctLeft, // use this to drive flashing-intensity & ticking-sound speed
      isCritical: pctLeft <= 0.25, // suggested threshold for "intense flashing" mode
    });
  }
}

module.exports = { TurnTimer, DEFAULT_CONFIG };
