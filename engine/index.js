/**
 * index.js — public entry point for the Maths The Bomb game engine.
 * Import from here in your UI/server code:
 *
 *   const { GameState, generateQuestion, TurnTimer, Lobby,
 *           QuickMatchQueue, PlayerWallet, CATALOG } = require('./engine');
 */

const { GameState } = require('./gameState');
const { generateQuestion, TOPIC_GENERATORS } = require('./questionGenerator');
const { TurnTimer, DEFAULT_CONFIG } = require('./timerManager');
const { Lobby, QuickMatchQueue, generatePlayerName, generateRoomCode } = require('./lobby');
const { CATALOG, calculateMatchReward, PlayerWallet } = require('./economy');

module.exports = {
  GameState,
  generateQuestion,
  TOPIC_GENERATORS,
  TurnTimer,
  DEFAULT_CONFIG,
  Lobby,
  QuickMatchQueue,
  generatePlayerName,
  generateRoomCode,
  CATALOG,
  calculateMatchReward,
  PlayerWallet,
};
